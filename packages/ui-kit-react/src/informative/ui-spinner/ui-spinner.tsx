'use client';

import { useEffect, useState, type ComponentPropsWithRef, type ReactNode } from 'react';

import { UiIcon, type UiIconSize } from '../../base/ui-icon';
import { cx } from '../../core/utils';

import './ui-spinner.scss';

export type UiSpinnerSize = 'default' | 'small';
export type UiSpinnerOrientation = 'vertical' | 'horizontal';

export interface UiSpinnerProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  size?: UiSpinnerSize;
  /** Place du marqueur par rapport au libellé. N'a d'effet qu'avec un `label`. */
  orientation?: UiSpinnerOrientation;
  /** Texte visible, rendu dans la région vivante. */
  label?: string;
  /** Nom accessible. Par défaut le `label`, sinon « Chargement ». */
  'aria-label'?: string;

  /** Remplace entièrement le marqueur animé. Prioritaire sur `image` et `icon`. */
  renderMark?: () => ReactNode;
  /** URL d'image servant de marqueur, rendue telle quelle avec sa propre animation. */
  image?: string;
  /** Texte alternatif de l'image. Vide, elle est décorative. */
  imageAlt?: string;
  /** Nom d'icône servant de marqueur. Le composant lui applique la rotation. */
  icon?: string;

  /** Épaisseur du trait du cercle par défaut, dans l'échelle 0-50 du viewBox. */
  strokeWidth?: string | number;
  /** Remplissage du cercle par défaut. `none` ne laisse que l'anneau. */
  fill?: string;
  /** Durée d'une rotation, partagée avec le marqueur en icône. */
  animationDuration?: string;

  /**
   * Délai de grâce avant apparition, en ms. Évite le clignotement du loader
   * pour une attente plus courte que le délai.
   */
  delay?: number;
}

/**
 * ui-spinner : indicateur de chargement indéterminé.
 *
 * Le marqueur se remplace, par ordre de priorité : `renderMark`, `image`, `icon`,
 * puis le cercle intégré. La racine est une région vivante `role="status"`
 * nommée ; le marqueur, lui, est décoratif.
 */
export function UiSpinner({
  size = 'default',
  orientation = 'vertical',
  label,
  renderMark,
  image,
  imageAlt = '',
  icon,
  strokeWidth = 4,
  fill = 'none',
  animationDuration = '1.2s',
  delay = 0,
  className,
  style,
  ...rest
}: UiSpinnerProps) {
  // On mémorise le délai ÉCOULÉ, pas un booléen : `visible` s'en déduit sans
  // `setState` synchrone dans l'effet, et un `delay` allongé re-masque le spinner.
  const [elapsed, setElapsed] = useState<number | null>(null);
  const visible = delay <= 0 || elapsed === delay;

  useEffect(() => {
    if (delay <= 0) return;
    // `setTimeout` et non `requestAnimationFrame` : celui-ci ne tire jamais
    // dans un onglet en arrière-plan, le spinner n'apparaîtrait pas.
    const id = setTimeout(() => setElapsed(delay), delay);
    return () => clearTimeout(id);
  }, [delay]);

  if (!visible) return null;

  // Un libellé visible est déjà lu par la région vivante : le doubler d'un
  // aria-label le remplacerait au lieu de s'y ajouter.
  const ariaLabel = rest['aria-label'] ?? (label ? undefined : 'Chargement');
  const iconSize: UiIconSize = size === 'small' ? 'default' : 'xl';

  const mark = renderMark ? (
    renderMark()
  ) : image ? (
    <img className="ui-spinner-image" src={image} alt={imageAlt} />
  ) : icon ? (
    <span className="ui-spinner-spin">
      <UiIcon name={icon} size={iconSize} />
    </span>
  ) : (
    <svg className="ui-spinner-svg" viewBox="0 0 50 50">
      <circle
        className="ui-spinner-circle"
        cx="25"
        cy="25"
        r="20"
        fill={fill}
        strokeWidth={strokeWidth}
      />
    </svg>
  );

  return (
    <div
      {...rest}
      className={cx(
        'ui-spinner',
        size !== 'default' && `_${size}`,
        orientation === 'horizontal' && '_horizontal',
        className,
      )}
      style={{ ['--ui-spinner-duration' as string]: animationDuration, ...style }}
      role="status"
      aria-live="polite"
      aria-busy={true}
      aria-label={ariaLabel}
    >
      <span className="ui-spinner-mark" aria-hidden="true">
        {mark}
      </span>
      {label && <span className="ui-spinner-label">{label}</span>}
    </div>
  );
}
