import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { focusableWithin, focusFirstWithin } from './focusable';

test('les focalisables sont rendus dans l’ordre du document', async () => {
  const screen = await render(
    <div data-panneau>
      <a href="#un">lien</a>
      <button type="button">bouton</button>
      <input defaultValue="champ" />
    </div>,
  );

  const found = focusableWithin(screen.container.querySelector('[data-panneau]')!);
  expect(found.map((el) => el.tagName)).toEqual(['A', 'BUTTON', 'INPUT']);
});

test('les éléments désactivés et hors parcours sont écartés', async () => {
  const screen = await render(
    <div data-panneau>
      <button type="button" disabled>
        désactivé
      </button>
      <button type="button" tabIndex={-1}>
        hors parcours
      </button>
      <input type="hidden" />
      <button type="button">seul retenu</button>
    </div>,
  );

  const found = focusableWithin(screen.container.querySelector('[data-panneau]')!);
  expect(found).toHaveLength(1);
  expect(found[0]!.textContent).toBe('seul retenu');
});

// Un sélecteur ne voit pas la visibilité : c'est la lecture des rectangles qui
// écarte ce qui n'est pas rendu.
test('un élément non rendu est écarté', async () => {
  const screen = await render(
    <div data-panneau>
      <div style={{ display: 'none' }}>
        <button type="button">caché</button>
      </div>
      <button type="button">visible</button>
    </div>,
  );

  const found = focusableWithin(screen.container.querySelector('[data-panneau]')!);
  expect(found.map((el) => el.textContent)).toEqual(['visible']);
});

test('un sous-arbre inerte est écarté', async () => {
  const screen = await render(
    <div data-panneau>
      <div inert>
        <button type="button">neutralisé</button>
      </div>
      <button type="button">actif</button>
    </div>,
  );

  const found = focusableWithin(screen.container.querySelector('[data-panneau]')!);
  expect(found.map((el) => el.textContent)).toEqual(['actif']);
});

test('le focus se pose sur le premier focalisable', async () => {
  const screen = await render(
    <div data-panneau>
      <button type="button">premier</button>
      <button type="button">second</button>
    </div>,
  );

  const target = focusFirstWithin(screen.container.querySelector('[data-panneau]')!);
  expect(target!.textContent).toBe('premier');
  expect(document.activeElement).toBe(target);
});

// Sans ce repli, le focus resterait sur l'élément d'avant, et Échap n'atteindrait
// jamais le panneau.
test('un panneau vide reçoit quand même le focus', async () => {
  const screen = await render(<div data-panneau>aucun élément focalisable</div>);
  const panel = screen.container.querySelector('[data-panneau]') as HTMLElement;

  const target = focusFirstWithin(panel);
  expect(target).toBe(panel);
  expect(panel.getAttribute('tabindex')).toBe('-1');
  expect(document.activeElement).toBe(panel);
});
