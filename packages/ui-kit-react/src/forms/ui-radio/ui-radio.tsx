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
   *
   * ⚠️ Écart avec la version Angular, où `readonly` est **hérité de la classe
   * de base et jamais utilisé** : un `<ui-radio readonly>` y est sans effet.
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
          // `checked` seulement en mode contrôlé : le passer à `undefined`
          // laisse l'input non contrôlé, et c'est le DOM qui tient
          // l'exclusivité du groupe par le `name`.
          checked={checked}
          required={required}
          disabled={disabled}
          aria-label={field.ariaLabel}
          aria-describedby={field.describedBy}
          // Pas d'`aria-invalid` : la spécification ARIA ne le supporte pas sur
          // le rôle `radio`, et c'est cohérent : la validité porte sur le CHOIX,
          // donc sur le groupe, pas sur chacune de ses options. `invalid` ne
          // pilote donc ici que le rendu ; l'annonce revient au `radiogroup` ou
          // au message d'erreur du groupe.
          //
          // ⚠️ Divergence assumée avec la version Angular, qui pose l'attribut.
          // Signalé par jsx-a11y ; à corriger côté Angular.
          // Pas d'`aria-readonly` non plus : la spécification ne le supporte
          // pas sur le rôle `radio`, seulement sur `radiogroup`. Même logique
          // que pour `aria-invalid` ci-dessus, et elle se tient : c'est le
          // CHOIX qui est en lecture seule, donc le groupe. L'annonce revient
          // au `radiogroup` englobant ; ici on garantit seulement que la
          // sélection ne bouge pas.
          //
          // Un `change` de radio ne se déclenche QUE lorsqu'il devient
          // sélectionné : il n'y a donc rien à tester ici, sauf `readOnly`.
          onChange={(event) => {
            if (readOnly) {
              // Le navigateur a déjà coché : on remet la propriété du DOM,
              // faute de quoi l'affichage et le modèle divergeraient, React ne
              // re-rendant pas puisque l'état ne change pas.
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
