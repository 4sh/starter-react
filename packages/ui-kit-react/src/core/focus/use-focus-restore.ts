'use client';

import { useEffect, useRef } from 'react';

/**
 * Rend le focus à l'élément qui l'avait avant l'ouverture, pour les couches qui
 * ne sont pas un dialogue natif (`showModal()` le fait déjà).
 *
 * Le focus n'est rendu que s'il est encore dans la couche à la fermeture : parti
 * ailleurs, le reprendre serait un vol.
 */
export function useFocusRestore(active: boolean, containerRef?: { current: HTMLElement | null }) {
  const previous = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    previous.current = document.activeElement as HTMLElement | null;
    // Lu à l'ouverture : au démontage, React a déjà remis la ref à `null`.
    const container = containerRef?.current ?? null;

    return () => {
      const target = previous.current;
      previous.current = null;
      if (!target || !target.isConnected) return;

      if (container && !container.contains(document.activeElement)) return;

      target.focus();
    };
  }, [active, containerRef]);
}
