'use client';

import { createContext, useContext, type ComponentPropsWithRef, type ReactNode } from 'react';

import type { FieldSize } from '../../core/forms';
import { cx } from '../../core/utils';

import './ui-input-group.scss';

/** Taille partagée par le groupe avec ses cellules. */
const UiInputGroupContext = createContext<FieldSize>('default');

export interface UiInputGroupProps extends ComponentPropsWithRef<'div'> {
  /** Taille transmise aux `UiInputGroupAddon`. Les contrôles gardent la leur. */
  size?: FieldSize;
  children?: ReactNode;
}

/**
 * ui-input-group : colle un contrôle et ses cellules en un seul champ visuel.
 *
 * Purement présentationnel : chaque enfant garde son API et ses états, le
 * groupe ne fait que les aligner sur une rangée, carrer les coins intérieurs et
 * fondre les bordures voisines en une seule.
 *
 * Les cellules non interactives (texte, icône, case à cocher) passent par
 * `UiInputGroupAddon` ; les contrôles (`UiInput`, `UiSelect`, `UiButton`) se
 * posent directement dans le groupe.
 */
export function UiInputGroup({
  size = 'default',
  className,
  children,
  ...rest
}: UiInputGroupProps) {
  return (
    <div {...rest} className={cx('ui-input-group', className)}>
      <UiInputGroupContext.Provider value={size}>{children}</UiInputGroupContext.Provider>
    </div>
  );
}

export interface UiInputGroupAddonProps extends ComponentPropsWithRef<'div'> {
  /** Taille de la cellule. Par défaut, celle du groupe. */
  size?: FieldSize;
  children?: ReactNode;
}

/**
 * ui-input-group-addon : cellule non interactive d'un `UiInputGroup` (texte,
 * icône, case à cocher, bouton radio).
 *
 * Elle rend son contenu dans une boîte alignée sur la hauteur de champ.
 */
export function UiInputGroupAddon({ size, className, children, ...rest }: UiInputGroupAddonProps) {
  const groupSize = useContext(UiInputGroupContext);
  const resolved = size ?? groupSize;

  return (
    <div
      {...rest}
      className={cx('ui-input-group-addon', resolved !== 'default' && `_${resolved}`, className)}
    >
      {children}
    </div>
  );
}
