import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { announceBrowserFill, hasFocus } from './browser-fill';

test("announceBrowserFill émet l'input manquant, pour la seule animation d'autofill", async () => {
  const onInput = vi.fn();
  const screen = await render(
    <input aria-label="Champ" onInput={onInput} onAnimationStart={announceBrowserFill} />,
  );
  const input = screen.container.querySelector('input')!;

  input.dispatchEvent(
    new AnimationEvent('animationstart', { animationName: 'ui-ripple-wave', bubbles: true }),
  );
  expect(onInput).not.toHaveBeenCalled();

  input.dispatchEvent(
    new AnimationEvent('animationstart', { animationName: 'ui-browser-fill', bubbles: true }),
  );
  expect(onInput).toHaveBeenCalledOnce();
});

test('hasFocus distingue le champ qui a le focus', async () => {
  const screen = await render(<input aria-label="Champ" />);
  const input = screen.container.querySelector('input')!;

  expect(hasFocus(input)).toBe(false);
  input.focus();
  expect(hasFocus(input)).toBe(true);
});
