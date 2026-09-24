'use client';

import type { ChangeEvent, ComponentPropsWithRef, MouseEvent, ReactNode, Ref } from 'react';

import { UiIcon, type UiIconSize } from '../../base/ui-icon';
import { useControllableState, useUiField, type UiFieldSharedProps } from '../../core/forms';
import { cx } from '../../core/utils';
import { UiField } from '../ui-field';

import './ui-input.scss';

/** Types texte pris en charge. Le numérique a son composant dédié, `ui-input-number`. */
export type InputType = 'text' | 'password' | 'email' | 'tel' | 'url' | 'search';

type NativeInputProps = Omit<
  ComponentPropsWithRef<'input'>,
  | 'type'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'size'
  | 'prefix'
  | 'children'
  | 'required'
  | 'disabled'
  | 'readOnly'
>;

export interface UiInputProps extends UiFieldSharedProps, NativeInputProps {
  type?: InputType;
  /** Valeur imposée. Renseignée, le champ est **contrôlé**. */
  value?: string;
  /** Valeur de départ quand le champ est non contrôlé. */
  defaultValue?: string;
  /** Notifié à chaque frappe, dans les deux modes. */
  onValueChange?: (value: string) => void;
  /** Unité affichée en suffixe (« % », « €», « @domaine »…). */
  unit?: string;
  /** Icône de gauche. Un **nom** est rendu par `ui-icon`, un **nœud** tel quel. */
  iconLeft?: string | ReactNode;
  /** Icône de droite. Même règle. */
  iconRight?: string | ReactNode;
  /**
   * Nom accessible de l'icône de droite.
   *
   * **Le renseigner transforme l'icône en zone d'action** : un vrai `<button>`
   * carré sur toute la hauteur, qui émet `onIconRightClick`. Sans nom
   * accessible il n'y a pas de bouton : un bouton sans nom est un piège pour
   * un lecteur d'écran, pas une fonctionnalité.
   */
  iconRightAriaLabel?: string;
  onIconRightClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Contenu du pied, à côté du message : compteur de caractères… */
  footer?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

/**
 * ui-input : champ texte composé, bâti sur la coquille `ui-field` et un `<input>` natif.
 *
 * Révéler un mot de passe ou vider une recherche passent par la zone d'action
 * de droite, pas par une prop dédiée : un seul mécanisme pour tous les cas.
 *
 * Pour les nombres, `ui-input-number` ; pour les masques, `ui-input-mask`.
 */
export function UiInput({
  type = 'text',
  value,
  defaultValue = '',
  onValueChange,
  unit,
  iconLeft,
  iconRight,
  iconRightAriaLabel,
  onIconRightClick,
  footer,
  // --- Props partagées de la coquille ---
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
}: UiInputProps) {
  const shared = {
    label,
    helperText,
    errorText,
    level,
    invalid,
    'aria-label': rest['aria-label'],
    'aria-describedby': rest['aria-describedby'],
  };
  const field = useUiField({ ...shared, id });

  const [text, setText] = useControllableState<string>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  const iconSize: UiIconSize = size === 'small' ? 'sm' : 'md';
  const hasFloatLabel = Boolean(floatLabel) && Boolean(label);
  const hasRightAction = Boolean(iconRight) && Boolean(iconRightAriaLabel);

  const renderIcon = (icon: string | ReactNode) =>
    typeof icon === 'string' ? <UiIcon name={icon} size={iconSize} /> : icon;

  const affix = (icon: string | ReactNode) => (
    <span className={cx('ui-input-icon', disabled && '_disabled')}>{renderIcon(icon)}</span>
  );

  const suffix = (
    <>
      {unit && (
        <span
          className={cx('ui-input-unit', size === 'small' && '_small', disabled && '_disabled')}
        >
          {unit}
        </span>
      )}
      {iconRight &&
        (hasRightAction ? (
          <button
            type="button"
            className="ui-input-action"
            aria-label={iconRightAriaLabel}
            disabled={disabled}
            onClick={onIconRightClick}
          >
            {renderIcon(iconRight)}
          </button>
        ) : (
          affix(iconRight)
        ))}
    </>
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
      prefix={iconLeft ? affix(iconLeft) : undefined}
      suffix={unit || iconRight ? suffix : undefined}
      footer={footer}
    >
      <input
        {...rest}
        ref={ref}
        className={cx('ui-input-native', size === 'small' && '_small')}
        type={type}
        id={field.inputId}
        value={text}
        // Au repos, le libellé flottant occupe cette place : un placeholder s'y superposerait.
        placeholder={hasFloatLabel ? '' : rest.placeholder}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        aria-label={field.ariaLabel}
        aria-describedby={field.describedBy}
        aria-invalid={field.ariaInvalid}
        // `rest.onInput` est déjà attaché par le spread : le rechaîner le ferait tirer deux fois.
        onChange={(event: ChangeEvent<HTMLInputElement>) => setText(event.target.value)}
      />
    </UiField>
  );
}
