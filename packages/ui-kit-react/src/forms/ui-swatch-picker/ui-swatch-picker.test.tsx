import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiButton } from '../../actions/ui-button';

import {
  DEFAULT_SWATCH_PALETTE,
  UiSwatchPicker,
  type UiSwatch,
  type UiSwatchGroup,
} from './ui-swatch-picker';

const PALETTE: UiSwatchGroup[] = [
  {
    label: 'Marque',
    swatches: [
      { key: 'rouge', cssVar: '--primitives-red-500', label: 'Rouge' },
      { key: 'vert', cssVar: '--primitives-green-500', label: 'Vert' },
      { key: 'bleu', cssVar: '--primitives-primary-500', label: 'Bleu' },
    ],
  },
];

const swatches = (root: ParentNode) => [
  ...root.querySelectorAll<HTMLButtonElement>('.ui-swatch-picker-swatch'),
];
const panel = (root: ParentNode) => root.querySelector<HTMLElement>('.ui-swatch-picker')!;

const touche = (el: HTMLElement, key: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

// --- Grille ----------------------------------------------------------------
test('la grille est une listbox nommée, chaque pastille une option', async () => {
  const screen = await render(
    <UiSwatchPicker palette={PALETTE} allowClear={false} aria-label="Couleur" />,
  );
  const liste = screen.container.querySelector('[role="listbox"]')!;

  expect(liste).toHaveAttribute('aria-label', 'Couleur');
  expect(swatches(screen.container)).toHaveLength(3);
  for (const pastille of swatches(screen.container)) {
    expect(pastille).toHaveAttribute('role', 'option');
    expect(pastille).toHaveAttribute('type', 'button');
  }
});

// Le nom ne doit jamais être la seule couleur : voyants et non voyants doivent
// lire la même chose.
test('chaque pastille porte son nom, jamais sa seule couleur', async () => {
  const screen = await render(<UiSwatchPicker palette={PALETTE} allowClear={false} />);

  expect(swatches(screen.container).map((s) => s.getAttribute('aria-label'))).toEqual([
    'Rouge',
    'Vert',
    'Bleu',
  ]);
  expect(swatches(screen.container)[0]).toHaveAttribute('title', 'Rouge');
});

// La pastille pointe une VARIABLE, jamais une valeur en dur : c'est ce qui fait
// suivre la grille quand la marque change.
test('la pastille est peinte par la variable de la palette', async () => {
  const screen = await render(<UiSwatchPicker palette={PALETTE} allowClear={false} />);
  const rouge = swatches(screen.container)[0]!;

  expect(rouge.style.getPropertyValue('--ui-swatch-picker-swatch-color')).toBe(
    'var(--primitives-red-500)',
  );
  // Et la variable RÉSOUT : une pastille qui pointe un jeton absent serait
  // transparente sans que rien ne le dise.
  expect(getComputedStyle(rouge).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
});

test('la palette par défaut couvre les teintes et les nuances', async () => {
  const screen = await render(<UiSwatchPicker allowClear={false} />);

  // 7 teintes × 5 nuances, plus le noir et le blanc.
  expect(swatches(screen.container)).toHaveLength(37);
  expect(
    DEFAULT_SWATCH_PALETTE[0]!.swatches.every((s) => s.cssVar.startsWith('--primitives-')),
  ).toBe(true);
});

// --- Sélection -------------------------------------------------------------
test('cliquer une pastille la sélectionne, et rapporte les deux formes', async () => {
  const onValueChange = vi.fn();
  const onSwatchSelect = vi.fn();
  const screen = await render(
    <UiSwatchPicker
      palette={PALETTE}
      allowClear={false}
      onValueChange={onValueChange}
      onSwatchSelect={onSwatchSelect}
    />,
  );

  await screen.getByRole('option', { name: 'Vert' }).click();

  await expect
    .poll(() => swatches(screen.container)[1]!.getAttribute('aria-selected'))
    .toBe('true');
  expect(swatches(screen.container)[1]).toHaveClass('_selected');
  expect(onValueChange).toHaveBeenLastCalledWith('vert');
  expect(onSwatchSelect).toHaveBeenLastCalledWith(
    expect.objectContaining({ key: 'vert', label: 'Vert' }),
  );
});

test('une seule pastille est sélectionnée à la fois', async () => {
  const screen = await render(
    <UiSwatchPicker palette={PALETTE} allowClear={false} defaultValue="rouge" />,
  );

  await screen.getByRole('option', { name: 'Bleu' }).click();

  await expect
    .poll(() => screen.container.querySelectorAll('[aria-selected="true"]'))
    .toHaveLength(1);
  expect(swatches(screen.container)[2]).toHaveClass('_selected');
});

test('la pastille « aucune couleur » vaut null', async () => {
  const onValueChange = vi.fn();
  const onSwatchSelect = vi.fn();
  const screen = await render(
    <UiSwatchPicker
      palette={PALETTE}
      allowClear
      defaultValue="rouge"
      onValueChange={onValueChange}
      onSwatchSelect={onSwatchSelect}
    />,
  );

  const vide = swatches(screen.container)[0]!;
  expect(vide).toHaveClass('_clear');
  expect(vide).toHaveAttribute('aria-label', 'Aucune couleur');

  await screen.getByRole('option', { name: 'Aucune couleur' }).click();

  await expect.poll(() => onValueChange.mock.calls.length).toBe(1);
  expect(onValueChange).toHaveBeenLastCalledWith(null);
  expect(onSwatchSelect).toHaveBeenLastCalledWith(null);
});

test('allowClear=false retire la pastille vide', async () => {
  const screen = await render(<UiSwatchPicker palette={PALETTE} allowClear={false} />);

  expect(screen.container.querySelector('._clear')).toBeNull();
});

test('le nom de la pastille vide se surcharge', async () => {
  const screen = await render(
    <UiSwatchPicker palette={PALETTE} allowClear clearLabel="Transparent" />,
  );

  expect(swatches(screen.container)[0]).toHaveAttribute('aria-label', 'Transparent');
});

test('en mode contrôlé, la valeur de l’appelant gagne', async () => {
  function Controlled() {
    const [value, setValue] = useState<string | null>('rouge');
    return (
      <>
        <button type="button" onClick={() => setValue('bleu')}>
          Imposer
        </button>
        <UiSwatchPicker palette={PALETTE} allowClear={false} value={value} />
      </>
    );
  }
  const screen = await render(<Controlled />);

  await screen.getByRole('option', { name: 'Vert' }).click();
  await expect
    .poll(() => swatches(screen.container)[0]!.getAttribute('aria-selected'))
    .toBe('true');

  await screen.getByRole('button', { name: 'Imposer' }).click();
  await expect
    .poll(() => swatches(screen.container)[2]!.getAttribute('aria-selected'))
    .toBe('true');
});

// --- Clavier ---------------------------------------------------------------
// Un seul arrêt de tabulation pour tout le lot : `Tab` traverse la grille, les
// flèches circulent dedans.
test('un seul arrêt de tabulation, posé sur la sélection', async () => {
  const screen = await render(
    <UiSwatchPicker palette={PALETTE} allowClear={false} defaultValue="vert" />,
  );

  expect(swatches(screen.container).map((s) => s.tabIndex)).toEqual([-1, 0, -1]);
});

test('sans sélection, l’arrêt de tabulation est sur la première pastille', async () => {
  const screen = await render(<UiSwatchPicker palette={PALETTE} allowClear={false} />);

  expect(swatches(screen.container).map((s) => s.tabIndex)).toEqual([0, -1, -1]);
});

test('les flèches horizontales avancent d’une pastille, sans boucler', async () => {
  const screen = await render(<UiSwatchPicker palette={PALETTE} allowClear={false} />);
  const all = swatches(screen.container);

  all[0]!.focus();
  touche(all[0]!, 'ArrowRight');
  await expect.poll(() => document.activeElement).toBe(all[1]);

  touche(all[1]!, 'ArrowLeft');
  await expect.poll(() => document.activeElement).toBe(all[0]);

  // Au bord, on reste : une grille n'est pas un carrousel.
  touche(all[0]!, 'ArrowLeft');
  await expect.poll(() => document.activeElement).toBe(all[0]);
});

// La grille fait 7 colonnes : c'est ce qui distingue ce clavier de celui d'une
// liste, et c'est la seule chose que les flèches verticales vérifient.
test('les flèches verticales sautent d’une ligne, soit sept pastilles', async () => {
  const screen = await render(<UiSwatchPicker allowClear={false} />);
  const all = swatches(screen.container);

  all[0]!.focus();
  touche(all[0]!, 'ArrowDown');
  await expect.poll(() => document.activeElement).toBe(all[7]);

  touche(all[7]!, 'ArrowUp');
  await expect.poll(() => document.activeElement).toBe(all[0]);
});

test('Début et Fin vont à la première et à la dernière pastille', async () => {
  const screen = await render(<UiSwatchPicker palette={PALETTE} allowClear={false} />);
  const all = swatches(screen.container);

  all[1]!.focus();
  touche(all[1]!, 'End');
  await expect.poll(() => document.activeElement).toBe(all[2]);

  touche(all[2]!, 'Home');
  await expect.poll(() => document.activeElement).toBe(all[0]);
});

test('l’arrêt de tabulation suit le focus', async () => {
  const screen = await render(<UiSwatchPicker palette={PALETTE} allowClear={false} />);
  const all = swatches(screen.container);

  all[2]!.focus();

  await expect.poll(() => swatches(screen.container).map((s) => s.tabIndex)).toEqual([-1, -1, 0]);
});

// --- Popup -----------------------------------------------------------------
function PopupHost(props: { onSelect?: (s: UiSwatch | null) => void; defaultOpen?: boolean }) {
  return (
    <UiSwatchPicker
      popup
      palette={PALETTE}
      allowClear={false}
      aria-label="Couleur"
      defaultOpen={props.defaultOpen}
      onSwatchSelect={props.onSelect}
      trigger={(triggerProps) => <UiButton {...triggerProps} label="Couleur" />}
    />
  );
}

test('fermé, le panneau n’occupe aucune place', async () => {
  const screen = await render(<PopupHost />);
  const el = panel(screen.container);

  expect(el).toHaveAttribute('popover', 'manual');
  expect(el.matches(':popover-open')).toBe(false);
  expect(getComputedStyle(el).display).toBe('none');
});

test('le déclencheur annonce le popup, et l’ouvre', async () => {
  const screen = await render(<PopupHost />);
  const bouton = screen.container.querySelector('button')!;

  expect(bouton).toHaveAttribute('aria-haspopup', 'listbox');
  expect(bouton).toHaveAttribute('aria-expanded', 'false');

  await screen.getByRole('button', { name: 'Couleur' }).click();

  await expect.poll(() => panel(document.body).matches(':popover-open')).toBe(true);
  expect(screen.container.querySelector('button')).toHaveAttribute('aria-expanded', 'true');
  expect(screen.container.querySelector('button')!.getAttribute('aria-controls')).toBe(
    panel(document.body).id,
  );
});

// Le panneau vit dans le calque supérieur : aucun ancêtre en `overflow: hidden`
// ne le rogne, et aucun z-index n'a à être arbitré.
test('le panneau ouvert échappe au rognage d’un ancêtre', async () => {
  await render(
    <div style={{ width: 80, height: 40, overflow: 'hidden' }}>
      <PopupHost defaultOpen />
    </div>,
  );

  await expect.poll(() => panel(document.body).matches(':popover-open')).toBe(true);
  await expect.poll(() => panel(document.body).getBoundingClientRect().width).toBeGreaterThan(80);
});

test('à l’ouverture, le focus part sur l’arrêt de tabulation', async () => {
  const screen = await render(<PopupHost />);

  await screen.getByRole('button', { name: 'Couleur' }).click();

  await expect
    .poll(() => (document.activeElement as HTMLElement | null)?.dataset.key)
    .toBe('rouge');
});

// Choisir ferme et REND le focus : un `popover="manual"` ne le fait pas seul,
// contrairement à un `auto`.
test('choisir une pastille referme et rend le focus au déclencheur', async () => {
  const onSelect = vi.fn();
  const screen = await render(<PopupHost onSelect={onSelect} />);

  await screen.getByRole('button', { name: 'Couleur' }).click();
  await expect.poll(() => panel(document.body).matches(':popover-open')).toBe(true);

  await screen.getByRole('option', { name: 'Vert' }).click();

  await expect.poll(() => panel(document.body).matches(':popover-open')).toBe(false);
  expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ key: 'vert' }));
  await expect.poll(() => document.activeElement).toBe(screen.container.querySelector('button'));
});

test('Échap referme et rend le focus', async () => {
  const screen = await render(<PopupHost defaultOpen />);

  await expect.poll(() => panel(document.body).matches(':popover-open')).toBe(true);
  touche(document.activeElement as HTMLElement, 'Escape');

  await expect.poll(() => panel(document.body).matches(':popover-open')).toBe(false);
  await expect.poll(() => document.activeElement).toBe(screen.container.querySelector('button'));
});

test('un clic à côté referme', async () => {
  const screen = await render(
    <>
      <PopupHost defaultOpen />
      <button type="button">Ailleurs</button>
    </>,
  );

  await expect.poll(() => panel(document.body).matches(':popover-open')).toBe(true);

  await screen.getByRole('button', { name: 'Ailleurs' }).click();

  await expect.poll(() => panel(document.body).matches(':popover-open')).toBe(false);
});

test('hors popup, le panneau est posé dans la page', async () => {
  const screen = await render(<UiSwatchPicker palette={PALETTE} allowClear={false} />);
  const el = panel(screen.container);

  expect(el.hasAttribute('popover')).toBe(false);
  expect(getComputedStyle(el).position).not.toBe('fixed');
});

test('la densité small pose son modifieur', async () => {
  const petit = await render(<UiSwatchPicker palette={PALETTE} size="small" />);
  const normal = await render(<UiSwatchPicker palette={PALETTE} size="default" />);

  expect(panel(petit.container)).toHaveClass('_small');
  expect(panel(normal.container)).not.toHaveClass('_small');
  expect(swatches(petit.container)[0]!.getBoundingClientRect().width).toBeLessThan(
    swatches(normal.container)[0]!.getBoundingClientRect().width,
  );
});
