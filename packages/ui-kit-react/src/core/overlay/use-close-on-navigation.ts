'use client';

import { useEffect, useRef } from 'react';

function pathOf(url: string): string {
  return url.split(/[?#]/)[0] ?? '';
}

/**
 * Ferme un panneau flottant quand la page change : une coquille d'application
 * (en-tête, barre latérale) le garde monté pendant la navigation.
 *
 * Écoute l'API History, que tout routeur finit par appeler : le kit n'en impose
 * aucun. Seul un changement de chemin ferme : la requête ou le fragment réécrits
 * le laissent ouvert.
 *
 * @param close Doit être idempotent, et ne pas voler le focus : la navigation
 * s'en occupe.
 */
export function useCloseOnNavigation(open: boolean, close: () => void): void {
  // Écrite dans un effet : écrire une ref au rendu n'est pas sûr en rendu concurrent.
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;

    let currentPath = pathOf(window.location.href);

    const check = () => {
      const next = pathOf(window.location.href);
      if (next === currentPath) return;
      currentPath = next;
      closeRef.current();
    };

    // `pushState` / `replaceState` n'émettent aucun événement (seul le retour
    // arrière émet `popstate`) : les deux sont enveloppés le temps de l'ouverture.
    const { pushState, replaceState } = window.history;
    const wrap =
      (original: typeof pushState) =>
      (...args: Parameters<typeof pushState>) => {
        original.apply(window.history, args);
        check();
      };

    window.history.pushState = wrap(pushState);
    window.history.replaceState = wrap(replaceState);
    window.addEventListener('popstate', check);

    return () => {
      window.history.pushState = pushState;
      window.history.replaceState = replaceState;
      window.removeEventListener('popstate', check);
    };
  }, [open]);
}
