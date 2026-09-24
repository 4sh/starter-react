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
  // Nommés `set*` et non `*Ref` : ce sont des refs de RAPPEL, des fonctions. Les
  // appeler `*Ref` les ferait passer pour des objets `RefObject`, ce que le
  // linter des hooks relève à juste titre en refusant de les lire au rendu.
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

/** Un panneau du calque supérieur : `[popover]` ou `<dialog>`. */
function isTopLayerPanel(element: HTMLElement): boolean {
  return element.hasAttribute('popover') || element instanceof HTMLDialogElement;
}

/**
 * Le panneau est-il rendu, donc mesurable ?
 *
 * Un panneau du calque supérieur ne l'est qu'une fois DANS le calque. Avant,
 * il est en `display: none` : sa taille vaut zéro, et Floating UI lui cherche
 * un parent de positionnement dans le DOM au lieu du viewport. La position
 * obtenue est fausse, et l'ancienne version la retenait quand même : le
 * panneau apparaissait ailleurs, puis sautait à sa place dès que son
 * redimensionnement relançait une mesure. Cela arrive dès que l'effet qui
 * appelle `showPopover()` court après la mesure, ce qui dépend de la priorité
 * de la mise à jour React (un survol, une minuterie), pas du composant.
 */
function isMeasurable(element: HTMLElement): boolean {
  if (element.hasAttribute('popover')) return element.matches(':popover-open');
  if (element instanceof HTMLDialogElement) return element.open;
  return element.getClientRects().length > 0;
}

/**
 * Point de croissance du panneau : le centre de son ancre, ramené sur le bord
 * du panneau qui la touche.
 *
 * L'échelle d'entrée part de là, donc le panneau grandit depuis ce qui l'a
 * ouvert : le pointeur d'un menu contextuel, le déclencheur d'un popover, et
 * ce même retourné ou décalé contre un bord du viewport. Calculé en dernier,
 * sur la position finale.
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
 * Positionnement ancré : le seul fichier du kit qui connaisse Floating UI.
 *
 * Aucun composant n'importe la librairie. Le jour où elle change, où le
 * positionnement d'ancrage CSS (`anchor-name`, `position-try`) devient utilisable
 * partout, ou où l'on décide de s'en passer, c'est ce fichier qui change, et lui
 * seul. C'est la décision D6, et `pnpm deps:check` la fait respecter.
 *
 * Ce qui justifie la librairie ici : la détection de collision dans un conteneur
 * défilant, le retournement, et le maintien de la position pendant le
 * défilement. Écrit à la main, c'est le genre de code qui a l'air fini et se
 * remet à bouger à chaque cas limite.
 *
 * Le cycle de vie, lui, est tenu ici plutôt que confié à `useFloating`, parce
 * que trois règles en dépendent, toutes mesurées sur un panneau réel :
 *
 * 1. **La position passe par `top` / `left`, jamais par `transform`.** Le
 *    mouvement d'entrée anime `scale`, et une propriété de transformation
 *    individuelle s'applique PAR-DESSUS `transform` : elle réduisait donc les
 *    coordonnées elles-mêmes, vers l'origine du document. Le panneau partait à
 *    96 % de sa position et glissait jusqu'à elle. Mesuré : 127 px au-dessus du
 *    pointeur pour un menu contextuel en bas de sa page de doc, 331 px pour le
 *    popover de l'Overview.
 * 2. **On ne mesure qu'un panneau rendu** (voir `isMeasurable`), et le résultat
 *    n'est retenu que s'il est toujours d'actualité.
 * 3. **Fermé, le panneau garde sa dernière position.** Sa sortie s'anime
 *    `allow-discrete`, donc il reste peint le temps du fondu : le déplacer à ce
 *    moment le montre ailleurs. Mesuré sur une version qui le posait à
 *    l'origine : un flash en haut à gauche de l'écran à chaque fermeture.
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
  // Deux états séparés, et non un objet : une ref de rappel recréée détache
  // puis rattache le MÊME nœud dans un seul rendu, et un objet neuf ferait
  // relancer toute la mesure à chaque rendu du composant.
  const setPanel = useCallback((node: P | null) => {
    setPanelElement(node);
    if (node) setTopLayer(isTopLayerPanel(node));
  }, []);

  // --- Ancre virtuelle -------------------------------------------------
  // STABLE : son rectangle se relit à chaque mesure. Recréée à chaque
  // déplacement du point, elle faisait rebrancher écouteurs et observateurs à
  // chaque défilement d'un menu contextuel, qui reprojette son point.
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
      // Une micro-tâche d'abord : l'effet qui ouvre le panneau vit dans le
      // composant, déclaré après ce crochet, et court donc après lui dans le
      // même passage. Quand il court plus tard encore, `isMeasurable` refuse la
      // mesure, et le redimensionnement du panneau à son ouverture la relance.
      await Promise.resolve();
      if (!active || current !== ticket || !isMeasurable(panel)) return;

      const data = await computePosition(anchor, panel, {
        placement,
        strategy: 'absolute',
        middleware,
      });
      // Une mesure dépassée par une plus récente, ou arrivée après la
      // fermeture, n'a plus rien à dire.
      if (!active || current !== ticket) return;

      const next = toLayout(data, panel);
      // Défiler la page ne change pas des coordonnées de document : aucun
      // rendu tant que rien n'a bougé.
      if (last && sameLayout(last, next)) return;
      const first = last === null;
      last = next;
      // Synchrone, pour que la position arrive avant la prochaine image.
      flushSync(() => {
        setLayout(next);
        setPositioned(true);
      });
      // Le premier placement peut changer la position CSS du panneau (attente
      // en `fixed`, puis `absolute`), donc le parent qui a servi à le mesurer :
      // une mesure de plus le confirme, et ne rend rien si rien n'a bougé.
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

  // La prochaine ouverture attend de nouveau sa position. Posé au démontage de
  // la session, pas à chaque changement d'ancre : un menu contextuel déplacé
  // pendant qu'il est ouvert se replace, il ne repart pas de l'état fermé.
  useEffect(() => {
    if (!open) return;
    return () => setPositioned(false);
  }, [open]);

  let panelStyle: CSSProperties;
  if (layout) {
    // Aussi pendant l'attente d'une réouverture : le panneau reste où il était
    // jusqu'à sa nouvelle position, sans passer par un coin de l'écran.
    panelStyle = {
      position: 'absolute',
      top: layout.y,
      left: layout.x,
      transformOrigin: layout.origin,
    };
  } else if (open && topLayer) {
    // Première ouverture : pas encore de place, et le panneau est déjà ouvert,
    // parfois déjà focalisé (`showModal()` le fait tout seul). À l'origine du
    // DOCUMENT, ce focus faisait défiler la page tout en haut (mesuré sur
    // l'Overview) ; à celle du VIEWPORT, il est déjà visible. Invisible pendant
    // cette attente, il n'est jamais peint là. Réservé au calque supérieur :
    // ailleurs, `fixed` fausserait le parent de positionnement mesuré.
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
