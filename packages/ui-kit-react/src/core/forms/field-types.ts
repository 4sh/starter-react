import type { UiFeedbackLevel } from '../types';

export type FieldSize = 'default' | 'small';

/** Statut de validation visuel (sous-ensemble de `UiFeedbackLevel`, partagé avec `ui-helper`). */
export type FieldLevel = Extract<UiFeedbackLevel, 'default' | 'success' | 'error'>;

/**
 * Placement du libellé flottant :
 * - `over` : il monte au-dessus de la boîte, là où se tient un libellé classique ;
 * - `in`   : il monte dans une bande réservée en haut, **à l'intérieur** de la boîte ;
 * - `on`   : il monte **sur** la bordure haute, qu'il entaille.
 */
export type FieldFloatLabel = 'over' | 'in' | 'on';

/**
 * Props partagées par tous les champs « en boîte » (`ui-input`, `ui-textarea`,
 * `ui-input-number`…), dont `useUiField` tire le câblage.
 */
export interface UiFieldSharedProps {
  /** Libellé, rendu par `ui-label`. */
  label?: string;
  /** Texte d'aide sous le champ, rendu par `ui-helper`. */
  helperText?: string;
  /** Message d'erreur, affiché à la place de l'aide quand le champ est en erreur. */
  errorText?: string;
  /** Préfixe le message d'un icône décoratif. */
  showMessageIcon?: boolean;
  /** Remplace le glyphe déduit du niveau. */
  messageIcon?: string;
  size?: FieldSize;
  /** Statut explicite. `error` est forcé dès que `invalid` est vrai. */
  level?: FieldLevel;
  /** Placement du libellé flottant. Absent = libellé classique au-dessus. */
  floatLabel?: FieldFloatLabel;
  /** Marqueur requis (*) et attribut natif. */
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  /** Force le rendu en erreur. */
  invalid?: boolean;
  /** Nom accessible quand aucun libellé visible n'est fourni. */
  'aria-label'?: string;
  /** id d'un élément externe qui étiquette ce champ. */
  'aria-labelledby'?: string;
  /**
   * id d'un élément externe qui décrit ce champ **en plus** du message.
   *
   * Chaîné au message, jamais substitué : les deux comptent, et une simple
   * surcharge de `aria-describedby` écraserait celui qui arrive en second.
   */
  'aria-describedby'?: string;
}
