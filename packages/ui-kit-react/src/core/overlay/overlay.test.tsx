import { useRef } from 'react';
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
