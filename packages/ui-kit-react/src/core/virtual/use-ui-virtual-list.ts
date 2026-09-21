'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useRef, type CSSProperties, type Key, type RefObject } from 'react';

export interface UiVirtualListOptions {
  /** Nombre total d'entrées. */
  count: number;
  /** Hauteur d'une entrée, en pixels. Estimation suffisante, la mesure corrige. */
  itemSize: number;
  /** Entrées rendues de part et d'autre de la fenêtre visible. */
  overscan?: number;
  /** Mesurer la hauteur réelle de chaque entrée, pour des tailles variables. */
  measure?: boolean;
}

export interface UiVirtualItem {
  index: number;
  key: Key;
  /** Styles à poser sur l'entrée, qui la placent dans la liste. */
  style: CSSProperties;
  /** À poser en `ref` sur l'entrée quand `measure` est actif. */
  ref?: (node: HTMLElement | null) => void;
}

export interface UiVirtualListResult<C extends HTMLElement> {
  /** À poser sur le conteneur défilant. */
  scrollRef: RefObject<C | null>;
  /** Hauteur totale de la liste, à poser sur l'élément intérieur. */
  totalSize: number;
  /** Les entrées à rendre, une fenêtre autour de la position de défilement. */
  items: UiVirtualItem[];
  /** Amener une entrée dans la fenêtre visible. */
  scrollToIndex: (index: number, align?: 'auto' | 'start' | 'center' | 'end') => void;
}

/**
 * Défilement virtuel : le seul fichier du kit qui connaisse TanStack Virtual.
 *
 * Aucun composant n'importe la librairie. Le jour où elle change, ou où
 * `content-visibility` suffit, c'est ce fichier qui change, et lui seul. C'est
 * la décision D6, et `pnpm deps:check` la fait respecter.
 *
 * Ce qui justifie la librairie ici : la fenêtre de rendu, la mesure dynamique
 * des hauteurs et l'ancrage du défilement quand la liste change sous le
 * curseur. Écrit à la main, c'est le genre de code qui marche jusqu'au premier
 * élément de hauteur variable.
 */
export function useUiVirtualList<C extends HTMLElement>({
  count,
  itemSize,
  overscan = 6,
  measure = false,
}: UiVirtualListOptions): UiVirtualListResult<C> {
  const scrollRef = useRef<C | null>(null);

  // Le compilateur React signale « Compilation Skipped: Use of incompatible
  // library » sur cet appel, et c'est exactement le résultat voulu : la
  // librairie n'est pas compatible, donc UN SEUL fichier du kit sort de
  // l'optimisation. C'est la contrepartie visible de la mise en quarantaine.
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => itemSize,
    overscan,
  });

  const scrollToIndex = useCallback(
    (index: number, align: 'auto' | 'start' | 'center' | 'end' = 'auto') => {
      virtualizer.scrollToIndex(index, { align });
    },
    [virtualizer],
  );

  const items: UiVirtualItem[] = virtualizer.getVirtualItems().map((item) => ({
    index: item.index,
    key: item.key,
    // Positionnement absolu et non un flux : c'est ce qui permet de ne rendre
    // qu'une fenêtre sans que les entrées absentes décalent les autres.
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: measure ? undefined : `${item.size}px`,
      transform: `translateY(${item.start}px)`,
    },
    // `measureElement` est typé pour `Element` : on le resserre ici, une fois,
    // plutôt que chez chaque consommateur.
    ref: measure ? (virtualizer.measureElement as (node: HTMLElement | null) => void) : undefined,
  }));

  return {
    scrollRef,
    totalSize: virtualizer.getTotalSize(),
    items,
    scrollToIndex,
  };
}
