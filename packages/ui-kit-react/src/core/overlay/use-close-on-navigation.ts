'use client';

import { useEffect, useRef } from 'react';

/** Partie chemin d'une URL, requête et fragment retirés. */
function pathOf(url: string): string {
  return url.split(/[?#]/)[0] ?? '';
}

/**
 * Ferme un panneau flottant quand la page change.
 *
 * Un panneau monté dans une coquille d'application (en-tête, barre latérale)
 * survit à la navigation : son composant hôte n'est pas démonté. Il resterait
 * donc ouvert par-dessus la page suivante, et se replacerait en haut à gauche
 * dès qu'on le repositionne, son ancre ayant disparu avec la page précédente.
 *
 * Côté Angular, la brique équivalente dépend du `Router`. Ici elle écoute
 * l'**API History** : le kit n'impose toujours aucun routeur, et le mécanisme
 * marche avec tous, puisque tous finissent par appeler `pushState`.
 *
 * Seul un changement de **page** ferme : réécrire la requête ou le fragment
 * (filtres, pagination, état poussé par le panneau lui-même) le laisse ouvert.
 *
 * @param close Doit être idempotent, et ne pas voler le focus : la navigation
 * s'en occupe.
 */
export function useCloseOnNavigation(open: boolean, close: () => void): void {
  // Écrite dans un effet et non au rendu : écrire une ref pendant le rendu n'est
  // pas sûr en rendu concurrent, et le linter des hooks le refuse.
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

    // `popstate` couvre le retour arrière ; les routeurs, eux, appellent
    // `pushState` / `replaceState`, qui n'émettent aucun événement. On enveloppe
    // donc les deux, en restaurant l'original au démontage.
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
