'use client';

import type { ComponentPropsWithRef } from 'react';

import { UiIcon } from '../../base/ui-icon';
import type { UiFeedbackLevel } from '../../core/types';
import { cx } from '../../core/utils';

import './ui-helper.scss';

export type HelperSize = 'default' | 'small';
export type HelperAriaLive = 'off' | 'polite' | 'assertive';

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
 * ui-helper : texte d'aide ou retour contextuel, sous un champ (relié par
 * `aria-describedby`) ou seul.
 *
 * L'icône est décorative. Un retour qui change en cours de saisie demande
 * `ariaLive="polite"` (`"assertive"` pour une erreur), sinon il n'est pas annoncé.
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
