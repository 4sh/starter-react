'use client';

import { useEffect } from 'react';

/** Verrous actifs : plusieurs couches peuvent verrouiller en même temps. */
let locks = 0;
let restore: (() => void) | null = null;

/**
 * Bloque le défilement de l'arrière-plan pendant qu'une couche modale est
 * ouverte : `showModal()` rend l'arrière-plan inerte, mais pas immobile.
 *
 * La largeur de la barre de défilement est compensée, et les verrous sont
 * comptés : un tiroir fermé par-dessus une modale ne rend pas le défilement.
 */
export function useUiScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    if (locks === 0) {
      const body = document.body;
      const previousOverflow = body.style.overflow;
      const previousPadding = body.style.paddingRight;
      const gap = window.innerWidth - document.documentElement.clientWidth;

      body.style.overflow = 'hidden';
      if (gap > 0) body.style.paddingRight = `${gap}px`;

      restore = () => {
        body.style.overflow = previousOverflow;
        body.style.paddingRight = previousPadding;
      };
    }

    locks += 1;
    return () => {
      locks -= 1;
      if (locks === 0) {
        restore?.();
        restore = null;
      }
    };
  }, [active]);
}
