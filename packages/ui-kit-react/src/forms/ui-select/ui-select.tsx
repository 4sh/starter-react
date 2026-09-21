'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';

import { UiIcon, type UiIconSize } from '../../base/ui-icon';
import { UiSpinner } from '../../informative/ui-spinner';
import {
  createOptionResolver,
  formatLabel,
  normalizeText,
  useControllableState,
  useUiField,
  type OptionEntry,
  type UiFieldSharedProps,
} from '../../core/forms';
import { useCloseOnNavigation, useUiDismiss, useUiPosition } from '../../core/overlay';
import { useUiVirtualList } from '../../core/virtual';
import { cx } from '../../core/utils';
import { UiField } from '../ui-field';

import './ui-select.scss';

export type SelectValue = unknown;

/** Une ligne rendue dans le panneau : un en-tête de groupe, ou une option. */
type SelectRow =
  | { kind: 'group'; key: string; label: string; original: unknown }
  | {
      kind: 'option';
      key: string;
      id: string;
      /** Index parmi les options VISIBLES, qui est l'espace du focus visuel. */
      index: number;
      entry: OptionEntry;
      selected: boolean;
    };

type OptionRow = Extract<SelectRow, { kind: 'option' }>;

/** Contexte remis au rendu d'une option. */
export interface SelectItemContext {
  option: unknown;
  selected: boolean;
  index: number;
}

/** Contexte remis au rendu d'une valeur sélectionnée. */
export interface SelectSelectedItemContext {
  option: unknown;
  index: number;
  /** Retire cette valeur de la sélection. */
  remove: () => void;
}

type NativeProps = Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'value' | 'defaultValue' | 'onChange' | 'size' | 'ref'
>;

export interface UiSelectProps extends UiFieldSharedProps, NativeProps {
  /** Options : primitives ou objets. */
  options?: readonly unknown[];
  /** Chemin du champ portant le libellé. Par défaut la clé `label`, sinon le texte. */
  optionLabel?: string;
  /** Chemin du champ portant la valeur. Par défaut l'option elle-même. */
  optionValue?: string;
  /** Chemin du champ portant l'état désactivé. Par défaut la clé `disabled`. */
  optionDisabled?: string;
  /** Les options sont des groupes. */
  group?: boolean;
  optionGroupLabel?: string;
  optionGroupChildren?: string;
  /** Clé d'égalité entre objets. Sans elle, deux objets identiques restent distincts. */
  dataKey?: string;

  /** Valeur imposée. Renseignée, le champ est contrôlé. */
  value?: SelectValue;
  defaultValue?: SelectValue;
  onValueChange?: (value: SelectValue) => void;

  /** Sélection multiple. La valeur devient un tableau. */
  multiple?: boolean;
  /** Coche à droite de l'option sélectionnée. */
  checkmark?: boolean;
  /** Case à cocher devant chaque option. Destinée au mode multiple. */
  checkbox?: boolean;
  /** Nombre de libellés affichés avant de replier le reste. */
  maxSelectedLabels?: number;
  /** Libellé du repli, `{0}` étant remplacé par le nombre replié. */
  overflowLabel?: string;

  placeholder?: string;
  /** Bouton d'effacement de la sélection. */
  showClear?: boolean;
  clearAriaLabel?: string;
  /** Nom d'icône du chevron. */
  icon?: string;

  /** Champ de recherche en tête du panneau. */
  filter?: boolean;
  filterPlaceholder?: string;
  filterAriaLabel?: string;
  /** Champs sur lesquels filtrer, séparés par des virgules. Par défaut le libellé. */
  filterBy?: string;
  /** Poser le focus dans le champ de recherche à l'ouverture. */
  autofocusFilter?: boolean;
  /** Vider la recherche à la fermeture. */
  resetFilterOnHide?: boolean;

  emptyMessage?: string;
  emptyFilterMessage?: string;

  /** Saisie libre dans le déclencheur. Ignorée en mode multiple. */
  editable?: boolean;
  loading?: boolean;

  /** Sélectionner l'option qui reçoit le focus visuel. Mono seulement. */
  selectOnFocus?: boolean;
  /** Déplacer le focus visuel au survol. */
  focusOnHover?: boolean;

  /** Défilement virtuel, pour une liste longue. */
  virtualScroll?: boolean;
  virtualScrollItemSize?: number;
  /** Hauteur maximale du panneau. */
  scrollHeight?: string;

  /** Retourner le panneau au-dessus quand la place manque. */
  autoFlip?: boolean;
  /** Largeur du panneau. `auto` fait de la largeur du champ un plancher. */
  panelWidth?: string;
  panelClassName?: string;

  /** Remplace le rendu d'une option. */
  renderOption?: (context: SelectItemContext) => ReactNode;
  /** Remplace le rendu d'une valeur sélectionnée. */
  renderSelectedItem?: (context: SelectSelectedItemContext) => ReactNode;
  /** Remplace le rendu d'un en-tête de groupe. */
  renderGroup?: (group: unknown) => ReactNode;
  /** Contenu épinglé au-dessus de la liste. */
  panelHeader?: ReactNode;
  /** Contenu épinglé sous la liste. */
  panelFooter?: ReactNode;
  /** Remplace le message de liste vide. */
  renderEmpty?: () => ReactNode;

  onOpen?: () => void;
  onClose?: () => void;
  onClear?: () => void;
  onFilterChange?: (filter: string) => void;

  ref?: Ref<HTMLElement>;
}

/** Avertissements déjà émis, pour rester idempotent sous `<StrictMode>`. */
const warned = new Set<string>();

/**
 * ui-select : liste déroulante posée sur la coquille `ui-field`.
 *
 * Suit le motif combobox de WAI-ARIA : le focus reste sur le déclencheur, et
 * l'option courante est désignée par `aria-activedescendant`. C'est ce qui
 * permet de taper dans le champ de recherche tout en naviguant dans la liste.
 *
 * Le panneau vit dans le **calque supérieur**, donc aucun ancêtre en
 * `overflow: hidden` ne le rogne, ce qui est le défaut le plus pénible d'un
 * select posé dans une zone défilante.
 */
export function UiSelect({
  options = [],
  optionLabel,
  optionValue,
  optionDisabled,
  group = false,
  optionGroupLabel = 'label',
  optionGroupChildren = 'items',
  dataKey,
  value,
  defaultValue = null,
  onValueChange,
  multiple = false,
  checkmark = false,
  checkbox = false,
  maxSelectedLabels,
  overflowLabel = '(+{0} autres)',
  placeholder,
  showClear = false,
  clearAriaLabel = 'Effacer la sélection',
  icon = 'angle-down',
  filter = false,
  filterPlaceholder,
  filterAriaLabel = 'Filtrer les options',
  filterBy,
  autofocusFilter = true,
  resetFilterOnHide = false,
  emptyMessage = 'Aucune option disponible',
  emptyFilterMessage = 'Aucun résultat',
  editable = false,
  loading = false,
  selectOnFocus = false,
  focusOnHover = true,
  virtualScroll = false,
  virtualScrollItemSize = 40,
  scrollHeight,
  autoFlip = true,
  panelWidth,
  panelClassName,
  renderOption,
  renderSelectedItem,
  renderGroup,
  panelHeader,
  panelFooter,
  renderEmpty,
  onOpen,
  onClose,
  onClear,
  onFilterChange,
  label,
  helperText,
  errorText,
  showMessageIcon = false,
  messageIcon,
  size = 'default',
  level = 'default',
  floatLabel,
  required = false,
  disabled = false,
  readOnly = false,
  invalid = false,
  id,
  className,
  ref,
  ...rest
}: UiSelectProps) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const uid = useId();
  const [open, setOpen] = useState(false);
  const [filterValue, setFilterValue] = useState('');
  /** Texte tapé dans un déclencheur éditable. `null` quand on ne tape pas. */
  const [editableQuery, setEditableQuery] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const [model, setModel] = useControllableState<SelectValue>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  const field = useUiField({
    label,
    helperText,
    errorText,
    level,
    invalid,
    'aria-label': rest['aria-label'],
    'aria-describedby': rest['aria-describedby'],
    id,
  });

  const listboxId = `${field.inputId}-list`;
  const isEditable = editable && !multiple;
  const iconSize: UiIconSize = size === 'small' ? 'sm' : 'md';

  const resolver = useMemo(
    () => createOptionResolver({ optionLabel, optionValue, optionDisabled, dataKey }),
    [optionLabel, optionValue, optionDisabled, dataKey],
  );

  // --- Options normalisées -------------------------------------------------
  const groups = useMemo(() => {
    if (!group) return [];
    return options.map((groupOption) => {
      const children = resolver.getField(groupOption, optionGroupChildren);
      return {
        label: resolver.asText(resolver.getField(groupOption, optionGroupLabel)) ?? '',
        original: groupOption,
        entries: (Array.isArray(children) ? children : []).map((o) => resolver.toEntry(o)),
      };
    });
  }, [group, options, resolver, optionGroupChildren, optionGroupLabel]);

  const flatEntries = useMemo(
    () => (group ? groups.flatMap((g) => g.entries) : options.map((o) => resolver.toEntry(o))),
    [group, groups, options, resolver],
  );

  // --- Sélection -----------------------------------------------------------
  const selectedValues = useMemo<unknown[]>(() => {
    if (model === null || model === undefined) return [];
    return multiple ? (Array.isArray(model) ? model : []) : [model];
  }, [model, multiple]);

  const selectedEntries = useMemo<OptionEntry[]>(
    () =>
      selectedValues.map(
        (v) =>
          flatEntries.find((e) => resolver.equals(e.value, v)) ?? {
            value: v,
            label: resolver.asText(v) ?? '',
            disabled: false,
            original: v,
          },
      ),
    [selectedValues, flatEntries, resolver],
  );

  const hasValue = multiple
    ? selectedValues.length > 0
    : model !== null && model !== undefined && model !== '';

  const displayedSelected =
    multiple && maxSelectedLabels != null && maxSelectedLabels > 0
      ? selectedEntries.slice(0, maxSelectedLabels)
      : selectedEntries;
  const overflowCount = selectedEntries.length - displayedSelected.length;
  const overflowText = formatLabel(overflowLabel, overflowCount);

  const selectedLabel = (() => {
    const shown = displayedSelected.map((e) => e.label).join(', ');
    return overflowCount > 0 ? `${shown} ${overflowText}` : shown;
  })();

  // --- Filtrage ------------------------------------------------------------
  const needles = useMemo(() => {
    const list = [normalizeText(filterValue.trim())];
    if (isEditable && editableQuery) list.push(normalizeText(editableQuery.trim()));
    return list.filter(Boolean);
  }, [filterValue, isEditable, editableQuery]);

  const matchesFilter = useCallback(
    (entry: OptionEntry) => {
      if (!needles.length) return true;
      const fields = filterBy
        ?.split(',')
        .map((f) => f.trim())
        .filter(Boolean);
      const haystacks = fields?.length
        ? fields.map((f) => resolver.asText(resolver.getField(entry.original, f)) ?? '')
        : [entry.label];
      return needles.every((needle) =>
        haystacks.some((text) => normalizeText(text).includes(needle)),
      );
    },
    [needles, filterBy, resolver],
  );

  // --- Lignes rendues ------------------------------------------------------
  const rows = useMemo<SelectRow[]>(() => {
    const out: SelectRow[] = [];
    let index = 0;
    const pushOption = (entry: OptionEntry) => {
      out.push({
        kind: 'option',
        key: `${listboxId}-${index}`,
        id: `${field.inputId}-option-${index}`,
        index,
        entry,
        selected: selectedValues.some((v) => resolver.equals(entry.value, v)),
      });
      index += 1;
    };

    if (group) {
      groups.forEach((g, gi) => {
        const entries = g.entries.filter(matchesFilter);
        if (!entries.length) return;
        out.push({
          kind: 'group',
          key: `${listboxId}-group-${gi}`,
          label: g.label,
          original: g.original,
        });
        entries.forEach(pushOption);
      });
    } else {
      flatEntries.filter(matchesFilter).forEach(pushOption);
    }
    return out;
  }, [
    group,
    groups,
    flatEntries,
    matchesFilter,
    selectedValues,
    resolver,
    listboxId,
    field.inputId,
  ]);

  const visibleOptions = useMemo(
    () => rows.filter((r): r is OptionRow => r.kind === 'option'),
    [rows],
  );

  const activeDescendant = open ? visibleOptions[focusedIndex]?.id : undefined;
  const emptyLabel = needles.length ? emptyFilterMessage : emptyMessage;

  // --- Placement du panneau ------------------------------------------------
  const position = useUiPosition<HTMLElement, HTMLDivElement>({
    placement: 'bottom-start',
    offset: 8,
    flip: autoFlip,
    matchWidth: panelWidth === undefined || panelWidth === 'auto',
    open,
  });

  // Le déclencheur porte le focus et le clavier ; l'ANCRE du panneau, elle, est
  // la boîte du champ. S'ancrer sur le déclencheur donnerait un panneau plus
  // étroit que le champ (mesuré : 276 px pour un champ de 320), le bouton étant
  // à l'intérieur des insets de la boîte.
  const setTrigger = useCallback(
    (node: HTMLElement | null) => {
      triggerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as { current: HTMLElement | null }).current = node;
    },
    [ref],
  );

  const setPanel = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node;
      position.setPanel(node);
    },
    [position],
  );

  // --- Ouverture et fermeture ---------------------------------------------
  const close = useCallback(
    (restoreFocus = true) => {
      setOpen((wasOpen) => {
        if (!wasOpen) return wasOpen;
        onClose?.();
        return false;
      });
      setEditableQuery(null);
      if (resetFilterOnHide) setFilterValue('');
      if (restoreFocus) triggerRef.current?.focus();
    },
    [onClose, resetFilterOnHide],
  );

  const openPanel = useCallback(() => {
    if (disabled || readOnly || open) return;
    setOpen(true);
    onOpen?.();
  }, [disabled, readOnly, open, onOpen]);

  // L'état pilote le calque, comme pour `ui-modal` : un popover s'ouvre par une
  // méthode, et faire dépendre l'état de son événement `toggle` désaligne les
  // deux dès que l'événement se fait attendre.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const isOpen = panel.matches(':popover-open');
    if (open && !isOpen) panel.showPopover();
    else if (!open && isOpen) panel.hidePopover();
  }, [open]);

  // `manual` et non `auto` : le light-dismiss natif fermerait aussi sur un clic
  // sur le déclencheur, qui rouvrirait aussitôt. `useUiDismiss` connaît l'ancre.
  useUiDismiss({
    open,
    onDismiss: () => close(false),
    panelRef,
    anchorRef: triggerRef,
    closeOnEscape: false, // géré par le clavier du déclencheur, qui sait si ça ferme
  });

  useCloseOnNavigation(open, () => close(false));

  // --- Focus visuel --------------------------------------------------------
  const scrollFocusedIntoView = useCallback((index: number) => {
    const row = listRef.current?.querySelector(`[data-option-index="${index}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }, []);

  const commit = useCallback(
    (next: SelectValue) => {
      setModel(next);
    },
    [setModel],
  );

  const removeValue = useCallback(
    (target: unknown) => {
      if (disabled || readOnly) return;
      if (!multiple) {
        commit(null);
        return;
      }
      commit(selectedValues.filter((v) => !resolver.equals(v, target)));
    },
    [disabled, readOnly, multiple, commit, selectedValues, resolver],
  );

  const selectRow = useCallback(
    (row: OptionRow, keepOpen = false) => {
      if (row.entry.disabled || readOnly) return;
      setFocusedIndex(row.index);
      setEditableQuery(null);

      if (multiple) {
        const current = [...selectedValues];
        const at = current.findIndex((v) => resolver.equals(v, row.entry.value));
        if (at !== -1) current.splice(at, 1);
        else current.push(row.entry.value);
        commit(current);
        return; // le panneau reste ouvert
      }

      commit(row.entry.value);
      if (!keepOpen) close();
    },
    [readOnly, multiple, selectedValues, resolver, commit, close],
  );

  const applyFocus = useCallback(
    (index: number) => {
      setFocusedIndex(index);
      scrollFocusedIntoView(index);
      if (selectOnFocus && !multiple) {
        const row = visibleOptions[index];
        if (row) selectRow(row, true);
      }
    },
    [scrollFocusedIntoView, selectOnFocus, multiple, visibleOptions, selectRow],
  );

  /** Déplace le focus visuel en sautant les options désactivées, sans bouclage. */
  const moveFocus = useCallback(
    (delta: 1 | -1) => {
      if (!visibleOptions.length) return;
      let i = focusedIndex;
      if (i === -1) i = delta === 1 ? -1 : visibleOptions.length;
      for (i += delta; i >= 0 && i < visibleOptions.length; i += delta) {
        if (!visibleOptions[i]!.entry.disabled) {
          applyFocus(i);
          return;
        }
      }
    },
    [visibleOptions, focusedIndex, applyFocus],
  );

  const focusEdge = useCallback(
    (direction: 1 | -1) => {
      const from = direction === 1 ? 0 : visibleOptions.length - 1;
      for (let i = from; i >= 0 && i < visibleOptions.length; i += direction) {
        if (!visibleOptions[i]!.entry.disabled) {
          applyFocus(i);
          return;
        }
      }
    },
    [visibleOptions, applyFocus],
  );

  // --- Frappe rapide -------------------------------------------------------
  const search = useRef({ buffer: '', timer: 0 });

  const searchOption = useCallback(
    (char: string) => {
      search.current.buffer += char.toLowerCase();
      window.clearTimeout(search.current.timer);
      search.current.timer = window.setTimeout(() => {
        search.current.buffer = '';
      }, 500);

      if (!visibleOptions.length) return;
      const needle = normalizeText(search.current.buffer);
      // Une recherche neuve (un seul caractère) repart SOUS l'option courante,
      // pour que retaper la même lettre passe à l'occurrence suivante.
      const from =
        search.current.buffer.length === 1 ? focusedIndex + 1 : Math.max(0, focusedIndex);
      for (let k = 0; k < visibleOptions.length; k += 1) {
        const i = (from + k) % visibleOptions.length;
        const option = visibleOptions[i]!;
        if (!option.entry.disabled && normalizeText(option.entry.label).startsWith(needle)) {
          applyFocus(i);
          return;
        }
      }
    },
    [visibleOptions, focusedIndex, applyFocus],
  );

  useEffect(() => () => window.clearTimeout(search.current.timer), []);

  // --- Clavier -------------------------------------------------------------
  /** Touches d'ouverture, de navigation et de sélection. Rend `true` si consommée. */
  const handleNavigationKey = useCallback(
    (event: KeyboardEvent): boolean => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (!open) {
            openPanel();
            if (focusedIndex === -1) moveFocus(1);
          } else moveFocus(1);
          return true;
        case 'ArrowUp':
          event.preventDefault();
          if (event.altKey) close();
          else if (!open) {
            openPanel();
            if (focusedIndex === -1) moveFocus(-1);
          } else moveFocus(-1);
          return true;
        case 'Home':
        case 'End':
          if (!open) return false;
          event.preventDefault();
          focusEdge(event.key === 'Home' ? 1 : -1);
          return true;
        case 'Enter': {
          if (!open) return false;
          event.preventDefault();
          const row = visibleOptions[focusedIndex];
          if (row) selectRow(row);
          else if (!multiple) close();
          return true;
        }
        case ' ': {
          // L'espace tape, dans un champ éditable comme dans la recherche.
          if (isEditable || (filter && event.target === filterRef.current)) return false;
          if (!open) return false;
          event.preventDefault();
          const row = visibleOptions[focusedIndex];
          if (row) selectRow(row);
          return true;
        }
        case 'Escape':
          if (!open) return false;
          event.preventDefault();
          // Consommée SEULEMENT parce qu'elle ferme : sinon elle fermerait aussi
          // le `ui-modal` qui contient le champ.
          event.stopPropagation();
          close();
          return true;
        case 'Tab':
          if (open) close(false);
          return false; // le focus continue son chemin
        default:
          return false;
      }
    },
    [
      open,
      focusedIndex,
      moveFocus,
      openPanel,
      close,
      focusEdge,
      visibleOptions,
      selectRow,
      multiple,
      isEditable,
      filter,
    ],
  );

  const onTriggerKeyDown = (event: KeyboardEvent) => {
    if (disabled || readOnly) return;

    // Multiple : Retour arrière retire la dernière valeur sélectionnée.
    if (event.key === 'Backspace' && !isEditable && multiple && hasValue) {
      event.preventDefault();
      removeValue(selectedValues[selectedValues.length - 1]);
      return;
    }

    if (handleNavigationKey(event)) return;

    // Frappe rapide, sur le déclencheur bouton seulement : un champ éditable
    // tape pour de vrai.
    if (
      !isEditable &&
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      if (!open) openPanel();
      searchOption(event.key);
    }
  };

  // --- Effets d'ouverture --------------------------------------------------
  useEffect(() => {
    if (!open) return;
    // Le panneau se pose après le rendu : `setTimeout` et non
    // `requestAnimationFrame`, qui ne tire pas dans un onglet en arrière-plan.
    const timer = window.setTimeout(() => {
      if (filter && autofocusFilter && !isEditable) filterRef.current?.focus();
      scrollFocusedIntoView(focusedIndex);
    });
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (warned.has(uid)) return;
    if (!label && !rest['aria-label'] && !rest['aria-labelledby']) {
      warned.add(uid);
      console.warn(
        `[ui-select] Champ sans nom accessible : renseignez \`label\`, \`aria-label\` ou \`aria-labelledby\`.`,
      );
    } else if (editable && multiple) {
      warned.add(uid);
      console.warn(`[ui-select] \`editable\` est ignoré en mode \`multiple\`.`);
    } else if (checkbox && !multiple) {
      warned.add(uid);
      console.warn(`[ui-select] \`checkbox\` est destiné au mode \`multiple\`.`);
    }
  }, [label, rest, editable, multiple, checkbox, uid]);

  // --- Défilement virtuel --------------------------------------------------
  const scrollHeightPx = (() => {
    const parsed = Number.parseFloat(scrollHeight ?? '');
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    return size === 'small' ? 256 : 312;
  })();

  const virtual = useUiVirtualList<HTMLDivElement>({
    count: virtualScroll ? rows.length : 0,
    itemSize: virtualScrollItemSize,
  });

  const clear = (event: MouseEvent) => {
    event.stopPropagation();
    commit(null);
    setEditableQuery(null);
    onClear?.();
    triggerRef.current?.focus();
  };

  // --- Rendu d'une ligne ---------------------------------------------------
  const renderRow = (row: SelectRow, style?: CSSProperties): ReactNode => {
    if (row.kind === 'group') {
      return (
        <li
          key={row.key}
          style={style}
          className={cx('ui-select-group', size === 'small' && '_small')}
          role="presentation"
        >
          {renderGroup ? renderGroup(row.original) : row.label}
        </li>
      );
    }

    return (
      // Motif combobox : le clavier et le focus vivent sur le déclencheur, et
      // l'option courante est désignée par `aria-activedescendant`. L'option
      // n'a donc ni `tabindex` ni gestionnaire de touches, et c'est correct.
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events
      <li
        key={row.key}
        id={row.id}
        style={style}
        data-option-index={row.index}
        className={cx(
          'ui-select-option',
          size === 'small' && '_small',
          row.selected && '_selected',
          row.index === focusedIndex && '_focused',
          row.entry.disabled && '_disabled',
        )}
        role="option"
        aria-selected={row.selected}
        aria-disabled={row.entry.disabled || undefined}
        aria-setsize={visibleOptions.length}
        aria-posinset={row.index + 1}
        // Garder le focus sur le déclencheur : sans ça, cliquer une option le
        // lui prend et la fermeture au clic extérieur se déclenche.
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.preventDefault();
          if (!loading) selectRow(row);
        }}
        onMouseEnter={() => {
          if (focusOnHover && !row.entry.disabled) setFocusedIndex(row.index);
        }}
      >
        {checkbox && multiple && (
          <span className={cx('ui-select-checkbox', row.selected && '_checked')} aria-hidden="true">
            <UiIcon className="ui-select-checkbox-icon" name="check" size="sm" />
          </span>
        )}
        {renderOption ? (
          renderOption({ option: row.entry.original, selected: row.selected, index: row.index })
        ) : (
          <span className="ui-select-option-label">{row.entry.label}</span>
        )}
        {checkmark && row.selected && (
          <UiIcon className="ui-select-checkmark" name="check" size={iconSize} />
        )}
      </li>
    );
  };

  const emptyRow = (
    <li className={cx('ui-select-empty', size === 'small' && '_small')} role="presentation">
      {renderEmpty ? renderEmpty() : emptyLabel}
    </li>
  );

  const listProps = {
    role: 'listbox' as const,
    id: listboxId,
    'aria-label': label || rest['aria-label'] || undefined,
    'aria-multiselectable': multiple || undefined,
  };

  // Toute l'ARIA du combobox vit ici, à côté du `role` qui la rend valide.
  // `aria-required` y compris : sur un `<button>`, `jsx-a11y` la juge sur le
  // rôle IMPLICITE de l'élément et non sur celui qu'on pose, d'où un faux
  // positif quand on l'écrit en attribut JSX.
  const triggerShared = {
    id: field.inputId,
    role: 'combobox' as const,
    'aria-haspopup': 'listbox' as const,
    'aria-required': required || undefined,
    'aria-expanded': open,
    'aria-controls': open ? listboxId : undefined,
    'aria-activedescendant': activeDescendant,
    'aria-label': label ? undefined : rest['aria-label'],
    'aria-labelledby': rest['aria-labelledby'],
    'aria-describedby': field.describedBy,
    'aria-invalid': field.ariaInvalid,
    onKeyDown: onTriggerKeyDown,
  };

  return (
    // Aucun gestionnaire de clic sur cette enveloppe : le déclencheur bouton
    // remplit déjà la boîte du champ (`flex: 1 1 auto` et `align-self:
    // stretch`), donc un clic n'importe où dedans l'atteint. En mode éditable,
    // c'est le chevron qui bascule, et il est alors un vrai bouton.
    <div className={cx('ui-select', isEditable && '_editable', className)}>
      <UiField
        onBoxRef={position.setAnchor}
        label={label}
        htmlFor={field.inputId}
        required={required}
        size={size}
        level={field.level}
        floatLabel={floatLabel}
        filled={hasValue}
        disabled={disabled}
        readOnly={readOnly}
        autoHeight={multiple}
        message={field.message}
        messageId={field.messageId}
        showMessageIcon={showMessageIcon}
        messageIcon={messageIcon}
        suffix={
          <>
            {showClear && hasValue && !disabled && !readOnly && (
              <button
                type="button"
                className="ui-select-clear"
                aria-label={clearAriaLabel}
                onClick={clear}
              >
                <UiIcon name="xmark" size={iconSize} />
              </button>
            )}
            {loading ? (
              <UiSpinner
                className="ui-select-loading"
                size="small"
                orientation="horizontal"
                aria-label="Chargement des options"
              />
            ) : isEditable ? (
              // En mode éditable, le chevron est la SEULE façon d'ouvrir le
              // panneau à la souris : c'est donc un vrai bouton, atteignable au
              // clavier, et pas une icône décorative.
              <button
                type="button"
                className={cx('ui-select-toggle', open && '_open', disabled && '_disabled')}
                aria-label={open ? 'Masquer les options' : 'Afficher les options'}
                aria-expanded={open}
                aria-controls={open ? listboxId : undefined}
                disabled={disabled}
                onClick={() => (open ? close() : openPanel())}
              >
                <UiIcon name={icon} size={iconSize} />
              </button>
            ) : (
              <UiIcon
                className={cx('ui-select-chevron', open && '_open', disabled && '_disabled')}
                name={icon}
                size={iconSize}
              />
            )}
          </>
        }
      >
        {isEditable ? (
          <input
            ref={setTrigger as Ref<HTMLInputElement>}
            {...triggerShared}
            type="text"
            className={cx('ui-select-native', size === 'small' && '_small')}
            aria-autocomplete="list"
            value={editableQuery ?? selectedLabel}
            placeholder={floatLabel && label ? '' : placeholder}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            onChange={(event) => {
              const next = event.target.value;
              setEditableQuery(next);
              commit(next === '' ? null : next);
              if (!open) openPanel();
              setFocusedIndex(0);
            }}
          />
        ) : (
          <>
            {/*
              Multiple avec rendu personnalisé : les valeurs vivent HORS du
              bouton. Leurs propres boutons de retrait ne peuvent pas s'imbriquer
              dans un bouton, ce serait du balisage invalide.
            */}
            {multiple && renderSelectedItem && hasValue && (
              <div className="ui-select-values">
                {displayedSelected.map((entry, index) => (
                  <span key={index}>
                    {renderSelectedItem({
                      option: entry.original,
                      index,
                      remove: () => removeValue(entry.value),
                    })}
                  </span>
                ))}
                {overflowCount > 0 && (
                  <span className={cx('ui-select-overflow', size === 'small' && '_small')}>
                    {overflowText}
                  </span>
                )}
              </div>
            )}
            <button
              ref={setTrigger as Ref<HTMLButtonElement>}
              {...triggerShared}
              type="button"
              className={cx('ui-select-trigger', size === 'small' && '_small')}
              disabled={disabled}
              // Le bouton BASCULE : `useUiDismiss` épargne l'ancre, donc un
              // clic dessus alors que le panneau est ouvert ne le ferme pas de
              // lui-même. Sans cette bascule, le panneau ne se refermerait
              // jamais par son déclencheur.
              onClick={() => (open ? close() : openPanel())}
            >
              {multiple && renderSelectedItem && hasValue ? (
                // Valeur accessible du combobox : la valeur visible, ce sont
                // les puces à côté.
                <span className="ui-select-sr">{selectedLabel}</span>
              ) : !multiple && renderSelectedItem && hasValue ? (
                renderSelectedItem({
                  option: displayedSelected[0]?.original,
                  index: 0,
                  remove: () => commit(null),
                })
              ) : hasValue ? (
                <span className={cx('ui-select-value', multiple && '_wrap')}>{selectedLabel}</span>
              ) : (
                <span className="ui-select-placeholder">
                  {floatLabel && label ? '' : placeholder}
                </span>
              )}
            </button>
          </>
        )}
      </UiField>

      <div
        ref={setPanel}
        // `manual` : le light-dismiss natif fermerait sur un clic sur le
        // déclencheur, qui rouvrirait aussitôt.
        // Tant que la position n'est pas calculée, le panneau reste dans son
        // état fermé : `computePosition` est asynchrone, et peindre l'image
        // d'avant est ce qui fait apparaître un panneau au mauvais endroit
        // avant qu'il se replace. Reconnu par `utils.overlay-motion`.
        data-unpositioned={position.isPositioned ? undefined : ''}
        popover="manual"
        className={cx('ui-select-panel', size === 'small' && '_small', panelClassName)}
        style={{
          ...position.panelStyle,
          width: panelWidth && panelWidth !== 'auto' ? panelWidth : undefined,
        }}
      >
        {panelHeader && <div className="ui-select-header">{panelHeader}</div>}

        {filter && (
          <div className={cx('ui-select-filter', size === 'small' && '_small')}>
            <UiIcon className="ui-select-filter-icon" name="magnifying-glass" size="sm" />
            <input
              ref={filterRef}
              type="text"
              className="ui-select-filter-input"
              autoComplete="off"
              role="searchbox"
              value={filterValue}
              placeholder={filterPlaceholder ?? ''}
              aria-label={filterAriaLabel}
              aria-controls={listboxId}
              aria-activedescendant={activeDescendant}
              onChange={(event) => {
                setFilterValue(event.target.value);
                onFilterChange?.(event.target.value);
                setFocusedIndex(0);
              }}
              onKeyDown={(event) => {
                // Début et Fin déplacent le curseur dans le champ.
                if (event.key === 'Home' || event.key === 'End') return;
                handleNavigationKey(event);
              }}
            />
          </div>
        )}

        {virtualScroll ? (
          // Les `<li>` restent enfants DIRECTS du `<ul role="listbox">`, placés
          // en absolu : un niveau d'imbrication de plus casserait la relation
          // que les technologies d'assistance attendent entre la liste et ses
          // options.
          <div
            className="ui-select-viewport"
            style={{ height: Math.min(rows.length * virtualScrollItemSize, scrollHeightPx) }}
            ref={virtual.scrollRef}
          >
            <ul
              {...listProps}
              ref={listRef}
              className="ui-select-list"
              style={{ height: virtual.totalSize, position: 'relative' }}
            >
              {virtual.items.map((item) => {
                const row = rows[item.index];
                return row ? renderRow(row, item.style) : null;
              })}
              {!rows.length && emptyRow}
            </ul>
          </div>
        ) : (
          <ul
            {...listProps}
            ref={listRef}
            className="ui-select-list"
            style={{ maxHeight: scrollHeightPx }}
          >
            {rows.map((row) => renderRow(row))}
            {!rows.length && emptyRow}
          </ul>
        )}

        {panelFooter && <div className="ui-select-footer">{panelFooter}</div>}
      </div>
    </div>
  );
}
