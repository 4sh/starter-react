'use client';

import type { ComponentPropsWithRef, MouseEvent, ReactNode } from 'react';

import { UiIcon } from '../../base/ui-icon';
import type { UiFeedbackLevel, UiSubLevel } from '../../core/types';
import { cx } from '../../core/utils';

import { UI_TOAST_DEFAULT_ICONS } from './ui-toast.types';

import './ui-toast.scss';

export interface UiToastProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  /** Ligne de titre, en gras. */
  title?: string;
  /** Corps du message. */
  text?: string;
  level?: UiFeedbackLevel;
  /** Intensité : `high` soutenue, `low` discrète. */
  subLevel?: UiSubLevel;
  /**
   * Icône de tête : un nom pour surcharger celle du niveau, `false` pour la
   * masquer, `true` pour garder le défaut du niveau.
   */
  icon?: string | boolean;
  /** Affiche le bouton de fermeture. */
  closable?: boolean;
  closeIcon?: string;
  /** Nom accessible du bouton de fermeture. */
  closeAriaLabel?: string;
  /** Étire la carte sur toute la largeur de sa région, façon bannière. */
  expanded?: boolean;
  /** Appelé au clic sur la fermeture. */
  onClose?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Contenu libre, rendu sous le titre et le message. */
  children?: ReactNode;
}

/**
 * ui-toast : la carte de notification, sans son empilement.
 *
 * Elle s'annonce seule : `role="alert"` pour `error` et `warning`, `role="status"`
 * sinon. C'est `UiToastContainer` qui la fait flotter et disparaître, mais elle
 * se pose telle quelle partout ailleurs.
 */
export function UiToast({
  title,
  text,
  level = 'default',
  subLevel = 'high',
  icon = true,
  closable = true,
  closeIcon = 'times-circle',
  closeAriaLabel = 'Fermer',
  expanded = false,
  onClose,
  className,
  children,
  ...rest
}: UiToastProps) {
  const iconName =
    icon === false ? null : typeof icon === 'string' ? icon : UI_TOAST_DEFAULT_ICONS[level];
  const urgent = level === 'error' || level === 'warning';

  return (
    <div
      {...rest}
      className={cx('ui-toast', `_${level}`, `_${subLevel}`, expanded && '_expanded', className)}
      role={urgent ? 'alert' : 'status'}
      aria-live={urgent ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {iconName && (
        <span className="ui-toast-icon">
          <UiIcon name={iconName} size="md" />
        </span>
      )}

      <div className="ui-toast-content">
        {title && <span className="ui-toast-title">{title}</span>}
        {text && <span className="ui-toast-text">{text}</span>}
        {children}
      </div>

      {closable && (
        <button
          type="button"
          className="ui-toast-close"
          aria-label={closeAriaLabel || undefined}
          onClick={onClose}
        >
          <UiIcon name={closeIcon} size="sm" />
        </button>
      )}
    </div>
  );
}
