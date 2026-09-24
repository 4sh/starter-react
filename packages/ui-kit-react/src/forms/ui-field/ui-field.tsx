'use client';

import { useRef, type ComponentPropsWithRef, type MouseEvent, type ReactNode } from 'react';

import type { FieldFloatLabel, FieldLevel, FieldSize } from '../../core/forms';
import { cx } from '../../core/utils';
import { UiHelper } from '../../informative/ui-helper';
import { UiLabel } from '../ui-label';

import './ui-field.scss';

export interface UiFieldProps extends Omit<ComponentPropsWithRef<'div'>, 'prefix' | 'children'> {
  /** Libellé, rendu par `ui-label`. */
  label?: string;
  /** `for` du libellé : l'id du contrôle projeté. */
  htmlFor?: string;
  required?: boolean;
  size?: FieldSize;
  /** Niveau effectif : il pilote la bordure et la couleur du message. */
  level?: FieldLevel;
  /** Placement du libellé flottant. Absent = libellé classique au-dessus. */
  floatLabel?: FieldFloatLabel;
  /** Le contrôle porte une valeur : garde le libellé flottant levé après le focus. */
  filled?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  /** Boîte multiligne, alignée en haut, hauteur automatique. Pour `ui-textarea`. */
  multiline?: boolean;
  /** Boîte à hauteur automatique, qui grandit avec son contenu. Pour `ui-select` en multiple. */
  autoHeight?: boolean;
  /** Message sous le champ, déjà résolu par le composant appelant. */
  message?: string;
  /** id du message, pour `aria-describedby`. */
  messageId?: string;
  /**
   * Préfixe le message d'une icône, rendue par `ui-helper` et décorative.
   *
   * Éteint par défaut : un champ annonce son état par sa bordure et son texte.
   * `messageIcon` choisit seulement *quel* glyphe : il n'allume jamais l'icône.
   */
  showMessageIcon?: boolean;
  messageIcon?: string;
  /** Contenu avant le contrôle : icône de gauche, préfixe… */
  prefix?: ReactNode;
  /** Contenu après le contrôle : unité, zone d'action, spinner… */
  suffix?: ReactNode;
  /** Contenu du pied, à côté du message : compteur de caractères… */
  footer?: ReactNode;
  /** Le contrôle lui-même : `<input>`, `<textarea>`… */
  children?: ReactNode;
  /**
   * Donne accès à la **boîte** du champ, celle qui porte la bordure.
   *
   * Un panneau flottant s'y ancre pour prendre sa largeur : s'ancrer sur le
   * contrôle intérieur donnerait un panneau plus étroit que le champ, et
   * s'ancrer sur la racine le placerait sous le message d'aide.
   */
  onBoxRef?: (node: HTMLDivElement | null) => void;
}

/**
 * ui-field : coquille présentationnelle partagée des champs « en boîte ».
 *
 * Purement visuelle, elle ne détient aucune valeur : les composants concrets
 * lui passent l'id, le niveau et le message déjà résolus par `useUiField`.
 * `filled` existe car un déclencheur `<button>` n'a pas de `value` lisible en CSS.
 */
export function UiField({
  label,
  htmlFor,
  required = false,
  size = 'default',
  level = 'default',
  floatLabel,
  filled = false,
  disabled = false,
  readOnly = false,
  multiline = false,
  autoHeight = false,
  message,
  messageId,
  showMessageIcon = false,
  messageIcon,
  prefix,
  suffix,
  footer,
  className,
  onBoxRef,
  children,
  ...rest
}: UiFieldProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  const isFloating = Boolean(floatLabel) && Boolean(label);

  // Cliquer le chrome de la boîte donne le focus au contrôle. Au `mousedown`, pas
  // au `click` : l'annuler avant que le navigateur ne déplace le focus lui-même.
  const onBoxMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled || readOnly) return;

    // Un élément interactif garde son comportement (sélection de texte, boutons).
    const target = event.target as HTMLElement;
    if (target.closest('button, a[href], input, textarea, select, [contenteditable="true"]'))
      return;

    const control = boxRef.current?.querySelector<HTMLElement>('input, textarea, select');
    if (!control || control.matches(':disabled')) return;

    event.preventDefault();
    control.focus();
  };

  const labelNode = (labelClass: string) => (
    <UiLabel
      className={labelClass}
      htmlFor={htmlFor}
      label={label}
      required={required}
      size={size}
      disabled={disabled}
    />
  );

  return (
    <div
      {...rest}
      className={cx(
        'ui-field',
        `_${level}`,
        size !== 'default' && `_${size}`,
        disabled && '_disabled',
        readOnly && '_readonly',
        multiline && '_multiline',
        autoHeight && '_auto-height',
        isFloating && ['_float', `_float-${floatLabel}`],
        isFloating && filled && '_filled',
        isFloating && Boolean(prefix) && '_has-prefix',
        className,
      )}
    >
      {label && !isFloating && labelNode('ui-field-label')}

      {/* Libellé flottant : FRÈRE de la boîte, jamais enfant, car l'inset horizontal
          revient au premier et au dernier enfant de la boîte. */}
      <div className="ui-field-control">
        {/*
          eslint-disable-next-line jsx-a11y/no-static-element-interactions --
          EXCEPTION JUSTIFIÉE: relais de focus au pointeur vers le contrôle natif,
          qu'un rôle et un tabindex doubleraient d'un arrêt de tabulation parasite.
        */}
        <div
          className="ui-field-box"
          ref={(node) => {
            boxRef.current = node;
            onBoxRef?.(node);
          }}
          onMouseDown={onBoxMouseDown}
        >
          {prefix}
          {children}
          {suffix}
        </div>

        {isFloating && labelNode('ui-field-float-label')}
      </div>

      {(message || footer) && (
        <div className="ui-field-footer">
          {message && (
            <UiHelper
              className="ui-field-message"
              id={messageId}
              message={message}
              level={level}
              showIcon={showMessageIcon}
              icon={messageIcon}
              size="small"
            />
          )}
          {footer}
        </div>
      )}
    </div>
  );
}
