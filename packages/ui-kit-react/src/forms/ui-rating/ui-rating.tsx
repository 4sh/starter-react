import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';

import { UiIcon, type UiIconSize } from '../../base/ui-icon';
import { useControllableState } from '../../core/forms';
import { cx } from '../../core/utils';

import './ui-rating.scss';

export type RatingOrientation = 'horizontal' | 'vertical';

/** Contexte passé à `renderOnIcon` et `renderOffIcon`. */
export interface RatingIconContext {
  /** Rang de l'étoile, à partir de 1. */
  index: number;
  /** L'étoile est atteinte par la valeur enregistrée. */
  active: boolean;
  /** Portion remplie, de `0` à `1`, survol compris. */
  fill: number;
}

export interface UiRatingProps {
  /** Valeur imposée. Renseignée, la note est **contrôlée**. `null` = pas de note. */
  value?: number | null;
  /** Valeur de départ quand la note est non contrôlée. */
  defaultValue?: number | null;
  /** Notifié à chaque changement. `null` quand la note est retirée. */
  onValueChange?: (value: number | null) => void;

  size?: UiIconSize;
  /** Nombre d'étoiles. */
  stars?: number;
  /** Demi-étoiles : la valeur avance par 0,5, au clic comme aux flèches. */
  allowHalf?: boolean;
  /** Permet de retirer la note en recliquant la valeur courante. */
  cancel?: boolean;
  orientation?: RatingOrientation;

  /** Rendu d'une étoile pleine. */
  renderOnIcon?: (context: RatingIconContext) => ReactNode;
  /** Rendu d'une étoile vide. */
  renderOffIcon?: (context: RatingIconContext) => ReactNode;

  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  /** Force le rendu en erreur. */
  invalid?: boolean;
  name?: string;
  tabIndex?: number;
  id?: string;
  className?: string;
  /** Nom accessible. Sans libellé visible, il est indispensable. */
  'aria-label'?: string;
  /** id d'un élément externe qui étiquette la note. */
  'aria-labelledby'?: string;

  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;

  ref?: Ref<HTMLInputElement>;
}

/**
 * ui-rating : note en étoiles, bâtie sur un `<input type="range">` natif.
 *
 * Les étoiles sont purement visuelles : le focus, le clavier et l'annonce sont
 * portés par le champ natif, masqué visuellement. L'étoile pleine, empilée sur la
 * vide, est **découpée** à la portion remplie : la demi-étoile marche avec toute icône.
 */
export function UiRating({
  value,
  defaultValue = null,
  onValueChange,
  size = 'default',
  stars = 5,
  allowHalf = false,
  cancel = true,
  orientation = 'horizontal',
  renderOnIcon,
  renderOffIcon,
  disabled = false,
  readOnly = false,
  required = false,
  invalid = false,
  name,
  tabIndex,
  id,
  className,
  onFocus,
  onBlur,
  ref,
  ...rest
}: UiRatingProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [model, setModel] = useControllableState<number | null>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  const [hoverValue, setHoverValue] = useState(0);

  const step = allowHalf ? 0.5 : 1;

  // Ramenée au pas : une moyenne à 4,3 ne rend pas un remplissage hors d'atteinte.
  const current = useMemo(() => Math.floor(Math.max(0, model ?? 0) / step) * step, [model, step]);

  const starList = useMemo(() => {
    const preview = hoverValue || current;
    return Array.from({ length: stars }, (_, i) => ({
      index: i + 1,
      fill: Math.min(1, Math.max(0, preview - i)),
      active: i + 1 <= current,
    }));
  }, [hoverValue, current, stars]);

  // Valeur pointée : l'étoile, ou sa première moitié avec `allowHalf`, lue selon
  // le sens d'écriture comme le découpage RTL de la feuille de style.
  const pointedValue = useCallback(
    (star: number, event: MouseEvent<HTMLElement>): number => {
      if (!allowHalf) return star;
      const el = event.currentTarget;
      const { left, width } = el.getBoundingClientRect();
      if (!width) return star;
      const ratio = (event.clientX - left) / width;
      const leadingHalf = getComputedStyle(el).direction === 'rtl' ? ratio > 0.5 : ratio < 0.5;
      return leadingHalf ? star - 0.5 : star;
    },
    [allowHalf],
  );

  const update = useCallback(
    (next: number | null) => {
      if (next !== model) setModel(next);
    },
    [model, setModel],
  );

  const rate = useCallback(
    (star: number, event: MouseEvent<HTMLElement>) => {
      if (disabled || readOnly) return;
      const pointed = pointedValue(star, event);
      update(cancel && model === pointed ? null : pointed);
      inputRef.current?.focus();
    },
    [disabled, readOnly, pointedValue, cancel, model, update],
  );

  const attacher = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as { current: HTMLInputElement | null }).current = node;
    },
    [ref],
  );

  const defautOn = (ctx: RatingIconContext) =>
    renderOnIcon ? renderOnIcon(ctx) : <UiIcon name="star" type="solid" size={size} />;
  const defautOff = (ctx: RatingIconContext) =>
    renderOffIcon ? renderOffIcon(ctx) : <UiIcon name="star" type="outline" size={size} />;

  return (
    <div
      className={cx(
        'ui-rating',
        `_size-${size}`,
        orientation === 'vertical' && '_vertical',
        disabled && '_disabled',
        readOnly && '_readonly',
        invalid && '_invalid',
        className,
      )}
      onMouseLeave={() => !disabled && !readOnly && setHoverValue(0)}
    >
      <input
        ref={attacher}
        id={inputId}
        name={name}
        type="range"
        className="ui-rating-input"
        min={0}
        max={stars}
        step={step}
        value={current}
        disabled={disabled}
        required={required}
        readOnly={readOnly}
        aria-label={rest['aria-label']}
        aria-labelledby={rest['aria-labelledby']}
        aria-invalid={invalid || undefined}
        tabIndex={tabIndex ?? 0}
        onChange={(event) => {
          const parsed = parseFloat(event.currentTarget.value);
          if (disabled || readOnly || Number.isNaN(parsed)) {
            // On remet le curseur natif en phase avec le modèle.
            event.currentTarget.value = String(current);
            return;
          }
          // Le 0 du curseur veut dire « pas de note » : `null` à la frontière.
          update(parsed === 0 ? null : parsed);
        }}
        onFocus={onFocus}
        onBlur={onBlur}
      />

      <div className="ui-rating-stars">
        {starList.map((star) => (
          /*
            eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions --
            Étoiles visuelles : focus, clavier et valeur sont portés par le range.
          */
          <div
            key={star.index}
            className="ui-rating-icon"
            onClick={(event) => rate(star.index, event)}
            onMouseMove={(event) => {
              if (disabled || readOnly) return;
              setHoverValue(pointedValue(star.index, event));
            }}
          >
            <span className="ui-rating-icon-stack">
              <span className="ui-rating-icon-base">{defautOff(star)}</span>
              {star.fill > 0 && (
                <span
                  className="ui-rating-icon-fill"
                  style={{ '--_rating-fill': star.fill } as CSSProperties}
                >
                  {defautOn(star)}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
