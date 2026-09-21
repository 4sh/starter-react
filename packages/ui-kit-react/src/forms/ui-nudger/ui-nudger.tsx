import { useCallback, useEffect, useId, type FocusEvent, type Ref } from 'react';

import { UiButton, type ButtonOnColor, type ButtonVariant } from '../../actions/ui-button';
import { useControllableState } from '../../core/forms';
import type { UiLevel } from '../../core/types';
import { cx } from '../../core/utils';

import './ui-nudger.scss';

export type NudgerSize = 'default' | 'small';

/** Instances déjà averties, pour n'avertir qu'une fois chacune. */
const prevenus = new Set<string>();

export interface UiNudgerProps {
  /** Valeur imposée. Renseignée, le compteur est **contrôlé**. */
  value?: number | null;
  /** Valeur de départ quand le compteur est non contrôlé. */
  defaultValue?: number;
  /** Notifié à chaque changement, dans les deux modes. */
  onValueChange?: (value: number) => void;

  /** Minimum, qui désactive « moins » à la borne. */
  min?: number;
  /** Maximum, qui désactive « plus » à la borne. */
  max?: number;
  /** Pas d'un cran. */
  step?: number;

  size?: NudgerSize;
  /** Famille de couleur des deux boutons. */
  level?: UiLevel;
  /** Apparence appliquée aux deux boutons. */
  variant?: ButtonVariant;
  /** Luminosité du fond sur lequel le compteur est posé (voir `UiButton`). */
  onColor?: ButtonOnColor | null;

  /** Nom accessible du bouton de décrément. */
  decrementAriaLabel?: string;
  /** Nom accessible du bouton d'incrément. */
  incrementAriaLabel?: string;
  /** Icône FontAwesome du bouton de décrément. */
  decrementIcon?: string;
  /** Icône FontAwesome du bouton d'incrément. */
  incrementIcon?: string;
  /** Formateur d'affichage de la valeur, par exemple `(v) => v + ' kg'`. */
  formatValue?: (value: number) => string;

  disabled?: boolean;
  readOnly?: boolean;
  /** Force le rendu en erreur. */
  invalid?: boolean;
  /** `name` natif, pour qu'un formulaire non contrôlé emporte la valeur. */
  name?: string;
  /** `tabindex` transmis aux deux boutons. */
  tabIndex?: number;
  id?: string;
  className?: string;

  /** Nom accessible du groupe. **Obligatoire en pratique** : un compteur sans
   *  nom ne dit pas ce qu'il compte. Un avertissement est émis en développement. */
  'aria-label'?: string;
  /** id d'un élément externe qui étiquette le compteur. */
  'aria-labelledby'?: string;

  /** Notifié quand le focus quitte le compteur pour de bon. */
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void;

  ref?: Ref<HTMLDivElement>;
}

/**
 * ui-nudger : compteur numérique (`[moins] valeur [plus]`).
 *
 * Compose deux `UiButton` en mode icône seule autour d'un affichage en lecture.
 * Les états « au minimum » et « au maximum » sont **dérivés de la valeur**,
 * jamais des props : c'est `min` et `max` qui désactivent le bouton concerné.
 *
 * Clavier : chaque bouton est un vrai `<button>`, donc Tab plus Entrée ou
 * Espace. La valeur est une région vive, annoncée à chaque changement.
 */
export function UiNudger({
  value,
  defaultValue = 0,
  onValueChange,
  min,
  max,
  step = 1,
  size = 'default',
  level = 'high',
  variant = 'filled',
  onColor = null,
  decrementAriaLabel = 'Diminuer',
  incrementAriaLabel = 'Augmenter',
  decrementIcon = 'minus',
  incrementIcon = 'plus',
  formatValue,
  disabled = false,
  readOnly = false,
  invalid = false,
  name,
  tabIndex,
  id,
  className,
  onBlur,
  ref,
  ...rest
}: UiNudgerProps) {
  const generatedId = useId();
  const rootId = id ?? generatedId;

  const [model, setModel] = useControllableState<number | null>({
    value,
    defaultValue,
    onChange: (next) => next !== null && onValueChange?.(next),
  });

  const current = model ?? defaultValue;

  const atMin = min != null && current <= min;
  const atMax = max != null && current >= max;

  const clamp = useCallback(
    (v: number) => {
      let out = v;
      if (min != null && out < min) out = min;
      if (max != null && out > max) out = max;
      return out;
    },
    [min, max],
  );

  const stepBy = useCallback(
    (direction: 1 | -1) => {
      if (disabled || readOnly) return;
      const next = clamp(current + direction * step);
      if (next === model) return;
      setModel(next);
    },
    [disabled, readOnly, clamp, current, step, model, setModel],
  );

  // Garde-fou d'accessibilité : un compteur a besoin d'un nom. Averti une fois
  // par instance, comme les autres composants du kit.
  const ariaLabel = rest['aria-label'];
  const ariaLabelledBy = rest['aria-labelledby'];
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (!ariaLabel && !ariaLabelledBy && !prevenus.has(rootId)) {
      prevenus.add(rootId);
      console.warn(
        '[ui-nudger] Compteur sans nom accessible : renseignez `aria-label` ou `aria-labelledby`.',
      );
    }
  }, [ariaLabel, ariaLabelledBy, rootId]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    // Le focus qui passe d'un bouton à l'autre ne quitte pas le compteur.
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    onBlur?.(event);
  };

  const boutonPartage = {
    level,
    size,
    variant,
    onColor,
    iconOnly: true,
    tabIndex,
    className: 'ui-nudger-button',
  } as const;

  return (
    <div
      ref={ref}
      id={rootId}
      className={cx(
        'ui-nudger',
        size !== 'default' && `_${size}`,
        disabled && '_disabled',
        invalid && '_invalid',
        className,
      )}
      role="group"
      aria-label={rest['aria-label']}
      aria-labelledby={rest['aria-labelledby']}
      onBlur={handleBlur}
    >
      <UiButton
        {...boutonPartage}
        icon={decrementIcon}
        aria-label={decrementAriaLabel}
        disabled={disabled || readOnly || atMin}
        onClick={() => stepBy(-1)}
      />

      <span className="ui-nudger-value" aria-live="polite">
        {formatValue ? formatValue(current) : String(current)}
      </span>

      <UiButton
        {...boutonPartage}
        icon={incrementIcon}
        aria-label={incrementAriaLabel}
        disabled={disabled || readOnly || atMax}
        onClick={() => stepBy(1)}
      />

      {/* Porteur masqué, pour qu'un `name` natif parte avec le formulaire. */}
      {name && <input type="hidden" name={name} value={current} />}
    </div>
  );
}
