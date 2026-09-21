import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiTag } from './ui-tag';

test('affiche le libellé et compose ses classes de niveau', async () => {
  const screen = await render(<UiTag label="Publié" level="success" subLevel="low" />);
  const tag = screen.container.querySelector('.ui-tag')!;

  expect(tag).toHaveClass('_success', '_low');
  expect(tag.textContent).toBe('Publié');
});

test('la forme pilule est la présentation par défaut', async () => {
  const screen = await render(<UiTag label="Brouillon" />);

  expect(screen.container.querySelector('.ui-tag')).not.toHaveClass('_square');
});

test('rounded={false} donne un rectangle arrondi', async () => {
  const screen = await render(<UiTag label="Brouillon" rounded={false} />);

  expect(screen.container.querySelector('.ui-tag')).toHaveClass('_square');
});

test('les deux icônes encadrent le libellé', async () => {
  const screen = await render(<UiTag label="Filtre" iconLeft="filter" iconRight="xmark" />);
  const children = [...screen.container.querySelector('.ui-tag')!.children];

  // `cx` place la classe du composant en premier et celle passée par le parent
  // en dernier : c'est la classe attendue qu'on cherche, pas la première venue.
  const roles = children.map((child) =>
    child.classList.contains('ui-tag-icon') ? 'icon' : 'label',
  );
  expect(roles).toEqual(['icon', 'label', 'icon']);
});

test('sans nom accessible, l’étiquette reste décorative', async () => {
  const screen = await render(<UiTag label="Brouillon" />);

  expect(screen.container.querySelector('.ui-tag')).not.toHaveAttribute('role');
});

test('sans libellé, aria-label porte le sens', async () => {
  const screen = await render(<UiTag iconLeft="lock" aria-label="Verrouillé" />);

  await expect.element(screen.getByRole('img', { name: 'Verrouillé' })).toBeInTheDocument();
});

test('la taille small réduit aussi l’icône', async () => {
  const screen = await render(<UiTag label="Petit" size="small" iconLeft="tag" />);

  expect(screen.container.querySelector('.ui-tag')).toHaveClass('_small');
  expect(screen.container.querySelector('.ui-tag-icon')).toHaveClass('_sm');
});
