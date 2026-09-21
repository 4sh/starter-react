import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  type FocusEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from 'react';

import { UiIcon, type UiIconSize } from '../../base/ui-icon';
import { createRichOptionResolver, useControllableState } from '../../core/forms';
import type { UiLevel } from '../../core/types';
import { cx } from '../../core/utils';

import './ui-toggle-button.scss';

export type ToggleButtonSize = 'default' | 'small' | 'large';
/** Habillage de l'état **non** pressé. L'état pressé est toujours plein. */
export type ToggleButtonVariant = 'outlined' | 'filled' | 'ghost';
export type ToggleButtonIconPos = 'left' | 'right';
export type ToggleButtonOrientation = 'horizontal' | 'vertical';

/**
 * Valeur du modèle : l'une de la paire `trueValue` / `falseValue` en mode
 * simple, ou le tableau des valeurs pressées en mode groupe.
 */
export type ToggleButtonValue<T> = T | T[] | null;

/**
 * Forme riche d'une option, en mode groupe. Une option peut aussi être une
 * primitive ou n'importe quel objet, auquel cas `optionLabel`, `optionValue`,
 * `optionDisabled` et `optionIcon` disent comment la lire.
 */
export interface ToggleButtonOption<T = unknown> {
  /** Texte affiché dans le bouton. */
  label?: string;
  /** Valeur portée dans le modèle quand le bouton est pressé. */
  value: T;
  /** Icône. */
  icon?: string;
  /** Icône substituée pendant que le bouton est pressé. */
  selectedIcon?: string;
  /** Désactive ce seul bouton. */
  disabled?: boolean;
  /** Nom accessible. **Obligatoire** pour un bouton en icône seule. */
  ariaLabel?: string;
}

/** Contexte passé à `renderIcon` et `renderContent`, en mode simple. */
export interface ToggleButtonStateContext {
  /** Le bouton est pressé. */
  checked: boolean;
}

/** Contexte passé à `renderItem`, en mode groupe. */
export interface ToggleButtonItemContext<T = unknown> {
  /** L'option d'origine. */
  option: T;
  /** Ce bouton est pressé. */
  selected: boolean;
  /** Son index dans la liste. */
  index: number;
}

/** Charge émise au clic sur un bouton du groupe. */
export interface ToggleButtonOptionClickEvent<T = unknown> {
  /** L'option d'origine, telle qu'elle a été passée. */
  option: T;
  /** Sa valeur résolue. */
  value: T;
  /** Son index dans la liste. */
  index: number;
  /** État pressé **après** le clic. */
  selected: boolean;
  /** L'événement DOM d'origine. */
  originalEvent: ReactMouseEvent;
}

/** Vue interne, normalisée, d'une option de groupe. */
interface NormalizedToggle {
  key: string;
  index: number;
  value: unknown;
  label: string | null;
  icon: string | null;
  ariaLabel: string | null;
  disabled: boolean;
  selected: boolean;
  iconOnly: boolean;
  original: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Instances déjà averties, pour n'avertir qu'une fois chacune. */
const prevenus = new Set<string>();

export interface UiToggleButtonProps<T = boolean> {
  /** Valeur imposée. Renseignée, le bouton est **contrôlé**. */
  value?: ToggleButtonValue<T>;
  /** Valeur de départ quand il est non contrôlé. */
  defaultValue?: ToggleButtonValue<T>;
  /** Notifié à chaque interaction, avec la nouvelle valeur du modèle. */
  onValueChange?: (value: ToggleButtonValue<T>) => void;
  /** Notifié au clic sur un bouton du groupe, même sans changement de valeur. */
  onOptionClick?: (event: ToggleButtonOptionClickEvent<T>) => void;

  // --- Mode simple --------------------------------------------------------
  /** Libellé des deux états. Sert de repli à `onLabel` et `offLabel`. */
  label?: string;
  /** Libellé affiché pendant que le bouton est pressé. */
  onLabel?: string;
  /** Libellé affiché pendant qu'il est relâché. */
  offLabel?: string;
  /** Icône des deux états. Sert de repli à `onIcon` et `offIcon`. */
  icon?: string;
  /** Icône affichée pendant que le bouton est pressé. */
  onIcon?: string;
  /** Icône affichée pendant qu'il est relâché. */
  offIcon?: string;
  /** Côté du libellé où se tient l'icône. */
  iconPos?: ToggleButtonIconPos;
  /** Valeur émise quand le bouton est pressé. */
  trueValue?: T;
  /** Valeur émise quand il est relâché. */
  falseValue?: T;

  // --- Mode groupe --------------------------------------------------------
  /** Options à afficher, un bouton chacune. Sa présence bascule en mode groupe. */
  options?: readonly (T | ToggleButtonOption<T>)[];
  /** Chemin de champ d'où lire le libellé, quand les options sont des objets. */
  optionLabel?: string;
  /** Chemin de champ d'où lire la valeur. */
  optionValue?: string;
  /** Chemin de champ d'où lire l'état désactivé. */
  optionDisabled?: string;
  /** Chemin de champ d'où lire le nom d'icône. */
  optionIcon?: string;
  /** Propriété qui sert à comparer deux valeurs objet. */
  dataKey?: string;
  /** Axe de disposition du groupe. */
  orientation?: ToggleButtonOrientation;

  // --- Communs ------------------------------------------------------------
  /** Famille de couleur de l'état pressé. */
  level?: UiLevel;
  /** Façon de dessiner l'état relâché. */
  variant?: ToggleButtonVariant;
  size?: ToggleButtonSize;
  /** Occupe toute la largeur du parent. Les boutons du groupe se la partagent. */
  fluid?: boolean;
  /** Forme en pilule. */
  rounded?: boolean;
  /** Le dernier bouton pressé peut être relâché, ou le groupe vidé. */
  allowEmpty?: boolean;

  /** Rendu de l'icône, en mode simple. */
  renderIcon?: (context: ToggleButtonStateContext) => ReactNode;
  /** Rendu de tout le contenu du bouton, en mode simple. */
  renderContent?: (context: ToggleButtonStateContext) => ReactNode;
  /** Rendu du contenu d'un bouton du groupe. */
  renderItem?: (context: ToggleButtonItemContext<T>) => ReactNode;

  disabled?: boolean;
  readOnly?: boolean;
  /**
   * Force le rendu en erreur.
   *
   * Rendu **seulement** : la spécification ARIA ne supporte pas `aria-invalid`
   * sur le rôle `button`, et c'est cohérent, la validité portant sur une saisie
   * et non sur une commande. L'annonce revient donc au champ englobant ou à son
   * message d'erreur, comme pour `ui-radio`.
   *
   * ⚠️ Écart assumé avec la version Angular, qui pose l'attribut sur les deux
   * boutons. Relevé par jsx-a11y ; à corriger côté Angular.
   */
  invalid?: boolean;
  name?: string;
  tabIndex?: number;
  id?: string;
  className?: string;
  /** Nom accessible. Du **groupe** en mode groupe, du bouton en mode simple. */
  'aria-label'?: string;
  /** id d'un élément externe qui étiquette le contrôle. */
  'aria-labelledby'?: string;

  onFocus?: (event: FocusEvent<HTMLButtonElement>) => void;
  onBlur?: (event: FocusEvent<HTMLButtonElement>) => void;

  ref?: Ref<HTMLDivElement>;
}

/**
 * ui-toggle-button : un bouton qui garde un état pressé.
 *
 * Deux modes, un composant :
 *
 * - **simple**, par défaut : un `<button aria-pressed>` natif adossé à un
 *   booléen, ou à la paire `trueValue` / `falseValue`. Libellé et icône peuvent
 *   différer selon l'état.
 * - **groupe**, dès que `options` est fourni : un bouton par option, `role="group"`
 *   sur la racine, et le modèle devient le tableau des valeurs pressées.
 *   Délibérément toujours multi-sélection : un choix exclusif est le travail de
 *   `ui-segment-control`, qui le dit avec une sémantique `radiogroup` plutôt
 *   qu'avec `aria-pressed`.
 */
export function UiToggleButton<T = boolean>({
  value,
  defaultValue,
  onValueChange,
  onOptionClick,
  label,
  onLabel,
  offLabel,
  icon,
  onIcon,
  offIcon,
  iconPos = 'left',
  trueValue = true as T,
  falseValue = false as T,
  options,
  optionLabel,
  optionValue,
  optionDisabled,
  optionIcon,
  dataKey,
  orientation = 'horizontal',
  level = 'high',
  variant = 'outlined',
  size = 'default',
  fluid = false,
  rounded = false,
  allowEmpty = true,
  renderIcon,
  renderContent,
  renderItem,
  disabled = false,
  readOnly = false,
  invalid = false,
  name,
  tabIndex,
  id,
  className,
  onFocus,
  onBlur,
  ref,
  ...rest
}: UiToggleButtonProps<T>) {
  const generatedId = useId();
  const uid = id ?? generatedId;

  const isGroup = !!options;

  const [model, setModel] = useControllableState<ToggleButtonValue<T>>({
    value,
    defaultValue: defaultValue ?? (isGroup ? [] : (falseValue as T)),
    onChange: onValueChange,
  });

  // La variante « forme riche » : la clé `value` gagne, et un objet sans clé
  // `label` reste sans libellé, ce qui est le cas d'un bouton en icône seule.
  const resolver = useMemo(
    () => createRichOptionResolver({ optionValue, optionLabel, optionDisabled, dataKey }),
    [optionValue, optionLabel, optionDisabled, dataKey],
  );

  const iconSize: UiIconSize = size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'default';
  const iconBefore = iconPos === 'left';

  // --- Mode simple ---------------------------------------------------------
  const checked = model === trueValue;
  const currentLabel = (checked ? onLabel : offLabel) ?? label ?? null;
  const currentIcon = (checked ? onIcon : offIcon) ?? icon ?? null;
  const isIconOnly = !renderContent && !currentLabel && !!currentIcon;
  /** Deux libellés d'état distincts : le nom accessible changerait avec l'état. */
  const hasStateLabels = !!onLabel && !!offLabel && onLabel !== offLabel;

  const toggle = useCallback(() => {
    if (disabled || readOnly) return;
    if (checked && !allowEmpty) return;
    setModel(checked ? falseValue : trueValue);
  }, [disabled, readOnly, checked, allowEmpty, setModel, falseValue, trueValue]);

  // --- Mode groupe ---------------------------------------------------------
  /** Icône d'une option, l'état pressé pouvant en substituer une autre. */
  const resolveIcon = useCallback(
    (option: unknown, selected: boolean): string | null => {
      if (selected && isRecord(option)) {
        const swapped = resolver.asText(option['selectedIcon']);
        if (swapped) return swapped;
      }
      if (optionIcon) return resolver.asText(resolver.getField(option, optionIcon));
      if (isRecord(option)) return resolver.asText(option['icon']);
      return null;
    },
    [resolver, optionIcon],
  );

  /** Le modèle d'un groupe est le tableau des valeurs pressées. */
  const isPressed = useCallback(
    (v: unknown) => Array.isArray(model) && model.some((m) => resolver.equals(m, v)),
    [model, resolver],
  );

  const items = useMemo<NormalizedToggle[]>(
    () =>
      (options ?? []).map((option, index) => {
        const v = resolver.resolveValue(option);
        const selected = isPressed(v);
        const itemLabel = resolver.resolveLabel(option);
        const itemIcon = resolveIcon(option, selected);
        return {
          key: `${uid}-${index}`,
          index,
          value: v,
          label: itemLabel,
          icon: itemIcon,
          ariaLabel: isRecord(option) ? resolver.asText(option['ariaLabel']) : null,
          disabled: disabled || resolver.resolveDisabled(option),
          selected,
          iconOnly: !itemLabel && !!itemIcon,
          original: option,
        };
      }),
    [options, resolver, isPressed, resolveIcon, uid, disabled],
  );

  const toggleOption = useCallback(
    (item: NormalizedToggle, event: ReactMouseEvent) => {
      if (item.disabled || readOnly) return;
      const v = item.value as T;
      const next = Array.isArray(model) ? [...(model as T[])] : [];
      const at = next.findIndex((m) => resolver.equals(m, v));
      let selected: boolean;

      if (at !== -1) {
        if (!allowEmpty && next.length === 1) return;
        next.splice(at, 1);
        selected = false;
      } else {
        next.push(v);
        selected = true;
      }

      setModel(next);
      onOptionClick?.({
        option: item.original as T,
        value: v,
        index: item.index,
        selected,
        originalEvent: event,
      });
    },
    [readOnly, model, resolver, allowEmpty, setModel, onOptionClick],
  );

  // --- Garde-fous d'accessibilité -----------------------------------------
  const ariaLabel = rest['aria-label'];
  const ariaLabelledBy = rest['aria-labelledby'];
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (prevenus.has(uid)) return;
    if (isGroup) {
      if (!ariaLabel && !ariaLabelledBy) {
        prevenus.add(uid);
        console.warn(
          '[ui-toggle-button] Groupe sans nom accessible : renseignez `aria-label` ou `aria-labelledby`.',
        );
      } else if (items.some((o) => o.iconOnly && !o.ariaLabel)) {
        prevenus.add(uid);
        console.warn(
          '[ui-toggle-button] Option en icône seule sans nom accessible : ajoutez `ariaLabel` sur l’option.',
        );
      }
      return;
    }
    if (isIconOnly && !ariaLabel) {
      prevenus.add(uid);
      console.warn(
        '[ui-toggle-button] Bouton en icône seule sans nom accessible : renseignez `aria-label`.',
      );
    } else if (hasStateLabels && !ariaLabel && !ariaLabelledBy) {
      // Un nom qui change avec l'état est réannoncé au focus : le contrôle sonne
      // alors comme un bouton différent selon sa valeur.
      prevenus.add(uid);
      console.warn(
        '[ui-toggle-button] `onLabel` et `offLabel` diffèrent : renseignez un `aria-label` indépendant de l’état.',
      );
    }
  }, [uid, isGroup, ariaLabel, ariaLabelledBy, items, isIconOnly, hasStateLabels]);

  const classesRacine = cx(
    'ui-toggle-button',
    `_${level}`,
    size !== 'default' && `_${size}`,
    variant !== 'outlined' && `_${variant}`,
    rounded && '_rounded',
    fluid && '_fluid',
    isGroup && '_group',
    isGroup && orientation === 'vertical' && '_vertical',
    readOnly && '_readonly',
    disabled && '_disabled',
    invalid && '_invalid',
    className,
  );

  const singleIcon = renderIcon
    ? renderIcon({ checked })
    : currentIcon && (
        <UiIcon className="ui-toggle-button-icon" name={currentIcon} size={iconSize} />
      );

  return (
    <div
      ref={ref}
      className={classesRacine}
      // Seul le GROUPE porte le nommage de niveau groupe : en mode simple, c'est
      // le bouton lui-même qui est nommé.
      role={isGroup ? 'group' : undefined}
      aria-label={isGroup ? ariaLabel : undefined}
      aria-labelledby={isGroup ? ariaLabelledBy : undefined}
    >
      {isGroup ? (
        items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={cx(
              'ui-toggle-button-item',
              item.selected && '_selected',
              item.iconOnly && '_icon-only',
            )}
            disabled={item.disabled}
            tabIndex={tabIndex}
            aria-pressed={item.selected}
            aria-label={item.ariaLabel ?? undefined}
            onClick={(event) => toggleOption(item, event)}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            {renderItem ? (
              renderItem({
                option: item.original as T,
                selected: item.selected,
                index: item.index,
              })
            ) : (
              <>
                {iconBefore && item.icon && (
                  <UiIcon className="ui-toggle-button-icon" name={item.icon} size={iconSize} />
                )}
                {item.label && <span className="ui-toggle-button-label">{item.label}</span>}
                {!iconBefore && item.icon && (
                  <UiIcon className="ui-toggle-button-icon" name={item.icon} size={iconSize} />
                )}
              </>
            )}
          </button>
        ))
      ) : (
        <button
          type="button"
          className={cx(
            'ui-toggle-button-item',
            checked && '_selected',
            isIconOnly && '_icon-only',
          )}
          id={uid}
          name={name}
          disabled={disabled}
          tabIndex={tabIndex}
          aria-pressed={checked}
          // Un nom explicite gagne ; sinon, seul un bouton en icône seule a
          // besoin qu'on lui en fabrique un depuis son libellé courant.
          aria-label={ariaLabel || (isIconOnly ? (currentLabel ?? undefined) : undefined)}
          aria-labelledby={ariaLabelledBy}
          onClick={toggle}
          onFocus={onFocus}
          onBlur={onBlur}
        >
          {renderContent ? (
            renderContent({ checked })
          ) : (
            <>
              {iconBefore && singleIcon}
              {currentLabel && <span className="ui-toggle-button-label">{currentLabel}</span>}
              {!iconBefore && singleIcon}
            </>
          )}
        </button>
      )}
    </div>
  );
}
