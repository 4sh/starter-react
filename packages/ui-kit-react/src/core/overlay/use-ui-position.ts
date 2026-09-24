'use client';

import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
  type ComputePositionReturn,
  type Middleware,
  type Placement,
  type VirtualElement,
} from '@floating-ui/react-dom';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';

export type UiPlacement = Placement;

export interface UiPositionOptions {
  /** Position souhaitée. Retournée automatiquement si elle ne tient pas. */
  placement?: UiPlacement;
  /**
   * Écart entre l'ancre et le panneau, en pixels. Un nombre ne règle que l'axe
   * principal ; la forme objet ouvre l'axe transverse, qui sert à faire
   * coïncider un contenu avec celui de l'ancre plutôt que les boîtes (le
   * premier item d'un sous-menu en cascade avec l'item parent, décalé de la
   * gouttière du panneau).
   */
  offset?: number | { main?: number; cross?: number };
  /** Retourner le panneau du côté opposé quand la place manque. */
  flip?: boolean;
  /** Aligner la largeur du panneau sur celle de l'ancre. */
  matchWidth?: boolean;
  /** Suivre l'ancre pendant le défilement et le redimensionnement. */
  open?: boolean;
  /**
   * Ancre virtuelle : un POINT du viewport, quand il n'y a pas d'élément à
   * viser (un menu contextuel s'ancre sur le pointeur). Renseigné, il remplace
   * l'élément posé par `setAnchor`.
   *
   * Le point est une ancre CONTRÔLÉE : changer ses coordonnées suffit à
   * replacer le panneau. Une ancre ÉLÉMENT qu'on déplacerait en CSS, elle, ne
   * serait pas resuivie : `autoUpdate` observe le défilement et les
   * redimensionnements, pas un déplacement d'auteur.
   */
  anchorPoint?: { x: number; y: number };
}

export interface UiPositionResult<A extends HTMLElement, P extends HTMLElement> {
  // Nommés `set*`, pas `*Ref` : le linter des hooks prendrait ces refs de rappel
  // pour des `RefObject` et refuserait de les lire au rendu.
  setAnchor: (node: A | null) => void;
  setPanel: (node: P | null) => void;
  /** Styles à poser sur le panneau. */
  panelStyle: CSSProperties;
  /** Position réellement retenue, une fois les retournements appliqués. */
  placement: UiPlacement;
  /**
   * La position a été calculée pour l'ouverture EN COURS.
   *
   * `computePosition` est **asynchrone** : entre l'ouverture et sa réponse, le
   * panneau n'a pas encore sa place. Il doit donc rester dans son état FERMÉ
   * (invisible) tant que ceci vaut `false` : c'est le rôle de l'attribut
   * `data-unpositioned`, que `utils.overlay-motion` reconnaît. Faux dès la
   * fermeture, pour que la prochaine ouverture attende de nouveau sa position.
   */
  isPositioned: boolean;
}

/** Dernière position calculée. Gardée après la fermeture : la sortie s'anime là. */
interface Layout {
  x: number;
  y: number;
  placement: Placement;
  origin: string;
}

function isTopLayerPanel(element: HTMLElement): boolean {
  return element.hasAttribute('popover') || element instanceof HTMLDialogElement;
}

/**
 * Le panneau est-il rendu, donc mesurable ? Un panneau du calque supérieur ne
 * l'est qu'une fois dans le calque : avant, en `display: none`, sa mesure est fausse.
 */
function isMeasurable(element: HTMLElement): boolean {
  if (element.hasAttribute('popover')) return element.matches(':popover-open');
  if (element instanceof HTMLDialogElement) return element.open;
  return element.getClientRects().length > 0;
}

/**
 * Point de croissance du panneau : le centre de son ancre, ramené sur le bord
 * du panneau qui la touche. Dernier middleware : il lit la position finale.
 */
const growFromAnchor: Middleware = {
  name: 'growFromAnchor',
  fn({ x, y, placement, rects }) {
    const side = placement.split('-')[0];
    const inside = (value: number, max: number) => Math.round(Math.min(Math.max(value, 0), max));
    const ax = inside(rects.reference.x + rects.reference.width / 2 - x, rects.floating.width);
    const ay = inside(rects.reference.y + rects.reference.height / 2 - y, rects.floating.height);
    const origin =
      side === 'top'
        ? `${ax}px 100%`
        : side === 'bottom'
          ? `${ax}px 0`
          : side === 'left'
            ? `100% ${ay}px`
            : `0 ${ay}px`;
    return { data: { origin } };
  },
};

function toLayout(
  { x, y, placement, middlewareData }: ComputePositionReturn,
  element: Element,
): Layout {
  // Arrondi au pixel PHYSIQUE : un bord posé entre deux pixels floute le texte.
  const ratio = element.ownerDocument.defaultView?.devicePixelRatio ?? 1;
  const snap = (value: number) => Math.round(value * ratio) / ratio;
  const origin: unknown = middlewareData.growFromAnchor?.origin;
  return {
    x: snap(x),
    y: snap(y),
    placement,
    origin: typeof origin === 'string' ? origin : '50% 50%',
  };
}

function sameLayout(a: Layout, b: Layout): boolean {
  return a.x === b.x && a.y === b.y && a.placement === b.placement && a.origin === b.origin;
}

/**
 * Positionnement ancré : le seul fichier du kit qui connaisse Floating UI (décision D6).
 *
 * Le cycle de vie est tenu ici plutôt que par `useFloating` : la position passe
 * par `top`/`left` (une échelle d'entrée s'appliquerait par-dessus un
 * `transform`), un panneau n'est mesuré qu'une fois rendu, et il garde sa
 * dernière position pendant sa sortie.
 */
export function useUiPosition<A extends HTMLElement, P extends HTMLElement>({
  placement = 'bottom-start',
  offset: gap = 8,
  flip: allowFlip = true,
  matchWidth = false,
  open = true,
  anchorPoint,
}: UiPositionOptions = {}): UiPositionResult<A, P> {
  const [anchorElement, setAnchorElement] = useState<A | null>(null);
  const [panel, setPanelElement] = useState<P | null>(null);
  const [topLayer, setTopLayer] = useState(false);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [positioned, setPositioned] = useState(false);

  const setAnchor = useCallback((node: A | null) => setAnchorElement(node), []);
  // Deux états, pas un objet : une ref de rappel recréée rattache le même nœud,
  // et un objet neuf relancerait la mesure à chaque rendu.
  const setPanel = useCallback((node: P | null) => {
    setPanelElement(node);
    if (node) setTopLayer(isTopLayerPanel(node));
  }, []);

  // --- Ancre virtuelle -------------------------------------------------
  // Stable : son rectangle se relit à chaque mesure, donc déplacer le point ne
  // rebranche ni écouteurs ni observateurs.
  const { x: anchorX, y: anchorY } = anchorPoint ?? {};
  const hasPoint = anchorX !== undefined && anchorY !== undefined;
  const pointRef = useRef({ x: 0, y: 0 });
  const virtualAnchor = useMemo<VirtualElement>(
    () => ({
      getBoundingClientRect: () => new DOMRect(pointRef.current.x, pointRef.current.y, 0, 0),
    }),
    [],
  );
  const anchor = hasPoint ? virtualAnchor : anchorElement;

  /** Mesure de la session en cours, pour qu'un point déplacé la relance. */
  const updateRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (anchorX === undefined || anchorY === undefined) return;
    pointRef.current = { x: anchorX, y: anchorY };
    updateRef.current?.();
  }, [anchorX, anchorY]);

  const mainGap = typeof gap === 'number' ? gap : (gap.main ?? 0);
  const crossGap = typeof gap === 'number' ? 0 : (gap.cross ?? 0);

  // --- Une session de positionnement par ouverture ----------------------
  useEffect(() => {
    if (!open || !anchor || !panel) return;

    let active = true;
    let ticket = 0;
    let last: Layout | null = null;

    const middleware: Middleware[] = [
      offset({ mainAxis: mainGap, crossAxis: crossGap }),
      ...(allowFlip ? [flip({ padding: 8 })] : []),
      shift({ padding: 8 }),
      ...(matchWidth
        ? [
            size({
              apply({ rects, elements }) {
                elements.floating.style.minWidth = `${rects.reference.width}px`;
              },
            }),
          ]
        : []),
      growFromAnchor,
    ];

    const measure = async (current: number) => {
      // Micro-tâche d'abord : l'effet du composant qui ouvre le panneau court après
      // ce crochet. Plus tard encore, `isMeasurable` refuse et le redimensionnement relance.
      await Promise.resolve();
      if (!active || current !== ticket || !isMeasurable(panel)) return;

      const data = await computePosition(anchor, panel, {
        placement,
        strategy: 'absolute',
        middleware,
      });
      // Dépassée par une mesure plus récente, ou arrivée après la fermeture : ignorée.
      if (!active || current !== ticket) return;

      const next = toLayout(data, panel);
      // Défiler ne change pas des coordonnées de document : aucun rendu si rien n'a bougé.
      if (last && sameLayout(last, next)) return;
      const first = last === null;
      last = next;
      // Synchrone, pour que la position arrive avant la prochaine image.
      flushSync(() => {
        setLayout(next);
        setPositioned(true);
      });
      // Le premier placement fait passer le panneau de `fixed` à `absolute`, donc
      // change son parent de positionnement : une mesure de plus le confirme.
      if (first) update();
    };

    const update = () => void measure(++ticket);
    updateRef.current = update;
    const stop = autoUpdate(anchor, panel, update);
    // Filet : l'entrée dans le calque sans changement de taille (réouverture
    // pendant la sortie) ne réveille pas l'observateur de redimensionnement.
    panel.addEventListener('toggle', update);

    return () => {
      active = false;
      stop();
      panel.removeEventListener('toggle', update);
      if (updateRef.current === update) updateRef.current = null;
    };
  }, [open, anchor, panel, placement, mainGap, crossGap, allowFlip, matchWidth]);

  // Remis à faux à la fermeture, pas à chaque changement d'ancre : un menu
  // contextuel déplacé ouvert se replace sans repasser par l'état fermé.
  useEffect(() => {
    if (!open) return;
    return () => setPositioned(false);
  }, [open]);

  let panelStyle: CSSProperties;
  if (layout) {
    // Fermé ou en attente d'une réouverture, le panneau reste à sa dernière position.
    panelStyle = {
      position: 'absolute',
      top: layout.y,
      left: layout.x,
      transformOrigin: layout.origin,
    };
  } else if (open && topLayer) {
    // Calque supérieur, première ouverture : en `fixed`, le focus déjà posé par
    // `showModal()` ne fait pas défiler la page. Ailleurs, `fixed` fausserait la mesure.
    panelStyle = { position: 'fixed', top: 0, left: 0 };
  } else {
    panelStyle = { position: 'absolute', top: 0, left: 0 };
  }

  return {
    setAnchor,
    setPanel,
    panelStyle,
    placement: layout?.placement ?? placement,
    isPositioned: open && positioned,
  };
}
