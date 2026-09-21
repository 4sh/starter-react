import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiTextarea } from './ui-textarea';

test('non contrôlé : la frappe met à jour le champ et notifie', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<UiTextarea label="Commentaire" onValueChange={onValueChange} />);
  const area = screen.getByRole('textbox');

  await area.fill('Bonjour');

  await expect.element(area).toHaveValue('Bonjour');
  expect(onValueChange).toHaveBeenLastCalledWith('Bonjour');
});

test('le compteur est chaîné à aria-describedby, pas substitué au message', async () => {
  const screen = await render(
    <UiTextarea
      label="Bio"
      helperText="Deux cents caractères au maximum."
      showCount
      maxLength={200}
    />,
  );
  const area = screen.container.querySelector('textarea')!;

  const describedBy = area.getAttribute('aria-describedby')!;
  const ids = describedBy.split(' ');

  expect(ids).toHaveLength(2);
  for (const id of ids) expect(document.getElementById(id)).not.toBeNull();
});

test('le compteur signale le dépassement', async () => {
  // Seulement atteignable par programme : maxLength borne déjà la saisie.
  const screen = await render(<UiTextarea label="Bio" value="abcdef" showCount maxLength={3} />);

  expect(screen.container.querySelector('.ui-textarea-count')!.className).toContain('_over');
});

test('autoResize retire la poignée manuelle', async () => {
  const screen = await render(<UiTextarea label="Commentaire" autoResize resize="both" />);
  const area = screen.container.querySelector('textarea')!;

  // Les deux se contrediraient : une hauteur pilotée par le contenu et une
  // hauteur pilotée par l'utilisateur.
  expect(getComputedStyle(area).resize).toBe('none');
});

test('la coquille est en mode multiligne', async () => {
  const screen = await render(<UiTextarea label="Commentaire" />);

  expect(screen.container.querySelector('.ui-field')!.className).toContain('_multiline');
});
