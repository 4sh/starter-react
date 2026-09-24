'use client';

import {
  useEffect,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
} from 'react';

import { UiIcon, type UiIconSize } from '../../base/ui-icon';
import { useControllableState } from '../../core/forms';
import type { UiFeedbackLevel, UiSubLevel } from '../../core/types';
import { cx } from '../../core/utils';

import './ui-chip.scss';

export type ChipSize = 'default' | 'small';

/** Avertissements déjà émis, pour rester idempotent sous `<StrictMode>`. */
const warned = new Set<string>();

// La racine est un `<button>` en mode sélectionnable, un `<span>` sinon : les
// props natives sont donc typées sur l'élément générique, et la `ref` avec.
export interface UiChipProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'onClick'> {
  /** Texte de la puce. */
  label?: string;
  level?: UiFeedbackLevel;
  /** Intensité. Les puces sont discrètes par défaut, donc `low`. */
  subLevel?: UiSubLevel;
  size?: ChipSize;
  /** Nom d'icône en tête. Ignoré quand `image` est renseigné. */
  icon?: string;
  /** Image en tête, façon avatar. Prioritaire sur `icon`. */
  image?: string;
  /** Texte alternatif de l'image. Vide à côté d'un libellé, l'image est décorative. */
  alt?: string;
  /** Forme pilule. `false` donne un rectangle à coins arrondis. */
  rounded?: boolean;
  /** Affiche l'action de retrait en fin de puce. */
  removable?: boolean;
  removeIcon?: string;
  disabled?: boolean;
  /**
   * Transforme la puce entière en bascule de sélection : la racine devient un
   * `<button aria-pressed>`. Incompatible avec `removable`, un élément
   * interactif ne pouvant pas en contenir un autre.
   */
  selectable?: boolean;
  /** État de sélection imposé. Renseigné, la puce est contrôlée. */
  selected?: boolean;
  defaultSelected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  /** Icône affichée en tête tant que la puce est sélectionnée. */
  selectedIcon?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Nom accessible de l'action de retrait. */
  removeAriaLabel?: string;
  /**
   * `tabindex` de l'action de retrait. À poser à `-1` quand la puce vit dans un
   * conteneur à focus glissant, pour qu'elle ne soit pas un arrêt de plus.
   */
  removeTabIndex?: number;
  /** Appelé au retrait, au clic comme au clavier. */
  onRemove?: (event: SyntheticEvent) => void;
  /** Appelé à la bascule d'une puce sélectionnable. */
  onChipClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Appelé quand l'image échoue à charger : la puce retombe sur l'icône. */
  onImageError?: (event: SyntheticEvent<HTMLImageElement>) => void;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

/**
 * ui-chip : entité compacte et interactive.
 *
 * Proche parent de `ui-tag`, mais manipulable : elle porte une icône ou une
 * image en tête, et se retire ou se sélectionne. Pour une étiquette qu'on ne
 * fait que lire, c'est `ui-tag`.
 */
export function UiChip({
  label,
  level = 'default',
  subLevel = 'low',
  size = 'default',
  icon,
  image,
  alt,
  rounded = true,
  removable = false,
  removeIcon = 'xmark',
  disabled = false,
  selectable = false,
  selected,
  defaultSelected = false,
  onSelectedChange,
  selectedIcon = 'check',
  removeAriaLabel = 'Supprimer',
  removeTabIndex,
  onRemove,
  onChipClick,
  onImageError,
  className,
  children,
  ref,
  ...rest
}: UiChipProps) {
  const ariaLabel = rest['aria-label'];
  const ariaLabelledBy = rest['aria-labelledby'];

  const [isSelected, setSelected] = useControllableState<boolean>({
    value: selected,
    defaultValue: defaultSelected,
    onChange: onSelectedChange,
  });

  // On mémorise la source EN ÉCHEC, pas un booléen : changer d'image réactive
  // l'affichage sans effet de remise à zéro.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(image) && failedSrc !== image;

  const hasLabel = Boolean(label);
  const showSelectedIcon = selectable && isSelected && Boolean(selectedIcon);
  const showIcon = !showImage && Boolean(icon);
  // Jamais dans un bouton sélectionnable : un élément interactif ne peut pas en
  // contenir un autre.
  const showRemove = removable && !selectable;
  const isVisualOnly = (showImage || showIcon) && !hasLabel;

  const accessibleName = ariaLabel ?? label;
  const rootAriaLabel = ariaLabelledBy ? undefined : accessibleName;

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (isVisualOnly && !accessibleName && !ariaLabelledBy) {
      const key = image ?? icon ?? 'visuel';
      if (!warned.has(key)) {
        warned.add(key);
        console.warn(
          `[ui-chip] Puce sans texte : renseignez \`label\`, \`aria-label\` ou \`aria-labelledby\`.`,
        );
      }
    }
    if (selectable && removable && !warned.has('exclusif')) {
      warned.add('exclusif');
      console.warn(
        `[ui-chip] \`selectable\` et \`removable\` s'excluent : l'action de retrait est ignorée.`,
      );
    }
  }, [isVisualOnly, accessibleName, ariaLabelledBy, image, icon, selectable, removable]);

  const iconSize: UiIconSize = size === 'small' ? 'sm' : 'md';

  const handleRemove = (event: SyntheticEvent) => {
    if (disabled) return;
    onRemove?.(event);
  };

  // Entrée et Espace sont natifs sur un <button> : seules Retour arrière et
  // Suppression demandent un traitement.
  const handleRemoveKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      handleRemove(event);
    }
  };

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    setSelected(!isSelected);
    onChipClick?.(event);
  };

  const classes = cx(
    'ui-chip',
    `_${level}`,
    `_${subLevel}`,
    size !== 'default' && `_${size}`,
    !rounded && '_square',
    showRemove && '_removable',
    disabled && '_disabled',
    selectable && '_selectable',
    selectable && isSelected && '_selected',
    className,
  );

  const inner = (
    <>
      {showSelectedIcon ? (
        <UiIcon className="ui-chip-icon" name={selectedIcon} size={iconSize} />
      ) : showImage ? (
        <img
          className="ui-chip-image"
          src={image}
          alt={alt ?? ''}
          onError={(event) => {
            setFailedSrc(image ?? null);
            onImageError?.(event);
          }}
        />
      ) : (
        showIcon && <UiIcon className="ui-chip-icon" name={icon!} size={iconSize} />
      )}

      {hasLabel && <span className="ui-chip-label">{label}</span>}
      {children}

      {showRemove && (
        <button
          type="button"
          className="ui-chip-remove"
          disabled={disabled}
          tabIndex={removeTabIndex}
          aria-label={removeAriaLabel}
          onClick={handleRemove}
          onKeyDown={handleRemoveKeyDown}
        >
          <UiIcon name={removeIcon} size="sm" />
        </button>
      )}
    </>
  );

  if (selectable) {
    return (
      <button
        {...rest}
        ref={ref as Ref<HTMLButtonElement>}
        type="button"
        className={classes}
        disabled={disabled}
        aria-pressed={isSelected}
        aria-label={rootAriaLabel}
        onClick={handleToggle}
      >
        {inner}
      </button>
    );
  }

  return (
    <span
      {...rest}
      ref={ref as Ref<HTMLSpanElement>}
      className={classes}
      // `group` avec un bouton, `img` pour un simple visuel nommé, aucun rôle sans nom.
      // Un `role` de l'appelant gagne : une puce option d'une liste reste `option`.
      role={
        rest.role ?? (rootAriaLabel || ariaLabelledBy ? (showRemove ? 'group' : 'img') : undefined)
      }
      aria-label={rootAriaLabel}
    >
      {inner}
    </span>
  );
}
