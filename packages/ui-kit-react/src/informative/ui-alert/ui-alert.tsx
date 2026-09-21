'use client';

import { useEffect, useRef, type ComponentPropsWithRef, type ReactNode } from 'react';

import { UiIcon, type UiIconSize } from '../../base/ui-icon';
import { useControllableState } from '../../core/forms';
import type { UiFeedbackLevel, UiSubLevel } from '../../core/types';
import { cx } from '../../core/utils';

import './ui-alert.scss';

export type AlertSize = 'default' | 'large';

/** Icône de tête par défaut, par niveau. Surchargeable par la prop `icon`. */
export const UI_ALERT_DEFAULT_ICONS: Record<UiFeedbackLevel, string> = {
  default: 'info-circle',
  highlight: 'info-circle',
  success: 'check',
  warning: 'warning',
  error: 'times',
};

export interface UiAlertProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  /** Ligne de titre, en gras. */
  title?: string;
  /** Corps du message. */
  text?: string;
  level?: UiFeedbackLevel;
  /** Intensité : `high` soutenue, `low` discrète. */
  subLevel?: UiSubLevel;
  size?: AlertSize;
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
  /** Délai en ms avant disparition automatique. `0` ne disparaît jamais. */
  life?: number;
  /** Affichage imposé. Renseigné, l'alerte est **contrôlée**. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Appelé au retrait, au clic comme à l'expiration de `life`. */
  onClose?: () => void;
  /** Contenu libre, rendu sous le titre et le message. */
  children?: ReactNode;
}

/**
 * ui-alert : message en ligne pour un retour informatif, de succès,
 * d'avertissement ou d'erreur.
 *
 * La racine porte `role="alert"` : le message est annoncé dès son apparition.
 * Pour une notification flottante et empilée, c'est `ui-toast`.
 */
export function UiAlert({
  title,
  text,
  level = 'default',
  subLevel = 'high',
  size = 'default',
  icon = true,
  closable = true,
  closeIcon = 'times-circle',
  closeAriaLabel = 'Fermer',
  life = 0,
  open,
  defaultOpen = true,
  onOpenChange,
  onClose,
  className,
  children,
  ...rest
}: UiAlertProps) {
  const [isOpen, setOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const close = () => {
    setOpen(false);
    onClose?.();
  };

  // Motif « dernière valeur » : le compte à rebours ne doit dépendre ni de
  // `onClose` ni de `onOpenChange`, qu'un appelant écrit presque toujours en
  // ligne. Dans les dépendances, chaque rendu du parent relancerait le délai,
  // et une alerte survolée ne disparaîtrait jamais.
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  // `setTimeout` et non `requestAnimationFrame` : le compte à rebours doit
  // continuer dans un onglet en arrière-plan, où les images ne sont plus
  // peintes. Le nettoyage rend l'effet idempotent sous `<StrictMode>`.
  useEffect(() => {
    if (!isOpen || life <= 0) return;
    const id = setTimeout(() => closeRef.current(), life);
    return () => clearTimeout(id);
  }, [isOpen, life]);

  if (!isOpen) return null;

  const iconName =
    icon === false ? null : typeof icon === 'string' ? icon : UI_ALERT_DEFAULT_ICONS[level];
  const iconSize: UiIconSize = size === 'large' ? 'default' : 'md';
  const closeIconSize: UiIconSize = size === 'large' ? 'md' : 'sm';
  // Un titre seul se centre verticalement : sans corps ni contenu projeté, il
  // n'y a pas de première ligne sur laquelle aligner l'icône.
  const titleOnly = Boolean(title) && !text && !children;

  return (
    <div
      {...rest}
      className={cx(
        'ui-alert',
        `_${level}`,
        `_${subLevel}`,
        size !== 'default' && `_${size}`,
        titleOnly && '_title-only',
        className,
      )}
      role="alert"
      aria-atomic="true"
    >
      {iconName && (
        <span className="ui-alert-icon">
          <UiIcon name={iconName} size={iconSize} />
        </span>
      )}

      <div className="ui-alert-content">
        {title && <span className="ui-alert-title">{title}</span>}
        {text && <span className="ui-alert-text">{text}</span>}
        {children}
      </div>

      {closable && (
        <button
          type="button"
          className="ui-alert-close"
          aria-label={closeAriaLabel || undefined}
          onClick={close}
        >
          <UiIcon name={closeIcon} size={closeIconSize} />
        </button>
      )}
    </div>
  );
}
