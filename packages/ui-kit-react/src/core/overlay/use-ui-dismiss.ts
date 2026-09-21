'use client';

import { useEffect, type RefObject } from 'react';

export interface UiDismissOptions {
  /** Le panneau est ouvert. Fermé, aucun écouteur n'est posé. */
  open: boolean;
  /** Appelé pour fermer. Doit être idempotent. */
  onDismiss: (reason: 'outside' | 'escape') => void;
  /** Le panneau lui-même : un clic dedans ne ferme pas. */
  panelRef: RefObject<HTMLElement | null>;
  /** L'ancre : un clic dessus ne ferme pas, sinon elle rouvrirait aussitôt. */
  anchorRef?: RefObject<HTMLElement | null>;
  /** Fermer au clic à l'extérieur. */
  closeOnOutside?: boolean;
  /** Fermer sur Échap. */
  closeOnEscape?: boolean;
}

/**
 * Fermeture d'un panneau flottant : clic à l'extérieur et touche Échap.
 *
 * Deux points qui ne s'improvisent pas.
 *
 * Le clic se juge sur **`pointerdown`**, pas sur `click` : un `click` ne se
 * produit que si la pression ET le relâchement ont lieu sur le même élément.
 * Une sélection de texte commencée dans le panneau et relâchée dehors ne
 * produirait donc aucun `click`, et le panneau resterait ouvert.
 *
 * Échap n'est consommée **que si elle ferme quelque chose** : sinon la même
 * touche fermerait aussi le `ui-modal` qui contient le panneau, et l'utilisateur
 * en perdrait deux d'un coup.
 */
export function useUiDismiss({
  open,
  onDismiss,
  panelRef,
  anchorRef,
  closeOnOutside = true,
  closeOnEscape = true,
}: UiDismissOptions): void {
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!closeOnOutside) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onDismiss('outside');
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!closeOnEscape || event.key !== 'Escape') return;
      event.stopPropagation();
      onDismiss('escape');
    };

    // En phase de capture : un panneau qui arrête la propagation dans son
    // propre contenu ne doit pas empêcher sa fermeture.
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onDismiss, panelRef, anchorRef, closeOnOutside, closeOnEscape]);
}
