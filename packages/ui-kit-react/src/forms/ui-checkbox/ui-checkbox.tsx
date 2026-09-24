'use client';

import {
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type Ref,
} from 'react';

import { UiIcon } from '../../base/ui-icon';
import { useControllableState, useUiField } from '../../core/forms';
import { cx } from '../../core/utils';

import './ui-checkbox.scss';

type NativeCheckboxProps = Omit<
  ComponentPropsWithRef<'input'>,
  | 'type'
  | 'value'
  | 'defaultValue'
  | 'checked'
  | 'defaultChecked'
  | 'onChange'
  | 'size'
  | 'children'
  | 'required'
  | 'disabled'
  | 'readOnly'
  | 'ref'
>;

export interface UiCheckboxProps<T = boolean> extends NativeCheckboxProps {
  /** Libellé affiché à côté de la case. Cliquer dessus bascule la case. */
  label?: string;
  /** Valeur imposée. Renseignée, la case est **contrôlée**. */
  value?: T;
  /** Valeur de départ quand la case est non contrôlée. */
  defaultValue?: T;
  /** Notifié à chaque bascule, dans les deux modes. */
  onValueChange?: (value: T) => void;
  /** Valeur du modèle quand la case est cochée. */
  trueValue?: T;
  /** Valeur du modèle quand la case est décochée. */
  falseValue?: T;
  /**
   * État indéterminé (« certains, pas tous »). Purement **visuel** : le modèle
   * garde sa valeur, et l'état ne se déduit jamais tout seul : c'est au parent
   * de savoir que sa sélection est partielle.
   */
  indeterminate?: boolean;
  /** Icône affichée quand la case est cochée. */
  checkIcon?: string;
  /** Icône affichée en état indéterminé. */
  indeterminateIcon?: string;
  required?: boolean;
  disabled?: boolean;
  /** Lecture seule. La case reste focalisable mais ne bascule plus. */
  readOnly?: boolean;
  /** Force le rendu en erreur. */
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/**
 * ui-checkbox : case à cocher bâtie sur un `<input type="checkbox">` natif,
 * recouvert par la boîte stylée.
 *
 * `value` et non `checked` : le modèle n'est pas forcément booléen
 * (`trueValue` / `falseValue`), et c'est la convention unique du kit.
 */
export function UiCheckbox<T = boolean>({
  label,
  value,
  defaultValue,
  onValueChange,
  trueValue = true as T,
  falseValue = false as T,
  indeterminate = false,
  checkIcon = 'check',
  indeterminateIcon = 'minus',
  required = false,
  disabled = false,
  readOnly = false,
  invalid = false,
  id,
  className,
  ref,
  ...rest
}: UiCheckboxProps<T>) {
  const innerRef = useRef<HTMLInputElement>(null);

  const [model, setModel] = useControllableState<T>({
    value,
    defaultValue: defaultValue ?? falseValue,
    onChange: onValueChange,
  });

  const field = useUiField({
    label,
    level: 'default',
    invalid,
    'aria-label': rest['aria-label'],
    'aria-describedby': rest['aria-describedby'],
    id,
  });

  const checked = model === trueValue;

  // `indeterminate` n'est qu'une propriété du DOM, sans attribut : React ne peut pas la poser.
  useLayoutEffect(() => {
    if (innerRef.current) innerRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const onNativeChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (readOnly) {
      // Pas de `readOnly` natif : le navigateur a déjà basculé, et React ne re-rendra pas.
      event.target.checked = checked;
      return;
    }
    setModel(event.target.checked ? trueValue : falseValue);
  };

  return (
    <label
      className={cx(
        'ui-checkbox',
        checked && '_checked',
        indeterminate && '_indeterminate',
        disabled && '_disabled',
        readOnly && '_readonly',
        field.level === 'error' && '_invalid',
        className,
      )}
    >
      <span className="ui-checkbox-control">
        <input
          {...rest}
          ref={(node) => {
            innerRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          type="checkbox"
          className="ui-checkbox-input"
          id={field.inputId}
          checked={checked}
          required={required}
          disabled={disabled}
          aria-label={field.ariaLabel}
          aria-describedby={field.describedBy}
          aria-invalid={field.ariaInvalid}
          // Pas de `readOnly` natif : annoncé ici, la bascule est annulée au `change`.
          aria-readonly={readOnly ? true : undefined}
          onChange={onNativeChange}
        />
        <span className="ui-checkbox-box" aria-hidden="true">
          <UiIcon
            className="ui-checkbox-icon"
            name={indeterminate ? indeterminateIcon : checkIcon}
            size="md"
          />
        </span>
      </span>

      {label && (
        <span className="ui-checkbox-label">
          <span className="ui-checkbox-text">{label}</span>
          {required && (
            <span className="ui-checkbox-required" aria-hidden="true">
              *
            </span>
          )}
        </span>
      )}
    </label>
  );
}
