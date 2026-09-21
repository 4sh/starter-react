import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiSpinner } from './ui-spinner';

test('rend une région vivante occupée, nommée par défaut', async () => {
  const screen = await render(<UiSpinner />);

  const root = screen.container.querySelector('.ui-spinner')!;
  expect(root).toHaveAttribute('role', 'status');
  expect(root).toHaveAttribute('aria-live', 'polite');
  expect(root).toHaveAttribute('aria-busy', 'true');
  expect(root).toHaveAttribute('aria-label', 'Chargement');
});

// Un aria-label REMPLACE le texte visible au lieu de s'y ajouter : avec un
// libellé, ne rien poser est la bonne réponse.
test('un libellé visible remplace le nom par défaut, sans aria-label', async () => {
  const screen = await render(<UiSpinner label="Chargement des données" />);
  const root = screen.container.querySelector('.ui-spinner')!;

  expect(root).not.toHaveAttribute('aria-label');
  expect(root.textContent).toBe('Chargement des données');
});

test('aria-label explicite gagne sur le libellé visible', async () => {
  const screen = await render(<UiSpinner label="15 %" aria-label="Téléversement en cours" />);

  await expect
    .element(screen.getByRole('status', { name: 'Téléversement en cours' }))
    .toBeInTheDocument();
});

test('le marqueur par défaut est un cercle décoratif', async () => {
  const screen = await render(<UiSpinner />);

  expect(screen.container.querySelector('.ui-spinner-mark')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.container.querySelector('.ui-spinner-circle')).toBeInTheDocument();
});

test('une icône remplace le cercle et reçoit la rotation', async () => {
  const screen = await render(<UiSpinner icon="circle-notch" />);

  expect(screen.container.querySelector('.ui-spinner-svg')).toBeNull();
  expect(screen.container.querySelector('.ui-spinner-spin .ui-icon')).toBeInTheDocument();
});

test('renderMark gagne sur icon et image', async () => {
  const screen = await render(
    <UiSpinner icon="circle-notch" image="/x.gif" renderMark={() => <b>sur mesure</b>} />,
  );

  expect(screen.container.querySelector('.ui-spinner-mark')!.textContent).toBe('sur mesure');
  expect(screen.container.querySelector('img')).toBeNull();
});

test('la durée passe par la variable CSS, pas par une valeur figée', async () => {
  const screen = await render(<UiSpinner animationDuration="3s" />);
  const root = screen.container.querySelector('.ui-spinner') as HTMLElement;

  expect(root.style.getPropertyValue('--ui-spinner-duration')).toBe('3s');
});

test('sous le délai de grâce, rien n’est rendu', async () => {
  vi.useFakeTimers();
  try {
    const screen = await render(<UiSpinner delay={500} />);
    expect(screen.container.querySelector('.ui-spinner')).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});

test('le spinner apparaît une fois le délai écoulé', async () => {
  const screen = await render(<UiSpinner delay={80} />);

  await expect.element(screen.getByRole('status')).toBeInTheDocument();
});
