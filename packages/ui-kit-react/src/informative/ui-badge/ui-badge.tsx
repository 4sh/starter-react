'use client';

import { useEffect, type ComponentPropsWithRef } from 'react';

import { UiIcon, type UiIconSize } from '../../base/ui-icon';
import type { UiFeedbackLevel, UiSubLevel } from '../../core/types';
import { cx } from '../../core/utils';

import './ui-badge.scss';

export type BadgeSize = 'default' | 'small' | 'large';

const ICON_SIZES: Record<BadgeSize, UiIconSize> = {
  default: 'md',
  small: 'sm',
  large: 'lg',
};

/** Avertissements déjà émis, pour rester idempotent sous `<StrictMode>`. */
const warned = new Set<string>();

export interface UiBadgeProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  /** Contenu affiché. Absent avec `icon`, la pastille se réduit à un point. */
  value?: string | number;
  level?: UiFeedbackLevel;
  /** Intensité : `high` pleine, `low` atténuée. */
  subLevel?: UiSubLevel;
  size?: BadgeSize;
  /** Nom d'icône, rendu avant le contenu. */
  icon?: string;
  /** Nom accessible. Obligatoire en icône seule. */
  'aria-label'?: string;
}

/**
 * ui-badge : indicateur de statut ou de compte.
 *
 * Trois formes selon ce qu'on lui donne : un texte, une icône seule, ou rien du
 * tout, auquel cas il devient un point de notification. Un caractère unique ou
 * une icône seule rendent une pastille carrée, pour rester lisible.
 */
export function UiBadge({
  value,
  level = 'default',
  subLevel = 'high',
  size = 'default',
  icon,
  className,
  ...rest
}: UiBadgeProps) {
  const ariaLabel = rest['aria-label'];

  const text = value === undefined || value === null ? '' : String(value);
  const hasText = text.length > 0;
  const hasIcon = Boolean(icon);
  const isIconOnly = hasIcon && !hasText;
  const isDot = !hasIcon && !hasText;

  // Un glyphe unique : une icône seule, ou un seul caractère (« 1 », « ★ »).
  // `Array.from` compte les points de code, pas les unités UTF-16.
  const isSingle = hasIcon ? !hasText : Array.from(text.trim()).length === 1;

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (isIconOnly && !ariaLabel) {
      const key = icon ?? 'icon';
      if (warned.has(key)) return;
      warned.add(key);
      console.warn(
        `[ui-badge] Pastille en icône seule sans nom accessible : renseignez \`aria-label\`.`,
      );
    }
  }, [isIconOnly, ariaLabel, icon]);

  return (
    <span
      {...rest}
      className={cx(
        'ui-badge',
        `_${level}`,
        `_${subLevel}`,
        size !== 'default' && `_${size}`,
        isDot ? '_dot' : isSingle && '_single',
        className,
      )}
      // Sans nom accessible, la pastille reste décorative : lui donner un
      // role="img" muet ferait annoncer « image » sans rien dire de plus.
      role={ariaLabel ? 'img' : undefined}
    >
      {icon && <UiIcon className="ui-badge-icon" name={icon} size={ICON_SIZES[size]} />}
      {hasText && <span className="ui-badge-label">{text}</span>}
    </span>
  );
}
