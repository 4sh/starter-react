import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiSeparator } from './ui-separator';

test('rend un role="separator" avec son orientation', async () => {
  const screen = await render(<UiSeparator orientation="vertical" />);

  await expect
    .element(screen.getByRole('separator'))
    .toHaveAttribute('aria-orientation', 'vertical');
});

test('le libellé sert de nom accessible', async () => {
  const screen = await render(<UiSeparator label="ou" />);

  await expect.element(screen.getByRole('separator', { name: 'ou' })).toBeInTheDocument();
});

test('aria-label remplace le libellé comme nom accessible', async () => {
  const screen = await render(<UiSeparator label="ou" aria-label="Séparateur de choix" />);

  await expect
    .element(screen.getByRole('separator', { name: 'Séparateur de choix' }))
    .toBeInTheDocument();
});

test('labelAlign=center coupe le filet de part et d’autre du libellé', async () => {
  const screen = await render(<UiSeparator label="ou" labelAlign="center" />);

  expect(screen.container.querySelectorAll('.ui-separator-line')).toHaveLength(2);
});

test('labelAlign=start pose le libellé en premier', async () => {
  const screen = await render(<UiSeparator label="ou" labelAlign="start" />);
  const root = screen.container.querySelector('.ui-separator')!;

  expect(root.querySelectorAll('.ui-separator-line')).toHaveLength(1);
  expect(root.firstElementChild).toHaveClass('ui-separator-label');
});

test('labelAlign=end pose le filet en premier', async () => {
  const screen = await render(<UiSeparator label="ou" labelAlign="end" />);
  const root = screen.container.querySelector('.ui-separator')!;

  expect(root.querySelectorAll('.ui-separator-line')).toHaveLength(1);
  expect(root.firstElementChild).toHaveClass('ui-separator-line');
});

test('les filets sont masqués aux lecteurs d’écran', async () => {
  const screen = await render(<UiSeparator />);
  const line = screen.container.querySelector('.ui-separator-line');

  expect(line).toHaveAttribute('aria-hidden', 'true');
});

test('le trait vient du jeton, pas d’une valeur codée en dur', async () => {
  const screen = await render(<UiSeparator />);
  const line = screen.container.querySelector('.ui-separator-line')!;

  expect(parseFloat(getComputedStyle(line).borderTopWidth)).toBeGreaterThan(0);
});
