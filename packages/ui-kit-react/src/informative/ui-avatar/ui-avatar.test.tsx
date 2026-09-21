import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiAvatar } from './ui-avatar';

const PORTRAIT =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'><rect width='8' height='8' fill='%23789'/></svg>";

test('une image gagne sur le libellé et sur l’icône', async () => {
  const screen = await render(<UiAvatar image={PORTRAIT} alt="Portrait" label="RL" />);

  expect(screen.container.querySelector('.ui-avatar')).toHaveClass('_image');
  expect(screen.container.querySelector('.ui-avatar-label')).toBeNull();
});

// L'image porte déjà son propre role="img" : le doubler sur le parent ferait
// annoncer l'avatar deux fois.
test('en mode image, le parent ne double pas le rôle', async () => {
  const screen = await render(<UiAvatar image={PORTRAIT} alt="Portrait de Camille" />);
  const root = screen.container.querySelector('.ui-avatar')!;

  expect(root).not.toHaveAttribute('role');
  expect(root).not.toHaveAttribute('aria-label');
  await expect
    .element(screen.getByRole('img', { name: 'Portrait de Camille' }))
    .toBeInTheDocument();
});

test('un libellé sert de nom accessible, ses lettres restant masquées', async () => {
  const screen = await render(<UiAvatar label="RL" />);

  expect(screen.container.querySelector('.ui-avatar-label')).toHaveAttribute('aria-hidden', 'true');
  await expect.element(screen.getByRole('img', { name: 'RL' })).toBeInTheDocument();
});

test('une icône sans nom rend un avatar purement décoratif', async () => {
  const screen = await render(<UiAvatar />);
  const root = screen.container.querySelector('.ui-avatar')!;

  expect(root).toHaveClass('_icon');
  expect(root).toHaveAttribute('aria-hidden', 'true');
  expect(root).not.toHaveAttribute('role');
});

test('une icône nommée cesse d’être décorative', async () => {
  const screen = await render(<UiAvatar aria-label="Utilisateur anonyme" />);
  const root = screen.container.querySelector('.ui-avatar')!;

  expect(root).not.toHaveAttribute('aria-hidden');
  await expect
    .element(screen.getByRole('img', { name: 'Utilisateur anonyme' }))
    .toBeInTheDocument();
});

test('une image en échec fait retomber sur le libellé et prévient l’appelant', async () => {
  const onImageError = vi.fn();
  const screen = await render(
    <UiAvatar image="/absente.png" alt="Portrait" label="RL" onImageError={onImageError} />,
  );

  await expect.element(screen.getByText('RL')).toBeInTheDocument();
  expect(screen.container.querySelector('.ui-avatar')).toHaveClass('_label');
  expect(onImageError).toHaveBeenCalledTimes(1);
});

test('le badge se pose en haut à droite du cadre', async () => {
  const screen = await render(<UiAvatar label="RL" badge={<span>•</span>} />);
  const badge = screen.container.querySelector('.ui-avatar-badge')!;

  expect(badge).toBeInTheDocument();
  expect(getComputedStyle(badge).position).toBe('absolute');
});

test('sans badge, aucun conteneur vide n’est rendu', async () => {
  const screen = await render(<UiAvatar label="RL" />);

  expect(screen.container.querySelector('.ui-avatar-badge')).toBeNull();
});

test('la taille de l’icône suit celle de l’avatar', async () => {
  const screen = await render(<UiAvatar size="large" aria-label="Anonyme" />);

  expect(screen.container.querySelector('.ui-avatar-icon')).toHaveClass('_lg');
});
