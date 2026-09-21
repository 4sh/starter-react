'use client';

import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useFloating,
  type Placement,
} from '@floating-ui/react-dom';
import { useMemo, type CSSProperties } from 'react';

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
   * La position a été calculée au moins une fois depuis l'ouverture.
   *
   * `computePosition` est **asynchrone** : entre l'ouverture et sa réponse, le
   * panneau porte encore la position d'avant. Peindre cette image donne le
   * défaut classique du panneau qui apparaît au mauvais endroit puis se
   * replace tout seul. Un panneau doit donc rester dans son état FERMÉ
   * (invisible) tant que ceci vaut `false` : c'est le rôle de l'attribut
   * `data-unpositioned`, que `utils.overlay-motion` reconnaît.
   */
  isPositioned: boolean;
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
 */
export function useUiPosition<A extends HTMLElement, P extends HTMLElement>({
  placement = 'bottom-start',
  offset: gap = 8,
  flip: allowFlip = true,
  matchWidth = false,
  open = true,
  anchorPoint,
}: UiPositionOptions = {}): UiPositionResult<A, P> {
  // Recréée dès que le point bouge : c'est son changement d'identité qui fait
  // remesurer Floating UI. Les coordonnées sont extraites d'abord, l'objet
  // `anchorPoint` étant presque toujours un littéral, donc neuf à chaque rendu.
  const { x: anchorX, y: anchorY } = anchorPoint ?? {};
  const virtualAnchor = useMemo(
    () =>
      anchorX === undefined || anchorY === undefined
        ? null
        : { getBoundingClientRect: () => new DOMRect(anchorX, anchorY, 0, 0) },
    [anchorX, anchorY],
  );

  const middleware = [
    offset(typeof gap === 'number' ? gap : { mainAxis: gap.main ?? 0, crossAxis: gap.cross ?? 0 }),
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
  ];

  const floating = useFloating({
    placement,
    middleware,
    ...(virtualAnchor ? { elements: { reference: virtualAnchor } } : null),
    // Transmis à Floating UI, et pas seulement lu ici : c'est ce qui remet
    // `isPositioned` à faux à la fermeture, donc ce qui fait qu'une réouverture
    // attend de nouveau sa position au lieu de peindre l'ancienne.
    open,
    // `autoUpdate` accroche le défilement, le redimensionnement et le
    // redimensionnement de l'ancre : sans lui le panneau reste où il a été posé.
    // Il n'est branché que pendant l'ouverture, sinon il observe pour rien.
    whileElementsMounted: open ? autoUpdate : undefined,
  });

  return {
    setAnchor: floating.refs.setReference as (node: A | null) => void,
    setPanel: floating.refs.setFloating as (node: P | null) => void,
    panelStyle: {
      position: floating.strategy,
      top: 0,
      left: 0,
      transform: `translate(${Math.round(floating.x)}px, ${Math.round(floating.y)}px)`,
    },
    placement: floating.placement,
    isPositioned: floating.isPositioned,
  };
}
