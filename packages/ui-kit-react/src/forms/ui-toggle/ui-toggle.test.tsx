import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiToggle } from './ui-toggle';

test('annoncé comme un interrupteur, pas comme une case', async () => {
  const screen = await render(<UiToggle label="Notifications" />);

  // `role="switch"` fait annoncer « activé / désactivé ».
  await expect.element(screen.getByRole('switch', { name: 'Notifications' })).toBeVisible();
});

test('non contrôlé : la bascule change l’état et notifie', async () => {
  const onValueChange = vi.fn();
  const screen = await render(<UiToggle label="Notifications" onValueChange={onValueChange} />);
  const toggle = screen.getByRole('switch');

  await toggle.click();

  await expect.element(toggle).toBeChecked();
  expect(onValueChange).toHaveBeenCalledWith(true);
});

test('contrôlé : l’interrupteur reste sur la valeur du parent', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <UiToggle label="Notifications" value={false} onValueChange={onValueChange} />,
  );
  const toggle = screen.getByRole('switch');

  await toggle.click();

  await expect.element(toggle).not.toBeChecked();
  expect(onValueChange).toHaveBeenCalledWith(true);
});

test('trueValue et falseValue portent le modèle', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <UiToggle label="Mode" trueValue="on" falseValue="off" onValueChange={onValueChange} />,
  );

  await screen.getByRole('switch').click();

  expect(onValueChange).toHaveBeenCalledWith('on');
});

test('readOnly annule la bascule et l’annonce', async () => {
  const onValueChange = vi.fn();
  const screen = await render(
    <UiToggle label="Verrouillé" readOnly onValueChange={onValueChange} />,
  );
  const toggle = screen.getByRole('switch');

  await toggle.click();

  await expect.element(toggle).not.toBeChecked();
  await expect.element(toggle).toHaveAttribute('aria-readonly', 'true');
  expect(onValueChange).not.toHaveBeenCalled();
});

test('renderHandle reçoit l’état de l’interrupteur', async () => {
  const screen = await render(
    <UiToggle
      label="Mode"
      defaultValue
      renderHandle={({ checked }) => <span data-state={checked ? 'on' : 'off'} />}
    />,
  );

  expect(screen.container.querySelector('.ui-toggle-thumb span')).toHaveAttribute(
    'data-state',
    'on',
  );
});

test('le libellé peut passer avant l’interrupteur', async () => {
  const screen = await render(<UiToggle label="Mode" labelPosition="before" />);
  const root = screen.container.querySelector('.ui-toggle')!;

  // L'ordre du DOM porte l'ordre visuel : pas de `order` CSS à maintenir.
  expect(root.firstElementChild!.className).toContain('ui-toggle-label');
});
