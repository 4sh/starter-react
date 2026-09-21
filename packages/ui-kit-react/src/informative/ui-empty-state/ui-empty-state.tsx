'use client';

import type { ComponentPropsWithRef, ReactNode } from 'react';

import { UiIcon, type UiIconType } from '../../base/ui-icon';
import { cx } from '../../core/utils';

import './ui-empty-state.scss';

export type EmptyStateSize = 'default' | 'small';

// `title` est repris pour le titre affiché, comme côté Angular : l'attribut
// natif du même nom (l'infobulle du navigateur) est donc écarté.
type NativeProps = Omit<ComponentPropsWithRef<'div'>, 'title'>;

export interface UiEmptyStateProps extends NativeProps {
  /** Ligne principale : ce qui est vide, et pourquoi. */
  title?: string;
  /** Ligne d'appui sous le titre : la marche à suivre. */
  description?: string;
  /** Nom d'icône, raccourci pour le visuel. Ignoré si `media` est renseigné. */
  icon?: string;
  iconType?: UiIconType;
  size?: EmptyStateSize;
  /** Visuel libre (illustration, image), qui remplace `icon`. */
  media?: ReactNode;
  /**
   * Afficher la zone visuelle. `false` garde un état vide purement textuel sans
   * avoir à retirer `icon` ou `media` du code appelant.
   */
  showMedia?: boolean;
  /** Zone d'actions, rendue sous le texte. */
  actions?: ReactNode;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Contenu libre, entre la description et les actions. */
  children?: ReactNode;
}

/**
 * ui-empty-state : dit l'absence de contenu, et propose une suite.
 *
 * Pile verticale centrée : un visuel, un titre, une description, un contenu
 * libre et des actions. Chaque zone n'est rendue que si elle a du contenu.
 */
export function UiEmptyState({
  title,
  description,
  icon,
  iconType = 'solid',
  size = 'default',
  media,
  showMedia = true,
  actions,
  className,
  children,
  ...rest
}: UiEmptyStateProps) {
  const ariaLabel = rest['aria-label'];
  const ariaLabelledBy = rest['aria-labelledby'];

  const showVisual = showMedia && Boolean(media ?? icon);
  const hasText = Boolean(title) || Boolean(description) || Boolean(children);

  return (
    <div
      {...rest}
      className={cx('ui-empty-state', size !== 'default' && `_${size}`, className)}
      role={ariaLabel || ariaLabelledBy ? 'region' : undefined}
    >
      {showVisual && (
        <div className="ui-empty-state-media">
          {media ?? (icon && <UiIcon name={icon} type={iconType} size="xl" />)}
        </div>
      )}

      <div className={cx('ui-empty-state-text', !hasText && '_empty')}>
        {title && <p className="ui-empty-state-title">{title}</p>}
        {description && <p className="ui-empty-state-description">{description}</p>}
        {children && <div className="ui-empty-state-body">{children}</div>}
      </div>

      {actions && <div className="ui-empty-state-actions">{actions}</div>}
    </div>
  );
}
