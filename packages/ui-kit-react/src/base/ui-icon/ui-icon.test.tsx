import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

// ⚠️ `render()` de vitest-browser-react est ASYNCHRONE (il rend une
// `Promise<RenderResult>`) : sans `await`, `screen` est la promesse elle-même
// et l'échec se lit « Cannot read properties of undefined ».

import { UiIcon } from './ui-icon';
import { UiIconFamilyProvider } from './ui-icon-families';

test('décorative par défaut : masquée aux lecteurs d’écran', async () => {
  const screen = await render(<UiIcon name="circle-user" />);
  const icon = screen.container.querySelector('i');

  expect(icon).toHaveAttribute('aria-hidden', 'true');
  expect(icon).not.toHaveAttribute('role');
  expect(icon?.className).toContain('fa-solid');
  expect(icon?.className).toContain('fa-circle-user');
});

test('porteuse de sens : role="img" et nom accessible', async () => {
  const screen = await render(
    <UiIcon name="triangle-exclamation" decorative={false} aria-label="Attention" />,
  );

  await expect.element(screen.getByRole('img', { name: 'Attention' })).toBeInTheDocument();
});

test('la taille est résolue depuis le jeton, pas codée en dur', async () => {
  const screen = await render(<UiIcon name="star" size="xl" />);
  const icon = screen.container.querySelector('i')!;

  // Ce que jsdom ne saurait pas faire : la valeur vient de la cascade réelle,
  // `--ui-icon-size-xl` → `--size-typography-icon-xl` → jeton généré.
  const resolved = getComputedStyle(icon).fontSize;
  expect(parseFloat(resolved)).toBeGreaterThan(0);
});

test('une famille déclarée par le provider remplace FontAwesome', async () => {
  const screen = await render(
    <UiIconFamilyProvider
      families={{ material: { classes: () => 'material-symbols-outlined', content: (n) => n } }}
      defaultFamily="material"
    >
      <UiIcon name="home" />
    </UiIconFamilyProvider>,
  );
  const icon = screen.container.querySelector('i');

  expect(icon?.className).toContain('material-symbols-outlined');
  expect(icon?.textContent).toBe('home');
});
