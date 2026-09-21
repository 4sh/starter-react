import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { UiMenuItem } from '../ui-menu';

import { UiContextMenu, type UiContextMenuProps } from './ui-context-menu';

const ITEMS: UiMenuItem[] = [
  { label: 'Ouvrir' },
  { label: 'Exporter', items: [{ label: 'PDF' }, { label: 'CSV' }] },
  { separator: true },
  { label: 'Supprimer' },
];

const panneau = () => document.querySelector('.ui-context-menu') as HTMLElement;
// Filtré sur la cascade : le sous-menu d'un groupe est rendu dans le DOM même
// fermé, et ses entrées répondraient au même sélecteur.
const entrees = () =>
  [...document.querySelectorAll('.ui-context-menu .ui-menu-action')].filter(
    (el) => !el.closest('.ui-menu-flyout'),
  );
const parLibelle = (nom: string) =>
  entrees().find((el) => el.textContent?.trim() === nom) as HTMLElement;

/** Le panneau entre en fondu : sans forcer la fin, tout rectangle est un état intermédiaire. */
function pose(element: HTMLElement) {
  element.getAnimations().forEach((animation) => animation.finish());
  return element.getBoundingClientRect();
}

function Demo(props: Partial<UiContextMenuProps> = {}) {
  return (
    <UiContextMenu
      items={ITEMS}
      aria-label="Actions"
      trigger={(zone) => (
        <button type="button" {...zone} style={{ width: 200, height: 100 }}>
          Zone
        </button>
      )}
      {...props}
    />
  );
}

/** Clic droit réel : l'écouteur est natif, un événement fabriqué l'atteint donc. */
function clicDroit(cible: Element, x = 40, y = 30) {
  const event = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  });
  cible.dispatchEvent(event);
  return event;
}

// --- Ouverture ------------------------------------------------------------

test('le panneau fermé n’occupe aucune place à l’écran', async () => {
  await render(<Demo />);

  expect(panneau().matches(':popover-open')).toBe(false);
  expect(getComputedStyle(panneau()).display).toBe('none');
  expect(panneau().getBoundingClientRect().width).toBe(0);
});

test('le clic droit ouvre le menu et confisque celui du navigateur', async () => {
  const screen = await render(<Demo />);
  const zone = screen.container.querySelector('button')!;

  const event = clicDroit(zone);

  expect(event.defaultPrevented).toBe(true);
  await expect.poll(() => panneau().matches(':popover-open')).toBe(true);
  expect(entrees()).toHaveLength(3);
});

// L'ancre est le point cliqué, pas un élément : c'est ce qui distingue ce
// composant d'un panneau ancré.
test('le panneau se pose sur le pointeur', async () => {
  const screen = await render(<Demo />);

  clicDroit(screen.container.querySelector('button')!, 120, 90);

  // `computePosition` est ASYNCHRONE : le premier rendu après l'ouverture porte
  // encore la position d'avant. Lire une seule fois ne prouve donc rien, et
  // c'est ce qui fait passer un test pour une régression de placement.
  await expect.poll(() => Math.round(pose(panneau()).left)).toBe(120);
  expect(Math.round(pose(panneau()).top)).toBe(90);
});

test('le focus entre dans le menu à l’ouverture', async () => {
  const screen = await render(<Demo />);

  clicDroit(screen.container.querySelector('button')!);

  await expect.poll(() => document.activeElement?.textContent?.trim()).toBe('Ouvrir');
});

test('un second clic droit repositionne le panneau', async () => {
  const screen = await render(<Demo />);
  const zone = screen.container.querySelector('button')!;

  clicDroit(zone, 30, 30);
  await expect.poll(() => panneau().matches(':popover-open')).toBe(true);

  clicDroit(zone, 150, 60);
  await expect.poll(() => Math.round(pose(panneau()).left)).toBe(150);
  expect(panneau().matches(':popover-open')).toBe(true);
});

// Le point est gardé en coordonnées de PAGE : le menu appartient au contenu,
// pas à l'écran. Mesuré : il se déplace exactement du défilement.
test('le panneau suit le défilement de la page', async () => {
  const screen = await render(
    <div style={{ minHeight: 3000 }}>
      <Demo />
    </div>,
  );

  clicDroit(screen.container.querySelector('button')!, 60, 200);
  await expect.poll(() => Math.round(pose(panneau()).top)).toBe(200);

  window.scrollTo(0, 120);
  await expect.poll(() => Math.round(pose(panneau()).top)).toBe(80);
  window.scrollTo(0, 0);
});

// --- Fermeture ------------------------------------------------------------

test('Échap referme et rend le focus à la zone', async () => {
  const onClose = vi.fn();
  const screen = await render(<Demo onClose={onClose} />);

  clicDroit(screen.container.querySelector('button')!);
  await expect.poll(() => document.activeElement?.textContent?.trim()).toBe('Ouvrir');

  document.activeElement!.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );

  await expect.poll(() => panneau().matches(':popover-open')).toBe(false);
  expect(onClose).toHaveBeenCalledTimes(1);
  // Un `popover="manual"` ne rend pas le focus tout seul : le composant le fait.
  await expect.poll(() => document.activeElement?.textContent?.trim()).toBe('Zone');
});

test('activer une entrée notifie puis referme', async () => {
  const onItemClick = vi.fn();
  const screen = await render(<Demo onItemClick={onItemClick} />);

  clicDroit(screen.container.querySelector('button')!);
  await expect.poll(() => panneau().matches(':popover-open')).toBe(true);

  await screen.getByRole('menuitem', { name: 'Supprimer' }).click();

  expect(onItemClick).toHaveBeenCalledTimes(1);
  expect(onItemClick.mock.calls[0]![0].item.label).toBe('Supprimer');
  await expect.poll(() => panneau().matches(':popover-open')).toBe(false);
});

test('un appui de pointeur à l’extérieur referme', async () => {
  const screen = await render(
    <>
      <Demo />
      <button type="button">Dehors</button>
    </>,
  );

  clicDroit(screen.container.querySelector('button')!);
  await expect.poll(() => panneau().matches(':popover-open')).toBe(true);

  await screen.getByRole('button', { name: 'Dehors' }).click();

  await expect.poll(() => panneau().matches(':popover-open')).toBe(false);
});

// --- Réglages -------------------------------------------------------------

test('la densité est compacte par défaut', async () => {
  const screen = await render(<Demo />);

  clicDroit(screen.container.querySelector('button')!);
  await expect.poll(() => entrees().length).toBe(3);

  // 32 px en `small`, contre 40 en `default` : c'est la seule mesure qui
  // distingue vraiment les deux densités.
  expect(parLibelle('Ouvrir').offsetHeight).toBe(32);
  expect(panneau().querySelector('.ui-menu')!.classList.contains('_small')).toBe(true);
});

test('les groupes sont en cascade par défaut', async () => {
  const screen = await render(<Demo />);

  clicDroit(screen.container.querySelector('button')!);
  await expect.poll(() => entrees().length).toBe(3);

  expect(parLibelle('Exporter').getAttribute('aria-haspopup')).toBe('menu');
});

test('submenus="inline" rend les groupes dans le panneau', async () => {
  const screen = await render(<Demo submenus="inline" />);

  clicDroit(screen.container.querySelector('button')!);
  await expect.poll(() => panneau().matches(':popover-open')).toBe(true);

  // Au premier niveau, un groupe `inline` est une SECTION titrée et non une
  // bascule : « Exporter » cesse d'être une entrée pour devenir un en-tête.
  const enTete = panneau().querySelector('.ui-menu-header')!;
  expect(enTete.textContent).toBe('Exporter');
  expect(panneau().querySelector('[role="group"]')!.getAttribute('aria-labelledby')).toBe(
    enTete.id,
  );
  expect(document.querySelector('.ui-menu-flyout')).toBe(null);
});

test('triggerEvent choisit l’événement d’ouverture', async () => {
  const screen = await render(<Demo triggerEvent="click" />);

  await screen.getByRole('button', { name: 'Zone' }).click();

  await expect.poll(() => panneau().matches(':popover-open')).toBe(true);
});

test('global attache l’écouteur au document', async () => {
  const onOpen = vi.fn();
  await render(<Demo global onOpen={onOpen} trigger={undefined} />);

  clicDroit(document.body, 200, 140);

  await expect.poll(() => Math.round(pose(panneau()).left)).toBe(200);
  expect(panneau().matches(':popover-open')).toBe(true);
  expect(onOpen).toHaveBeenCalledTimes(1);
});

// Même piège que sur le sous-menu de `ui-menu` : l'enveloppe fait la taille du
// panneau, et l'`overflow: auto` du style navigateur rognerait son ombre.
test('l’enveloppe ne rogne pas l’ombre du panneau', async () => {
  const screen = await render(<Demo />);

  clicDroit(screen.container.querySelector('button')!);
  await expect.poll(() => panneau().matches(':popover-open')).toBe(true);

  const menu = panneau().querySelector('.ui-menu') as HTMLElement;
  expect(getComputedStyle(panneau()).overflowY).toBe('visible');
  expect(panneau().offsetWidth).toBe(menu.offsetWidth);
  expect(getComputedStyle(menu).boxShadow).not.toBe('none');
});

test('un panneau non encore positionné reste invisible', async () => {
  const screen = await render(<Demo />);

  // Au repos, le garde est POSÉ : c'est ce qui prouve qu'il est branché.
  expect(panneau().hasAttribute('data-unpositioned')).toBe(true);

  clicDroit(screen.container.querySelector('button')!);
  // Attendre l'OUVERTURE ne suffit pas : le panneau est légitimement invisible
  // jusqu'à ce que sa position soit calculée. C'est la levée de l'attribut qu'il
  // faut attendre, et c'est elle qui prouve que le garde se relâche.
  await expect.poll(() => panneau().hasAttribute('data-unpositioned')).toBe(false);
  panneau()
    .getAnimations()
    .forEach((animation) => animation.finish());
  expect(getComputedStyle(panneau()).opacity).toBe('1');

  panneau().setAttribute('data-unpositioned', '');
  panneau()
    .getAnimations()
    .forEach((animation) => animation.finish());

  expect(getComputedStyle(panneau()).opacity).toBe('0');
});

test('la liste porte le nom accessible, jamais l’enveloppe', async () => {
  const screen = await render(<Demo />);

  clicDroit(screen.container.querySelector('button')!);
  await expect.poll(() => panneau().matches(':popover-open')).toBe(true);

  expect(panneau().querySelector('[role="menu"]')!.getAttribute('aria-label')).toBe('Actions');
  expect(panneau().hasAttribute('aria-label')).toBe(false);
});
