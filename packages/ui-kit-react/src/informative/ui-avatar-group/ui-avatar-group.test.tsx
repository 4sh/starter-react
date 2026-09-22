import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiAvatar } from '../ui-avatar';

import { UiAvatarGroup } from './ui-avatar-group';

test('le groupe est une région nommée qui porte ses avatars', async () => {
  const screen = await render(
    <UiAvatarGroup aria-label="Membres">
      <UiAvatar label="AL" aria-label="Alice" />
      <UiAvatar label="BO" aria-label="Bob" />
    </UiAvatarGroup>,
  );

  await expect.element(screen.getByRole('group', { name: 'Membres' })).toBeInTheDocument();
  expect(screen.container.querySelectorAll('.ui-avatar')).toHaveLength(2);
});

// Le chevauchement est une marge NÉGATIVE portée par les suivants : le premier
// doit rester à zéro, sinon le groupe entier se décale vers la gauche.
test('seuls les avatars suivants remontent sur le précédent', async () => {
  const screen = await render(
    <UiAvatarGroup aria-label="Membres">
      <UiAvatar label="AL" aria-label="Alice" />
      <UiAvatar label="BO" aria-label="Bob" />
    </UiAvatarGroup>,
  );
  const [first, second] = [...screen.container.querySelectorAll('.ui-avatar')];

  expect(getComputedStyle(first!).marginLeft).toBe('0px');
  expect(parseFloat(getComputedStyle(second!).marginLeft)).toBeLessThan(0);
});

test('le hook de chevauchement se règle par groupe', async () => {
  const screen = await render(
    <UiAvatarGroup aria-label="Membres" style={{ '--ui-avatar-group-overlap': '4px' } as never}>
      <UiAvatar label="AL" aria-label="Alice" />
      <UiAvatar label="BO" aria-label="Bob" />
    </UiAvatarGroup>,
  );
  const second = [...screen.container.querySelectorAll('.ui-avatar')][1]!;

  expect(getComputedStyle(second).marginLeft).toBe('-4px');
});

test('className et rest atterrissent sur la racine', async () => {
  const screen = await render(
    <UiAvatarGroup aria-label="Membres" className="maison" data-test="x">
      <UiAvatar label="AL" aria-label="Alice" />
    </UiAvatarGroup>,
  );
  const group = screen.container.querySelector('.ui-avatar-group')!;

  expect(group).toHaveClass('maison');
  expect(group).toHaveAttribute('data-test', 'x');
});
