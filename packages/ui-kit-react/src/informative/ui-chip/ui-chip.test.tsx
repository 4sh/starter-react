import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiChip } from './ui-chip';

const PORTRAIT =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'><rect width='8' height='8' fill='%23789'/></svg>";

test('affiche le libellé et compose ses classes', async () => {
  const screen = await render(<UiChip label="Bordeaux" level="success" size="small" />);
  const chip = screen.container.querySelector('.ui-chip')!;

  expect(chip).toHaveClass('_success', '_low', '_small');
  expect(chip.textContent).toBe('Bordeaux');
});

test('sélectionnable, la racine devient un bouton à état', async () => {
  const screen = await render(<UiChip label="Disponible" selectable />);

  await expect
    .element(screen.getByRole('button', { name: 'Disponible' }))
    .toHaveAttribute('aria-pressed', 'false');
});

test('non contrôlée, la puce bascule d’elle-même et prévient', async () => {
  const onSelectedChange = vi.fn();
  const screen = await render(
    <UiChip label="Disponible" selectable onSelectedChange={onSelectedChange} />,
  );

  await screen.getByRole('button').click();

  await expect.element(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  expect(onSelectedChange).toHaveBeenCalledWith(true);
});

// En mode contrôlé, l'état interne n'est jamais lu : la puce reste sur ce que
// dit son parent, même après un clic.
test('contrôlée, la puce ne bascule pas toute seule', async () => {
  const onSelectedChange = vi.fn();
  const screen = await render(
    <UiChip label="Disponible" selectable selected={false} onSelectedChange={onSelectedChange} />,
  );

  await screen.getByRole('button').click();

  await expect.element(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  expect(onSelectedChange).toHaveBeenCalledWith(true);
});

test('sélectionnée, l’icône de sélection prend la tête', async () => {
  const screen = await render(<UiChip label="Lyon" selectable selected icon="location-dot" />);

  expect(screen.container.querySelector('.ui-chip-icon')!.className).toContain('fa-check');
});

test('le retrait est un vrai bouton, atteignable au clavier', async () => {
  const onRemove = vi.fn();
  const screen = await render(<UiChip label="jetons" removable onRemove={onRemove} />);

  await screen.getByRole('button', { name: 'Supprimer' }).click();
  expect(onRemove).toHaveBeenCalledTimes(1);
});

test('Retour arrière retire aussi', async () => {
  const onRemove = vi.fn();
  const screen = await render(<UiChip label="jetons" removable onRemove={onRemove} />);
  const button = screen.container.querySelector('.ui-chip-remove') as HTMLButtonElement;

  button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
  expect(onRemove).toHaveBeenCalledTimes(1);
});

test('désactivée, la puce ne se retire pas', async () => {
  const onRemove = vi.fn();
  const screen = await render(<UiChip label="jetons" removable disabled onRemove={onRemove} />);
  const button = screen.container.querySelector('.ui-chip-remove') as HTMLButtonElement;

  expect(button.disabled).toBe(true);
  button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
  expect(onRemove).not.toHaveBeenCalled();
});

// Un élément interactif ne peut pas en contenir un autre : demander les deux
// laisse tomber le retrait, jamais la sélection.
test('sélectionnable et retirable : le retrait est ignoré', async () => {
  const screen = await render(<UiChip label="Lyon" selectable removable />);

  expect(screen.container.querySelector('.ui-chip-remove')).toBeNull();
  expect(screen.container.querySelector('button.ui-chip')).toBeInTheDocument();
});

test('avec bouton de retrait, la puce nommée est un groupe', async () => {
  const screen = await render(<UiChip label="jetons" removable />);

  await expect.element(screen.getByRole('group', { name: 'jetons' })).toBeInTheDocument();
});

test('visuel nommé sans bouton : rôle image', async () => {
  const screen = await render(<UiChip icon="location-dot" aria-label="Bordeaux" />);

  await expect.element(screen.getByRole('img', { name: 'Bordeaux' })).toBeInTheDocument();
});

test('une image en échec fait retomber sur l’icône', async () => {
  const onImageError = vi.fn();
  const screen = await render(
    <UiChip label="Camille" image="/absente.png" icon="user" onImageError={onImageError} />,
  );

  // Le libellé est rendu dès le départ : l'attendre ne prouverait rien. Ce qui
  // marque la bascule, c'est la DISPARITION de l'image, et il faut une
  // assertion qui réessaie pour la voir.
  await expect.poll(() => screen.container.querySelector('.ui-chip-image')).toBeNull();

  expect(onImageError).toHaveBeenCalledTimes(1);
  expect(screen.container.querySelector('.ui-chip-icon')).toBeInTheDocument();
});

test('une image valide reste affichée', async () => {
  const screen = await render(<UiChip label="Camille" image={PORTRAIT} icon="user" />);

  expect(screen.container.querySelector('.ui-chip-image')).toBeInTheDocument();
  expect(screen.container.querySelector('.ui-chip-icon')).toBeNull();
});

// Côté Angular, l'hôte et le span interne sont deux éléments ; ici c'est le
// même. Sans priorité à l'appelant, une puce servant d'option verrait son rôle
// remplacé, et la liste qui la contient perdrait ses options.
test('un rôle fourni par l’appelant gagne sur celui du composant', async () => {
  const screen = await render(
    <UiChip label="jetons" removable role="option" aria-selected aria-label="jetons" />,
  );

  await expect.element(screen.getByRole('option', { name: 'jetons' })).toBeInTheDocument();
  expect(screen.container.querySelector('.ui-chip')).toHaveAttribute('role', 'option');
});
