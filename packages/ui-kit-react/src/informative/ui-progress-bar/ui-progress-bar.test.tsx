import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiProgressBar } from './ui-progress-bar';

test('la piste porte le rôle et ses bornes', async () => {
  const screen = await render(<UiProgressBar value={60} aria-label="Téléversement" />);
  const track = screen.container.querySelector('.ui-progress-bar-track')!;

  expect(track).toHaveAttribute('role', 'progressbar');
  expect(track).toHaveAttribute('aria-valuemin', '0');
  expect(track).toHaveAttribute('aria-valuemax', '100');
  expect(track).toHaveAttribute('aria-valuenow', '60');
});

test('une valeur hors bornes est écrêtée, à l’affichage comme dans l’annonce', async () => {
  const screen = await render(<UiProgressBar value={140} aria-label="Téléversement" />);

  expect(screen.container.querySelector('.ui-progress-bar-track')).toHaveAttribute(
    'aria-valuenow',
    '100',
  );
  expect(screen.container.querySelector('.ui-progress-bar-label')!.textContent).toBe('100%');
});

test('une valeur négative est ramenée à zéro', async () => {
  const screen = await render(<UiProgressBar value={-20} aria-label="Téléversement" />);

  expect(screen.container.querySelector('.ui-progress-bar-track')).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
});

// L'absence d'aria-valuenow est ce qui DIT qu'aucune valeur n'est suivie :
// en poser un, même à 0, annoncerait une progression nulle.
test('en indéterminé, aucune valeur n’est annoncée', async () => {
  const screen = await render(<UiProgressBar mode="indeterminate" aria-label="Traitement" />);
  const track = screen.container.querySelector('.ui-progress-bar-track')!;

  expect(track).not.toHaveAttribute('aria-valuenow');
  expect(screen.container.querySelector('.ui-progress-bar-label')).toBeNull();
});

test('les étapes remplacent la piste et s’annoncent en toutes lettres', async () => {
  const screen = await render(<UiProgressBar steps={5} value={60} aria-label="Parcours" />);
  const segments = screen.container.querySelectorAll('.ui-progress-bar-segment');

  expect(segments).toHaveLength(5);
  expect([...segments].filter((s) => s.classList.contains('_active'))).toHaveLength(3);
  expect(screen.container.querySelector('.ui-progress-bar-track')).toHaveAttribute(
    'aria-valuetext',
    '3 / 5',
  );
});

test('en étapes, le libellé numérique disparaît', async () => {
  const screen = await render(<UiProgressBar steps={4} value={50} aria-label="Parcours" />);

  expect(screen.container.querySelector('.ui-progress-bar-label')).toBeNull();
});

test('la largeur du remplissage suit la valeur', async () => {
  const screen = await render(<UiProgressBar value={25} aria-label="Téléversement" />);
  const fill = screen.container.querySelector('.ui-progress-bar-value') as HTMLElement;
  const track = screen.container.querySelector('.ui-progress-bar-track')!;

  expect(fill.style.width).toBe('25%');
  const ratio = fill.getBoundingClientRect().width / track.getBoundingClientRect().width;
  expect(ratio).toBeCloseTo(0.25, 2);
});

// La piste est passée à zéro de large tant que `_bottom` alignait ses enfants
// en `flex-end` : en colonne, cet axe est l'horizontal.
test('valuePosition=bottom laisse la piste occuper toute la largeur', async () => {
  const screen = await render(
    <div style={{ width: 300 }}>
      <UiProgressBar value={50} valuePosition="bottom" aria-label="Téléversement" />
    </div>,
  );
  const track = screen.container.querySelector('.ui-progress-bar-track')!;

  expect(track.getBoundingClientRect().width).toBe(300);
});

test('valuePosition=inside pose le libellé dans le remplissage', async () => {
  const screen = await render(
    <UiProgressBar value={70} valuePosition="inside" aria-label="Téléversement" />,
  );

  expect(screen.container.querySelector('.ui-progress-bar-label')).toBeNull();
  expect(
    screen.container.querySelector('.ui-progress-bar-value .ui-progress-bar-value-label')!
      .textContent,
  ).toBe('70%');
});

test('renderValue remplace le libellé et reçoit la valeur écrêtée', async () => {
  const screen = await render(
    <UiProgressBar
      value={150}
      aria-label="Téléversement"
      renderValue={(v) => <b>{v} sur cent</b>}
    />,
  );

  expect(screen.container.querySelector('.ui-progress-bar-label')!.textContent).toBe(
    '100 sur cent',
  );
});

test('color passe par la variable CSS du composant', async () => {
  const screen = await render(
    <UiProgressBar value={40} color="rgb(1, 2, 3)" aria-label="Téléversement" />,
  );
  const root = screen.container.querySelector('.ui-progress-bar') as HTMLElement;

  expect(root.style.getPropertyValue('--ui-progress-bar-color')).toBe('rgb(1, 2, 3)');
  expect(
    getComputedStyle(screen.container.querySelector('.ui-progress-bar-value')!).backgroundColor,
  ).toBe('rgb(1, 2, 3)');
});
