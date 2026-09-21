import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiCheckbox } from './ui-checkbox';

// Rappel : UN SEUL render() par test, et `expect.element()` dès qu'on assère
// sur un état re-rendu. Voir docs/ROADMAP.md.

test('non contrôlée : la bascule change l’état et notifie', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<UiCheckbox label="J’accepte" onValueChange={onValueChange} />);
  const box = screen.getByRole('checkbox');

  await box.click();

  await expect.element(box).toBeChecked();
  expect(onValueChange).toHaveBeenCalledWith(true);
});

test('contrôlée : la case reste sur la valeur du parent', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <UiCheckbox label="J’accepte" value={false} onValueChange={onValueChange} />,
  );
  const box = screen.getByRole('checkbox');

  await box.click();

  await expect.element(box).not.toBeChecked();
  expect(onValueChange).toHaveBeenCalledWith(true);
});

test('trueValue et falseValue portent le modèle, pas un booléen', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <UiCheckbox
      label="Newsletter"
      trueValue="oui"
      falseValue="non"
      onValueChange={onValueChange}
    />,
  );

  await screen.getByRole('checkbox').click();

  // C'est la raison pour laquelle la prop s'appelle `value` et non `checked` :
  // le modèle n'est pas forcément booléen.
  expect(onValueChange).toHaveBeenCalledWith('oui');
});

test('la valeur initiale décochée est falseValue, pas false', async () => {
  const screen = await render(<UiCheckbox label="Newsletter" trueValue="oui" falseValue="non" />);

  await expect.element(screen.getByRole('checkbox')).not.toBeChecked();
});

test('readOnly annule la bascule sans retirer le focus', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <UiCheckbox label="Verrouillé" readOnly onValueChange={onValueChange} />,
  );
  const box = screen.getByRole('checkbox');

  await box.click();

  // Une case n'a pas de readOnly natif : la propriété du DOM a été basculée par
  // le navigateur puis remise par le composant.
  await expect.element(box).not.toBeChecked();
  await expect.element(box).toHaveAttribute('aria-readonly', 'true');
  expect(onValueChange).not.toHaveBeenCalled();
});

test('disabled bloque la bascule', async () => {
  const screen = await render(<UiCheckbox label="Indisponible" disabled />);

  await expect.element(screen.getByRole('checkbox')).toBeDisabled();
});

test('indeterminate est posé sur la PROPRIÉTÉ du DOM', async () => {
  const screen = await render(<UiCheckbox label="Partiel" indeterminate />);
  const input = screen.container.querySelector('input')!;

  // Il n'existe aucun attribut `indeterminate` : React ne peut pas le poser en
  // JSX, d'où le layout effect.
  expect(input.indeterminate).toBe(true);
  expect(input.hasAttribute('indeterminate')).toBe(false);
});

test('le libellé étiquette la case, sans htmlFor', async () => {
  const screen = await render(<UiCheckbox label="J’accepte les conditions" />);

  // Le `<label>` enveloppe l'input : l'association est structurelle, et cliquer
  // le texte bascule la case.
  await expect
    .element(screen.getByRole('checkbox', { name: 'J’accepte les conditions' }))
    .toBeVisible();
});
