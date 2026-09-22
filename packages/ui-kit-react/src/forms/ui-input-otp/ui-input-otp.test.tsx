import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiInputOtp, type UiInputOtpProps } from './ui-input-otp';

function Host(props: Partial<UiInputOtpProps>) {
  return <UiInputOtp aria-label="Code de vérification" {...props} />;
}

const cells = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLInputElement>('.ui-input-otp-cell'),
];

const touche = (el: HTMLElement, key: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

// La saisie passe par le VRAI clavier : `keydown` décide de ce qui entre, et un
// événement fabriqué sauterait ce filtre.
const saisir = (
  screen: { getByRole: (r: string, o?: object) => { fill: (v: string) => Promise<void> } },
  rang: number,
  texte: string,
) => screen.getByRole('textbox', { name: `Code de vérification ${rang}` }).fill(texte);

test('le groupe porte son rôle et son nom, une case par caractère', async () => {
  const screen = await render(<Host length={5} />);
  const groupe = screen.container.querySelector('.ui-input-otp')!;

  expect(groupe).toHaveAttribute('role', 'group');
  expect(groupe).toHaveAttribute('aria-label', 'Code de vérification');
  expect(cells(screen.container)).toHaveLength(5);
});

// Chaque case est nommée à son rang, sinon un lecteur d'écran annonce cinq fois
// la même chose.
test('chaque case est nommée par son rang', async () => {
  const screen = await render(<Host length={3} />);

  expect(cells(screen.container).map((c) => c.getAttribute('aria-label'))).toEqual([
    'Code de vérification 1',
    'Code de vérification 2',
    'Code de vérification 3',
  ]);
});

test('charAriaLabel sert quand le groupe n’a qu’un aria-labelledby', async () => {
  const screen = await render(
    <>
      <span id="titre-otp">Code</span>
      <UiInputOtp aria-labelledby="titre-otp" charAriaLabel="Chiffre" length={2} />
    </>,
  );

  expect(cells(screen.container)[0]).toHaveAttribute('aria-label', 'Chiffre 1');
});

// Le groupe est un SEUL arrêt de tabulation : `Tab` traverse le champ, les
// flèches circulent dedans.
test('une seule case porte l’arrêt de tabulation', async () => {
  const screen = await render(<Host length={4} />);

  expect(cells(screen.container).map((c) => c.tabIndex)).toEqual([0, -1, -1, -1]);

  cells(screen.container)[2]!.focus();

  await expect.poll(() => cells(screen.container).map((c) => c.tabIndex)).toEqual([-1, -1, 0, -1]);
});

test('la valeur de départ se répartit sur les cases', async () => {
  const screen = await render(<Host defaultValue="42" length={4} />);

  expect(cells(screen.container).map((c) => c.value)).toEqual(['4', '2', '', '']);
});

test('la frappe avance à la case suivante', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Host onValueChange={onValueChange} />);

  await saisir(screen, 1, '7');

  await expect.poll(() => document.activeElement).toBe(cells(screen.container)[1]);
  expect(onValueChange).toHaveBeenLastCalledWith('7');
});

test('onComplete signale le code une fois toutes les cases remplies', async () => {
  const onComplete = vi.fn();
  const screen = await render(<Host length={3} onComplete={onComplete} />);

  await saisir(screen, 1, '1');
  await saisir(screen, 2, '2');
  expect(onComplete).not.toHaveBeenCalled();

  await saisir(screen, 3, '3');

  await expect.poll(() => onComplete.mock.calls.length).toBe(1);
  expect(onComplete).toHaveBeenCalledWith('123');
});

test('les flèches circulent entre les cases, sans boucler', async () => {
  const screen = await render(<Host length={3} />);
  const all = cells(screen.container);

  all[0]!.focus();
  touche(all[0]!, 'ArrowRight');
  await expect.poll(() => document.activeElement).toBe(all[1]);

  touche(all[1]!, 'ArrowLeft');
  await expect.poll(() => document.activeElement).toBe(all[0]);

  // Au bord, on reste : un code se lit de gauche à droite.
  touche(all[0]!, 'ArrowLeft');
  await expect.poll(() => document.activeElement).toBe(all[0]);
});

test('Début et Fin vont à la première et à la dernière case', async () => {
  const screen = await render(<Host length={4} />);
  const all = cells(screen.container);

  all[1]!.focus();
  touche(all[1]!, 'End');
  await expect.poll(() => document.activeElement).toBe(all[3]);

  touche(all[3]!, 'Home');
  await expect.poll(() => document.activeElement).toBe(all[0]);
});

// Les flèches verticales n'ont pas de sens ici, et sans garde la page défile.
test('les flèches verticales sont neutralisées', async () => {
  const screen = await render(<Host />);
  const first = cells(screen.container)[0]!;
  first.focus();

  const evenement = new KeyboardEvent('keydown', {
    key: 'ArrowUp',
    bubbles: true,
    cancelable: true,
  });
  first.dispatchEvent(evenement);

  expect(evenement.defaultPrevented).toBe(true);
});

test('Retour arrière sur une case vide efface la précédente et recule', async () => {
  const screen = await render(<Host defaultValue="12" length={3} />);
  const all = cells(screen.container);

  all[2]!.focus();
  touche(all[2]!, 'Backspace');

  await expect.poll(() => document.activeElement).toBe(all[1]);
  expect(cells(screen.container).map((c) => c.value)).toEqual(['1', '', '']);
});

test('integerOnly refuse les caractères qui ne sont pas des chiffres', async () => {
  const screen = await render(<Host integerOnly />);
  const first = cells(screen.container)[0]!;
  first.focus();

  const lettre = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
  first.dispatchEvent(lettre);
  expect(lettre.defaultPrevented).toBe(true);

  const chiffre = new KeyboardEvent('keydown', { key: '5', bubbles: true, cancelable: true });
  first.dispatchEvent(chiffre);
  expect(chiffre.defaultPrevented).toBe(false);
});

test('integerOnly demande le pavé numérique', async () => {
  const screen = await render(<Host integerOnly />);

  expect(cells(screen.container)[0]).toHaveAttribute('inputmode', 'numeric');
});

test('mask rend des cases de mot de passe', async () => {
  const screen = await render(<Host mask defaultValue="12" />);

  expect(cells(screen.container)[0]).toHaveAttribute('type', 'password');
});

// Un code arrive presque toujours par le presse-papiers : il doit se répartir,
// pas s'écraser dans une seule case.
test('un code collé se répartit sur les cases', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<Host length={6} integerOnly onValueChange={onValueChange} />);
  const first = cells(screen.container)[0]!;
  first.focus();

  const data = new DataTransfer();
  data.setData('text', '123456');
  first.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
  );

  await expect
    .poll(() => cells(screen.container).map((c) => c.value))
    .toEqual(['1', '2', '3', '4', '5', '6']);
  expect(onValueChange).toHaveBeenLastCalledWith('123456');
});

test('un collage plus long que le champ s’arrête à la dernière case', async () => {
  const screen = await render(<Host length={4} integerOnly />);
  const first = cells(screen.container)[0]!;
  first.focus();

  const data = new DataTransfer();
  data.setData('text', '9876543');
  first.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
  );

  await expect
    .poll(() => cells(screen.container).map((c) => c.value))
    .toEqual(['9', '8', '7', '6']);
});

test('un collage non numérique est filtré par integerOnly', async () => {
  const screen = await render(<Host length={4} integerOnly />);
  const first = cells(screen.container)[0]!;
  first.focus();

  const data = new DataTransfer();
  data.setData('text', 'a1b2c3');
  first.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
  );

  await expect.poll(() => cells(screen.container).map((c) => c.value)).toEqual(['1', '2', '3', '']);
});

// Une case remplie alors que les précédentes sont vides laisse un TROU, que la
// valeur jointe ne sait pas porter. Le rendu ne doit pas recoller à gauche.
test('une case remplie seule garde sa place', async () => {
  const screen = await render(<Host length={4} />);

  await saisir(screen, 3, '9');

  await expect.poll(() => cells(screen.container).map((c) => c.value)).toEqual(['', '', '9', '']);
});

test('en mode contrôlé, la valeur de l’appelant gagne', async () => {
  function Controlled() {
    const [code, setCode] = useState('11');
    return (
      <>
        <button type="button" onClick={() => setCode('99')}>
          Imposer
        </button>
        <Host value={code} length={4} />
      </>
    );
  }
  const screen = await render(<Controlled />);

  // Le parent ne suit pas : la frappe ne change rien.
  await saisir(screen, 3, '5');
  await expect.poll(() => cells(screen.container).map((c) => c.value)).toEqual(['1', '1', '', '']);

  await screen.getByRole('button', { name: 'Imposer' }).click();
  await expect.poll(() => cells(screen.container).map((c) => c.value)).toEqual(['9', '9', '', '']);
});

test('désactivé, rien n’est saisissable', async () => {
  const screen = await render(<Host disabled defaultValue="12" />);
  const groupe = screen.container.querySelector('.ui-input-otp')!;

  expect(groupe).toHaveClass('_disabled');
  expect(groupe).toHaveAttribute('aria-disabled', 'true');
  for (const cell of cells(screen.container)) expect(cell).toBeDisabled();
});

// `aria-invalid` n'est pas supporté par le rôle `group` : il appartient aux
// cases, qui sont les contrôles réels.
test('en erreur, ce sont les cases qui portent aria-invalid', async () => {
  const screen = await render(<Host invalid />);
  const groupe = screen.container.querySelector('.ui-input-otp')!;

  expect(groupe).toHaveClass('_invalid');
  expect(groupe).not.toHaveAttribute('aria-invalid');
  expect(cells(screen.container)[0]).toHaveAttribute('aria-invalid', 'true');
});

test('le nom du champ se décline par case', async () => {
  const screen = await render(<Host name="otp" length={3} />);

  expect(cells(screen.container).map((c) => c.name)).toEqual(['otp-0', 'otp-1', 'otp-2']);
});

// Passer d'une case à l'autre ne quitte pas le champ : seul ce qui en sort
// compte, sans quoi un `onBlur` de validation tirerait à chaque frappe.
test('onBlur ne tire que quand le focus quitte le groupe', async () => {
  const onBlur = vi.fn();
  const screen = await render(
    <>
      <Host onBlur={onBlur} length={3} />
      <button type="button">Ailleurs</button>
    </>,
  );
  const all = cells(screen.container);

  all[0]!.focus();
  all[1]!.focus();
  await new Promise((r) => setTimeout(r, 30));
  expect(onBlur).not.toHaveBeenCalled();

  screen.container.querySelector('button')!.focus();
  await expect.poll(() => onBlur.mock.calls.length).toBe(1);
});

test('renderCell remplace le contrôle sans perdre le comportement', async () => {
  const screen = await render(
    <Host
      length={3}
      renderCell={({ index, value, tabIndex, ...handlers }) => (
        <input
          {...handlers}
          value={value}
          tabIndex={tabIndex}
          maxLength={1}
          data-maison=""
          aria-label={`Chiffre ${index + 1}`}
        />
      )}
    />,
  );

  expect(screen.container.querySelectorAll('[data-maison]')).toHaveLength(3);
  expect(cells(screen.container)).toHaveLength(0);

  await screen.getByRole('textbox', { name: 'Chiffre 1' }).fill('4');

  const maison = [...screen.container.querySelectorAll<HTMLInputElement>('[data-maison]')];
  await expect.poll(() => document.activeElement).toBe(maison[1]);
  expect(maison[0]!.value).toBe('4');
});

test('focusOnMount pose le focus sur la première case', async () => {
  const screen = await render(<Host focusOnMount />);

  await expect.poll(() => document.activeElement).toBe(cells(screen.container)[0]);
});

test('les tailles posent leur modifieur', async () => {
  const petit = await render(<Host size="small" />);
  const grand = await render(<Host size="large" />);

  expect(petit.container.querySelector('.ui-input-otp')).toHaveClass('_small');
  expect(grand.container.querySelector('.ui-input-otp')).toHaveClass('_large');

  const casePetite = petit.container.querySelector('.ui-input-otp-cell')!;
  const caseGrande = grand.container.querySelector('.ui-input-otp-cell')!;
  expect(casePetite.getBoundingClientRect().width).toBeLessThan(
    caseGrande.getBoundingClientRect().width,
  );
});
