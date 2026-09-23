import { StrictMode, useState } from 'react';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import {
  UiSidebar,
  UiSidebarProvider,
  getUiSidebarTriggerProps,
  useUiSidebarTrigger,
  type UiSidebarProps,
} from './ui-sidebar';
import { UiSidebarMenu } from './ui-sidebar-menu';

afterEach(() => {
  vi.restoreAllMocks();
});

// Le pointeur de Playwright reste où le test précédent l'a laissé : un rail
// `openOnHover` qui monte dessous se croit survolé, et flotte dès le départ.
// C'est le bon comportement, mais selon la charge l'événement arrive avant ou
// après la première assertion. Coin bas droit, hors de toute barre de ces tests.
beforeEach(async () => {
  const parking = document.createElement('div');
  parking.style.cssText = 'position:fixed; right:0; bottom:0; width:8px; height:8px;';
  document.body.append(parking);
  await page.elementLocator(parking).hover();
  parking.remove();
});

const ITEMS = [
  { label: 'Tableau de bord', icon: 'gauge', active: true },
  { label: 'Projets', icon: 'folder-open' },
];

/** Un bouton de menu placé HORS de la barre, comme dans une barre d'application. */
function Trigger({ label = 'Basculer' }: { label?: string }) {
  const trigger = useUiSidebarTrigger();
  return (
    <button type="button" {...trigger}>
      {label}
    </button>
  );
}

/**
 * La mise en page d'une application : une rangée flex qui a une hauteur. La
 * barre statique s'y étire ; rendue nue, son rail mesure zéro de haut, son
 * panneau étant positionné en absolu pour pouvoir flotter.
 */
function Shell({ children, ...props }: Partial<UiSidebarProps>) {
  return (
    <UiSidebarProvider>
      <div style={{ position: 'relative', display: 'flex', height: 400 }}>
        <UiSidebar aria-label="Navigation principale" {...props}>
          {children ?? <UiSidebarMenu items={ITEMS} aria-label="Sections" />}
        </UiSidebar>
        {/* À droite : un rail déployé en flottant recouvre le début du contenu. */}
        <main
          style={{
            flex: '1 1 auto',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: 16,
          }}
        >
          <Trigger />
          <button type="button">Contenu</button>
        </main>
      </div>
    </UiSidebarProvider>
  );
}

const panel = (root: ParentNode) => root.querySelector<HTMLElement>('.ui-sidebar')!;
const rail = (root: ParentNode) => root.querySelector<HTMLElement>('.ui-sidebar-rail');
const dialog = (root: ParentNode) => root.querySelector<HTMLDialogElement>('dialog.ui-sidebar');
const tick = () => new Promise((r) => requestAnimationFrame(() => r(null)));

// --- Présentation statique ------------------------------------------------------

test('statique : un rail dans le flux porte un <aside> nommé', async () => {
  const screen = await render(<Shell />);

  expect(rail(screen.container)).toHaveClass('_left');
  expect(panel(screen.container).tagName).toBe('ASIDE');
  expect(panel(screen.container)).toHaveAttribute('aria-label', 'Navigation principale');
  expect(panel(screen.container)).toHaveClass('ui-sidebar', '_left');
  expect(dialog(screen.container)).toBeNull();
});

test('aria-labelledby l’emporte, et sans nom le composant avertit une fois', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const screen = await render(
    <>
      <h2 id="titre-nav">Espace</h2>
      <UiSidebar aria-labelledby="titre-nav" />
      <UiSidebar />
    </>,
  );
  const [nommee, anonyme] = [...screen.container.querySelectorAll('.ui-sidebar')];

  expect(nommee).toHaveAttribute('aria-labelledby', 'titre-nav');
  expect(nommee).not.toHaveAttribute('aria-label');
  expect(anonyme).toHaveAttribute('aria-label', 'Navigation');
  expect(warn).toHaveBeenCalledTimes(1);
  expect(warn.mock.calls[0]![0]).toContain('[ui-sidebar]');
});

test('un déclencheur hors de la barre la replie, et annonce son état', async () => {
  const onCollapsedChange = vi.fn();
  const screen = await render(<Shell onCollapsedChange={onCollapsedChange} />);
  const trigger = screen.getByRole('button', { name: 'Basculer' });

  await expect.element(trigger).toHaveAttribute('aria-controls', panel(screen.container).id);
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');

  await trigger.click();

  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(rail(screen.container)).toHaveClass('_collapsed');
  expect(panel(screen.container)).toHaveClass('_collapsed');
  expect(screen.container.querySelector('.ui-sidebar-menu')).toHaveClass('_collapsed');
  expect(onCollapsedChange).toHaveBeenCalledWith(true);
});

test('collapsible à faux : la bascule ne replie rien', async () => {
  const screen = await render(<Shell collapsible={false} />);

  await screen.getByRole('button', { name: 'Basculer' }).click();
  await tick();

  expect(panel(screen.container)).not.toHaveClass('_collapsed');
});

test('contrôlé, le repli suit le parent', async () => {
  const onCollapsedChange = vi.fn();
  const screen = await render(<Shell collapsed onCollapsedChange={onCollapsedChange} />);

  expect(panel(screen.container)).toHaveClass('_collapsed');
  await screen.getByRole('button', { name: 'Basculer' }).click();
  await tick();

  expect(onCollapsedChange).toHaveBeenCalledWith(false);
  expect(panel(screen.container)).toHaveClass('_collapsed');
});

test("l'en-tête et le pied reçoivent l'état de la barre", async () => {
  function Demo() {
    const [collapsed, setCollapsed] = useState(false);
    return (
      <UiSidebar
        aria-label="Navigation"
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        header={(sb) => (
          <button type="button" {...getUiSidebarTriggerProps(sb)}>
            {sb.collapsed ? 'A' : 'Application'}
          </button>
        )}
        footer={(sb) => (sb.collapsed ? null : <span>Jane Doe</span>)}
      />
    );
  }
  const screen = await render(
    <div style={{ display: 'flex', height: 400 }}>
      <Demo />
    </div>,
  );
  const header = () => screen.container.querySelector('.ui-sidebar-header')!;

  expect(header()).toHaveTextContent('Application');
  expect(screen.container.querySelector('.ui-sidebar-footer')).toHaveTextContent('Jane Doe');
  await expect
    .element(screen.getByRole('button', { name: 'Application' }))
    .toHaveAttribute('aria-controls', panel(screen.container).id);

  await screen.getByRole('button', { name: 'Application' }).click();

  await expect.poll(() => header().textContent).toBe('A');
  expect(screen.container.querySelector('.ui-sidebar-footer')?.textContent).toBe('');
});

test('openOnHover : un rail replié flotte ouvert au survol, sans pousser le contenu', async () => {
  const screen = await render(<Shell defaultCollapsed openOnHover />);
  const r = rail(screen.container)!;
  const largeurRail = r.getBoundingClientRect().width;

  expect(panel(screen.container)).toHaveClass('_collapsed');

  await screen.getByRole('button', { name: 'Tableau de bord' }).hover();
  await expect.poll(() => panel(screen.container).classList.contains('_floating')).toBe(true);
  expect(panel(screen.container)).not.toHaveClass('_collapsed');
  // L'empreinte reste celle du rail : le contenu ne bouge pas.
  expect(r).toHaveClass('_collapsed');
  expect(r.getBoundingClientRect().width).toBe(largeurRail);
  expect(screen.container.querySelector('.ui-sidebar-menu')).not.toHaveClass('_collapsed');

  await screen.getByRole('button', { name: 'Contenu' }).hover();
  await expect.poll(() => panel(screen.container).classList.contains('_collapsed')).toBe(true);
  expect(panel(screen.container)).not.toHaveClass('_floating');
});

test('openOnHover : le focus clavier déploie le rail, sa sortie le replie', async () => {
  const screen = await render(<Shell defaultCollapsed openOnHover />);

  screen.container.querySelector<HTMLElement>('.ui-sidebar-menu-action')!.focus();
  await expect.poll(() => panel(screen.container).classList.contains('_floating')).toBe(true);

  screen.getByRole('button', { name: 'Contenu' }).element().focus();
  await expect.poll(() => panel(screen.container).classList.contains('_collapsed')).toBe(true);
});

test('un menu autonome ne se replie pas avec la barre voisine du même fournisseur', async () => {
  const screen = await render(
    <UiSidebarProvider>
      <Trigger />
      <UiSidebar aria-label="Barre" defaultCollapsed />
      <UiSidebarMenu items={ITEMS} aria-label="Menu autonome" />
    </UiSidebarProvider>,
  );

  await expect
    .element(screen.getByRole('button', { name: 'Basculer' }))
    .toHaveAttribute('aria-expanded', 'false');
  expect(screen.container.querySelector('nav[aria-label="Menu autonome"]')).not.toHaveClass(
    '_collapsed',
  );
});

test('sous <StrictMode>, le déclencheur trouve toujours la barre', async () => {
  const screen = await render(
    <StrictMode>
      <Shell />
    </StrictMode>,
  );

  await expect
    .element(screen.getByRole('button', { name: 'Basculer' }))
    .toHaveAttribute('aria-controls', panel(screen.container).id);
});

test('la ref désigne le panneau, et motionDisabled coupe la durée', async () => {
  let node: HTMLElement | null = null;
  const screen = await render(
    <Shell
      ref={(n) => {
        node = n;
      }}
      motionDisabled
    />,
  );

  expect(node).toBe(panel(screen.container));
  expect(rail(screen.container)!.style.getPropertyValue('--ui-motion-duration')).toBe('0ms');
});

// --- Présentation superposée ----------------------------------------------------

test('superposée : un <dialog> modal, ouvert par le déclencheur, qui bloque le défilement', async () => {
  const onShow = vi.fn();
  const screen = await render(<Shell mode="overlay" onShow={onShow} />);
  const d = dialog(screen.container)!;
  const trigger = screen.getByRole('button', { name: 'Basculer' });

  expect(d.open).toBe(false);
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(rail(screen.container)).toBeNull();

  await trigger.click();

  await expect.poll(() => d.open).toBe(true);
  expect(d.matches(':modal')).toBe(true);
  expect(d).toHaveClass('_overlay');
  expect(document.body.style.overflow).toBe('hidden');
  expect(onShow).toHaveBeenCalledTimes(1);
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
});

test('Échap ferme, rend le focus au déclencheur, et libère le défilement', async () => {
  const onHide = vi.fn();
  const screen = await render(<Shell mode="overlay" onHide={onHide} />);
  const d = dialog(screen.container)!;
  const trigger = screen.getByRole('button', { name: 'Basculer' });

  trigger.element().focus();
  await trigger.click();
  await expect.poll(() => d.open).toBe(true);

  d.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

  await expect.poll(() => d.open).toBe(false);
  expect(onHide).toHaveBeenCalledTimes(1);
  expect(document.body.style.overflow).toBe('');
  await expect.poll(() => document.activeElement).toBe(trigger.element());
});

test('dismissable à faux : ni Échap ni le voile ne ferment', async () => {
  const screen = await render(<Shell mode="overlay" defaultVisible dismissable={false} />);
  const d = dialog(screen.container)!;
  await expect.poll(() => d.open).toBe(true);

  d.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  d.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 2000, clientY: 10 }));
  await tick();

  expect(d.open).toBe(true);
});

test('un clic sur le voile ferme, un clic dans le panneau non', async () => {
  const screen = await render(<Shell mode="overlay" defaultVisible />);
  const d = dialog(screen.container)!;
  await expect.poll(() => d.open).toBe(true);
  const box = d.getBoundingClientRect();

  // Sur le bord du panneau lui-même : la cible est le dialogue, mais DANS sa boîte.
  d.dispatchEvent(
    new MouseEvent('click', { bubbles: true, clientX: box.right - 1, clientY: box.top + 5 }),
  );
  await tick();
  expect(d.open).toBe(true);

  d.dispatchEvent(
    new MouseEvent('click', { bubbles: true, clientX: box.right + 50, clientY: box.top + 5 }),
  );
  await expect.poll(() => d.open).toBe(false);
});

test('le bouton de fermeture ferme, et showCloseButton le retire', async () => {
  const screen = await render(
    <Shell mode="overlay" defaultVisible closeAriaLabel="Fermer le menu" />,
  );
  const d = dialog(screen.container)!;
  await expect.poll(() => d.open).toBe(true);

  await screen.getByRole('button', { name: 'Fermer le menu' }).click();
  await expect.poll(() => d.open).toBe(false);

  await screen.rerender(
    <Shell mode="overlay" defaultVisible showCloseButton={false} closeAriaLabel="Fermer le menu" />,
  );
  expect(screen.container.querySelector('.ui-sidebar-close')).toBeNull();
});

test('sans voile, le panneau est non modal et la page reste utilisable', async () => {
  const screen = await render(<Shell mode="overlay" defaultVisible backdrop={false} />);
  const d = dialog(screen.container)!;

  await expect.poll(() => d.open).toBe(true);
  expect(d.matches(':modal')).toBe(false);
  expect(document.body.style.overflow).toBe('');

  // Non modal : Échap ferme quand même, par `keydown`.
  d.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await expect.poll(() => d.open).toBe(false);
});

test('cantonnée, la barre est non modale et positionnée dans son conteneur', async () => {
  const screen = await render(
    <div style={{ position: 'relative', height: 300 }}>
      <Shell mode="overlay" defaultVisible contained />
    </div>,
  );
  const d = dialog(screen.container)!;

  await expect.poll(() => d.open).toBe(true);
  expect(d).toHaveClass('_contained');
  expect(d.matches(':modal')).toBe(false);
  expect(getComputedStyle(d).position).toBe('absolute');
  expect(document.body.style.overflow).toBe('');
});

// --- Adaptatif -------------------------------------------------------------------

test('responsive : sous le point de rupture la barre se superpose, au-dessus elle revient au rail', async () => {
  const onVisibleChange = vi.fn();
  const onHide = vi.fn();
  function Demo({ breakpoint }: { breakpoint: string }) {
    const [visible, setVisible] = useState(false);
    return (
      <Shell
        responsive
        breakpoint={breakpoint}
        visible={visible}
        onVisibleChange={(v) => {
          onVisibleChange(v);
          setVisible(v);
        }}
        onHide={onHide}
      />
    );
  }
  // Une fenêtre de test fait bien moins de 5000px, et bien plus de 10px.
  const screen = await render(<Demo breakpoint="5000px" />);
  expect(dialog(screen.container)).not.toBeNull();

  await screen.getByRole('button', { name: 'Basculer' }).click();
  await expect.poll(() => dialog(screen.container)?.open).toBe(true);

  await screen.rerender(<Demo breakpoint="10px" />);

  // Revenue en statique panneau ouvert : `visible` retombe, et la fermeture s'annonce.
  await expect.poll(() => rail(screen.container)).not.toBeNull();
  await expect.poll(() => onVisibleChange.mock.lastCall?.[0]).toBe(false);
  expect(onHide).toHaveBeenCalledTimes(1);

  await screen.rerender(<Demo breakpoint="5000px" />);
  await tick();
  expect(dialog(screen.container)!.open).toBe(false);
});
