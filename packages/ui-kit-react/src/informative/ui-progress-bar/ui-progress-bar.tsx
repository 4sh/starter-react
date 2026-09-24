'use client';

import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cx } from '../../core/utils';

import './ui-progress-bar.scss';

export type UiProgressBarSize = 'default' | 'small';
export type UiProgressBarMode = 'determinate' | 'indeterminate';
export type UiProgressBarValuePosition = 'right' | 'bottom' | 'inside';

export interface UiProgressBarProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Avancement, de 0 à 100 (écrêté). Ignoré en mode indéterminé. */
  value?: number;
  /** `determinate` suit une valeur, `indeterminate` boucle sans en suivre aucune. */
  mode?: UiProgressBarMode;
  /** Afficher la valeur à côté de la barre. Sans effet en indéterminé ni en segments. */
  showValue?: boolean;
  /** Unité ajoutée après la valeur. */
  unit?: string;
  size?: UiProgressBarSize;
  /** Place du libellé : à droite, dessous, ou centré dans la portion remplie. */
  valuePosition?: UiProgressBarValuePosition;
  /**
   * Au-delà de 0, la barre devient ce nombre de segments discrets, remplis à
   * proportion de `value`. Masque le libellé numérique.
   */
  steps?: number;
  /** Couleur de remplissage. Pose `--ui-progress-bar-color`. */
  color?: string;
  /** Remplace le libellé de la valeur. */
  renderValue?: (value: number) => ReactNode;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

/**
 * ui-progress-bar : indicateur d'avancement d'un traitement.
 *
 * Trois présentations : une piste remplie à `value`%, une boucle sans valeur
 * (`indeterminate`), ou des segments discrets avec `steps`. La piste porte
 * `role="progressbar"` : la nommer par `aria-label` ou `aria-labelledby`.
 */
export function UiProgressBar({
  value = 0,
  mode = 'determinate',
  showValue = true,
  unit = '%',
  size = 'default',
  valuePosition = 'right',
  steps = 0,
  color,
  renderValue,
  className,
  style,
  ...rest
}: UiProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value || 0));
  const isIndeterminate = mode === 'indeterminate';
  const stepCount = Math.max(0, Math.floor(steps || 0));
  const isSteps = stepCount > 0;
  const filledSteps = Math.round((clamped / 100) * stepCount);

  const showLabel = showValue && !isIndeterminate && !isSteps;
  const labelInside = showLabel && valuePosition === 'inside';

  const label = renderValue ? renderValue(clamped) : `${clamped}${unit}`;

  return (
    <div
      {...rest}
      className={cx(
        'ui-progress-bar',
        `_${valuePosition}`,
        size !== 'default' && `_${size}`,
        isIndeterminate && '_indeterminate',
        isSteps && '_steps',
        className,
      )}
      style={color ? { ['--ui-progress-bar-color' as string]: color, ...style } : style}
    >
      <div
        className="ui-progress-bar-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={isIndeterminate ? undefined : clamped}
        aria-valuetext={isSteps ? `${filledSteps} / ${stepCount}` : undefined}
        aria-label={rest['aria-label']}
        aria-labelledby={rest['aria-labelledby']}
      >
        {isSteps ? (
          Array.from({ length: stepCount }, (_, index) => (
            <span
              key={index}
              className={cx('ui-progress-bar-segment', index < filledSteps && '_active')}
            />
          ))
        ) : isIndeterminate ? (
          <div className="ui-progress-bar-value _indeterminate" />
        ) : (
          <div className="ui-progress-bar-value" style={{ width: `${clamped}%` }}>
            {labelInside && <span className="ui-progress-bar-value-label">{label}</span>}
          </div>
        )}
      </div>

      {showLabel && !labelInside && <div className="ui-progress-bar-label">{label}</div>}
    </div>
  );
}
