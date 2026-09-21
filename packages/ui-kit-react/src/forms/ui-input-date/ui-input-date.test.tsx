import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiInputDate, type InputDateValue } from './ui-input-date';

type Ecran = { container: HTMLElement };

const natif = (s: Ecran) => s.container.querySelector('.ui-input-date-native') as HTMLInputElement;
const bouton = (s: Ecran) =>
  s.container.querySelector('.ui-input-date-action') as HTMLButtonElement | null;
const racine = (s: Ecran) => s.container.querySelector('.ui-field') as HTMLElement;

/**
 * Pose une valeur comme le ferait le navigateur, puis émet le `change` natif.
 * Le setter natif est obligatoire : React compare à sa propre valeur et ne
 * verrait pas une affectation directe.
 */
function valider(el: HTMLInputElement, texte: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(el, texte);
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/** La même pose, mais seulement `input` : la saisie en cours, pas encore validée. */
function frapper(el: HTMLInputElement, texte: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(el, texte);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function DemoControlee({
  initial = null,
  ...props
}: Partial<React.ComponentProps<typeof UiInputDate>> & { initial?: InputDateValue }) {
  const [value, setValue] = useState<InputDateValue>(initial);
  return (
    <UiInputDate
      label="Date"
      {...props}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        props.onValueChange?.(v);
      }}
    />
  );
}

// --- Contrôle natif --------------------------------------------------------

test.each([
  ['date', 'date'],
  ['time', 'time'],
  ['datetime', 'datetime-local'],
] as const)('le mode %s rend le contrôle natif %s', async (mode, type) => {
  const screen = await render(<UiInputDate label="Date" mode={mode} />);
  expect(natif(screen).type).toBe(type);
});

test.each(['date', 'time', 'datetime'] as const)(
  'le libellé reste levé sur un champ %s vide',
  async (mode) => {
    const screen = await render(<UiInputDate label="Date" mode={mode} floatLabel="on" />);

    expect(natif(screen).value).toBe('');
    // Le navigateur dessine son gabarit dans la boîte : un libellé au repos
    // viendrait par-dessus.
    expect(racine(screen).className).toContain('_filled');
  },
);

// --- Émission --------------------------------------------------------------

test('reste muet sur `input` et n’émet que sur `change`', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<UiInputDate label="Date" onValueChange={onValueChange} />);

  // Un contrôle temporel vide sa propre valeur tant que la saisie est
  // incomplète : la rafale d'`input` ne doit jamais sortir du composant.
  frapper(natif(screen), '');
  frapper(natif(screen), '2026-09-14');
  expect(onValueChange).not.toHaveBeenCalled();

  natif(screen).dispatchEvent(new Event('change', { bubbles: true }));
  expect(onValueChange).toHaveBeenCalledTimes(1);
  expect(onValueChange.mock.lastCall![0]).toBeInstanceOf(Date);
});

test('`valueType="date"` émet une Date à minuit', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<UiInputDate label="Date" onValueChange={onValueChange} />);

  valider(natif(screen), '2026-09-14');

  const value = onValueChange.mock.lastCall![0] as Date;
  expect([value.getFullYear(), value.getMonth(), value.getDate()]).toEqual([2026, 8, 14]);
  expect(value.getHours()).toBe(0);
});

test.each([
  ['date', '2026-09-14', '2026-09-14'],
  ['datetime', '2026-09-14T09:30', '2026-09-14T09:30'],
  ['time', '09:30', '09:30'],
] as const)('`valueType="iso"` émet la chaîne du mode %s', async (mode, saisie, attendu) => {
  const onValueChange = vi.fn();
  const screen = await render(
    <UiInputDate label="Date" mode={mode} valueType="iso" onValueChange={onValueChange} />,
  );

  valider(natif(screen), saisie);

  expect(onValueChange).toHaveBeenLastCalledWith(attendu);
});

test('une heure seule est portée par une Date posée sur aujourd’hui', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <UiInputDate label="Heure" mode="time" onValueChange={onValueChange} />,
  );

  valider(natif(screen), '09:30');

  const value = onValueChange.mock.lastCall![0] as Date;
  expect([value.getHours(), value.getMinutes()]).toEqual([9, 30]);
  expect(value.getDate()).toBe(new Date().getDate());
});

test('le champ vidé émet null', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee initial={new Date(2026, 8, 14)} onValueChange={onValueChange} />,
  );

  valider(natif(screen), '');

  expect(onValueChange).toHaveBeenLastCalledWith(null);
});

// --- Formes acceptées en entrée --------------------------------------------

test.each([
  ['une chaîne ISO', '2026-09-14'],
  ['une Date', new Date(2026, 8, 14)],
] as [string, InputDateValue][])('%s est acceptée en écriture', async (_nom, valeur) => {
  const screen = await render(<UiInputDate label="Date" defaultValue={valeur} />);
  expect(natif(screen).value).toBe('2026-09-14');
});

test('une borne Date est sérialisée sur l’attribut natif, une chaîne passe telle quelle', async () => {
  const screen = await render(<UiInputDate label="Date" min={new Date(2026, 0, 1)} />);
  expect(natif(screen).getAttribute('min')).toBe('2026-01-01');

  const autre = await render(<UiInputDate label="Date" min="2026-02-01" />);
  expect(natif(autre).getAttribute('min')).toBe('2026-02-01');
});

test('contrôlé : le champ revient sur la valeur du parent qui refuse', async () => {
  const screen = await render(<UiInputDate label="Date" value="2026-09-14" />);

  valider(natif(screen), '2026-10-20');

  // Le parent n'a rien rendu de nouveau : le contrôle natif est remis sur le
  // modèle, au lieu de garder à l'écran une valeur que personne ne porte.
  await expect.poll(() => natif(screen).value).toBe('2026-09-14');
});

// --- Bouton d'ouverture ----------------------------------------------------

test.each([
  ['date', 'fa-calendar'],
  ['datetime', 'fa-calendar'],
  ['time', 'fa-clock'],
] as const)('le bouton porte l’icône du mode %s', async (mode, classe) => {
  const screen = await render(<UiInputDate label="Date" mode={mode} />);
  expect(bouton(screen)!.querySelector('i')?.className).toContain(classe);
});

test('`icon` remplace le glyphe, `showIcon={false}` retire le bouton', async () => {
  const screen = await render(<UiInputDate label="Date" icon="calendar-day" />);
  expect(bouton(screen)!.querySelector('i')?.className).toContain('fa-calendar-day');

  const sans = await render(<UiInputDate label="Date" showIcon={false} />);
  expect(bouton(sans)).toBeNull();
});

test('le bouton est nommé et hors du parcours clavier', async () => {
  const screen = await render(<UiInputDate label="Date" />);

  expect(bouton(screen)!.getAttribute('tabindex')).toBe('-1');
  expect(bouton(screen)!.getAttribute('aria-label')).toBe('Ouvrir le calendrier');
});

test('le bouton ouvre le sélecteur du système, et se tait en lecture seule', async () => {
  const screen = await render(<UiInputDate label="Date" />);
  const showPicker = vi.fn();
  (natif(screen) as HTMLInputElement & { showPicker: () => void }).showPicker = showPicker;

  bouton(screen)!.click();
  expect(showPicker).toHaveBeenCalledTimes(1);

  const lecture = await render(<UiInputDate label="Date" readOnly />);
  const autre = vi.fn();
  (natif(lecture) as HTMLInputElement & { showPicker: () => void }).showPicker = autre;
  bouton(lecture)!.click();
  expect(autre).not.toHaveBeenCalled();
});
