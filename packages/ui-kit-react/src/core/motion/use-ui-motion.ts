'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * Préréglages d'entrée et de sortie. Chacun correspond à une paire de classes
 * globales (`ui-motion-<preset>-enter` / `-leave`) définies dans
 * `styles/base/_motion.scss`, donc livrées dans la feuille du paquet.
 *
 * - `fade` : opacité seule, neutre.
 * - `slide-up` : monte en apparaissant (toasts, bulles au-dessus d'une ancre).
 * - `slide-down` : descend (menus et listes sous leur déclencheur).
 * - `slide-left` : entre par la droite (panneaux).
 * - `slide-right` : entre par la gauche.
 * - `zoom` : échelle et opacité (dialogues).
 * - `collapse` : hauteur de rangée de grille (accordéons, sections dépliables).
 */
export type UiMotionPreset =
  'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'zoom' | 'collapse';

/** Tous les préréglages, dans l'ordre de déclaration. */
export const UI_MOTION_PRESETS: readonly UiMotionPreset[] = [
  'fade',
  'slide-up',
  'slide-down',
  'slide-left',
  'slide-right',
  'zoom',
  'collapse',
];

/** Classe d'entrée d'un préréglage. */
export const motionEnterClass = (preset: UiMotionPreset): string => `ui-motion-${preset}-enter`;
/** Classe de sortie d'un préréglage. */
export const motionLeaveClass = (preset: UiMotionPreset): string => `ui-motion-${preset}-leave`;

/** Préfixe des animations du système, pour ne jamais attendre celles d'autrui. */
const MOTION_ANIMATION = 'ui-motion-';

export interface UiMotionOptions {
  preset?: UiMotionPreset;
  /** Coupe le mouvement pour cet élément : il apparaît et disparaît net. */
  disabled?: boolean;
  /** Durée de cet élément, par exemple `'120ms'`. */
  duration?: string;
  /** Délai avant le départ, par exemple `'40ms'`. */
  delay?: string;
  /** Courbe des deux sens. */
  easing?: string;
  /** Courbe d'entrée seule. À défaut, `easing`. */
  enterEasing?: string;
  /** Courbe de sortie seule. À défaut, `easing`. */
  leaveEasing?: string;
  /** Distance du glissement des préréglages directionnels, par exemple `'12px'`. */
  distance?: string;
  /** Échelle de départ et d'arrivée du préréglage `zoom`. */
  scale?: number | string;
  /** Appelé quand la sortie est finie, donc quand l'élément quitte le DOM. */
  onExited?: () => void;
}

export interface UiMotionResult {
  /**
   * L'élément doit-il être rendu ? Reste **vrai pendant la sortie**, et c'est
   * tout l'objet de ce crochet.
   */
  present: boolean;
  /** Ref à poser sur l'élément animé. */
  ref: (node: HTMLElement | null) => void;
  /** Classe de préréglage du moment, à passer à `cx`. */
  className: string | undefined;
  /** Réglages de cet exemplaire, à fusionner avec le `style` de l'appelant. */
  style: CSSProperties;
}

/**
 * Entrée et sortie d'un élément hors calque supérieur (liste, section dépliable,
 * toast ; un panneau du calque s'anime en CSS via `utils.overlay-motion`).
 * `present` retient le nœud sortant jusqu'à la fin réelle des animations du
 * système : les objets `Animation`, jamais une minuterie calée sur la durée.
 *
 * ⚠️ Destructurer le résultat en tête du composant : il contient une ref de rappel.
 *
 * @example
 * ```tsx
 * const { present, ref, className, style } = useUiMotion(open, { preset: 'collapse' });
 * return present ? (
 *   <div ref={ref} className={cx('ui-thing-panel', className)} style={style}>…</div>
 * ) : null;
 * ```
 */
export function useUiMotion(open: boolean, options: UiMotionOptions = {}): UiMotionResult {
  const {
    preset = 'fade',
    disabled = false,
    duration,
    delay,
    easing,
    enterEasing,
    leaveEasing,
    distance,
    scale,
    onExited,
  } = options;

  const [present, setPresent] = useState(open);
  const nodeRef = useRef<HTMLElement | null>(null);

  // Dernière valeur : `onExited`, souvent écrit en ligne, relancerait l'attente
  // à chaque rendu du parent s'il était une dépendance.
  const exitedRef = useRef(onExited);
  useEffect(() => {
    exitedRef.current = onExited;
  });

  // Ajusté au rendu, pas dans un effet : l'élément doit être là dès la première image.
  if (open && !present) setPresent(true);

  useEffect(() => {
    if (open || !present) return;
    const node = nodeRef.current;

    // `getAnimations` force le recalcul de style, donc voit la classe de sortie.
    // Seules celles du système comptent : une animation en boucle du contenu ne finirait jamais.
    const animations = (node?.getAnimations() ?? []).filter((animation) =>
      String((animation as CSSAnimation).animationName ?? '').startsWith(MOTION_ANIMATION),
    );

    if (animations.length === 0) {
      // Rien à attendre : mouvement coupé ou réduit, ou aucun préréglage appliqué.
      setPresent(false);
      exitedRef.current?.();
      return;
    }

    let cancelled = false;
    // `allSettled` et non `all` : une animation annulée rejette, et une sortie
    // interrompue par une réouverture ne doit pas remonter en erreur.
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (cancelled) return;
      setPresent(false);
      exitedRef.current?.();
    });

    return () => {
      cancelled = true;
    };
  }, [open, present]);

  const style: CSSProperties = {};
  const set = (name: string, value: string | undefined) => {
    if (value !== undefined) (style as Record<string, string>)[name] = value;
  };
  set('--ui-motion-duration', duration);
  set('--ui-motion-delay', delay);
  set('--ui-motion-easing-enter', enterEasing ?? easing);
  set('--ui-motion-easing-leave', leaveEasing ?? easing);
  set('--ui-motion-distance', distance);
  set('--ui-motion-scale', scale === undefined ? undefined : String(scale));

  return {
    present,
    ref: (node) => {
      nodeRef.current = node;
    },
    className: disabled ? undefined : open ? motionEnterClass(preset) : motionLeaveClass(preset),
    style,
  };
}
