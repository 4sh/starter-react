'use client';

import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cx } from '../../core/utils';

import './ui-card.scss';

export type CardVariant = 'outlined' | 'elevated' | 'flat';

type NativeProps = Omit<ComponentPropsWithRef<'div'>, 'title' | 'content'>;

export interface UiCardProps extends NativeProps {
  /** Zone visuelle pleine largeur, rendue au-dessus du corps. */
  media?: ReactNode;
  /** Titre. Une chaîne suffit, mais tout nœud est accepté. */
  header?: ReactNode;
  /** Sous-titre, rendu sous le titre. */
  subheader?: ReactNode;
  /** Zone de pied : actions, étiquettes. */
  footer?: ReactNode;
  variant?: CardVariant;
  /** Occuper toute la largeur du parent. */
  fluid?: boolean;
  /**
   * Retire la gouttière horizontale du corps pour que le contenu touche les
   * bords. La regouttiérer se fait par `padding-inline: var(--ui-card-gutter)`.
   */
  contentFlush?: boolean;
  /** Classes posées sur la zone de contenu, gouttière conservée. */
  contentClassName?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Corps de la carte. */
  children?: ReactNode;
}

/**
 * ui-card : conteneur qui compose des zones optionnelles, visuel, en-tête
 * (titre et sous-titre), corps et pied.
 *
 * Chaque zone n'est rendue que si elle a du contenu : pas de conteneur vide,
 * donc pas d'espacement fantôme.
 *
 * Là où la version Angular détectait ses zones par des directives marqueurs et
 * une inspection du DOM après rendu, ici ce sont des props : `media`, `header`,
 * `subheader`, `footer`, et `children` pour le corps.
 */
export function UiCard({
  media,
  header,
  subheader,
  footer,
  variant = 'outlined',
  fluid = false,
  contentFlush = false,
  contentClassName,
  className,
  children,
  ...rest
}: UiCardProps) {
  const ariaLabel = rest['aria-label'];
  const ariaLabelledBy = rest['aria-labelledby'];

  const hasHeader = Boolean(header) || Boolean(subheader);
  const hasContent = Boolean(children);

  return (
    <div
      {...rest}
      className={cx(
        'ui-card',
        `_${variant}`,
        Boolean(media) && '_has-media',
        fluid && '_fluid',
        className,
      )}
      // Un point de repère nommé seulement : un `role="region"` sans nom
      // encombre la liste des repères sans rien y apporter.
      role={ariaLabel || ariaLabelledBy ? 'region' : undefined}
    >
      {media && <div className="ui-card-media">{media}</div>}

      <div className="ui-card-body">
        {hasHeader && (
          <div className="ui-card-header">
            {header && <div className="ui-card-title">{header}</div>}
            {subheader && <div className="ui-card-subtitle">{subheader}</div>}
          </div>
        )}

        <div
          className={cx(
            'ui-card-content',
            !hasContent && '_empty',
            contentFlush && '_flush',
            contentClassName,
          )}
        >
          {children}
        </div>

        {footer && <div className="ui-card-footer">{footer}</div>}
      </div>
    </div>
  );
}
