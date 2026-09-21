'use client';

import type { ChangeEvent, ComponentPropsWithRef, ReactNode, Ref } from 'react';

import { useControllableState, useUiField } from '../../core/forms';
import { cx } from '../../core/utils';

import './ui-toggle.scss';

export type ToggleSize = 'default' | 'small';
export type ToggleLabelPosition = 'before' | 'after';

/** Contexte remis au rendu personnalisé de la pastille. */
export interface ToggleHandleContext {
  checked: boolean;
}

type NativeToggleProps = Omit<
  ComponentPropsWithRef<'input'>,
  | 'type'
  | 'role'
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
>;

export interface UiToggleProps<T = boolean> extends NativeToggleProps {
  /** Libellé affiché à côté. Cliquer dessus bascule l'interrupteur. */
  label?: string;
  /** Côté du libellé. Les deux côtés restent cliquables. */
  labelPosition?: ToggleLabelPosition;
  size?: ToggleSize;
  /** Valeur imposée. Renseignée, l'interrupteur est **contrôlé**. */
  value?: T;
  /** Valeur de départ quand l'interrupteur est non contrôlé. */
  defaultValue?: T;
  /** Notifié à chaque bascule, dans les deux modes. */
  onValueChange?: (value: T) => void;
  /** Valeur du modèle quand l'interrupteur est activé. */
  trueValue?: T;
  /** Valeur du modèle quand il est désactivé. */
  falseValue?: T;
  /**
   * Rend le contenu de la pastille. Reçoit l'état, pour pouvoir en dépendre :
   * une coche quand c'est activé, une croix sinon.
   */
  renderHandle?: (context: ToggleHandleContext) => ReactNode;
  required?: boolean;
  disabled?: boolean;
  /** Lecture seule. L'interrupteur reste focalisable mais ne bascule plus. */
  readOnly?: boolean;
  /** Force le rendu en erreur. */
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/**
 * ui-toggle : interrupteur bâti sur un `<input type="checkbox" role="switch">`
 * natif, invisible et posé sur le rail.
 *
 * `role="switch"` pour un réglage qui prend effet immédiatement ; `ui-checkbox`
 * pour un choix validé ensuite. Même contrat que lui par ailleurs.
 */
export function UiToggle<T = boolean>({
  label,
  labelPosition = 'after',
  size = 'default',
  value,
  defaultValue,
  onValueChange,
  trueValue = true as T,
  falseValue = false as T,
  renderHandle,
  required = false,
  disabled = false,
  readOnly = false,
  invalid = false,
  id,
  className,
  ref,
  ...rest
}: UiToggleProps<T>) {
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

  const onNativeChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (readOnly) {
      // Même raison que pour `ui-checkbox` : pas de `readOnly` natif, le
      // navigateur a déjà basculé la propriété, et React ne re-rendra pas
      // puisque l'état ne change pas.
      event.target.checked = checked;
      return;
    }
    setModel(event.target.checked ? trueValue : falseValue);
  };

  const labelNode = label && (
    <span className="ui-toggle-label">
      <span className="ui-toggle-text">{label}</span>
      {required && (
        <span className="ui-toggle-required" aria-hidden="true">
          *
        </span>
      )}
    </span>
  );

  return (
    <label
      className={cx(
        'ui-toggle',
        size !== 'default' && `_${size}`,
        checked && '_checked',
        disabled && '_disabled',
        readOnly && '_readonly',
        field.level === 'error' && '_invalid',
        className,
      )}
    >
      {labelPosition === 'before' && labelNode}

      <span className="ui-toggle-control">
        <input
          {...rest}
          ref={ref}
          type="checkbox"
          role="switch"
          className="ui-toggle-input"
          id={field.inputId}
          checked={checked}
          required={required}
          disabled={disabled}
          aria-label={field.ariaLabel}
          aria-describedby={field.describedBy}
          aria-invalid={field.ariaInvalid}
          aria-readonly={readOnly ? true : undefined}
          // Pas d'`aria-checked` : sur un `<input type="checkbox">`, l'état coché
          // natif est déjà exposé à l'assistance technique, quel que soit le
          // `role`. L'ajouter serait un doublon qui peut diverger de l'état réel,
          // et un `aria-checked` en désaccord avec la case donne un comportement
          // indéfini. La version Angular le pose ; ici il n'apporte rien.
          onChange={onNativeChange}
        />
        <span className="ui-toggle-track" aria-hidden="true">
          <span className="ui-toggle-thumb">{renderHandle?.({ checked })}</span>
        </span>
      </span>

      {labelPosition === 'after' && labelNode}
    </label>
  );
}
