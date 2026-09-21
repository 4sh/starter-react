import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { useUiVirtualList } from './use-ui-virtual-list';

function Liste({ count = 1000, itemSize = 40 }: { count?: number; itemSize?: number }) {
  const { scrollRef, totalSize, items } = useUiVirtualList<HTMLDivElement>({ count, itemSize });

  return (
    <div ref={scrollRef} data-defilant style={{ height: 200, overflow: 'auto' }}>
      <div style={{ height: totalSize, position: 'relative' }} data-interieur>
        {items.map((item) => (
          <div key={item.key} style={item.style} data-entree={item.index}>
            Entrée {item.index}
          </div>
        ))}
      </div>
    </div>
  );
}

// Tout l'intérêt : mille entrées, une poignée dans le DOM.
test('seule une fenêtre d’entrées est rendue', async () => {
  const screen = await render(<Liste count={1000} />);

  await expect
    .poll(() => screen.container.querySelectorAll('[data-entree]').length)
    .toBeGreaterThan(0);

  const rendues = screen.container.querySelectorAll('[data-entree]').length;
  expect(rendues).toBeGreaterThan(4);
  expect(rendues).toBeLessThan(40);
});

test('la hauteur totale reflète la liste entière, pas la fenêtre', async () => {
  const screen = await render(<Liste count={1000} itemSize={40} />);
  const interieur = screen.container.querySelector('[data-interieur]') as HTMLElement;

  await expect.poll(() => interieur.getBoundingClientRect().height).toBe(40000);
});

test('la fenêtre suit le défilement', async () => {
  const screen = await render(<Liste count={1000} />);
  const defilant = screen.container.querySelector('[data-defilant]') as HTMLElement;

  const premierAvant = screen.container.querySelector('[data-entree]')!.getAttribute('data-entree');
  expect(premierAvant).toBe('0');

  defilant.scrollTop = 4000;

  await expect
    .poll(() =>
      Number(screen.container.querySelector('[data-entree]')!.getAttribute('data-entree')),
    )
    .toBeGreaterThan(80);
});

test('une liste vide ne rend aucune entrée', async () => {
  const screen = await render(<Liste count={0} />);

  expect(screen.container.querySelectorAll('[data-entree]')).toHaveLength(0);
  expect(
    (screen.container.querySelector('[data-interieur]') as HTMLElement).getBoundingClientRect()
      .height,
  ).toBe(0);
});

// Le positionnement absolu est ce qui permet de ne rendre qu'une fenêtre sans
// que les entrées absentes décalent les autres.
test('chaque entrée est placée par un décalage absolu', async () => {
  const screen = await render(<Liste count={100} itemSize={40} />);

  await expect
    .poll(() => screen.container.querySelectorAll('[data-entree]').length)
    .toBeGreaterThan(2);

  const entrees = [...screen.container.querySelectorAll('[data-entree]')] as HTMLElement[];
  expect(getComputedStyle(entrees[0]!).position).toBe('absolute');
  expect(entrees[0]!.style.transform).toBe('translateY(0px)');
  expect(entrees[1]!.style.transform).toBe('translateY(40px)');
});
