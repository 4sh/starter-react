'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';

import { UiIcon, type UiIconSize } from '../../base/ui-icon';
import { UiChip } from '../../informative/ui-chip';
import { UiSpinner } from '../../informative/ui-spinner';
import { useRovingTabIndex } from '../../core/focus';
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

import './ui-autocomplete.scss';

export type AutocompleteValue = unknown;
/** Requête envoyée par le bouton de liste : la saisie courante, ou rien. */
export type AutocompleteDropdownMode = 'blank' | 'current';

type AcRow =
  | { kind: 'group'; key: string; label: string; original: unknown }
  | { kind: 'option'; key: string; id: string; index: number; entry: OptionEntry };

type OptionRow = Extract<AcRow, { kind: 'option' }>;

export interface AutocompleteItemContext {
  option: unknown;
  index: number;
}

export interface AutocompleteSelectedItemContext {
  option: unknown;
  index: number;
  remove: () => void;
}

type NativeProps = Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'value' | 'defaultValue' | 'onChange' | 'size' | 'ref'
>;

export interface UiAutocompleteProps extends UiFieldSharedProps, NativeProps {
  /**
   * Suggestions à afficher. **Déjà filtrées** : c'est l'appelant qui répond à
   * `onComplete`, ce qui permet d'interroger un serveur.
   */
  suggestions?: readonly unknown[];
  optionLabel?: string;
  optionValue?: string;
  optionDisabled?: string;
  dataKey?: string;

  group?: boolean;
  optionGroupLabel?: string;
  optionGroupChildren?: string;

  /** Valeur imposée. Renseignée, le champ est contrôlé. */
  value?: AutocompleteValue;
  defaultValue?: AutocompleteValue;
  onValueChange?: (value: AutocompleteValue) => void;

  placeholder?: string;
  /** Nombre de caractères avant d'interroger. */
  minLength?: number;
  /** Attente avant d'interroger, en ms. */
  delay?: number;
  /** Interroger dès la prise de focus. */
  completeOnFocus?: boolean;

  /** Bouton qui affiche les suggestions sans avoir à taper. */
  dropdown?: boolean;
  /** `blank` interroge avec une requête vide, `current` avec la saisie. */
  dropdownMode?: AutocompleteDropdownMode;
  dropdownAriaLabel?: string;
  dropdownIcon?: string;

  /** La valeur doit correspondre à une suggestion. Le texte libre est refusé. */
  forceSelection?: boolean;

  /** Sélection multiple, rendue en puces. */
  multiple?: boolean;
  /**
   * Onde de pression sur les suggestions et les étiquettes, quand elle est activée. `false` la coupe
   * sur ce champ, activation globale comprise.
   */
  ripple?: boolean;
  /** Refuser deux fois la même valeur. */
  unique?: boolean;
  maxSelectedLabels?: number;
  overflowLabel?: string;

  showClear?: boolean;
  clearAriaLabel?: string;
  loading?: boolean;

  emptyMessage?: string;
  /** Afficher le message quand aucune suggestion ne revient. */
  showEmptyMessage?: boolean;

  selectOnFocus?: boolean;
  focusOnHover?: boolean;

  virtualScroll?: boolean;
  virtualScrollItemSize?: number;
  scrollHeight?: string;

  autoFlip?: boolean;
  panelClassName?: string;

  renderOption?: (context: AutocompleteItemContext) => ReactNode;
  renderSelectedItem?: (context: AutocompleteSelectedItemContext) => ReactNode;
  renderGroup?: (group: unknown) => ReactNode;
  renderEmpty?: () => ReactNode;

  /** Appelé quand une requête part. C'est à l'appelant de mettre `suggestions` à jour. */
  onComplete?: (query: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onClear?: () => void;
  onOptionSelect?: (option: unknown) => void;
  onOptionUnselect?: (option: unknown) => void;

  ref?: Ref<HTMLInputElement>;
}

/** Avertissements déjà émis, pour rester idempotent sous `<StrictMode>`. */
const warned = new Set<string>();

/**
 * ui-autocomplete : champ de saisie assistée, posé sur la coquille `ui-field`.
 * Le composant **ne filtre rien** : il émet une requête par `onComplete`, et
 * l'appelant répond en mettant `suggestions` à jour, ce qui permet d'interroger un
 * serveur. Motif combobox : le focus reste sur le champ, l'option courante est
 * désignée par `aria-activedescendant`, et le panneau vit dans le calque supérieur.
 */
export function UiAutocomplete({
  suggestions = [],
  optionLabel,
  optionValue,
  optionDisabled,
  dataKey,
  group = false,
  optionGroupLabel = 'label',
  optionGroupChildren = 'items',
  value,
  defaultValue = null,
  onValueChange,
  placeholder,
  minLength = 1,
  delay = 300,
  completeOnFocus = false,
  dropdown = false,
  dropdownMode = 'blank',
  dropdownAriaLabel = 'Afficher les suggestions',
  dropdownIcon = 'angle-down',
  forceSelection = false,
  multiple = false,
  ripple = true,
  unique = true,
  maxSelectedLabels,
  overflowLabel = '(+{0} autres)',
  showClear = false,
  clearAriaLabel = 'Effacer la saisie',
  loading = false,
  emptyMessage = 'Aucun résultat',
  showEmptyMessage = true,
  selectOnFocus = false,
  focusOnHover = true,
  virtualScroll = false,
  virtualScrollItemSize = 40,
  scrollHeight,
  autoFlip = true,
  panelClassName,
  renderOption,
  renderSelectedItem,
  renderGroup,
  renderEmpty,
  onComplete,
  onOpen,
  onClose,
  onClear,
  onOptionSelect,
  onOptionUnselect,
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
}: UiAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const tagRefs = useRef<(HTMLElement | null)[]>([]);
  const searchTimer = useRef(0);
  /** Une requête a déjà été traitée : évite que `completeOnFocus` en refasse une. */
  const queryDirty = useRef(false);

  const uid = useId();
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const [model, setModel] = useControllableState<AutocompleteValue>({
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
  const tagsId = `${field.inputId}-tags`;
  const iconSize: UiIconSize = size === 'small' ? 'sm' : 'md';

  const resolver = useMemo(
    () => createOptionResolver({ optionLabel, optionValue, optionDisabled, dataKey }),
    [optionLabel, optionValue, optionDisabled, dataKey],
  );

  // --- Suggestions ---------------------------------------------------------
  const groups = useMemo(() => {
    if (!group) return [];
    return suggestions.map((groupOption) => {
      const children = resolver.getField(groupOption, optionGroupChildren);
      return {
        label: resolver.asText(resolver.getField(groupOption, optionGroupLabel)) ?? '',
        original: groupOption,
        entries: (Array.isArray(children) ? children : []).map((o) => resolver.toEntry(o)),
      };
    });
  }, [group, suggestions, resolver, optionGroupChildren, optionGroupLabel]);

  const flatEntries = useMemo(
    () => (group ? groups.flatMap((g) => g.entries) : suggestions.map((o) => resolver.toEntry(o))),
    [group, groups, suggestions, resolver],
  );

  const rows = useMemo<AcRow[]>(() => {
    const out: AcRow[] = [];
    let index = 0;
    const pushOption = (entry: OptionEntry) => {
      out.push({
        kind: 'option',
        key: `${listboxId}-${index}`,
        id: `${field.inputId}-option-${index}`,
        index,
        entry,
      });
      index += 1;
    };

    if (group) {
      groups.forEach((g, gi) => {
        if (!g.entries.length) return;
        out.push({
          kind: 'group',
          key: `${listboxId}-group-${gi}`,
          label: g.label,
          original: g.original,
        });
        g.entries.forEach(pushOption);
      });
    } else {
      flatEntries.forEach(pushOption);
    }
    return out;
  }, [group, groups, flatEntries, listboxId, field.inputId]);

  const visibleOptions = useMemo(
    () => rows.filter((r): r is OptionRow => r.kind === 'option'),
    [rows],
  );

  const activeDescendant = open ? visibleOptions[focusedIndex]?.id : undefined;

  // --- Sélection -----------------------------------------------------------
  const selectedValues = useMemo<unknown[]>(() => {
    if (model === null || model === undefined) return [];
    return multiple ? (Array.isArray(model) ? model : []) : [model];
  }, [model, multiple]);

  /**
   * Libellés retenus AU MOMENT du choix : les suggestions changent à chaque requête,
   * et une puce n'afficherait plus que sa valeur brute.
   */
  const [labelCache, setLabelCache] = useState<Map<unknown, string>>(() => new Map());

  const labelOf = useCallback(
    (v: unknown): string =>
      labelCache.get(v) ??
      flatEntries.find((e) => resolver.equals(e.value, v))?.label ??
      resolver.asText(v) ??
      '',
    [labelCache, flatEntries, resolver],
  );

  const tags = useMemo(
    () => selectedValues.map((v, index) => ({ value: v, label: labelOf(v), index })),
    [selectedValues, labelOf],
  );

  const visibleTags =
    maxSelectedLabels != null && maxSelectedLabels > 0 ? tags.slice(0, maxSelectedLabels) : tags;
  const overflowCount = tags.length - visibleTags.length;

  const hasValue = multiple
    ? selectedValues.length > 0
    : model !== null && model !== undefined && model !== '';

  // --- Placement du panneau ------------------------------------------------
  const position = useUiPosition<HTMLElement, HTMLDivElement>({
    placement: 'bottom-start',
    offset: 8,
    flip: autoFlip,
    matchWidth: true,
    open,
  });

  const setAnchor = useCallback(
    (node: HTMLDivElement | null) => {
      anchorRef.current = node;
      position.setAnchor(node);
    },
    [position],
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
      setFocusedIndex(-1);
      if (restoreFocus) inputRef.current?.focus();
    },
    [onClose],
  );

  const openPanel = useCallback(() => {
    if (disabled || readOnly) return;
    setOpen((wasOpen) => {
      if (wasOpen) return wasOpen;
      onOpen?.();
      return true;
    });
  }, [disabled, readOnly, onOpen]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const isOpen = panel.matches(':popover-open');
    if (open && !isOpen) panel.showPopover();
    else if (!open && isOpen) panel.hidePopover();
  }, [open]);

  useUiDismiss({
    open,
    onDismiss: () => close(false),
    panelRef,
    anchorRef,
    closeOnEscape: false, // le clavier du champ sait si Échap ferme
  });

  useCloseOnNavigation(open, () => close(false));

  useEffect(() => () => window.clearTimeout(searchTimer.current), []);

  // --- Requêtes ------------------------------------------------------------
  const runSearch = useCallback(
    (query: string) => {
      queryDirty.current = true;
      onComplete?.(query);
      openPanel();
    },
    [onComplete, openPanel],
  );

  const commit = useCallback((next: AutocompleteValue) => setModel(next), [setModel]);

  const selectEntry = useCallback(
    (entry: OptionEntry, closePanel = true) => {
      if (entry.disabled || readOnly) return;

      setLabelCache((cache) => new Map(cache).set(entry.value, entry.label));

      if (multiple) {
        const already = selectedValues.some((v) => resolver.equals(v, entry.value));
        if (!(unique && already)) {
          commit([...selectedValues, entry.value]);
          onOptionSelect?.(entry.original);
        }
        // La requête vient d'être consommée : un panneau ouvert montrerait des
        // résultats pour un texte que le champ n'affiche plus.
        setInputText('');
        if (closePanel) close();
        return;
      }

      commit(entry.value);
      setInputText(entry.label);
      onOptionSelect?.(entry.original);
      if (closePanel) close();
    },
    [readOnly, multiple, selectedValues, unique, resolver, commit, close, onOptionSelect],
  );

  const removeAt = useCallback(
    (index: number) => {
      if (disabled || readOnly) return;
      const target = tags[index];
      if (!target) return;
      commit(selectedValues.filter((_, i) => i !== index));
      onOptionUnselect?.(target.value);
      inputRef.current?.focus();
    },
    [disabled, readOnly, tags, selectedValues, commit, onOptionUnselect],
  );

  // --- Focus visuel dans la liste ------------------------------------------
  const scrollFocusedIntoView = useCallback((index: number) => {
    listRef.current?.querySelector(`[data-option-index="${index}"]`)?.scrollIntoView({
      block: 'nearest',
    });
  }, []);

  const applyFocus = useCallback(
    (index: number) => {
      setFocusedIndex(index);
      scrollFocusedIntoView(index);
      if (selectOnFocus && !multiple) {
        const row = visibleOptions[index];
        if (row) selectEntry(row.entry, false);
      }
    },
    [scrollFocusedIntoView, selectOnFocus, multiple, visibleOptions, selectEntry],
  );

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

  // --- Focus glissant sur les puces ----------------------------------------
  const roving = useRovingTabIndex({
    count: visibleTags.length,
    orientation: 'horizontal',
    loop: false,
    defaultActiveIndex: -1,
  });

  const focusTag = useCallback(
    (index: number) => {
      roving.setActiveIndex(index);
      // Focus après le rendu qui pose le `tabIndex`, par `setTimeout` :
      // `requestAnimationFrame` ne tire pas dans un onglet en arrière-plan.
      window.setTimeout(() => tagRefs.current[index]?.focus());
    },
    [roving],
  );

  const focusInput = useCallback(() => {
    roving.setActiveIndex(-1);
    inputRef.current?.focus();
  }, [roving]);

  const onTagKeyDown = (event: KeyboardEvent, index: number) => {
    if (disabled || readOnly) return;
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        if (index > 0) focusTag(index - 1);
        return;
      case 'ArrowRight':
        event.preventDefault();
        if (index < visibleTags.length - 1) focusTag(index + 1);
        else focusInput();
        return;
      case 'Backspace':
      case 'Delete':
        event.preventDefault();
        removeAt(index);
        return;
      case 'Home':
        event.preventDefault();
        focusTag(0);
        return;
      case 'End':
        event.preventDefault();
        focusTag(visibleTags.length - 1);
        return;
      default:
        return;
    }
  };

  // --- Saisie --------------------------------------------------------------
  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setInputText(query);

    // Texte libre pendant la frappe, sauf avec `forceSelection` (une vraie suggestion
    // est attendue) et `multiple` (la requête ne touche jamais la sélection).
    if (!forceSelection && !multiple) commit(query === '' ? null : query);

    window.clearTimeout(searchTimer.current);

    if (query.length === 0) {
      if (!multiple) onClear?.();
      close(false);
      return;
    }
    if (query.length < minLength) {
      close(false);
      return;
    }

    setFocusedIndex(-1);
    searchTimer.current = window.setTimeout(() => runSearch(query), delay);
  };

  /**
   * `forceSelection` : à la sortie du champ, un texte sans suggestion correspondante
   * est effacé, pour que le modèle ne contienne jamais de texte libre.
   */
  const validateForceSelection = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    const match = flatEntries.find(
      (e) => !e.disabled && normalizeText(e.label) === normalizeText(text),
    );
    if (match) {
      selectEntry(match, false);
    } else if (multiple) {
      setInputText('');
    } else {
      commit(null);
      setInputText('');
      onClear?.();
    }
  }, [inputText, flatEntries, selectEntry, multiple, commit, onClear]);

  const onInputBlur = (event: FocusEvent<HTMLInputElement>) => {
    const next = event.relatedTarget as Node | null;
    const inside =
      (next && anchorRef.current?.contains(next)) || (next && panelRef.current?.contains(next));
    if (!inside && forceSelection) validateForceSelection();
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled || readOnly) return;

    if (multiple && selectedValues.length) {
      const input = event.currentTarget;
      if (event.key === 'Backspace' && !inputText) {
        removeAt(selectedValues.length - 1);
        return;
      }
      if (
        event.key === 'ArrowLeft' &&
        !renderSelectedItem &&
        input.selectionStart === 0 &&
        input.selectionEnd === 0
      ) {
        event.preventDefault();
        focusTag(visibleTags.length - 1);
        return;
      }
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (open) moveFocus(1);
        else if (rows.length) {
          openPanel();
          moveFocus(1);
        }
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (event.altKey) close();
        else if (open) moveFocus(-1);
        else if (rows.length) {
          openPanel();
          moveFocus(-1);
        }
        return;
      case 'Home':
      case 'End':
        // Le curseur du champ garde ces touches quand le panneau est fermé.
        if (!open) return;
        event.preventDefault();
        focusEdge(event.key === 'Home' ? 1 : -1);
        return;
      case 'Enter': {
        if (!open) return; // fermé : la soumission native du formulaire passe
        event.preventDefault();
        const row = visibleOptions[focusedIndex];
        if (row) selectEntry(row.entry);
        else close();
        return;
      }
      case 'Escape':
        if (!open) return;
        event.preventDefault();
        // Consommée SEULEMENT parce qu'elle ferme : sinon elle fermerait aussi
        // le `ui-modal` qui contient le champ.
        event.stopPropagation();
        close();
        return;
      case 'Tab':
        if (open) close(false);
        return;
      default:
        return;
    }
  };

  const onDropdownClick = () => {
    if (disabled || readOnly) return;
    if (open) {
      close();
      return;
    }
    // Marqué AVANT le focus, qui est synchrone : sinon `completeOnFocus` lancerait
    // une seconde requête.
    queryDirty.current = true;
    inputRef.current?.focus();
    runSearch(dropdownMode === 'current' ? inputText : '');
  };

  const clear = (event: MouseEvent) => {
    event.stopPropagation();
    commit(multiple ? [] : null);
    setInputText('');
    onClear?.();
    close(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (warned.has(uid)) return;
    if (!label && !rest['aria-label'] && !rest['aria-labelledby']) {
      warned.add(uid);
      console.warn(
        `[ui-autocomplete] Champ sans nom accessible : renseignez \`label\`, \`aria-label\` ou \`aria-labelledby\`.`,
      );
    }
  }, [label, rest, uid]);

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

  // --- Rendu ---------------------------------------------------------------
  const renderRow = (row: AcRow, style?: React.CSSProperties): ReactNode => {
    if (row.kind === 'group') {
      return (
        <li
          key={row.key}
          style={style}
          className={cx('ui-autocomplete-group', size === 'small' && '_small')}
          role="presentation"
        >
          {renderGroup ? renderGroup(row.original) : row.label}
        </li>
      );
    }

    return (
      // Motif combobox : le clavier et le focus vivent sur le champ (`aria-activedescendant`).
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events
      <li
        key={row.key}
        id={row.id}
        style={style}
        data-option-index={row.index}
        className={cx(
          'ui-autocomplete-option',
          size === 'small' && '_small',
          row.index === focusedIndex && '_focused',
          row.entry.disabled && '_disabled',
        )}
        data-ripple={ripple ? 'on' : 'off'}
        role="option"
        aria-selected={row.index === focusedIndex}
        aria-disabled={row.entry.disabled || undefined}
        aria-setsize={visibleOptions.length}
        aria-posinset={row.index + 1}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.preventDefault();
          selectEntry(row.entry);
        }}
        onMouseEnter={() => {
          if (focusOnHover && !row.entry.disabled) setFocusedIndex(row.index);
        }}
      >
        {renderOption ? (
          renderOption({ option: row.entry.original, index: row.index })
        ) : (
          <span className="ui-autocomplete-option-label">{row.entry.label}</span>
        )}
      </li>
    );
  };

  const listProps = {
    role: 'listbox' as const,
    id: listboxId,
    'aria-label': label || rest['aria-label'] || undefined,
  };

  return (
    <div className={cx('ui-autocomplete', className)}>
      <UiField
        onBoxRef={setAnchor}
        label={label}
        htmlFor={field.inputId}
        required={required}
        size={size}
        level={field.level}
        floatLabel={floatLabel}
        filled={hasValue || inputText !== ''}
        disabled={disabled}
        readOnly={readOnly}
        autoHeight={multiple}
        message={field.message}
        messageId={field.messageId}
        showMessageIcon={showMessageIcon}
        messageIcon={messageIcon}
        suffix={
          <>
            {showClear && (hasValue || inputText !== '') && !disabled && !readOnly && (
              <button
                type="button"
                className="ui-autocomplete-clear"
                aria-label={clearAriaLabel}
                onClick={clear}
              >
                <UiIcon name="xmark" size={iconSize} />
              </button>
            )}
            {loading ? (
              <UiSpinner
                className="ui-autocomplete-loading"
                size="small"
                orientation="horizontal"
                aria-label="Chargement des suggestions"
              />
            ) : (
              dropdown && (
                <button
                  type="button"
                  className={cx('ui-autocomplete-dropdown', open && '_open')}
                  aria-label={dropdownAriaLabel}
                  aria-expanded={open}
                  aria-controls={open ? listboxId : undefined}
                  disabled={disabled}
                  onClick={onDropdownClick}
                >
                  <UiIcon name={dropdownIcon} size={iconSize} />
                </button>
              )
            )}
          </>
        }
      >
        <div className={cx('ui-autocomplete-control', size === 'small' && '_small')}>
          {multiple && visibleTags.length > 0 && (
            // `display: contents` : le rôle de liste est porté ici, mais les puces
            // restent des enfants du contrôle, et le champ s'enroule autour d'elles.
            <div
              className="ui-autocomplete-tags"
              id={tagsId}
              role="listbox"
              aria-orientation="horizontal"
              aria-label={label || rest['aria-label'] || undefined}
            >
              {visibleTags.map((tag) =>
                renderSelectedItem ? (
                  <span key={tag.index}>
                    {renderSelectedItem({
                      option: tag.value,
                      index: tag.index,
                      remove: () => removeAt(tag.index),
                    })}
                  </span>
                ) : (
                  <UiChip
                    key={tag.index}
                    ref={(node) => {
                      tagRefs.current[tag.index] = node;
                    }}
                    className="ui-autocomplete-tag"
                    data-ripple={ripple ? 'on' : 'off'}
                    role="option"
                    aria-selected
                    aria-label={tag.label}
                    aria-setsize={tags.length}
                    aria-posinset={tag.index + 1}
                    tabIndex={disabled ? -1 : roving.tabIndexFor(tag.index)}
                    label={tag.label}
                    size="small"
                    disabled={disabled}
                    // Pas `removable` : son `<button>` serait imbriqué dans une `option`
                    // (`nested-interactive`). La croix est décorative, Suppr retire au clavier.
                    onKeyDown={(event) => onTagKeyDown(event, tag.index)}
                    onFocus={() => roving.setActiveIndex(tag.index)}
                  >
                    {!disabled && !readOnly && (
                      <span
                        className="ui-autocomplete-remove"
                        aria-hidden="true"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => {
                          event.stopPropagation();
                          removeAt(tag.index);
                        }}
                      >
                        <UiIcon name="xmark" size="sm" />
                      </span>
                    )}
                  </UiChip>
                ),
              )}
              {overflowCount > 0 && (
                <span className={cx('ui-autocomplete-overflow', size === 'small' && '_small')}>
                  {formatLabel(overflowLabel, overflowCount)}
                </span>
              )}
            </div>
          )}

          <input
            ref={(node) => {
              inputRef.current = node;
              if (typeof ref === 'function') ref(node);
              else if (ref) ref.current = node;
            }}
            id={field.inputId}
            type="text"
            className={cx('ui-autocomplete-input', size === 'small' && '_small')}
            role="combobox"
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={open ? listboxId : undefined}
            aria-activedescendant={activeDescendant}
            aria-label={label ? undefined : rest['aria-label']}
            aria-labelledby={rest['aria-labelledby']}
            aria-describedby={field.describedBy}
            aria-invalid={field.ariaInvalid}
            aria-required={required || undefined}
            autoComplete="off"
            value={inputText}
            placeholder={floatLabel && label ? '' : placeholder}
            disabled={disabled}
            readOnly={readOnly}
            onChange={onInput}
            onKeyDown={onInputKeyDown}
            onFocus={() => {
              if (disabled) return;
              if (!queryDirty.current && completeOnFocus) runSearch(inputText);
            }}
            onBlur={onInputBlur}
          />
        </div>
      </UiField>

      <div
        ref={setPanel}
        // Fermé tant que la position n'est pas calculée, `computePosition` étant
        // asynchrone. Lu par `utils.overlay-motion`.
        data-unpositioned={position.isPositioned ? undefined : ''}
        popover="manual"
        className={cx('ui-autocomplete-panel', size === 'small' && '_small', panelClassName)}
        style={position.panelStyle}
      >
        {virtualScroll ? (
          <div
            className="ui-autocomplete-viewport"
            style={{ height: Math.min(rows.length * virtualScrollItemSize, scrollHeightPx) }}
            ref={virtual.scrollRef}
          >
            <ul
              {...listProps}
              ref={listRef}
              className="ui-autocomplete-list"
              style={{ height: virtual.totalSize, position: 'relative' }}
            >
              {virtual.items.map((item) => {
                const row = rows[item.index];
                return row ? renderRow(row, item.style) : null;
              })}
            </ul>
          </div>
        ) : (
          <ul
            {...listProps}
            ref={listRef}
            className="ui-autocomplete-list"
            style={{ maxHeight: scrollHeightPx }}
          >
            {rows.map((row) => renderRow(row))}
            {!rows.length && showEmptyMessage && (
              <li
                className={cx('ui-autocomplete-empty', size === 'small' && '_small')}
                role="presentation"
              >
                {renderEmpty ? renderEmpty() : emptyMessage}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
