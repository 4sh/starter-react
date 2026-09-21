'use client';

import type { ComponentPropsWithRef } from 'react';

import { cx } from '../../core/utils';

import './ui-separator.scss';

export type SeparatorOrientation = 'horizontal' | 'vertical';
export type SeparatorVariant = 'solid' | 'dashed';
export type SeparatorSize = 'default' | 'small';
export type SeparatorLabelAlign = 'start' | 'center' | 'end';

export interface UiSeparatorProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Libellé posé sur le filet. Absent, le filet est continu. */
  label?: string;
  orientation?: SeparatorOrientation;
  /** Style du trait. */
  variant?: SeparatorVariant;
  /** Épaisseur du trait : 2px par défaut, 1px en `small`. */
  size?: SeparatorSize;
  /** Place du libellé le long du filet. */
  labelAlign?: SeparatorLabelAlign;
  /** Nom accessible. Par défaut, le `label`. */
  'aria-label'?: string;
}

/**
 * ui-separator : séparation visuelle et sémantique entre deux contenus.
 *
 * Rend un `role="separator"` dont le trait vient des jetons. Un `label` le
 * transforme en séparateur titré, placé par `labelAlign` au début, au milieu ou
 * à la fin de la ligne.
 */
export function UiSeparator({
  label,
  orientation = 'horizontal',
  variant = 'solid',
  size = 'default',
  labelAlign = 'start',
  className,
  ...rest
}: UiSeparatorProps) {
  const hasLabel = Boolean(label);
  const lineBefore = labelAlign === 'center' || labelAlign === 'end';
  const lineAfter = labelAlign === 'center' || labelAlign === 'start';

  const line = <span className="ui-separator-line" aria-hidden="true" />;

  return (
    <div
      {...rest}
      className={cx(
        'ui-separator',
        `_${orientation}`,
        variant !== 'solid' && `_${variant}`,
        size !== 'default' && `_${size}`,
        hasLabel && '_labelled',
        className,
      )}
      role="separator"
      aria-orientation={orientation}
      aria-label={rest['aria-label'] ?? label}
    >
      {hasLabel ? (
        <>
          {lineBefore && line}
          <span className="ui-separator-label">{label}</span>
          {lineAfter && line}
        </>
      ) : (
        line
      )}
    </div>
  );
}
