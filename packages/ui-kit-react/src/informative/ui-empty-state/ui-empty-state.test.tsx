import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiEmptyState } from './ui-empty-state';

test('titre et description sont rendus', async () => {
  const screen = await render(<UiEmptyState title="Aucun résultat" description="Élargissez." />);

  expect(screen.container.querySelector('.ui-empty-state-title')!.textContent).toBe(
    'Aucun résultat',
  );
  expect(screen.container.querySelector('.ui-empty-state-description')!.textContent).toBe(
    'Élargissez.',
  );
});

test('icon rend le visuel par défaut', async () => {
  const screen = await render(<UiEmptyState title="Vide" icon="magnifying-glass" />);

  expect(screen.container.querySelector('.ui-empty-state-media .ui-icon')).toBeInTheDocument();
});

test('media remplace le raccourci icon', async () => {
  const screen = await render(
    <UiEmptyState title="Vide" icon="magnifying-glass" media={<img alt="" src="/x.svg" />} />,
  );
  const media = screen.container.querySelector('.ui-empty-state-media')!;

  expect(media.querySelector('img')).toBeInTheDocument();
  expect(media.querySelector('.ui-icon')).toBeNull();
});

// `showMedia` existe pour couper le visuel SANS avoir à retirer `icon` du code
// appelant : c'est ce qui la distingue d'un simple `icon={undefined}`.
test('showMedia=false retire le visuel sans toucher aux props', async () => {
  const screen = await render(
    <UiEmptyState title="Vide" icon="magnifying-glass" showMedia={false} />,
  );

  expect(screen.container.querySelector('.ui-empty-state-media')).toBeNull();
});

test('les zones vides ne sont pas rendues', async () => {
  const screen = await render(<UiEmptyState title="Vide" />);

  expect(screen.container.querySelector('.ui-empty-state-description')).toBeNull();
  expect(screen.container.querySelector('.ui-empty-state-body')).toBeNull();
  expect(screen.container.querySelector('.ui-empty-state-actions')).toBeNull();
});

test('sans texte du tout, la zone de texte est marquée vide', async () => {
  const screen = await render(<UiEmptyState icon="inbox" />);

  expect(screen.container.querySelector('.ui-empty-state-text')).toHaveClass('_empty');
});

test('les actions se rendent sous le texte', async () => {
  const screen = await render(
    <UiEmptyState title="Vide" actions={<button type="button">Réinitialiser</button>} />,
  );
  const root = screen.container.querySelector('.ui-empty-state')!;

  expect(root.lastElementChild).toHaveClass('ui-empty-state-actions');
  await expect.element(screen.getByRole('button', { name: 'Réinitialiser' })).toBeInTheDocument();
});

test('sans nom, le composant n’est pas un point de repère', async () => {
  const screen = await render(<UiEmptyState title="Vide" />);

  expect(screen.container.querySelector('.ui-empty-state')).not.toHaveAttribute('role');
});

test('nommé, il devient une région', async () => {
  const screen = await render(<UiEmptyState title="Vide" aria-label="Résultats de recherche" />);

  await expect
    .element(screen.getByRole('region', { name: 'Résultats de recherche' }))
    .toBeInTheDocument();
});
