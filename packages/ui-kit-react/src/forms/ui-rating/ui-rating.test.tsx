import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiRating } from './ui-rating';

type Ecran = { container: HTMLElement };

const curseur = (s: Ecran) => s.container.querySelector('.ui-rating-input') as HTMLInputElement;
const etoiles = (s: Ecran) => [...s.container.querySelectorAll('.ui-rating-icon')] as HTMLElement[];
const remplissages = (s: Ecran) =>
  etoiles(s).map((e) => {
    const fill = e.querySelector('.ui-rating-icon-fill') as HTMLElement | null;
    return fill ? Number(fill.style.getPropertyValue('--_rating-fill')) : 0;
  });

function Demo(props: Partial<React.ComponentProps<typeof UiRating>> = {}) {
  return <UiRating aria-label="Note" {...props} />;
}

function DemoControlee({
  initial = 3,
  ...props
}: Partial<React.ComponentProps<typeof UiRating>> & { initial?: number | null }) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <Demo
      {...props}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        props.onValueChange?.(v);
      }}
    />
  );
}

/** Clique une étoile à une position relative donnée (0 = début, 1 = fin). */
async function cliquerEtoile(el: HTMLElement, ratio = 0.75) {
  const { left, top, width, height } = el.getBoundingClientRect();
  el.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      clientX: left + width * ratio,
      clientY: top + height / 2,
    }),
  );
}

// --- Sémantique ------------------------------------------------------------

test('la valeur et le clavier vivent sur un curseur natif', async () => {
  const screen = await render(<Demo defaultValue={3} stars={5} />);

  const el = curseur(screen);
  expect(el.type).toBe('range');
  expect(el.min).toBe('0');
  expect(el.max).toBe('5');
  expect(el.value).toBe('3');
  expect(el).toHaveAttribute('aria-label', 'Note');
  // Il porte le focus, donc il doit rester atteignable au clavier.
  expect(el.tabIndex).toBe(0);
});

test('le pas du curseur suit allowHalf', async () => {
  const entier = await render(<Demo defaultValue={3} />);
  expect(curseur(entier).step).toBe('1');

  const demi = await render(<Demo defaultValue={3} allowHalf />);
  expect(curseur(demi).step).toBe('0.5');
});

test('le rang d’étoiles rend l’anneau de focus du curseur masqué', async () => {
  const screen = await render(<Demo defaultValue={3} />);

  // Le curseur est en opacity 0 : sans cette règle, le composant serait
  // opérable au clavier sans indicateur visible (WCAG 2.4.7).
  curseur(screen).focus();
  const rang = screen.container.querySelector('.ui-rating-stars') as HTMLElement;
  await expect.poll(() => getComputedStyle(rang).boxShadow).not.toBe('none');
});

// --- Affichage -------------------------------------------------------------

test('le remplissage décrit la note, étoile par étoile', async () => {
  const screen = await render(<Demo defaultValue={3} stars={5} />);

  expect(remplissages(screen)).toEqual([1, 1, 1, 0, 0]);
});

test('une valeur hors pas est ramenée au pas', async () => {
  // 4,3 n'est pas choisissable : rendre 4,3 montrerait un remplissage que
  // personne n'aurait pu produire.
  const entier = await render(<Demo defaultValue={4.3} />);
  expect(remplissages(entier)).toEqual([1, 1, 1, 1, 0]);

  const demi = await render(<Demo defaultValue={4.3} allowHalf />);
  expect(remplissages(demi)).toEqual([1, 1, 1, 1, 0]);
});

test('en demi-notes, la moitié se rend comme un remplissage partiel', async () => {
  const screen = await render(<Demo defaultValue={3.5} allowHalf />);

  expect(remplissages(screen)).toEqual([1, 1, 1, 0.5, 0]);
});

test('une note vide ne remplit aucune étoile', async () => {
  const screen = await render(<Demo defaultValue={null} />);

  expect(remplissages(screen)).toEqual([0, 0, 0, 0, 0]);
  expect(curseur(screen).value).toBe('0');
});

test('stars pilote le nombre d’étoiles rendues', async () => {
  const screen = await render(<Demo defaultValue={7} stars={10} />);

  expect(etoiles(screen)).toHaveLength(10);
  expect(curseur(screen).max).toBe('10');
});

// --- Interaction -----------------------------------------------------------

test('cliquer une étoile pose la note', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee initial={1} onValueChange={onValueChange} />);

  await cliquerEtoile(etoiles(screen)[3]!);

  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe(4);
});

test('en demi-notes, la première moitié d’une étoile vaut x,5', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee initial={1} allowHalf onValueChange={onValueChange} />,
  );

  await cliquerEtoile(etoiles(screen)[3]!, 0.25);
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe(3.5);

  await cliquerEtoile(etoiles(screen)[3]!, 0.75);
  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe(4);
});

test('recliquer la valeur courante la retire, et null remonte', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee initial={4} onValueChange={onValueChange} />);

  await cliquerEtoile(etoiles(screen)[3]!);

  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe(null);
});

test('cancel à faux garde la note en place', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <DemoControlee initial={4} cancel={false} onValueChange={onValueChange} />,
  );

  await cliquerEtoile(etoiles(screen)[3]!);
  await new Promise((r) => setTimeout(r, 60));

  expect(onValueChange).not.toHaveBeenCalled();
});

test('le survol prévisualise sans rien enregistrer', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee initial={1} onValueChange={onValueChange} />);
  const cible = etoiles(screen)[3]!;
  const { left, top, width, height } = cible.getBoundingClientRect();

  cible.dispatchEvent(
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: left + width / 2,
      clientY: top + height / 2,
    }),
  );

  await expect.poll(() => remplissages(screen)).toEqual([1, 1, 1, 1, 0]);
  expect(onValueChange).not.toHaveBeenCalled();
});

test('quitter le composant efface l’aperçu de survol', async () => {
  const screen = await render(<DemoControlee initial={1} />);
  const cible = etoiles(screen)[3]!;
  const r = cible.getBoundingClientRect();

  cible.dispatchEvent(
    new MouseEvent('mousemove', { bubbles: true, clientX: r.left + 5, clientY: r.top + 5 }),
  );
  await expect.poll(() => remplissages(screen)[3]).toBeGreaterThan(0);

  // React DERIVE `onMouseLeave` de `mouseout` : un `mouseleave` fabrique
  // n'atteint jamais son gestionnaire. Il faut sortir vers une cible hors du
  // composant, ce que React traduit alors en « leave ».
  screen.container
    .querySelector('.ui-rating')!
    .dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));

  await expect.poll(() => remplissages(screen)).toEqual([1, 0, 0, 0, 0]);
});

test('le clavier passe par le curseur natif', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee initial={3} onValueChange={onValueChange} />);
  const el = curseur(screen);

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(el, '4');
  el.dispatchEvent(new Event('input', { bubbles: true }));

  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe(4);
});

test('ramener le curseur à zéro vaut « pas de note »', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee initial={3} onValueChange={onValueChange} />);
  const el = curseur(screen);

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(el, '0');
  el.dispatchEvent(new Event('input', { bubbles: true }));

  await expect.poll(() => onValueChange.mock.calls.at(-1)?.[0]).toBe(null);
});

// --- États -----------------------------------------------------------------

test('désactivé, ni le clic ni le survol ne font quoi que ce soit', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee initial={2} disabled onValueChange={onValueChange} />);

  expect(curseur(screen).disabled).toBe(true);
  await cliquerEtoile(etoiles(screen)[4]!);
  await new Promise((r) => setTimeout(r, 60));

  expect(onValueChange).not.toHaveBeenCalled();
  expect(remplissages(screen)).toEqual([1, 1, 0, 0, 0]);
});

test('en lecture seule, la note s’affiche mais ne change pas', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<DemoControlee initial={4} readOnly onValueChange={onValueChange} />);

  await cliquerEtoile(etoiles(screen)[1]!);
  await new Promise((r) => setTimeout(r, 60));

  expect(onValueChange).not.toHaveBeenCalled();
  expect(remplissages(screen)).toEqual([1, 1, 1, 1, 0]);
});

test('invalide, la note le signale à l’assistance', async () => {
  const screen = await render(<Demo defaultValue={2} invalid />);

  expect(curseur(screen)).toHaveAttribute('aria-invalid', 'true');
});

// --- Composition -----------------------------------------------------------

test('un rendu personnalisé garde le découpage de la demi-note', async () => {
  const screen = await render(
    <Demo
      defaultValue={2.5}
      allowHalf
      renderOnIcon={() => <span data-plein>coeur</span>}
      renderOffIcon={() => <span data-vide>coeur</span>}
    />,
  );

  expect(screen.container.querySelectorAll('[data-vide]')).toHaveLength(5);
  expect(remplissages(screen)).toEqual([1, 1, 0.5, 0, 0]);
});
