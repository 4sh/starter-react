'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';

export interface ModalGestureOptions {
  dialogRef: RefObject<HTMLDialogElement | null>;
  draggable: boolean;
  resizable: boolean;
  keepInViewport: boolean;
  minX: number;
  minY: number;
  minWidth: number;
  minHeight: number;
  onDragEnd?: () => void;
  onResizeEnd?: (size: { width: number; height: number }) => void;
}

export interface ModalGestures {
  /** Décalage cumulé du glissement, ou `null` tant qu'on n'a pas glissé. */
  dragOffset: { x: number; y: number } | null;
  /** Taille imposée par le redimensionnement, ou `null`. */
  size: { width: number; height: number } | null;
  onHeaderPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onResizePointerDown: (event: PointerEvent<HTMLElement>) => void;
  /** Remet le dialogue à sa place et à sa taille d'origine. */
  reset: () => void;
}

/**
 * Glissement par l'en-tête et redimensionnement par le coin.
 *
 * Sorti du composant parce que c'est de la mécanique de pointeur, pas du
 * dialogue : `ui-modal` n'a qu'à poser deux gestionnaires et lire deux valeurs.
 */
export function useModalGestures({
  dialogRef,
  draggable,
  resizable,
  keepInViewport,
  minX,
  minY,
  minWidth,
  minHeight,
  onDragEnd,
  onResizeEnd,
}: ModalGestureOptions): ModalGestures {
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  // Un `ref` par geste : les gestionnaires vivent sur `document` le temps du
  // geste, et doivent lire l'état courant sans se réabonner à chaque frame.
  const drag = useRef<{ x: number; y: number } | null>(null);
  const resize = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const callbacks = useRef({ onDragEnd, onResizeEnd });
  useEffect(() => {
    callbacks.current = { onDragEnd, onResizeEnd };
  });

  const reset = useCallback(() => {
    setDragOffset(null);
    setSize(null);
  }, []);

  const onHeaderPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!draggable || event.button !== 0) return;
      // Jamais depuis les boutons d'action de l'en-tête.
      if ((event.target as HTMLElement).closest('button')) return;
      drag.current = { x: event.clientX, y: event.clientY };
      document.body.style.userSelect = 'none';
    },
    [draggable],
  );

  const onResizePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!resizable || event.button !== 0) return;
      const element = dialogRef.current;
      if (!element) return;
      // La poignée ne doit ni déclencher un glissement ni remonter au dialogue.
      event.preventDefault();
      event.stopPropagation();
      const rect = element.getBoundingClientRect();
      resize.current = { x: event.clientX, y: event.clientY, w: rect.width, h: rect.height };
      document.body.style.userSelect = 'none';
    },
    [resizable, dialogRef],
  );

  useEffect(() => {
    const onPointerMove = (event: globalThis.PointerEvent) => {
      const element = dialogRef.current;

      if (drag.current && element) {
        const dx = event.clientX - drag.current.x;
        const dy = event.clientY - drag.current.y;
        drag.current = { x: event.clientX, y: event.clientY };

        setDragOffset((current) => {
          const base = current ?? { x: 0, y: 0 };
          let nextX = base.x + dx;
          let nextY = base.y + dy;

          if (keepInViewport) {
            const rect = element.getBoundingClientRect();
            // `||` et non `??` : un 0 dégénéré écraserait le dialogue.
            const viewWidth = window.innerWidth || rect.right;
            const viewHeight = window.innerHeight || rect.bottom;
            // Un delta qui pousserait le dialogue hors de l'écran est refusé,
            // axe par axe : glisser en diagonale le long d'un bord doit rester
            // possible.
            if (rect.left + dx < minX || rect.right + dx > viewWidth) nextX = base.x;
            if (rect.top + dy < minY || rect.bottom + dy > viewHeight) nextY = base.y;
          }

          return { x: nextX, y: nextY };
        });
      }

      if (resize.current) {
        const start = resize.current;
        const maxWidth = window.innerWidth || Number.MAX_SAFE_INTEGER;
        const maxHeight = window.innerHeight || Number.MAX_SAFE_INTEGER;
        setSize({
          width: Math.min(maxWidth, Math.max(minWidth, start.w + (event.clientX - start.x))),
          height: Math.min(maxHeight, Math.max(minHeight, start.h + (event.clientY - start.y))),
        });
      }
    };

    const onPointerUp = () => {
      const wasDragging = drag.current !== null;
      const wasResizing = resize.current !== null;
      if (!wasDragging && !wasResizing) return;

      drag.current = null;
      resize.current = null;
      document.body.style.userSelect = '';

      if (wasDragging) callbacks.current.onDragEnd?.();
      if (wasResizing) {
        setSize((current) => {
          if (current) callbacks.current.onResizeEnd?.(current);
          return current;
        });
      }
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.body.style.userSelect = '';
    };
  }, [dialogRef, keepInViewport, minX, minY, minWidth, minHeight]);

  return { dragOffset, size, onHeaderPointerDown, onResizePointerDown, reset };
}
