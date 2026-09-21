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
 *
 * `filled` existe parce que « porte une valeur » ne s'exprime pas en CSS pour
 * tous les contrôles : un déclencheur `<button>` n'a pas de `value`.
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

  // Un `floatLabel` sans libellé n'a rien à faire monter.
  const isFloating = Boolean(floatLabel) && Boolean(label);

  /**
   * Cliquer le chrome de la boîte donne le focus au contrôle.
   *
   * Un `<label for>` couvrirait le libellé, pas la boîte. Et l'événement est
   * intercepté au `mousedown` plutôt qu'au `click` pour pouvoir l'annuler avant
   * que le navigateur ne déplace le focus lui-même : au `click` il serait déjà
   * trop tard, et le curseur sauterait.
   */
  const onBoxMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled || readOnly) return;

    // Un élément déjà interactif garde son propre comportement : voler son
    // mousedown casserait la sélection de texte et les boutons d'action.
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
        // `Boolean()` explicite : `prefix` est un ReactNode, pas une valeur de
        // classe. `cx` refuse le type, et il a raison de le refuser.
        isFloating && Boolean(prefix) && '_has-prefix',
        className,
      )}
    >
      {label && !isFloating && labelNode('ui-field-label')}

      {/*
        Contexte de positionnement du libellé flottant : la boîte de ce
        conteneur EST celle du champ, donc les décalages du libellé se lisent
        contre elle quelle que soit la hauteur. Le libellé est un FRÈRE de la
        boîte, jamais un enfant : `utils.field-inset-edges` confie l'inset
        horizontal au premier et au dernier enfant de la boîte, et un élément
        de plus le lui volerait en silence.
      */}
      <div className="ui-field-control">
        {/*
          eslint-disable-next-line jsx-a11y/no-static-element-interactions --
          EXCEPTION JUSTIFIÉE: cette boîte ne REMPLACE aucun contrôle, elle relaie
          le focus vers celui qu'elle contient, lequel est nativement accessible au
          clavier. La règle vise les div qui se substituent à un contrôle ; ici
          l'interaction est un confort au pointeur qui n'ajoute aucune capacité, et
          un utilisateur clavier atteint le contrôle directement par Tab. Lui donner
          un rôle et un tabindex ajouterait un arrêt de tabulation parasite devant
          chaque champ.
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
