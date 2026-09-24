'use client';

import { useEffect, type ComponentPropsWithRef } from 'react';

import { cx } from '../../core/utils';

import { fontAwesomeFamily, useUiIconFamilies, type UiIconType } from './ui-icon-families';

import './ui-icon.scss';

export type UiIconSize = 'sm' | 'md' | 'default' | 'lg' | 'xl';
export type { UiIconType };

export interface UiIconProps extends Omit<ComponentPropsWithRef<'i'>, 'children'> {
  /** Nom de l'icône dans la famille retenue (par exemple « circle-user »). */
  name: string;
  /** Taille de l'icône. */
  size?: UiIconSize;
  /** Variante visuelle, interprétée par la famille (plein / contour). */
  type?: UiIconType;
  /** Clé de famille. Par défaut : celle du provider, sinon « fontawesome ». */
  family?: string;
  /** Icône purement décorative, masquée aux lecteurs d'écran. */
  decorative?: boolean;
  /** Nom accessible. Obligatoire dès que `decorative` vaut `false`. */
  'aria-label'?: string;
}

/**
 * Avertissements déjà émis. `<StrictMode>` monte deux fois chaque composant en
 * développement : dédupliquer garde l'effet idempotent.
 */
const warned = new Set<string>();

/**
 * ui-icon : rend une icône depuis une fonte configurable, FontAwesome par défaut.
 *
 * Les autres fontes se déclarent avec `<UiIconFamilyProvider>` et se choisissent par
 * `family`. Décorative par défaut ; `decorative={false}` demande un `aria-label`.
 * `type` reste à « solid » : le jeu « outline » de FontAwesome Free est presque vide.
 */
export function UiIcon({
  name,
  size = 'default',
  type = 'solid',
  family,
  decorative = true,
  className,
  ...rest
}: UiIconProps) {
  const { families, defaultFamily } = useUiIconFamilies();
  const ariaLabel = rest['aria-label'];

  const key = family ?? defaultFamily;
  const resolved = families[key] ?? fontAwesomeFamily;

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;

    if (!families[key] && !warned.has(`family:${key}`)) {
      warned.add(`family:${key}`);
      console.warn(`[ui-icon] Famille « ${key} » inconnue. Repli sur « fontawesome ».`);
    }

    if (!decorative && !ariaLabel && !warned.has(`label:${name}`)) {
      warned.add(`label:${name}`);
      console.warn(
        `[ui-icon] L'icône porteuse de sens « ${name} » (decorative={false}) n'a pas ` +
          `d'aria-label : elle rend un role="img" sans nom accessible.`,
      );
    }
  }, [families, key, decorative, ariaLabel, name]);

  const content = resolved.content?.(name, type) ?? null;

  return (
    <i
      {...rest}
      className={cx('ui-icon', `_${size}`, resolved.classes(name, type), className)}
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : ariaLabel}
    >
      {content}
    </i>
  );
}
