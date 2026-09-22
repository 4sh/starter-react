'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';

import { UiIcon } from '../../base/ui-icon';
import { useControllableState } from '../../core/forms';
import { useCloseOnNavigation, useUiDismiss, useUiPosition } from '../../core/overlay';
import { cx } from '../../core/utils';

import './ui-swatch-picker.scss';

export type SwatchPickerSize = 'default' | 'small';

/** Une couleur choisissable. */
export interface UiSwatch {
  /** Identifiant stable, qui est aussi la valeur portée par `value`. */
  key: string;
  /** Variable CSS qui peint la pastille, par exemple `--primitives-red-500`. */
  cssVar: string;
  /** Nom accessible. Jamais la seule couleur : voyants et non voyants doivent lire pareil. */
  label: string;
}

/** Une section titrée de la palette. */
export interface UiSwatchGroup {
  label: string;
  /** Les pastilles de la section, ligne par ligne. */
  swatches: UiSwatch[];
}

/** Props posées sur le déclencheur du popup, telles que `trigger` les reçoit. */
export interface UiSwatchPickerTriggerProps {
  ref: Ref<HTMLElement>;
  'aria-haspopup': 'listbox';
  'aria-expanded': boolean;
  'aria-controls': string | undefined;
  onClick: () => void;
}

/** Une entrée aplatie, vraie pastille ou pastille « aucune couleur ». */
interface FlatSwatch {
  key: string | null;
  cssVar: string | null;
  label: string;
}

/** Les teintes de la palette par défaut, en colonnes. */
const DEFAULT_HUES: { key: string; label: string }[] = [
  { key: 'primary', label: 'Primaire' },
  { key: 'secondary', label: 'Secondaire' },
  { key: 'green', label: 'Vert' },
  { key: 'orange', label: 'Orange' },
  { key: 'red', label: 'Rouge' },
  { key: 'slate', label: 'Ardoise' },
  { key: 'grey', label: 'Gris' },
];
const DEFAULT_STEPS = [900, 700, 500, 300, 100];

/**
 * La palette par défaut : 7 teintes sur 5 nuances, du foncé au clair, plus le
 * noir et le blanc. Jamais une valeur en dur : chaque pastille pointe une
 * variable `--primitives-*`, donc changer de marque change la grille sans
 * toucher au code.
 */
export const DEFAULT_SWATCH_PALETTE: UiSwatchGroup[] = [
  {
    label: 'Couleurs',
    swatches: [
      ...DEFAULT_STEPS.flatMap((step) =>
        DEFAULT_HUES.map((hue): UiSwatch => ({
          key: `${hue.key}-${step}`,
          cssVar: `--primitives-${hue.key}-${step}`,
          label: `${hue.label} ${step}`,
        })),
      ),
      { key: 'black', cssVar: '--primitives-black-base', label: 'Noir' },
      { key: 'white', cssVar: '--primitives-white-base', label: 'Blanc' },
    ],
  },
];

/** Colonnes de la grille, calées sur les 7 teintes de la palette par défaut. */
const GRID_COLUMNS = 7;

/** Écart entre le déclencheur et le panneau, aligné sur `$overlay-panel-offset`. */
const PANEL_OFFSET = 8;

export interface UiSwatchPickerProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'defaultValue' | 'onChange'
> {
  /** La palette, en sections de pastilles. */
  palette?: UiSwatchGroup[];
  /** Pastille choisie, par sa clé. `null` veut dire « aucune couleur ». */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (key: string | null) => void;
  /** Notifié au choix de l'utilisateur, avec la pastille entière. */
  onSwatchSelect?: (swatch: UiSwatch | null) => void;
  /** Mode popup : le panneau vit dans le calque supérieur, ancré au déclencheur. */
  popup?: boolean;
  /** Ouverture imposée du popup. Renseignée, le panneau est **contrôlé**. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Rend le déclencheur du popup, en lui reversant les props reçues. */
  trigger?: (props: UiSwatchPickerTriggerProps) => ReactNode;
  /** Retourner le panneau au-dessus du déclencheur quand la place manque. */
  autoFlip?: boolean;
  /** Densité : `small` pour une barre d'outils ou un popup compact. */
  size?: SwatchPickerSize;
  /** Rend une pastille « aucune couleur » en tête de grille. */
  allowClear?: boolean;
  /** Nom accessible de cette pastille. */
  clearLabel?: string;
  /** Nom accessible de la grille. */
  'aria-label'?: string;
  /** Couper l'animation d'ouverture du popup. */
  motionDisabled?: boolean;
}

/**
 * ui-swatch-picker : grille de couleurs, posée dans la page ou en popup.
 *
 * Chaque pastille est un `<button role="option">` dans un `role="listbox"`, et
 * la navigation au clavier est celle d'une **grille** : les flèches se déplacent
 * sur deux axes, un seul arrêt de tabulation pour tout le lot.
 *
 * Comme `ui-menu`, le composant ne rend pas son propre déclencheur : `trigger`
 * reçoit les props à reverser sur celui de l'appelant.
 */
export function UiSwatchPicker({
  palette = DEFAULT_SWATCH_PALETTE,
  value,
  defaultValue = null,
  onValueChange,
  onSwatchSelect,
  popup = false,
  open,
  defaultOpen = false,
  onOpenChange,
  trigger,
  autoFlip = true,
  size = 'small',
  allowClear = true,
  clearLabel = 'Aucune couleur',
  motionDisabled = false,
  className,
  style,
  ref,
  ...rest
}: UiSwatchPickerProps) {
  const uid = useId();
  const ariaLabel = rest['aria-label'];
  delete rest['aria-label'];

  const [selected, setSelected] = useControllableState<string | null>({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const [isOpen, setOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  /** Clé de la pastille qui tient l'arrêt de tabulation. `''` est celle du vide. */
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const { setAnchor, setPanel, panelStyle, isPositioned } = useUiPosition<
    HTMLElement,
    HTMLDivElement
  >({
    placement: 'bottom-start',
    offset: PANEL_OFFSET,
    flip: autoFlip,
    open: popup && isOpen,
  });

  const attachTrigger = useCallback(
    (node: HTMLElement | null) => {
      triggerRef.current = node;
      setAnchor(node);
    },
    [setAnchor],
  );

  const attachPanel = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node;
      if (popup) setPanel(node);
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [popup, setPanel, ref],
  );

  const close = useCallback(() => {
    setOpen(false);
    setFocusedKey(null);
  }, [setOpen]);

  // Les pastilles à rendre, la synthétique « aucune couleur » en tête.
  const flat: FlatSwatch[] = [];
  if (allowClear) flat.push({ key: null, cssVar: null, label: clearLabel });
  for (const group of palette) for (const swatch of group.swatches) flat.push(swatch);

  const keyOf = (swatch: FlatSwatch) => swatch.key ?? '';
  const keys = flat.map(keyOf);

  /** L'arrêt de tabulation : le dernier focalisé, sinon le sélectionné, sinon le premier. */
  const tabStop =
    focusedKey !== null && keys.includes(focusedKey)
      ? focusedKey
      : keys.includes(selected ?? '')
        ? (selected ?? '')
        : (keys[0] ?? null);

  /** Déplace le focus du DOM, et donc l'arrêt de tabulation, sur une clé. */
  const focusKey = useCallback((key: string | undefined) => {
    if (key === undefined) return;
    setFocusedKey(key);
    panelRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.focus();
  }, []);

  // L'état pilote le calque, jamais l'inverse : un popover s'ouvre par une
  // MÉTHODE, et faire dépendre l'état de son événement `toggle` désaligne les
  // deux dès que l'événement se fait attendre.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !popup) return;
    const shown = panel.matches(':popover-open');
    if (isOpen && !shown) {
      panel.showPopover();
      return;
    }
    if (isOpen || !shown) return;

    const hadFocus = panel.contains(document.activeElement);
    panel.hidePopover();
    // Un `popover="manual"` ne rend pas le focus tout seul, contrairement à
    // `auto` : la restitution est à notre charge, et seulement si le focus
    // était DANS le panneau.
    if (hadFocus) triggerRef.current?.focus();
  }, [isOpen, popup]);

  // À l'ouverture, le focus va sur l'arrêt de tabulation. Il est déjà posé dans
  // le DOM : le relire là évite de recopier la règle qui l'a choisi, et de
  // garder la valeur dans une ref que React interdit d'écrire au rendu.
  useEffect(() => {
    if (!popup || !isOpen) return;
    panelRef.current?.querySelector<HTMLElement>('[data-key][tabindex="0"]')?.focus();
  }, [popup, isOpen]);

  // `manual` et non `auto` : le light-dismiss natif fermerait aussi sur un clic
  // sur le déclencheur, qui rouvrirait aussitôt.
  useUiDismiss({
    open: popup && isOpen,
    onDismiss: close,
    panelRef,
    anchorRef: triggerRef,
  });

  useCloseOnNavigation(popup && isOpen, close);

  const activate = (swatch: FlatSwatch) => {
    setFocusedKey(keyOf(swatch));
    setSelected(swatch.key);
    onSwatchSelect?.(
      swatch.key === null || swatch.cssVar === null
        ? null
        : { key: swatch.key, cssVar: swatch.cssVar, label: swatch.label },
    );
    // Fermer suffit : la restitution du focus appartient à l'effet qui cache
    // le panneau, qui est le seul à savoir si le focus était dedans.
    if (popup) setOpen(false);
  };

  /** Navigation à deux axes : la grille, pas la liste. */
  const onGridKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!keys.length) return;
    const from = (event.target as HTMLElement).closest?.('[data-key]');
    const current = from?.getAttribute('data-key') ?? focusedKey;
    const index = current !== null ? keys.indexOf(current) : -1;
    const columns = Math.min(GRID_COLUMNS, keys.length);

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        focusKey(keys[Math.min(index + 1, keys.length - 1)]);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusKey(keys[Math.max(index - 1, 0)]);
        break;
      case 'ArrowDown':
        event.preventDefault();
        focusKey(keys[Math.min(index + columns, keys.length - 1)]);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusKey(keys[Math.max(index - columns, 0)]);
        break;
      case 'Home':
        event.preventDefault();
        focusKey(keys[0]);
        break;
      case 'End':
        event.preventDefault();
        focusKey(keys[keys.length - 1]);
        break;
      case 'Escape':
        if (popup) {
          event.preventDefault();
          close();
        }
        break;
    }
  };

  const panel = (
    <div
      {...rest}
      ref={attachPanel}
      id={popup ? uid : rest.id}
      className={cx(
        'ui-swatch-picker',
        size !== 'default' && `_${size}`,
        popup && '_popup',
        className,
      )}
      style={
        motionDisabled
          ? { ...(popup ? panelStyle : null), ['--ui-motion-duration' as string]: '0ms', ...style }
          : { ...(popup ? panelStyle : null), ...style }
      }
      {...(popup
        ? {
            popover: 'manual' as const,
            // Le panneau reste dans son état fermé tant que sa position n'est
            // pas calculée : `computePosition` est asynchrone, et peindre
            // l'image d'avant donne le panneau qui apparaît ailleurs puis se
            // replace.
            'data-unpositioned': isPositioned ? undefined : '',
          }
        : null)}
    >
      {/* Motif listbox à arrêt de tabulation glissant. Le clavier est branché
          sur les OPTIONS et non sur la liste : le focus y vit déjà, et une
          liste porteuse de gestionnaires devrait être focalisable pour
          satisfaire `jsx-a11y`, ce qu'un `role="listbox"` n'est justement pas. */}
      <div className="ui-swatch-picker-grid" role="listbox" aria-label={ariaLabel || undefined}>
        {flat.map((swatch) => {
          const key = keyOf(swatch);
          const isSelected = selected === swatch.key;
          return (
            <button
              key={key}
              type="button"
              className={cx(
                'ui-swatch-picker-swatch',
                isSelected && '_selected',
                swatch.key === null && '_clear',
              )}
              role="option"
              data-key={key}
              aria-selected={isSelected}
              aria-label={swatch.label}
              title={swatch.label}
              tabIndex={key === tabStop ? 0 : -1}
              style={
                swatch.cssVar
                  ? ({
                      ['--ui-swatch-picker-swatch-color' as string]: `var(${swatch.cssVar})`,
                    } as React.CSSProperties)
                  : undefined
              }
              onClick={() => activate(swatch)}
              onFocus={() => setFocusedKey(key)}
              onKeyDown={onGridKeyDown}
            >
              {swatch.key === null && (
                <UiIcon className="ui-swatch-picker-clear-icon" name="slash" size="sm" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (!popup) return panel;

  const triggerProps: UiSwatchPickerTriggerProps = {
    ref: attachTrigger,
    'aria-haspopup': 'listbox',
    'aria-expanded': isOpen,
    'aria-controls': isOpen ? uid : undefined,
    onClick: () => (isOpen ? close() : setOpen(true)),
  };

  return (
    <>
      {/*
        Faux positif de `react-hooks/refs` : la règle voit un objet contenant
        une clé `ref` lu au rendu et suppose une lecture de `.current`. Ici on
        TRANSMET une ref de rappel à une prop de rendu.
      */}
      {/* eslint-disable-next-line react-hooks/refs */}
      {trigger?.(triggerProps)}
      {panel}
    </>
  );
}
