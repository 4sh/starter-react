'use client';

import { useEffect } from 'react';

/** Verrous actifs : plusieurs couches peuvent verrouiller en même temps. */
let locks = 0;
let restore: (() => void) | null = null;

/**
 * Bloque le défilement de l'arrière-plan pendant qu'une couche modale est
 * ouverte.
 *
 * C'est le seul manque **mesuré** de `<dialog>.showModal()` : le navigateur rend
 * bien l'arrière-plan inerte, mais ne fige pas son défilement (`overflow` reste
 * `visible`). D'où cette brique, plutôt qu'une dépendance : le besoin tient en
 * quelques lignes une fois qu'il est délimité.
 *
 * La largeur de la barre de défilement est compensée : sans elle, la page saute
 * latéralement à l'ouverture, ce qui se voit plus que le verrou lui-même.
 *
 * Les verrous sont **comptés** : un tiroir ouvert depuis une fenêtre modale ne
 * doit pas rendre le défilement en se fermant.
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
