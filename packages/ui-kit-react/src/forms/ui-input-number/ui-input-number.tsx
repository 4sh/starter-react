'use client';

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type FocusEvent,
  type KeyboardEvent,
  type Ref,
} from 'react';

import { UiIcon } from '../../base/ui-icon';
import { useControllableState, useUiField, type UiFieldSharedProps } from '../../core/forms';
import { cx } from '../../core/utils';
import { UiField } from '../ui-field';

import './ui-input-number.scss';

type NativeProps = Omit<
  ComponentPropsWithRef<'input'>,
  | 'type'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'size'
  | 'children'
  | 'required'
  | 'disabled'
  | 'readOnly'
  | 'min'
  | 'max'
  | 'step'
  | 'ref'
>;

export interface UiInputNumberProps extends UiFieldSharedProps, NativeProps {
  /** Valeur imposée. Renseignée, le champ est contrôlé. */
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  /** Borne basse : écrêtage à la sortie du champ, et bouton moins désactivé. */
  min?: number;
  /** Borne haute : écrêtage à la sortie du champ, et bouton plus désactivé. */
  max?: number;
  /** Pas d'incrément, pour le pavé et les flèches. */
  step?: number;
  /** Autoriser les décimales. */
  allowDecimals?: boolean;
  /** Unité en suffixe. Ignorée quand `currency` est renseigné. */
  unit?: string;
  /** Afficher le pavé d'incrément. */
  showButtons?: boolean;
  incrementAriaLabel?: string;
  decrementAriaLabel?: string;
  /** Étiquette BCP-47. Par défaut, celle du navigateur. */
  locale?: string;
  /** Code ISO de devise, qui bascule le formatage en monétaire. */
  currency?: string;
  /** Séparateurs de milliers à la sortie du champ. */
  useGrouping?: boolean;
  minFractionDigits?: number;
  maxFractionDigits?: number;
  /** Remplace le formatage d'affichage. */
  formatValue?: (value: number) => string;
  ref?: Ref<HTMLInputElement>;
}

/**
 * ui-input-number : champ numérique, bâti sur la coquille `ui-field`.
 *
 * La saisie est **permissive** : le texte n'est pas reformaté pendant la frappe,
 * donc le curseur ne saute jamais. Le champ montre une forme éditable au focus,
 * et le formatage riche (milliers, devise, décimales) s'applique à la sortie,
 * en même temps que l'écrêtage sur `min` et `max`.
 */
export function UiInputNumber({
  value,
  defaultValue = null,
  onValueChange,
  min,
  max,
  step = 1,
  allowDecimals = true,
  unit,
  showButtons = true,
  incrementAriaLabel = 'Augmenter',
  decrementAriaLabel = 'Diminuer',
  locale,
  currency,
  useGrouping = true,
  minFractionDigits,
  maxFractionDigits,
  formatValue,
  label,
  helperText,
  errorText,
  showMessageIcon = false,
  messageIcon,
  size = 'default',
  level = 'default',
  floatLabel,
  required = false,
  disabled = false,
  readOnly = false,
  invalid = false,
  id,
  className,
  ref,
  ...rest
}: UiInputNumberProps) {
  const innerRef = useRef<HTMLInputElement>(null);

  const [model, setModel] = useControllableState<number | null>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  const field = useUiField({
    label,
    helperText,
    errorText,
    level,
    invalid,
    'aria-label': rest['aria-label'],
    'aria-describedby': rest['aria-describedby'],
    id,
  });

  /** Forme riche, appliquée à la sortie du champ. */
  const format = useCallback(
    (n: number) => {
      if (formatValue) return formatValue(n);
      const options: Intl.NumberFormatOptions = { useGrouping };
      if (currency) {
        options.style = 'currency';
        options.currency = currency;
      }
      if (minFractionDigits != null) options.minimumFractionDigits = minFractionDigits;
      if (maxFractionDigits != null) options.maximumFractionDigits = maxFractionDigits;
      return new Intl.NumberFormat(locale, options).format(n);
    },
    [formatValue, useGrouping, currency, minFractionDigits, maxFractionDigits, locale],
  );

  /** Forme éditable au focus : décimales de la locale, sans milliers ni devise. */
  const editable = useCallback(
    (n: number) =>
      new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 20 }).format(n),
    [locale],
  );

  // Le texte est un état À PART, pas une dérivée du modèle : pendant la frappe « 1, » ou
  // « - » ne sont aucun nombre, et reformater ferait sauter le curseur.
  const [text, setText] = useState(() => (model === null ? '' : format(model)));

  const separators = useMemo(() => {
    const parts = new Intl.NumberFormat(locale).formatToParts(11111.1);
    return {
      group: parts.find((p) => p.type === 'group')?.value ?? '',
      decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
    };
  }, [locale]);

  const parse = (raw: string): number | null => {
    let s = raw.trim();
    if (separators.group) s = s.split(separators.group).join('');
    s = s
      .replace(/\s/g, '') // espaces, y compris les séparateurs U+202F et U+00A0
      .replace(separators.decimal, '.')
      .replace(/[^0-9.-]/g, ''); // symboles monétaires
    if (s === '' || s === '-' || s === '.' || s === '-.') return null;
    const n = Number(s);
    if (Number.isNaN(n)) return null;
    return allowDecimals ? n : Math.trunc(n);
  };

  const clamp = (n: number | null): number | null => {
    if (n === null) return null;
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };

  const atMax = model != null && max != null && model >= max;
  const atMin = model != null && min != null && model <= min;

  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
    setModel(parse(event.target.value));
  };

  const onFocus = (event: FocusEvent<HTMLInputElement>) => {
    if (model != null) setText(editable(model));
    rest.onFocus?.(event);
  };

  const onBlur = (event: FocusEvent<HTMLInputElement>) => {
    const next = clamp(model);
    setModel(next);
    setText(next === null ? '' : format(next));
    rest.onBlur?.(event);
  };

  const stepBy = (direction: 1 | -1) => {
    if (disabled || readOnly) return;
    const next = clamp((model ?? 0) + direction * step);
    const focused = document.activeElement === innerRef.current;
    setModel(next);
    setText(next === null ? '' : focused ? editable(next) : format(next));
    innerRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      stepBy(1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      stepBy(-1);
    }
    rest.onKeyDown?.(event);
  };

  const displayUnit = currency ? undefined : unit;

  const spinnerButton = (direction: 1 | -1, ariaLabel: string, atBound: boolean) => (
    <button
      type="button"
      // Hors du parcours clavier : les flèches du champ font déjà le travail.
      tabIndex={-1}
      aria-label={ariaLabel}
      disabled={disabled || readOnly || atBound}
      onClick={() => stepBy(direction)}
    >
      <UiIcon name={direction === 1 ? 'angle-up' : 'angle-down'} size="sm" />
    </button>
  );

  return (
    <UiField
      className={className}
      label={label}
      htmlFor={field.inputId}
      required={required}
      size={size}
      level={field.level}
      floatLabel={floatLabel}
      filled={text !== ''}
      disabled={disabled}
      readOnly={readOnly}
      message={field.message}
      messageId={field.messageId}
      showMessageIcon={showMessageIcon}
      messageIcon={messageIcon}
      suffix={
        displayUnit || showButtons ? (
          <>
            {displayUnit && (
              <span
                className={cx(
                  'ui-input-number-unit',
                  size === 'small' && '_small',
                  disabled && '_disabled',
                )}
              >
                {displayUnit}
              </span>
            )}
            {showButtons && (
              <span className="ui-input-number-spinner">
                {spinnerButton(1, incrementAriaLabel, atMax)}
                {spinnerButton(-1, decrementAriaLabel, atMin)}
              </span>
            )}
          </>
        ) : undefined
      }
    >
      <input
        {...rest}
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={cx('ui-input-number-native', size === 'small' && '_small')}
        // `text` et non `number` : le natif refuse les séparateurs de la locale, perd des
        // décimales selon le navigateur et impose son pavé ; `inputMode` suffit au tactile.
        type="text"
        inputMode="decimal"
        id={field.inputId}
        value={text}
        placeholder={floatLabel && label ? '' : rest.placeholder}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        role="spinbutton"
        aria-valuenow={model ?? undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={field.ariaLabel}
        aria-describedby={field.describedBy}
        aria-invalid={field.ariaInvalid}
        onChange={onInput}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </UiField>
  );
}
