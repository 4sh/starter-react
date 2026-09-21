import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { useRovingTabIndex, type UiRovingOptions } from './use-roving-tabindex';

function Groupe({ labels, ...options }: { labels: string[] } & Omit<UiRovingOptions, 'count'>) {
  const roving = useRovingTabIndex({ count: labels.length, ...options });

  return (
    <div data-groupe role="listbox" tabIndex={-1} onKeyDown={roving.onKeyDown}>
      {labels.map((label, index) => (
        <button
          key={label}
          type="button"
          role="option"
          aria-selected={index === roving.activeIndex}
          tabIndex={roving.tabIndexFor(index)}
          disabled={options.isDisabled?.(index)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const LABELS = ['un', 'deux', 'trois'];

/** Index actif lu sur le DOM, via le seul élément resté dans le parcours. */
function actif(container: HTMLElement): string {
  return container.querySelector('[tabindex="0"]')!.textContent!;
}

function frappe(container: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  container.querySelector('[data-groupe]')!.dispatchEvent(event);
  return event;
}

// Tout l'intérêt du motif : un seul arrêt de tabulation pour le groupe entier.
test('un seul élément reste dans le parcours de tabulation', async () => {
  const screen = await render(<Groupe labels={LABELS} />);

  expect(screen.container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
  expect(screen.container.querySelectorAll('[tabindex="-1"]')).toHaveLength(3);
});

test('les flèches déplacent l’index actif', async () => {
  const screen = await render(<Groupe labels={LABELS} />);

  frappe(screen.container, 'ArrowDown');
  await expect.poll(() => actif(screen.container)).toBe('deux');

  frappe(screen.container, 'ArrowUp');
  await expect.poll(() => actif(screen.container)).toBe('un');
});

test('Début et Fin vont aux extrémités', async () => {
  const screen = await render(<Groupe labels={LABELS} />);

  frappe(screen.container, 'End');
  await expect.poll(() => actif(screen.container)).toBe('trois');

  frappe(screen.container, 'Home');
  await expect.poll(() => actif(screen.container)).toBe('un');
});

test('la navigation boucle par défaut', async () => {
  const screen = await render(<Groupe labels={LABELS} />);

  frappe(screen.container, 'ArrowUp');
  await expect.poll(() => actif(screen.container)).toBe('trois');
});

test('loop=false bute sur l’extrémité', async () => {
  const screen = await render(<Groupe labels={LABELS} loop={false} />);

  frappe(screen.container, 'ArrowUp');
  await expect.poll(() => actif(screen.container)).toBe('un');
});

test('les entrées désactivées sont sautées', async () => {
  const screen = await render(<Groupe labels={LABELS} isDisabled={(i) => i === 1} />);

  frappe(screen.container, 'ArrowDown');
  await expect.poll(() => actif(screen.container)).toBe('trois');
});

// Sans cette borne, un groupe entièrement désactivé ferait tourner la recherche
// du prochain index indéfiniment.
test('un groupe entièrement désactivé ne boucle pas', async () => {
  const screen = await render(<Groupe labels={LABELS} isDisabled={() => true} />);

  frappe(screen.container, 'ArrowDown');
  expect(screen.container.querySelectorAll('[data-groupe]')).toHaveLength(1);
});

// Une flèche horizontale dans une liste verticale doit continuer à déplacer le
// curseur dans un champ de saisie : la consommer serait un vol de touche.
test('une flèche hors axe n’est pas consommée', async () => {
  const screen = await render(<Groupe labels={LABELS} />);

  const horizontale = frappe(screen.container, 'ArrowRight');
  expect(horizontale.defaultPrevented).toBe(false);

  const verticale = frappe(screen.container, 'ArrowDown');
  expect(verticale.defaultPrevented).toBe(true);
});

test('en orientation both, les deux axes naviguent', async () => {
  const screen = await render(<Groupe labels={LABELS} orientation="both" />);

  const event = frappe(screen.container, 'ArrowRight');
  expect(event.defaultPrevented).toBe(true);
  await expect.poll(() => actif(screen.container)).toBe('deux');
});

test('contrôlé, l’index vient du parent et ne bouge pas seul', async () => {
  const onActiveIndexChange = vi.fn();
  const screen = await render(
    <Groupe labels={LABELS} activeIndex={0} onActiveIndexChange={onActiveIndexChange} />,
  );

  frappe(screen.container, 'ArrowDown');

  expect(onActiveIndexChange).toHaveBeenCalledWith(1);
  expect(actif(screen.container)).toBe('un');
});
