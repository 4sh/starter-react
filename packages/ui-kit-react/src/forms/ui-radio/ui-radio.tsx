'use client';

import type { ComponentPropsWithRef, Ref } from 'react';

import { useUiField } from '../../core/forms';
import { cx } from '../../core/utils';

import './ui-radio.scss';

type NativeRadioProps = Omit<
  ComponentPropsWithRef<'input'>,
  | 'type'
  | 'value'
  | 'defaultValue'
  | 'checked'
  | 'onChange'
  | 'size'
  | 'children'
  | 'required'
  | 'disabled'
  | 'readOnly'
>;

export interface UiRadioProps<T = unknown> extends NativeRadioProps {
  /** Valeur portée par ce bouton radio. Le modèle la prend quand il est sélectionné. */
  value: T;
  /**
   * Valeur du **groupe**. Renseignée, le bouton est **contrôlé** : il est
   * sélectionné quand elle est égale à sa propre `value`.
   */
  groupValue?: T;
  /** Notifié quand ce bouton devient sélectionné, avec sa propre `value`. */
  onValueChange?: (value: T) => void;
  /** Libellé affiché à côté. Cliquer dessus sélectionne le bouton. */
  label?: string;
  required?: boolean;
  disabled?: boolean;
  /**
   * Consultable mais pas modifiable. Un `<input type="radio">` n'a **pas** de
   * `readOnly` natif : l'attribut ne s'applique qu'aux champs de saisie. Le
   * bouton reste donc focalisable, et la sélection est annulée dans le
   * gestionnaire.
   *
   * L'**annonce** ne peut pas se faire ici : la spécification ARIA ne supporte
   * `aria-readonly` que sur `radiogroup`, pas sur `radio`. Poser
   * `aria-readonly` sur le groupe englobant reste donc à la charge de
   * l'appelant, comme pour la validité.
   */
  readOnly?: boolean;
  /** Force le rendu en erreur. */
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/**
 * ui-radio : bouton radio bâti sur un `<input type="radio">` natif.
 *
 * Chaque bouton porte sa `value` ; c'est le groupe qui porte la valeur choisie.
 * Contrôlé par `groupValue`, ou non contrôlé en laissant le `name` natif tenir
 * l'exclusivité. Pas de `defaultValue` : il ne pourrait pas coordonner ses
 * voisins. Les deux modes sont détaillés dans la page de doc.
 */
export function UiRadio<T = unknown>({
  value,
  groupValue,
  onValueChange,
  label,
  required = false,
  disabled = false,
  readOnly = false,
  invalid = false,
  id,
  className,
  ref,
  ...rest
}: UiRadioProps<T>) {
  const field = useUiField({
    label,
    level: 'default',
    invalid,
    'aria-label': rest['aria-label'],
    'aria-describedby': rest['aria-describedby'],
    id,
  });

  const isControlled = groupValue !== undefined;
  const checked = isControlled ? groupValue === value : undefined;

  return (
    <label
      className={cx(
        'ui-radio',
        checked && '_checked',
        disabled && '_disabled',
        readOnly && '_readonly',
        field.level === 'error' && '_invalid',
        className,
      )}
    >
      <span className="ui-radio-control">
        <input
          {...rest}
          ref={ref}
          type="radio"
          className="ui-radio-input"
          id={field.inputId}
          // `undefined` hors mode contrôlé : le DOM tient alors l'exclusivité par le `name`.
          checked={checked}
          required={required}
          disabled={disabled}
          aria-label={field.ariaLabel}
          aria-describedby={field.describedBy}
          // Ni `aria-invalid` ni `aria-readonly` : ARIA ne les supporte pas sur
          // `radio`, l'annonce revient au `radiogroup` englobant.
          onChange={(event) => {
            if (readOnly) {
              // Déjà coché par le navigateur : React ne re-rendra pas, on remet le DOM.
              event.target.checked = checked ?? false;
              return;
            }
            onValueChange?.(value);
          }}
        />
        <span className="ui-radio-box" aria-hidden="true">
          <span className="ui-radio-dot" />
        </span>
      </span>

      {label && (
        <span className="ui-radio-label">
          <span className="ui-radio-text">{label}</span>
          {required && (
            <span className="ui-radio-required" aria-hidden="true">
              *
            </span>
          )}
        </span>
      )}
    </label>
  );
}
