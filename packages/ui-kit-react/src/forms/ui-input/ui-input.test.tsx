import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiInput } from './ui-input';

test('non contrôlé : la frappe met à jour le champ et notifie', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<UiInput label="Nom" onValueChange={onValueChange} />);
  const input = screen.getByRole('textbox');

  await input.fill('Ada');

  await expect.element(input).toHaveValue('Ada');
  expect(onValueChange).toHaveBeenLastCalledWith('Ada');
});

test('contrôlé : le champ reste sur la valeur du parent', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<UiInput label="Nom" value="imposé" onValueChange={onValueChange} />);
  const input = screen.getByRole('textbox');

  await input.fill('Ada');

  // Le parent n'a rien rendu de nouveau : le champ ne bouge pas de lui-même.
  await expect.element(input).toHaveValue('imposé');
  expect(onValueChange).toHaveBeenCalled();
});
