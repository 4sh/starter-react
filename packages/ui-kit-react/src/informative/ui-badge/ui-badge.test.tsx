import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { UiBadge } from './ui-badge';

test('affiche la valeur et compose ses classes de niveau', async () => {
  const screen = await render(<UiBadge value={12} level="error" subLevel="low" />);
  const badge = screen.container.querySelector('.ui-badge')!;

  expect(badge).toHaveClass('_error', '_low');
  expect(badge.textContent).toBe('12');
});

test('un texte de plusieurs caractères ne rend pas une pastille carrée', async () => {
  const screen = await render(<UiBadge value="123" />);

  expect(screen.container.querySelector('.ui-badge')).not.toHaveClass('_single');
});

test('un caractère unique rend une pastille carrée', async () => {
  const screen = await render(<UiBadge value={3} />);

  expect(screen.container.querySelector('.ui-badge')).toHaveClass('_single');
});

// Un emoji occupe deux unités UTF-16 : `length` en compterait deux et raterait
// la pastille carrée. C'est ce que `Array.from` corrige.
test('un emoji compte pour un seul caractère', async () => {
  const screen = await render(<UiBadge value="★" />);

  expect(screen.container.querySelector('.ui-badge')).toHaveClass('_single');
});

test('sans texte ni icône, la pastille devient un point', async () => {
  const screen = await render(<UiBadge aria-label="Non lu" />);
  const badge = screen.container.querySelector('.ui-badge')!;

  expect(badge).toHaveClass('_dot');
  expect(badge).not.toHaveClass('_single');
  expect(badge.textContent).toBe('');
});

test('sans nom accessible, la pastille reste décorative', async () => {
  const screen = await render(<UiBadge value={4} />);

  expect(screen.container.querySelector('.ui-badge')).not.toHaveAttribute('role');
});

test('avec un nom accessible, la pastille est annoncée comme image', async () => {
  const screen = await render(<UiBadge icon="bell" aria-label="3 notifications" />);

  await expect.element(screen.getByRole('img', { name: '3 notifications' })).toBeInTheDocument();
});

test('la taille de l’icône suit celle de la pastille', async () => {
  const screen = await render(<UiBadge icon="bell" size="large" aria-label="Alertes" />);

  expect(screen.container.querySelector('.ui-badge-icon')).toHaveClass('_lg');
});

test('les couleurs viennent des jetons informatifs', async () => {
  const screen = await render(<UiBadge value={1} level="success" />);
  const badge = screen.container.querySelector('.ui-badge')!;

  const background = getComputedStyle(badge).backgroundColor;
  expect(background).not.toBe('');
  expect(background).not.toBe('rgba(0, 0, 0, 0)');
});
