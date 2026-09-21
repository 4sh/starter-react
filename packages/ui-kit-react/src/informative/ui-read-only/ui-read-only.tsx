'use client';

import type { HTMLAttributes, ReactNode, Ref } from 'react';

import { cx } from '../../core/utils';
import { UiLabel } from '../../forms/ui-label';

import './ui-read-only.scss';

export type ReadOnlySize = 'default' | 'small';
export type ReadOnlyLayout = 'vertical' | 'horizontal' | 'grid';
export type ReadOnlyAlign = 'left' | 'right';

// La racine est un `<dl>` avec libellé, un `<div>` sans : les props natives
// sont donc typées sur l'élément générique, et la `ref` avec elles.
export interface UiReadOnlyProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Libellé du champ, rendu par `ui-label`. */
  label?: string;
  /** Affiche l'astérisque de champ requis, pour aller avec un formulaire. */
  required?: boolean;
  /** Remplace entièrement le libellé par défaut. */
  renderLabel?: () => ReactNode;
  /** Valeur affichée. Ignorée dès que `children` est renseigné. */
  value?: string | number | null;
  /** Affiché en atténué quand la valeur est vide. */
  fallback?: string;
  /**
   * Texte annoncé à la place du symbole de repli quand la valeur est vide, par
   * exemple « Non renseigné ». Le repli visuel, lui, reste décoratif.
   */
  emptyLabel?: string;
  layout?: ReadOnlyLayout;
  size?: ReadOnlySize;
  /** Alignement du libellé. N'a d'effet qu'en disposition horizontale. */
  labelAlign?: ReadOnlyAlign;
  /** Largeur de la colonne du libellé en horizontal. Sans valeur, elle épouse le texte. */
  labelWidth?: string;
  /** Conserver les retours à la ligne de la valeur. */
  multiline?: boolean;
  /** Épouser le contenu et se poser dans le flux, au lieu de remplir le parent. */
  inline?: boolean;
  /** Aligner la hauteur sur celle d'un champ de formulaire voisin. */
  matchField?: boolean;
  /** Classes ajoutées sur la ligne, par exemple une classe de grille. */
  rowClassName?: string;
  /** Classes ajoutées sur la cellule du libellé. */
  labelClassName?: string;
  /** Classes ajoutées sur la cellule de la valeur. */
  valueClassName?: string;
  /** Valeur riche (badge, lien). Remplace `value`. */
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

/**
 * ui-read-only : une valeur étiquetée, en lecture seule.
 *
 * Avec un libellé, le composant rend une vraie liste de définition
 * (`dl`/`dt`/`dd`), qui est le balisage juste pour une paire étiquette-valeur.
 * Sans libellé, il rend de simples `div` : un `dd` sans `dt` serait invalide.
 */
export function UiReadOnly({
  label,
  required = false,
  renderLabel,
  value,
  fallback = '—',
  emptyLabel,
  layout = 'vertical',
  size = 'default',
  labelAlign = 'left',
  labelWidth,
  multiline = false,
  inline = false,
  matchField = false,
  rowClassName,
  labelClassName,
  valueClassName,
  className,
  style,
  children,
  ref,
  ...rest
}: UiReadOnlyProps) {
  const hasLabel = Boolean(label) || Boolean(renderLabel);
  const isEmpty = value === null || value === undefined || value === '';
  const displayValue = isEmpty ? fallback : String(value);

  const rootClassName = cx(
    'ui-read-only',
    layout === 'horizontal' && '_horizontal',
    layout === 'grid' && '_grid',
    size !== 'default' && `_${size}`,
    labelAlign === 'right' && '_label-right',
    inline && '_inline',
    matchField && '_match-field',
    rowClassName,
    className,
  );

  const rootStyle = labelWidth
    ? { ['--ui-read-only-label-width' as string]: labelWidth, ...style }
    : style;

  const valueBlock = children ? (
    <span className="ui-read-only-projected">{children}</span>
  ) : isEmpty && emptyLabel ? (
    // Le symbole de repli ne veut rien dire à l'oreille : on le masque et on
    // annonce un texte à la place.
    <span className={cx('ui-read-only-value', '_fallback', multiline && '_multiline')}>
      <span aria-hidden="true">{displayValue}</span>
      <span className="ui-read-only-sr">{emptyLabel}</span>
    </span>
  ) : (
    <span className={cx('ui-read-only-value', isEmpty && '_fallback', multiline && '_multiline')}>
      {displayValue}
    </span>
  );

  if (!hasLabel) {
    return (
      <div {...rest} ref={ref as Ref<HTMLDivElement>} className={rootClassName} style={rootStyle}>
        <div className={cx('ui-read-only-value-cell', valueClassName)}>{valueBlock}</div>
      </div>
    );
  }

  return (
    <dl {...rest} ref={ref as Ref<HTMLDListElement>} className={rootClassName} style={rootStyle}>
      <dt className={cx('ui-read-only-label', labelClassName)}>
        {renderLabel ? renderLabel() : <UiLabel label={label!} size={size} required={required} />}
      </dt>
      <dd className={cx('ui-read-only-value-cell', valueClassName)}>{valueBlock}</dd>
    </dl>
  );
}
