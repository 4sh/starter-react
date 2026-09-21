'use client';

import { useEffect, type ComponentPropsWithRef } from 'react';

import { UiIcon, type UiIconSize } from '../../base/ui-icon';
import type { UiFeedbackLevel, UiSubLevel } from '../../core/types';
import { cx } from '../../core/utils';

import './ui-tag.scss';

export type TagSize = 'default' | 'small';

/** Avertissements déjà émis, pour rester idempotent sous `<StrictMode>`. */
const warned = new Set<string>();

export interface UiTagProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  /** Texte de l'étiquette. */
  label?: string;
  level?: UiFeedbackLevel;
  /** Intensité : `high` pleine, `low` atténuée. */
  subLevel?: UiSubLevel;
  size?: TagSize;
  /** Nom d'icône, rendu avant le libellé. */
  iconLeft?: string;
  /** Nom d'icône, rendu après le libellé. */
  iconRight?: string;
  /** Forme pilule. `false` donne un rectangle à coins arrondis. */
  rounded?: boolean;
  /** Nom accessible. Obligatoire sans libellé. */
  'aria-label'?: string;
}

/**
 * ui-tag : étiquette informative ou pastille de statut.
 *
 * Se colore par `level` × `subLevel`, les mêmes familles que `ui-badge`, plutôt
 * que par une sévérité à plat. Purement présentationnel : pour une étiquette
 * qu'on peut retirer ou activer, c'est `ui-chip`.
 */
export function UiTag({
  label,
  level = 'default',
  subLevel = 'high',
  size = 'default',
  iconLeft,
  iconRight,
  rounded = true,
  className,
  ...rest
}: UiTagProps) {
  const ariaLabel = rest['aria-label'];

  const hasLabel = Boolean(label);
  const isIconOnly = Boolean(iconLeft ?? iconRight) && !hasLabel;
  const iconSize: UiIconSize = size === 'small' ? 'sm' : 'md';

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (isIconOnly && !ariaLabel) {
      const key = iconLeft ?? iconRight ?? 'icon';
      if (warned.has(key)) return;
      warned.add(key);
      console.warn(
        `[ui-tag] Étiquette sans texte : renseignez \`label\` ou, à défaut, \`aria-label\`.`,
      );
    }
  }, [isIconOnly, ariaLabel, iconLeft, iconRight]);

  return (
    <span
      {...rest}
      className={cx(
        'ui-tag',
        `_${level}`,
        `_${subLevel}`,
        size !== 'default' && `_${size}`,
        !rounded && '_square',
        className,
      )}
      role={ariaLabel ? 'img' : undefined}
    >
      {iconLeft && <UiIcon className="ui-tag-icon" name={iconLeft} size={iconSize} />}
      {hasLabel && <span className="ui-tag-label">{label}</span>}
      {iconRight && <UiIcon className="ui-tag-icon" name={iconRight} size={iconSize} />}
    </span>
  );
}
