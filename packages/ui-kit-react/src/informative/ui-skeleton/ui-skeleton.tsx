'use client';

import type { ComponentPropsWithRef } from 'react';

import { cx } from '../../core/utils';

import './ui-skeleton.scss';

export type UiSkeletonShape = 'text' | 'circle' | 'rectangle';
export type UiSkeletonSize = 'default' | 'small';
export type UiSkeletonAnimation = 'wave' | 'pulse' | 'none';

export interface UiSkeletonProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  shape?: UiSkeletonShape;
  size?: UiSkeletonSize;
  /** Largeur CSS brute, qui remplace celle de la forme. */
  width?: string;
  /** Hauteur CSS brute, qui remplace celle de la forme. */
  height?: string;
  /** Rayon CSS brut, qui remplace celui de la forme. */
  borderRadius?: string;
  animation?: UiSkeletonAnimation;
}

/**
 * ui-skeleton : bloc affiché à la place d'un contenu en cours de chargement.
 *
 * Trois formes avec leurs dimensions par défaut ; `width`, `height` et
 * `borderRadius` prennent le dessus pour une mise en page sur mesure.
 *
 * Le composant est masqué aux lecteurs d'écran : le chargement est un état
 * purement visuel. Pour l'annoncer, poser `aria-busy="true"` sur le conteneur
 * qui regroupe les blocs.
 */
export function UiSkeleton({
  shape = 'text',
  size = 'default',
  width,
  height,
  borderRadius,
  animation = 'wave',
  className,
  style,
  ...rest
}: UiSkeletonProps) {
  return (
    <div
      {...rest}
      className={cx(
        'ui-skeleton',
        `_${shape}`,
        size !== 'default' && `_${size}`,
        animation === 'pulse' && '_pulse',
        animation === 'none' && '_static',
        className,
      )}
      style={{ width, height, borderRadius, ...style }}
      aria-hidden={true}
    />
  );
}
