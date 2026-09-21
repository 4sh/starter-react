'use client';

import type { ComponentPropsWithRef } from 'react';

import { UiIcon } from '../../base/ui-icon';
import type { UiFeedbackLevel } from '../../core/types';
import { cx } from '../../core/utils';

import './ui-helper.scss';

export type HelperSize = 'default' | 'small';
export type HelperAriaLive = 'off' | 'polite' | 'assertive';

/** Icône associée à chaque niveau, par défaut. */
const LEVEL_ICONS: Record<UiFeedbackLevel, string> = {
  default: 'question-circle',
  highlight: 'info-circle',
  success: 'check-circle',
  warning: 'exclamation-circle',
  error: 'times-circle',
};

export interface UiHelperProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Message affiché. */
  message: string;
  /** Niveau de retour, qui pilote la couleur et l'icône par défaut. */
  level?: UiFeedbackLevel;
  size?: HelperSize;
  /** Affiche l'icône du niveau. */
  showIcon?: boolean;
  /** Remplace le nom d'icône déduit de `level`. */
  icon?: string;
  /** Région vivante, pour un retour dynamique. */
  ariaLive?: HelperAriaLive;
}

/**
 * ui-helper : texte d'aide ou retour contextuel.
 *
 * Affiche un message précédé d'une icône dont le sens dépend du `level`.
 * Utilisé sous un champ (relié par `aria-describedby`) ou seul.
 *
 * Accessibilité : c'est le **texte** qui porte l'information, l'icône est
 * décorative (`aria-hidden`). Pour un retour qui apparaît ou change en cours de
 * saisie, passer `ariaLive="polite"` (ou `"assertive"` pour une erreur) sans
 * quoi un lecteur d'écran n'annoncera jamais le changement.
 */
export function UiHelper({
  message,
  level = 'default',
  size = 'default',
  showIcon = true,
  icon,
  ariaLive = 'off',
  className,
  ...rest
}: UiHelperProps) {
  const resolvedIcon = icon ?? LEVEL_ICONS[level];

  return (
    <div
      {...rest}
      className={cx('ui-helper', `_${level}`, size !== 'default' && `_${size}`, className)}
      // `off` n'est pas posé : l'attribut absent dit déjà « pas une région
      // vivante », et le poser polluerait le DOM sans rien changer.
      aria-live={ariaLive === 'off' ? undefined : ariaLive}
    >
      {showIcon && resolvedIcon && (
        <UiIcon
          className="ui-helper-icon"
          name={resolvedIcon}
          size={size === 'small' ? 'sm' : 'default'}
        />
      )}
      <span className="ui-helper-message">{message}</span>
    </div>
  );
}
