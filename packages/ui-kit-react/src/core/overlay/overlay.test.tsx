import { useEffect, useRef, useState } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { useCloseOnNavigation } from './use-close-on-navigation';
import { useUiDismiss } from './use-ui-dismiss';
import { useUiPosition } from './use-ui-position';
import { useUiScrollLock } from './use-ui-scroll-lock';

// --- useUiDismiss ----------------------------------------------------------

function Panneau({
  onDismiss,
  open = true,
  ...options
}: { onDismiss: (r: 'outside' | 'escape') => void; open?: boolean } & Partial<{
  closeOnOutside: boolean;
  closeOnEscape: boolean;
}>) {
  const panelRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);

  useUiDismiss({ open, onDismiss, panelRef, anchorRef, ...options });

  return (
    <div>
      <button type="button" ref={anchorRef} data-ancre>
        ancre
      </button>
      <div ref={panelRef} data-panneau>
        <button type="button" data-dedans>
          dedans
        </button>
      </div>
      <button type="button" data-dehors>
        dehors
      </button>
    </div>
  );
}

const pointerdown = (el: Element) =>
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

test('un clic à l’extérieur ferme', async () => {
  const onDismiss = vi.fn();
  const screen = await render(<Panneau onDismiss={onDismiss} />);

  pointerdown(screen.container.querySelector('[data-dehors]')!);
  expect(onDismiss).toHaveBeenCalledWith('outside');
});

test('un clic dans le panneau ne ferme pas', async () => {
  const onDismiss = vi.fn();
  const screen = await render(<Panneau onDismiss={onDismiss} />);

  pointerdown(screen.container.querySelector('[data-dedans]')!);
  expect(onDismiss).not.toHaveBeenCalled();
});

// Sans cette exception, le clic fermerait le panneau et l'ancre le rouvrirait
// dans la foulée : le panneau clignoterait sans jamais se fermer.
test('un clic sur l’ancre ne ferme pas', async () => {
  const onDismiss = vi.fn();
  const screen = await render(<Panneau onDismiss={onDismiss} />);

  pointerdown(screen.container.querySelector('[data-ancre]')!);
  expect(onDismiss).not.toHaveBeenCalled();
});

test('Échap ferme', async () => {
  const onDismiss = vi.fn();
  await render(<Panneau onDismiss={onDismiss} />);

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(onDismiss).toHaveBeenCalledWith('escape');
});

test('fermé, aucun écouteur n’est posé', async () => {
  const onDismiss = vi.fn();
  const screen = await render(<Panneau onDismiss={onDismiss} open={false} />);

  pointerdown(screen.container.querySelector('[data-dehors]')!);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(onDismiss).not.toHaveBeenCalled();
});

test('closeOnOutside=false garde le panneau ouvert au clic dehors', async () => {
  const onDismiss = vi.fn();
  const screen = await render(<Panneau onDismiss={onDismiss} closeOnOutside={false} />);

  pointerdown(screen.container.querySelector('[data-dehors]')!);
  expect(onDismiss).not.toHaveBeenCalled();
});

// --- useUiScrollLock -------------------------------------------------------

function Verrou({ actif, imbrique = false }: { actif: boolean; imbrique?: boolean }) {
  useUiScrollLock(actif);
  useUiScrollLock(imbrique);
  return <div data-verrou>{String(actif)}</div>;
}

test('le verrou fige le défilement de l’arrière-plan', async () => {
  await render(<Verrou actif />);

  expect(document.body.style.overflow).toBe('hidden');
});

test('inactif, le verrou ne touche à rien', async () => {
  const avant = document.body.style.overflow;
  await render(<Verrou actif={false} />);

  expect(document.body.style.overflow).toBe(avant);
});

// Deux couches ouvertes : refermer la seconde ne doit pas rendre le défilement
// pendant que la première est encore là.
test('les verrous se comptent', async () => {
  const screen = await render(<Verrou actif imbrique />);

  expect(document.body.style.overflow).toBe('hidden');
  screen.unmount();
  await expect.poll(() => document.body.style.overflow).toBe('');
});

// --- useCloseOnNavigation --------------------------------------------------

function SurNavigation({ onClose }: { onClose: () => void }) {
  useCloseOnNavigation(true, onClose);
  return <div data-navigation />;
}

test('un changement de page ferme', async () => {
  const onClose = vi.fn();
  await render(<SurNavigation onClose={onClose} />);

  const depart = window.location.href;
  window.history.pushState({}, '', '/une-autre-page');
  expect(onClose).toHaveBeenCalledTimes(1);
  window.history.replaceState({}, '', depart);
});

// Un panneau qui pousse son propre état dans la requête ne doit pas se fermer
// lui-même.
test('un changement de requête seul ne ferme pas', async () => {
  const onClose = vi.fn();
  await render(<SurNavigation onClose={onClose} />);

  const depart = window.location.href;
  window.history.pushState({}, '', `${window.location.pathname}?filtre=2024`);
  expect(onClose).not.toHaveBeenCalled();
  window.history.replaceState({}, '', depart);
});

// --- useUiPosition ---------------------------------------------------------

function Ancre({ placement = 'bottom-start' as const, matchWidth = false }) {
  const {
    setAnchor,
    setPanel,
    panelStyle,
    placement: resolved,
  } = useUiPosition<HTMLButtonElement, HTMLDivElement>({ placement, matchWidth });

  return (
    <div style={{ padding: 200 }}>
      <button type="button" ref={setAnchor} data-ancre style={{ width: 180 }}>
        ancre
      </button>
      <div
        ref={setPanel}
        data-panneau
        data-placement={resolved}
        style={{ ...panelStyle, width: 120, height: 60, background: '#eee' }}
      >
        panneau
      </div>
    </div>
  );
}

test('le panneau se place sous l’ancre, alignés à gauche', async () => {
  const screen = await render(<Ancre />);
  const ancre = screen.container.querySelector('[data-ancre]')!;
  const panneau = screen.container.querySelector('[data-panneau]')!;

  await expect
    .poll(() => panneau.getBoundingClientRect().top > ancre.getBoundingClientRect().bottom)
    .toBe(true);

  const ecart = panneau.getBoundingClientRect().top - ancre.getBoundingClientRect().bottom;
  expect(Math.round(ecart)).toBe(8);
  expect(Math.round(panneau.getBoundingClientRect().left)).toBe(
    Math.round(ancre.getBoundingClientRect().left),
  );
});

test('matchWidth aligne la largeur du panneau sur l’ancre', async () => {
  const screen = await render(<Ancre matchWidth />);
  const ancre = screen.container.querySelector('[data-ancre]')!;
  const panneau = screen.container.querySelector('[data-panneau]')!;

  await expect
    .poll(() => Math.round(panneau.getBoundingClientRect().width))
    .toBe(Math.round(ancre.getBoundingClientRect().width));
});

// --- useUiPosition dans le calque supérieur ---------------------------------
//
// Piloté comme les panneaux du kit : l'état décide, un effet appelle
// `showPopover()` / `hidePopover()`. `showAfter` retarde l'ouverture réelle,
// pour reproduire un effet qui court APRÈS la mesure.

function Couche({
  open,
  showAfter = 0,
  scale,
  anchorPoint,
  focusOnShow = false,
}: {
  open: boolean;
  showAfter?: number;
  scale?: number;
  anchorPoint?: { x: number; y: number };
  focusOnShow?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { setAnchor, setPanel, panelStyle, isPositioned } = useUiPosition<
    HTMLButtonElement,
    HTMLDivElement
  >({ placement: 'bottom-start', open, anchorPoint });

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (!open) {
      if (panel.matches(':popover-open')) panel.hidePopover();
      return;
    }
    const show = () => {
      if (panel.matches(':popover-open')) return;
      panel.showPopover();
      if (focusOnShow) panel.focus();
    };
    if (!showAfter) return show();
    const timer = window.setTimeout(show, showAfter);
    return () => window.clearTimeout(timer);
  }, [open, showAfter, focusOnShow]);

  return (
    <div style={{ padding: 200 }}>
      <button type="button" ref={setAnchor} data-ancre style={{ width: 180 }}>
        ancre
      </button>
      <div
        // Ref de rappel recréée à chaque rendu, comme chez un consommateur
        // pressé : le panneau ne doit pas se remesurer pour autant.
        ref={(node) => {
          panelRef.current = node;
          setPanel(node);
        }}
        popover="manual"
        tabIndex={-1}
        data-panneau
        data-unpositioned={isPositioned ? undefined : ''}
        // `inset` et `margin` d'abord : le style navigateur du calque les pose,
        // et ils doivent céder à `top` / `left`.
        style={{ inset: 'auto', margin: 0, ...panelStyle, width: 120, height: 60, scale }}
      >
        panneau
      </div>
    </div>
  );
}

const panneauDe = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-panneau]')!;
const positionne = (panneau: HTMLElement) => !panneau.hasAttribute('data-unpositioned');

// Le défaut signalé : un menu contextuel s'ouvrait 127 px au-dessus du pointeur
// puis glissait jusqu'à lui. L'échelle d'entrée s'appliquait par-dessus le
// `transform` de positionnement, donc réduisait aussi les coordonnées.
test('une échelle sur le panneau ne déplace pas son bord ancré', async () => {
  const screen = await render(<Couche open scale={0.5} />);
  const ancre = screen.container.querySelector('[data-ancre]')!;
  const panneau = panneauDe(screen.container);

  await expect.poll(() => positionne(panneau)).toBe(true);
  expect(panneau.style.transform).toBe('');
  expect(Math.round(panneau.getBoundingClientRect().top)).toBe(
    Math.round(ancre.getBoundingClientRect().bottom + 8),
  );
});

test('le panneau grandit depuis son ancre', async () => {
  const screen = await render(<Couche open scale={0.5} anchorPoint={{ x: 40, y: 40 }} />);
  const panneau = panneauDe(screen.container);

  await expect.poll(() => positionne(panneau)).toBe(true);
  expect(panneau.style.transformOrigin).toBe('0px 0px');
  // Sous le point, de l'écart par défaut (8 px), et y reste malgré l'échelle.
  const { left, top } = panneau.getBoundingClientRect();
  expect([Math.round(left), Math.round(top)]).toEqual([40, 48]);
});

// Décalé contre le bord droit, le panneau ne commence plus au pointeur : c'est
// le pointeur qui reste le point fixe de l'échelle, pas le coin.
test('décalé contre un bord, le panneau grandit toujours depuis le pointeur', async () => {
  const x = window.innerWidth - 10;
  const screen = await render(<Couche open scale={0.5} anchorPoint={{ x, y: 40 }} />);
  const panneau = panneauDe(screen.container);

  await expect.poll(() => positionne(panneau)).toBe(true);
  const origine = parseFloat(panneau.style.transformOrigin);
  expect(origine).toBeGreaterThan(0);
  const { left, top } = panneau.getBoundingClientRect();
  expect(Math.round(left + origine * 0.5)).toBe(x);
  expect(Math.round(top)).toBe(48);
});

// Le second défaut signalé : un flash en haut à gauche de l'écran à chaque
// fermeture. La sortie s'anime avec le panneau encore peint : il doit rester
// là où il était.
test('fermé, le panneau garde sa dernière position', async () => {
  const screen = await render(<Couche open />);
  const panneau = panneauDe(screen.container);
  await expect.poll(() => positionne(panneau)).toBe(true);
  const { top, left, position } = panneau.style;

  await screen.rerender(<Couche open={false} />);
  expect(panneau.matches(':popover-open')).toBe(false);
  expect([panneau.style.position, panneau.style.top, panneau.style.left]).toEqual([
    position,
    top,
    left,
  ]);
  expect(position).toBe('absolute');
});

// Mesurer un panneau encore en `display: none` donne une taille nulle et un
// mauvais parent de positionnement. Cette position fausse ne doit pas être
// retenue, sinon le panneau apparaît ailleurs puis saute à sa place.
test('un panneau ouvert après la mesure attend d’être rendu pour se placer', async () => {
  const screen = await render(<Couche open showAfter={60} />);
  const ancre = screen.container.querySelector('[data-ancre]')!;
  const panneau = panneauDe(screen.container);

  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(panneau.matches(':popover-open')).toBe(false);
  expect(positionne(panneau)).toBe(false);

  await expect.poll(() => positionne(panneau)).toBe(true);
  expect(Math.round(panneau.getBoundingClientRect().top)).toBe(
    Math.round(ancre.getBoundingClientRect().bottom + 8),
  );
});

// Le panneau est déjà ouvert, et parfois déjà focalisé, avant d'avoir sa place.
// Posé à l'origine du DOCUMENT, ce focus faisait défiler la page tout en haut.
// Ouvert par un vrai clic, comme dans le kit : c'est la voie synchrone, celle où
// l'effet d'ouverture court avant toute mesure. Et dans un ancêtre transformé,
// comme la carte d'aperçu de l'Overview (`scale(0.9)`), où le défaut a été vu.
function OuvertureAuClic() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div style={{ height: 3000 }} />
      <button type="button" onClick={() => setOpen(true)}>
        ouvrir
      </button>
      <div style={{ transform: 'scale(0.9)' }}>
        <Couche open={open} focusOnShow />
      </div>
    </div>
  );
}

test('focaliser un panneau pas encore placé ne fait pas défiler la page', async () => {
  const screen = await render(<OuvertureAuClic />);
  const bouton = screen.getByRole('button', { name: 'ouvrir' });
  bouton.element().scrollIntoView({ block: 'center' });
  const depart = window.scrollY;
  expect(depart).toBeGreaterThan(1000);

  await bouton.click();
  const panneau = panneauDe(screen.container);
  await expect.poll(() => positionne(panneau)).toBe(true);
  expect(document.activeElement).toBe(panneau);
  expect(window.scrollY).toBe(depart);
  window.scrollTo(0, 0);
});
