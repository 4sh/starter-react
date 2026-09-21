'use client';

import { useEffect, useRef } from 'react';

/**
 * Rend le focus à l'élément qui l'avait avant l'ouverture.
 *
 * `<dialog>.showModal()` le fait déjà. Cette brique sert aux couches qui ne sont
 * pas un dialogue natif : un panneau, un menu, une liste de suggestions.
 *
 * Le focus n'est rendu que s'il est encore **dans la couche** au moment de la
 * fermeture : si l'utilisateur est déjà reparti ailleurs, le lui reprendre
 * serait un vol de focus.
 */
export function useFocusRestore(active: boolean, containerRef?: { current: HTMLElement | null }) {
  const previous = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    previous.current = document.activeElement as HTMLElement | null;
    // Capturé à l'OUVERTURE : l'élément de la couche ne change pas d'identité
    // tant qu'elle est ouverte, et le lire au démontage lirait une ref déjà
    // remise à zéro par React.
    const container = containerRef?.current ?? null;

    return () => {
      const target = previous.current;
      previous.current = null;
      if (!target || !target.isConnected) return;

      // Le focus est déjà reparti ailleurs : le reprendre serait un vol.
      if (container && !container.contains(document.activeElement)) return;

      target.focus();
    };
  }, [active, containerRef]);
}
