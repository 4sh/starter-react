import type { UiFeedbackLevel, UiSubLevel } from '../../core/types';

/** Identifiant d'un message. Généré par le magasin quand il n'est pas fourni. */
export type UiToastId = string | number;

/** Où une `UiToastContainer` épingle sa pile. */
export type UiToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'center';

/** Toutes les positions, dans l'ordre de déclaration. */
export const UI_TOAST_POSITIONS: readonly UiToastPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
  'center',
];

/**
 * Un message poussé dans le magasin `uiToast`.
 *
 * `title` et `text` suffisent dans le cas courant : tout le reste a un défaut
 * que la pile résout.
 */
export interface UiToastMessage {
  /** Identifiant unique. Généré à l'ajout quand il est omis. */
  id?: UiToastId;
  /**
   * Achemine le message vers la ou les piles de même `channel`. Là où le kit
   * Angular dit `key`, React réserve ce nom pour l'identité d'un élément.
   */
  channel?: string;
  /** Niveau sémantique : couleurs et icône par défaut. */
  level?: UiFeedbackLevel;
  /** Intensité : `high` soutenue, `low` discrète. */
  subLevel?: UiSubLevel;
  /** Ligne de titre, en gras. */
  title?: string;
  /** Corps du message. */
  text?: string;
  /**
   * Icône de tête : un nom pour surcharger celle du niveau, `false` pour la
   * masquer, `true` ou rien pour garder le défaut du niveau.
   */
  icon?: string | boolean;
  /** Affiche le bouton de fermeture. */
  closable?: boolean;
  /** Ne jamais disparaître seul : c'est l'utilisateur qui ferme. */
  sticky?: boolean;
  /** Délai avant disparition, en ms. À défaut, le `life` de la pile. */
  life?: number;
  /** Charge libre, transmise telle quelle à `renderToast`. */
  data?: unknown;
  /** Classe(s) posée(s) sur cette carte. */
  className?: string;
}

/** Icône de tête par défaut, par niveau. */
export const UI_TOAST_DEFAULT_ICONS: Record<UiFeedbackLevel, string> = {
  default: 'info-circle',
  highlight: 'info-circle',
  success: 'check',
  warning: 'warning',
  error: 'times',
};
