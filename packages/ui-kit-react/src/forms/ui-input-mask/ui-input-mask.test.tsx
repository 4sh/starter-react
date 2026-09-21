import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiInputMask } from './ui-input-mask';

test('les littéraux sont insérés à la frappe', async () => {
  const screen = await render(<UiInputMask label="Date" mask="99/99/9999" />);
  const input = screen.getByRole('textbox');

  await input.fill('12092024');

  await expect.element(input).toHaveValue('12/09/2024');
});

test('la valeur du modèle est masquée par défaut', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <UiInputMask label="Date" mask="99/99/9999" onValueChange={onValueChange} />,
  );

  await screen.getByRole('textbox').fill('12092024');

  expect(onValueChange).toHaveBeenLastCalledWith('12/09/2024');
});

test('unmask émet la valeur brute', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <UiInputMask label="Date" mask="99/99/9999" unmask onValueChange={onValueChange} />,
  );

  await screen.getByRole('textbox').fill('12092024');

  expect(onValueChange).toHaveBeenLastCalledWith('12092024');
});

test('une saisie partielle affiche le caractère de remplissage', async () => {
  const screen = await render(<UiInputMask label="Date" mask="99/99/9999" />);
  const input = screen.getByRole('textbox');

  await input.fill('12');

  await expect.element(input).toHaveValue('12/__/____');
});

test('un champ vide n’affiche pas le gabarit', async () => {
  const screen = await render(<UiInputMask label="Date" mask="99/99/9999" />);

  // Sinon le champ paraît rempli alors qu'il ne l'est pas.
  await expect.element(screen.getByRole('textbox')).toHaveValue('');
});

test('ranges refuse un chiffre qui ne mène à aucun segment valide', async () => {
  const screen = await render(<UiInputMask label="Heure" mask="99:99" ranges="0-23 0-59" />);
  const input = screen.getByRole('textbox');

  // Aucune heure ne commence par 9, le chiffre est écarté. "2" est pris, parce
  // que 20 à 23 sont dans la plage. "3" ne le serait pas non plus : 30 à 39 en
  // sont toutes hors.
  await input.fill('92');

  await expect.element(input).toHaveValue('2_:__');
});

test('contrôlé : le champ reste sur la valeur du parent', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <UiInputMask label="Date" mask="99/99/9999" value="01/01/2000" onValueChange={onValueChange} />,
  );
  const input = screen.getByRole('textbox');

  await input.fill('12092024');

  await expect.element(input).toHaveValue('01/01/2000');
  expect(onValueChange).toHaveBeenCalled();
});

test('le curseur se replace après le Nième caractère saisi', async () => {
  const screen = await render(<UiInputMask label="Date" mask="99/99/9999" defaultValue="12" />);
  const input = screen.container.querySelector('input')!;

  input.focus();
  input.setSelectionRange(2, 2);
  // Une frappe qui complète le segment fait franchir le littéral au curseur.
  await screen.getByRole('textbox').fill('120');

  expect(input.selectionStart).toBe(4);
});
