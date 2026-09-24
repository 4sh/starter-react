'use client';

import type { ComponentPropsWithRef, MouseEvent, ReactNode } from 'react';

import type { UiLevel, UiSubLevel } from '../../core/types';
import { cx } from '../../core/utils';
import { UiMenu, type UiMenuItem, type UiMenuItemCommandEvent } from '../../navigation/ui-menu';
import {
  UiButton,
  type ButtonIconPos,
  type ButtonOnColor,
  type ButtonSize,
  type ButtonVariant,
} from '../ui-button';

import './ui-button-split.scss';

export type ButtonSplitSize = ButtonSize;

export interface UiButtonSplitProps extends Omit<ComponentPropsWithRef<'div'>, 'onClick'> {
  /** Options révélées par le déroulant. Même modèle déclaratif que `UiMenu`. */
  items?: UiMenuItem[];
  /** Libellé du bouton d'action. */
  label?: string;
  /** Icône du bouton d'action : un nom, ou un nœud rendu tel quel. */
  icon?: string | ReactNode;
  iconPos?: ButtonIconPos;
  /** Icône du déclencheur, le chevron. */
  dropdownIcon?: string;
  /** Niveau sémantique, appliqué aux deux boutons. */
  level?: UiLevel;
  /** Taille du contrôle : les deux boutons et la densité du menu. */
  size?: ButtonSplitSize;
  /** Apparence, appliquée aux deux boutons. */
  variant?: ButtonVariant;
  /** Luminosité du fond de couleur sur lequel le contrôle est posé. */
  onColor?: ButtonOnColor | null;

  /** Désactive les deux boutons. */
  disabled?: boolean;
  /** Désactive le seul bouton d'action. */
  buttonDisabled?: boolean;
  /** Désactive le seul déclencheur. */
  menuButtonDisabled?: boolean;

  /** Nom accessible du bouton d'action. Obligatoire sans libellé. */
  'aria-label'?: string;
  /** Nom accessible du déclencheur, qui est en icône seule. */
  menuButtonAriaLabel?: string;
  /** Nom accessible de la liste d'options. */
  menuAriaLabel?: string;
  /** Famille de couleur du panneau. */
  menuLevel?: UiSubLevel;
  /** Classe(s) posée(s) sur le panneau, pour le styler sans toucher au reste. */
  menuClassName?: string;
  /** Retourner le panneau au-dessus du déclencheur quand la place manque. */
  autoFlip?: boolean;
  /** Animer l'ouverture. Le mouvement réduit gagne toujours. */
  motion?: boolean;

  /** Ouverture imposée du panneau. Renseignée, le contrôle est **contrôlé**. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  /** Clic sur le bouton d'action. Jamais quand il est désactivé. */
  onButtonClick?: (event: MouseEvent<HTMLElement>) => void;
  /** Clic sur le déclencheur. Jamais quand il est désactivé. */
  onDropdownClick?: (event: MouseEvent<HTMLElement>) => void;
  /** Une option a été activée, au clic ou au clavier. */
  onItemClick?: (event: UiMenuItemCommandEvent) => void;

  /** Contenu projeté du bouton d'action, à côté ou à la place du `label`. */
  children?: ReactNode;
}

/**
 * ui-button-split : un bouton d'action accolé à un déclencheur déroulant.
 *
 * Le bouton principal déclenche l'action par défaut ; le chevron ouvre un
 * `UiMenu` nourri par `items`. Les deux se désactivent séparément, ce qui est
 * le cas courant d'une action indisponible dont les options restent utiles.
 */
export function UiButtonSplit({
  items = [],
  label,
  icon,
  iconPos = 'left',
  dropdownIcon = 'chevron-down',
  level = 'high',
  size = 'default',
  variant = 'filled',
  onColor = null,
  disabled = false,
  buttonDisabled = false,
  menuButtonDisabled = false,
  menuButtonAriaLabel = "Plus d'options",
  menuAriaLabel,
  menuLevel = 'high',
  menuClassName,
  autoFlip = true,
  motion = true,
  open,
  defaultOpen,
  onOpenChange,
  onButtonClick,
  onDropdownClick,
  onItemClick,
  className,
  children,
  ...rest
}: UiButtonSplitProps) {
  // Hors de `...rest` : axe refuse un nom accessible sur un `<div>` sans rôle.
  const ariaLabel = rest['aria-label'];
  delete rest['aria-label'];

  return (
    <div
      {...rest}
      className={cx('ui-button-split', `_${level}`, size !== 'default' && `_${size}`, className)}
    >
      <UiButton
        className="ui-button-split-action"
        label={label}
        aria-label={ariaLabel}
        icon={icon}
        iconPos={iconPos}
        level={level}
        size={size}
        variant={variant}
        onColor={onColor}
        disabled={disabled || buttonDisabled}
        onClick={onButtonClick}
      >
        {children}
      </UiButton>

      <UiMenu
        popup
        items={items}
        level={menuLevel}
        size={size}
        autoFlip={autoFlip}
        motionDisabled={!motion}
        className={menuClassName}
        aria-label={menuAriaLabel}
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        onItemClick={onItemClick}
        trigger={(triggerProps) => (
          <UiButton
            {...triggerProps}
            className="ui-button-split-trigger"
            icon={dropdownIcon}
            iconOnly
            aria-label={menuButtonAriaLabel}
            level={level}
            size={size}
            variant={variant}
            onColor={onColor}
            disabled={disabled || menuButtonDisabled}
            onClick={(event) => {
              onDropdownClick?.(event);
              triggerProps.onClick();
            }}
          />
        )}
      />
    </div>
  );
}
