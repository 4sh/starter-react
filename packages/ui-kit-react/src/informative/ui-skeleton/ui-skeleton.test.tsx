import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiSkeleton } from './ui-skeleton';

test('le bloc est masqué aux lecteurs d’écran', async () => {
  const screen = await render(<UiSkeleton />);

  expect(screen.container.querySelector('.ui-skeleton')).toHaveAttribute('aria-hidden', 'true');
});

test('la forme compose sa classe et ses dimensions de jeton', async () => {
  const screen = await render(<UiSkeleton shape="circle" />);
  const box = screen.container.querySelector('.ui-skeleton')!;

  expect(box).toHaveClass('_circle');
  expect(box.getBoundingClientRect().width).toBeGreaterThan(0);
});

test('width et height remplacent les dimensions de la forme', async () => {
  const screen = await render(<UiSkeleton shape="rectangle" width="320px" height="48px" />);
  const box = screen.container.querySelector('.ui-skeleton')!;

  expect(box.getBoundingClientRect().width).toBe(320);
  expect(box.getBoundingClientRect().height).toBe(48);
});

test('animation=pulse échange le reflet contre le clignotement', async () => {
  const screen = await render(<UiSkeleton animation="pulse" />);
  const box = screen.container.querySelector('.ui-skeleton')!;

  expect(box).toHaveClass('_pulse');
  expect(getComputedStyle(box).animationName).toBe('ui-skeleton-pulse');
  expect(getComputedStyle(box, '::after').content).toBe('none');
});

test('animation=none retire le reflet sans figer la boîte', async () => {
  const screen = await render(<UiSkeleton animation="none" />);
  const box = screen.container.querySelector('.ui-skeleton')!;

  expect(box).toHaveClass('_static');
  expect(getComputedStyle(box, '::after').content).toBe('none');
});

test('le fond vient du jeton, pas d’une couleur figée', async () => {
  const screen = await render(<UiSkeleton />);
  const box = screen.container.querySelector('.ui-skeleton')!;

  const background = getComputedStyle(box).backgroundColor;
  expect(background).not.toBe('rgba(0, 0, 0, 0)');
});
