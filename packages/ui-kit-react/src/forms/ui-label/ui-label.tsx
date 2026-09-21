'use client';

import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cx } from '../../core/utils';

import './ui-label.scss';

export type LabelSize = 'default' | 'small';

export interface UiLabelProps extends Omit<ComponentPropsWithRef<'label'>, 'children'> {
  /** Texte du libellé. Peut aussi être projeté via `children`. */
  label?: string;
  /** Affiche le marqueur requis (*). */
  required?: boolean;
  size?: LabelSize;
  /** Style désactivé, cascadé depuis le composant de formulaire parent. */
  disabled?: boolean;
  children?: ReactNode;
}

/**
 * ui-label : libellé de champ de formulaire.
 *
 * Rend un `<label>` natif avec un marqueur requis optionnel. Utilisé seul, ou
 * composé dans un champ (`ui-field`, `ui-checkbox`, `ui-radio`…).
 *
 * Point d'extension : la couleur du texte lit `--ui-label-color` en premier,
 * de sorte qu'un composant parent pilote l'état du libellé (survol, désactivé)
 * sans avoir à écrire de sélecteur qui traverse ce composant :
 *
 * ```scss
 * .ui-checkbox:hover { --ui-label-color: var(--form-high-content-hover); }
 * ```
 */
export function UiLabel({
  label,
  required = false,
  size = 'default',
  disabled = false,
  className,
  children,
  ...rest
}: UiLabelProps) {
  return (
    <label
      {...rest}
      className={cx(
        'ui-label',
        size !== 'default' && `_${size}`,
        disabled && '_disabled',
        className,
      )}
    >
      <span className="ui-label-text">
        {label}
        {children}
      </span>
      {required && (
        <span className="ui-label-marker" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}
