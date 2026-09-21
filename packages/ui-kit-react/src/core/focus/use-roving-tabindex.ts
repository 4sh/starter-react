'use client';

import { useCallback, useState, type KeyboardEvent } from 'react';

export type RovingOrientation = 'vertical' | 'horizontal' | 'both';

export interface UiRovingOptions {
  /** Nombre d'éléments navigables. */
  count: number;
  /** Axe des flèches qui déplacent le focus. */
  orientation?: RovingOrientation;
  /** Repasser du dernier au premier, et inversement. */
  loop?: boolean;
  /** Index actif imposé. Renseigné, le conteneur est contrôlé. */
  activeIndex?: number;
  defaultActiveIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  /** Index à sauter, typiquement les entrées désactivées. */
  isDisabled?: (index: number) => boolean;
}

export interface UiRovingResult {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  /** `tabIndex` à poser sur l'élément d'index donné. */
  tabIndexFor: (index: number) => 0 | -1;
  /** À brancher sur le conteneur. */
  onKeyDown: (event: KeyboardEvent) => void;
}

/**
 * Focus glissant : un seul arrêt de tabulation pour tout un groupe, les flèches
 * naviguant à l'intérieur.
 *
 * C'est le motif que le clavier attend d'une liste, d'un menu ou d'un groupe de
 * boutons : Tab entre dans le groupe et en sort, il ne le parcourt pas. Un
 * groupe de vingt entrées qui serait vingt arrêts de tabulation rend le reste de
 * la page inatteignable au clavier.
 *
 * Le composant reste maître du rendu : ce crochet ne dit que quel index est
 * actif et quel `tabIndex` poser. C'est du **contrat de Design System**, pas de
 * la mécanique de navigateur : il n'a rien à faire dans une librairie tierce.
 */
export function useRovingTabIndex({
  count,
  orientation = 'vertical',
  loop = true,
  activeIndex,
  defaultActiveIndex = 0,
  onActiveIndexChange,
  isDisabled,
}: UiRovingOptions): UiRovingResult {
  const [internal, setInternal] = useState(defaultActiveIndex);
  const isControlled = activeIndex !== undefined;
  const current = isControlled ? activeIndex : internal;

  const setActiveIndex = useCallback(
    (next: number) => {
      if (!isControlled) setInternal(next);
      onActiveIndexChange?.(next);
    },
    [isControlled, onActiveIndexChange],
  );

  /** Prochain index navigable dans une direction, en sautant les désactivés. */
  const step = useCallback(
    (from: number, direction: 1 | -1): number => {
      if (count === 0) return from;
      let next = from;
      // Borné par `count` : sans cette borne, un groupe entièrement désactivé
      // ferait tourner la boucle indéfiniment.
      for (let tried = 0; tried < count; tried += 1) {
        next += direction;
        if (next < 0) {
          if (!loop) return from;
          next = count - 1;
        } else if (next >= count) {
          if (!loop) return from;
          next = 0;
        }
        if (!isDisabled?.(next)) return next;
      }
      return from;
    },
    [count, loop, isDisabled],
  );

  const edge = useCallback(
    (direction: 1 | -1): number => {
      const start = direction === 1 ? -1 : count;
      return step(start, direction);
    },
    [count, step],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const vertical = orientation === 'vertical' || orientation === 'both';
      const horizontal = orientation === 'horizontal' || orientation === 'both';

      let next: number | null = null;
      if (vertical && event.key === 'ArrowDown') next = step(current, 1);
      else if (vertical && event.key === 'ArrowUp') next = step(current, -1);
      else if (horizontal && event.key === 'ArrowRight') next = step(current, 1);
      else if (horizontal && event.key === 'ArrowLeft') next = step(current, -1);
      else if (event.key === 'Home') next = edge(1);
      else if (event.key === 'End') next = edge(-1);

      if (next === null) return;
      // Consommée seulement si elle a servi : une flèche horizontale dans une
      // liste verticale doit continuer à déplacer le curseur dans un champ.
      event.preventDefault();
      if (next !== current) setActiveIndex(next);
    },
    [orientation, current, step, edge, setActiveIndex],
  );

  const tabIndexFor = useCallback(
    (index: number): 0 | -1 => (index === current ? 0 : -1),
    [current],
  );

  return { activeIndex: current, setActiveIndex, tabIndexFor, onKeyDown };
}
