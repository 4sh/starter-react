import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { useControllableState } from './use-controllable-state';

// ⚠️ Un `element.click()` synchrone suivi d'une lecture du DOM ne voit PAS le
// nouveau rendu : React n'a pas encore repassé. Les assertions qui portent sur
// un état re-rendu utilisent donc `expect.element()`, qui réessaie jusqu'à ce
// que le DOM se stabilise. Une assertion sur un espion, elle, peut rester
// synchrone : c'est ce qui rend l'écart facile à ne pas voir.

/** Sonde minimale : elle expose l'état et un moyen de le pousser. */
function Probe({ value, onChange }: { value?: string; onChange?: (next: string) => void }) {
  const [text, setText] = useControllableState({ value, defaultValue: 'initial', onChange });
  return (
    <button type="button" data-value={text} onClick={() => setText('poussé')}>
      {text}
    </button>
  );
}

test('non contrôlé : defaultValue amorce, et le composant garde son état', async () => {
  const screen = await render(<Probe />);
  const button = screen.getByRole('button');

  await expect.element(button).toHaveAttribute('data-value', 'initial');
  await button.click();
  await expect.element(button).toHaveAttribute('data-value', 'poussé');
});

test('contrôlé : le composant ne bouge PAS de lui-même', async () => {
  const onChange = vi.fn();
  const screen = await render(<Probe value="imposé" onChange={onChange} />);
  const button = screen.getByRole('button');

  await button.click();

  // C'est le cœur du contrat : l'état interne n'est pas lu, donc le champ
  // reste sur la valeur du parent tant que celui-ci n'en rend pas une autre.
  await expect.element(button).toHaveAttribute('data-value', 'imposé');
  expect(onChange).toHaveBeenCalledWith('poussé');
});

// ⚠️ UN SEUL `render()` par test.
//
// Deux rendus dans le même test empilent leurs conteneurs au même endroit de la
// page, et un clic réel (Playwright vise le centre de l'élément) atterrit sur
// celui du dessus. L'échec se déplace alors d'une exécution à l'autre, ce qui
// fait chercher une course de rendu là où il n'y a qu'un recouvrement.

test('onChange est appelé en mode non contrôlé', async () => {
  const onChange = vi.fn();
  const screen = await render(<Probe onChange={onChange} />);

  await screen.getByRole('button').click();

  expect(onChange).toHaveBeenCalledWith('poussé');
});

test('onChange est appelé AUSSI en mode contrôlé', async () => {
  const onChange = vi.fn();
  const screen = await render(<Probe value="x" onChange={onChange} />);

  await screen.getByRole('button').click();

  // Un appelant contrôlé qui l'ignorerait figerait son champ : c'est voulu.
  expect(onChange).toHaveBeenCalledWith('poussé');
});

test('une value rendue à nouveau par le parent est bien reprise', async () => {
  const screen = await render(<Probe value="premier" />);
  await expect.element(screen.getByRole('button')).toHaveAttribute('data-value', 'premier');

  await screen.rerender(<Probe value="second" />);
  await expect.element(screen.getByRole('button')).toHaveAttribute('data-value', 'second');
});
