import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from 'react';

import { UiIcon, type UiIconSize } from '../../base/ui-icon';
import { useRovingTabIndex } from '../../core/focus';
import {
  createOptionResolver,
  useControllableState,
  useUiField,
  type UiFieldSharedProps,
} from '../../core/forms';
import { useCloseOnNavigation, useUiDismiss, useUiPosition } from '../../core/overlay';
import type { UiFeedbackLevel, UiSubLevel } from '../../core/types';
import { cx } from '../../core/utils';
import { UiChip } from '../../informative/ui-chip';
import { UiField } from '../ui-field';

import './ui-input-tags.scss';

/** Séparateur qui découpe le texte tapé, ou collé, en plusieurs tags. */
export type TagDelimiter = string | RegExp;

/** Contexte passé à `renderTag`. */
export interface InputTagsItemContext<T = unknown> {
  /** La valeur du tag. */
  value: T;
  /** Son libellé d'affichage résolu. */
  label: string;
  /** Son index. */
  index: number;
  /** Retire ce tag. */
  remove: () => void;
}

/** Contexte passé à `renderOption`. */
export interface InputTagsOptionContext<T = unknown> {
  /** La suggestion, telle qu'elle a été passée. */
  option: T;
  /** Son index dans la liste visible. */
  index: number;
}

/** Vue plate d'une suggestion. */
interface TagEntry {
  value: unknown;
  label: string;
  disabled: boolean;
  original: unknown;
}

/** Ligne rendue dans le panneau. */
type TagRow =
  | { kind: 'group'; key: string; label: string; original: unknown }
  | { kind: 'option'; key: string; id: string; index: number; entry: TagEntry; present: boolean };

/** Instances déjà averties, pour n'avertir qu'une fois chacune. */
const prevenus = new Set<string>();

export interface UiInputTagsProps<T = string> extends UiFieldSharedProps {
  /** Valeur imposée. Renseignée, le champ est **contrôlé**. */
  value?: T[];
  /** Valeur de départ quand le champ est non contrôlé. */
  defaultValue?: T[];
  /** Notifié à chaque changement de la liste des tags. */
  onValueChange?: (value: T[]) => void;

  /** Texte indicatif, affiché tant qu'aucun tag n'est posé. */
  placeholder?: string;
  /** Nombre maximal de tags. Atteint, la saisie se ferme. */
  max?: number;
  /** Séparateur qui découpe le texte en plusieurs tags, à la frappe comme au collage. */
  delimiter?: TagDelimiter;
  /** Accepter deux fois la même valeur. */
  allowDuplicate?: boolean;
  /** Transformer le texte restant en tag quand le champ perd le focus. */
  addOnBlur?: boolean;
  /** Transformer le texte restant en tag sur `Tab`. */
  addOnTab?: boolean;
  /** Découper le texte collé en tags. */
  addOnPaste?: boolean;
  /** Longueur maximale du texte tapé, transmise au champ natif. */
  maxLength?: number;

  /** Famille de couleur des tags. */
  chipLevel?: UiFeedbackLevel;
  /** Intensité des tags. */
  chipSubLevel?: UiSubLevel;
  /** Tags en pilule. */
  chipRounded?: boolean;

  // --- Suggestions --------------------------------------------------------
  /** Activer le panneau de suggestions. */
  typeahead?: boolean;
  /**
   * Suggestions affichées. Le composant **ne filtre rien** : il émet une requête
   * par `onComplete`, et l'appelant met cette liste à jour.
   */
  suggestions?: readonly unknown[];
  /** Chemin de champ d'où lire le libellé d'une suggestion. */
  optionLabel?: string;
  /** Chemin de champ d'où lire la valeur. */
  optionValue?: string;
  /** Chemin de champ d'où lire l'état désactivé. */
  optionDisabled?: string;
  /** Propriété qui sert à comparer deux valeurs objet. */
  dataKey?: string;
  /** Traiter les suggestions comme des groupes. */
  group?: boolean;
  /** Chemin de champ du libellé d'un groupe. */
  optionGroupLabel?: string;
  /** Chemin de champ des enfants d'un groupe. */
  optionGroupChildren?: string;
  /** Longueur minimale avant d'émettre une requête. */
  minLength?: number;
  /** Amortissement de la frappe, en millisecondes. */
  delay?: number;
  /** Émettre une requête dès la prise de focus. */
  completeOnFocus?: boolean;
  /** Hauteur maximale de la zone défilante du panneau. */
  scrollHeight?: string;
  /** Poser le focus visuel sur la première suggestion à l'ouverture. */
  autoOptionFocus?: boolean;
  /** Déplacer le focus visuel au survol. */
  focusOnHover?: boolean;
  /** Retourner le panneau au-dessus du champ quand la place manque. */
  autoFlip?: boolean;
  /** Classe(s) supplémentaire(s) sur le panneau. */
  panelClassName?: string;
  /** Message affiché quand aucune suggestion ne revient. */
  emptyMessage?: string;

  /** Rendu personnalisé d'un tag. */
  renderTag?: (context: InputTagsItemContext<T>) => ReactNode;
  /** Rendu personnalisé d'une suggestion. */
  renderOption?: (context: InputTagsOptionContext) => ReactNode;
  /** Rendu personnalisé d'un en-tête de groupe. */
  renderGroup?: (group: unknown) => ReactNode;

  name?: string;
  tabIndex?: number;
  id?: string;
  className?: string;

  /** Émis quand un tag est ajouté. */
  onTagAdd?: (value: T) => void;
  /** Émis quand un tag est retiré. */
  onTagRemove?: (value: T, index: number) => void;
  /** Émis pour demander des suggestions. L'appelant répond via `suggestions`. */
  onComplete?: (query: string) => void;
  /** Émis quand une suggestion est choisie, avec l'option d'origine. */
  onOptionSelect?: (option: unknown) => void;
  /** Émis quand le panneau s'ouvre. */
  onOpen?: () => void;
  /** Émis quand le panneau se ferme. */
  onClose?: () => void;
  onFocus?: (event: ReactFocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: ReactFocusEvent<HTMLInputElement>) => void;

  ref?: Ref<HTMLInputElement>;
}

/**
 * ui-input-tags : saisie de plusieurs valeurs sous forme de tags, sur la coquille
 * `ui-field`. Un tag se pose par `Entrée` ou un `delimiter`, et se retire par
 * `Retour arrière` ou la croix. `typeahead` ajoute un panneau de suggestions alimenté
 * par l'appelant : le composant **ne filtre rien**. Les tags forment un `listbox`
 * horizontal à focus glissant, qui n'enveloppe qu'eux.
 */
export function UiInputTags<T = string>({
  value,
  defaultValue = [],
  onValueChange,
  placeholder,
  max,
  delimiter,
  allowDuplicate = false,
  addOnBlur = false,
  addOnTab = false,
  addOnPaste = false,
  maxLength,
  chipLevel = 'default',
  chipSubLevel = 'low',
  chipRounded = true,
  typeahead = false,
  suggestions,
  optionLabel,
  optionValue,
  optionDisabled,
  dataKey,
  group = false,
  optionGroupLabel = 'label',
  optionGroupChildren = 'items',
  minLength = 1,
  delay = 300,
  completeOnFocus = false,
  scrollHeight,
  autoOptionFocus = false,
  focusOnHover = true,
  autoFlip = true,
  panelClassName,
  emptyMessage = 'Aucun résultat',
  renderTag,
  renderOption,
  renderGroup,
  name,
  tabIndex,
  id,
  className,
  onTagAdd,
  onTagRemove,
  onComplete,
  onOptionSelect,
  onOpen,
  onClose,
  onFocus,
  onBlur,
  ref,
  ...rest
}: UiInputTagsProps<T>) {
  const field = useUiField({ ...rest, id });
  const uid = useId();
  const listboxId = `${field.inputId}-tags`;
  const panelListId = `${field.inputId}-list`;

  const disabled = rest.disabled ?? false;
  const readOnly = rest.readOnly ?? false;
  const small = rest.size === 'small';
  const iconSize: UiIconSize = small ? 'sm' : 'md';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const tagRefs = useRef<(HTMLElement | null)[]>([]);
  const searchTimer = useRef(0);
  /** Une requête a déjà été traitée : évite que `completeOnFocus` en refasse une. */
  const queryDirty = useRef(false);

  const [tags, setTags] = useControllableState<T[]>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  const [inputText, setInputText] = useState('');
  const [open, setOpen] = useState(false);
  /** Index de la suggestion au focus visuel. `-1` = aucune. */
  const [focusedOption, setFocusedOption] = useState(-1);

  const resolver = useMemo(
    () => createOptionResolver({ optionValue, optionLabel, optionDisabled, dataKey }),
    [optionValue, optionLabel, optionDisabled, dataKey],
  );

  // --- État dérivé ---------------------------------------------------------
  const isFull = max != null && max > 0 && tags.length >= max;
  const canType = !disabled && !readOnly && !isFull;
  const canRemove = !disabled && !readOnly;

  const isPresent = useCallback(
    (v: unknown) => tags.some((t) => resolver.equals(t, v)),
    [tags, resolver],
  );

  const flatEntries = useMemo<TagEntry[]>(() => {
    const source = suggestions ?? [];
    if (!group) return source.map((o) => resolver.toEntry(o));
    return source.flatMap((g) => {
      const children = resolver.getField(g, optionGroupChildren);
      return (Array.isArray(children) ? children : []).map((o) => resolver.toEntry(o));
    });
  }, [suggestions, group, resolver, optionGroupChildren]);

  /** Libellé d'affichage d'un tag : celui de la suggestion si on la connaît. */
  const labelOfValue = useCallback(
    (v: unknown): string => {
      if (v === null || v === undefined) return '';
      const entry = flatEntries.find((e) => resolver.equals(e.value, v));
      if (entry) return entry.label;
      return resolver.resolveLabel(v) ?? resolver.asText(v) ?? '';
    },
    [flatEntries, resolver],
  );

  const tagRows = useMemo(
    () =>
      tags.map((v, index) => {
        const label = labelOfValue(v);
        return { value: v, index, label };
      }),
    [tags, labelOfValue],
  );

  /** Lignes du panneau. Une valeur déjà posée y est marquée, et désactivée. */
  const visibleRows = useMemo<TagRow[]>(() => {
    const rows: TagRow[] = [];
    let index = 0;
    const pushOption = (entry: TagEntry) => {
      const present = isPresent(entry.value);
      rows.push({
        kind: 'option',
        key: `${panelListId}-${index}`,
        id: `${field.inputId}-option-${index}`,
        index,
        entry: { ...entry, disabled: entry.disabled || (present && !allowDuplicate) },
        present,
      });
      index += 1;
    };

    if (group) {
      (suggestions ?? []).forEach((g, gi) => {
        const children = resolver.getField(g, optionGroupChildren);
        const entries = (Array.isArray(children) ? children : []).map((o) => resolver.toEntry(o));
        if (!entries.length) return;
        rows.push({
          kind: 'group',
          key: `${panelListId}-group-${gi}`,
          label: resolver.asText(resolver.getField(g, optionGroupLabel)) ?? '',
          original: g,
        });
        entries.forEach(pushOption);
      });
    } else {
      flatEntries.forEach(pushOption);
    }
    return rows;
  }, [
    group,
    suggestions,
    resolver,
    optionGroupChildren,
    optionGroupLabel,
    flatEntries,
    isPresent,
    allowDuplicate,
    panelListId,
    field.inputId,
  ]);

  const visibleOptions = useMemo(
    () => visibleRows.filter((r): r is Extract<TagRow, { kind: 'option' }> => r.kind === 'option'),
    [visibleRows],
  );

  const activeDescendant = open ? (visibleOptions[focusedOption]?.id ?? undefined) : undefined;

  // --- Panneau -------------------------------------------------------------
  const position = useUiPosition<HTMLElement, HTMLDivElement>({
    placement: 'bottom-start',
    offset: 8,
    flip: autoFlip,
    matchWidth: true,
    open,
  });

  const setPanel = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node;
      position.setPanel(node);
    },
    [position],
  );

  const close = useCallback(
    (focusInput = true) => {
      setOpen((wasOpen) => {
        if (!wasOpen) return wasOpen;
        onClose?.();
        return false;
      });
      setFocusedOption(-1);
      queryDirty.current = false;
      if (focusInput) inputRef.current?.focus();
    },
    [onClose],
  );

  const openPanel = useCallback(() => {
    if (!canType || open) return;
    setFocusedOption(autoOptionFocus ? visibleOptions.findIndex((o) => !o.entry.disabled) : -1);
    setOpen(true);
    onOpen?.();
  }, [canType, open, autoOptionFocus, visibleOptions, onOpen]);

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
    anchorRef: containerRef,
    closeOnEscape: false, // le clavier du champ sait, lui, si la touche ferme
  });

  useCloseOnNavigation(open, () => close(false));

  useEffect(() => () => window.clearTimeout(searchTimer.current), []);

  // --- Mutations de tags ---------------------------------------------------
  /** La liste avec `v` ajoutée, ou `null` si `max` ou `allowDuplicate` l'interdit. */
  const addValue = useCallback(
    (v: T, courant: T[]): T[] | null => {
      if (!allowDuplicate && courant.some((t) => resolver.equals(t, v))) return null;
      if (max != null && max > 0 && courant.length >= max) return null;
      return [...courant, v];
    },
    [allowDuplicate, resolver, max],
  );

  const split = useCallback(
    (text: string): string[] => (delimiter ? text.split(delimiter as string) : [text]),
    [delimiter],
  );

  /**
   * Ajoute plusieurs valeurs en une seule écriture du modèle : chaque écriture
   * partirait sinon d'un `tags` périmé, et seule la dernière survivrait.
   */
  const addMany = useCallback(
    (valeurs: T[]) => {
      if (!canType || !valeurs.length) return;
      let courant = tags;
      const ajoutees: T[] = [];
      for (const v of valeurs) {
        const suivant = addValue(v, courant);
        if (!suivant) continue;
        courant = suivant;
        ajoutees.push(v);
      }
      if (!ajoutees.length) return;
      setTags(courant);
      ajoutees.forEach((v) => onTagAdd?.(v));
    },
    [canType, tags, addValue, setTags, onTagAdd],
  );

  const addFromInput = useCallback(() => {
    const parts = split(inputText)
      .map((p) => p.trim())
      .filter(Boolean) as T[];
    addMany(parts);
    if (parts.length || inputText) setInputText('');
  }, [split, inputText, addMany]);

  const removeAt = useCallback(
    (index: number) => {
      if (disabled || readOnly) return;
      if (index < 0 || index >= tags.length) return;
      const v = tags[index]!;
      setTags(tags.filter((_, i) => i !== index));
      onTagRemove?.(v, index);
      return tags.length - 1;
    },
    [disabled, readOnly, tags, setTags, onTagRemove],
  );

  // --- Focus glissant des tags --------------------------------------------
  const roving = useRovingTabIndex({
    count: tags.length,
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

  const onTagKeyDown = (event: ReactKeyboardEvent, index: number) => {
    if (disabled || readOnly) return;
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        if (index > 0) focusTag(index - 1);
        return;
      case 'ArrowRight':
        event.preventDefault();
        if (index < tags.length - 1) focusTag(index + 1);
        else focusInput();
        return;
      case 'Backspace':
      case 'Delete': {
        event.preventDefault();
        const restants = removeAt(index);
        // On garde le focus glissant cohérent après un retrait.
        if (restants === undefined) return;
        if (restants === 0) focusInput();
        else focusTag(Math.min(index, restants - 1));
        return;
      }
      case 'Home':
        event.preventDefault();
        focusTag(0);
        return;
      case 'End':
        event.preventDefault();
        focusTag(tags.length - 1);
        return;
      default:
    }
  };

  // --- Suggestions ---------------------------------------------------------
  const runSearch = useCallback(
    (query: string) => {
      queryDirty.current = true;
      onComplete?.(query);
      openPanel();
    },
    [onComplete, openPanel],
  );

  /** Déplace le focus visuel en sautant les options désactivées, sans boucler. */
  const moveOption = useCallback(
    (delta: 1 | -1) => {
      if (!visibleOptions.length) return;
      let i = focusedOption;
      if (i === -1) i = delta === 1 ? -1 : visibleOptions.length;
      for (i += delta; i >= 0 && i < visibleOptions.length; i += delta) {
        const cible = visibleOptions[i];
        if (cible && !cible.entry.disabled) {
          setFocusedOption(i);
          panelRef.current?.querySelector(`[id="${cible.id}"]`)?.scrollIntoView({
            block: 'nearest',
          });
          return;
        }
      }
    },
    [visibleOptions, focusedOption],
  );

  const selectRow = useCallback(
    (row: Extract<TagRow, { kind: 'option' }>) => {
      if (row.entry.disabled) return;
      const suivant = addValue(row.entry.value as T, tags);
      if (suivant) {
        setTags(suivant);
        onTagAdd?.(row.entry.value as T);
        onOptionSelect?.(row.entry.original);
      }
      setInputText('');
      close();
    },
    [addValue, tags, setTags, onTagAdd, onOptionSelect, close],
  );

  // --- Saisie --------------------------------------------------------------
  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.currentTarget.value;
    setInputText(next);

    // Un séparateur tapé verse les parties complètes dans les tags, et garde
    // le reste dans le champ.
    if (delimiter && split(next).length > 1) {
      const parts = split(next);
      const reste = parts.pop() ?? '';
      addMany(parts.map((p) => p.trim()).filter(Boolean) as T[]);
      setInputText(reste);
      return;
    }

    if (!typeahead) return;

    window.clearTimeout(searchTimer.current);
    if (next.length < minLength) {
      close(false);
      return;
    }
    setFocusedOption(-1);
    searchTimer.current = window.setTimeout(() => runSearch(next), delay);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (disabled || readOnly) return;
    const el = inputRef.current;
    const atStart = !el || (el.selectionStart === 0 && el.selectionEnd === 0);

    switch (event.key) {
      case 'Enter': {
        event.preventDefault();
        const cible = visibleOptions[focusedOption];
        if (open && focusedOption !== -1 && cible) selectRow(cible);
        else addFromInput();
        return;
      }
      case 'Backspace':
        if (inputText.length === 0 && tags.length) {
          event.preventDefault();
          removeAt(tags.length - 1);
        }
        return;
      case 'ArrowLeft':
        if (atStart && tags.length) {
          event.preventDefault();
          focusTag(tags.length - 1);
        }
        return;
      case 'ArrowDown':
        if (typeahead) {
          event.preventDefault();
          if (open) moveOption(1);
          else if (visibleRows.length) {
            openPanel();
            if (focusedOption === -1) moveOption(1);
          }
        }
        return;
      case 'ArrowUp':
        if (typeahead && open) {
          event.preventDefault();
          moveOption(-1);
        }
        return;
      case 'Escape':
        // Consommée seulement si elle ferme : sinon un dialogue parent reste
        // atteignable par la même touche.
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        return;
      case 'Tab':
        if (addOnTab && inputText.trim()) {
          event.preventDefault();
          addFromInput();
        }
        if (open) close(false);
        return;
      default:
    }
  };

  const onPaste = (event: ReactClipboardEvent<HTMLInputElement>) => {
    if (!addOnPaste || !canType) return;
    const text = event.clipboardData?.getData('text') ?? '';
    if (!text) return;
    event.preventDefault();
    // Sans `delimiter`, un collage se découpe quand même sur les séparateurs
    // usuels : c'est tout l'intérêt de coller une liste.
    const parts = (delimiter ? split(text) : text.split(/[\r\n\t,;]+/))
      .map((p) => p.trim())
      .filter(Boolean) as T[];
    addMany(parts);
  };

  const onInputBlur = (event: ReactFocusEvent<HTMLInputElement>) => {
    const next = event.relatedTarget as Node | null;
    const dedans = !!containerRef.current?.contains(next) || !!panelRef.current?.contains(next);
    if (!dedans && addOnBlur && inputText.trim()) addFromInput();
    onBlur?.(event);
  };

  /** Un clic dans la boîte, hors d'un tag ou d'un bouton, tombe sur la saisie. */
  const onBoxMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, .ui-input-tags-tag, input')) return;
    event.preventDefault();
    inputRef.current?.focus();
  };

  // --- Garde-fou d'accessibilité ------------------------------------------
  const ariaLabel = rest['aria-label'];
  const ariaLabelledBy = rest['aria-labelledby'];
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (prevenus.has(uid)) return;
    if (!rest.label && !ariaLabel && !ariaLabelledBy) {
      prevenus.add(uid);
      console.warn(
        '[ui-input-tags] Champ sans nom accessible : renseignez `label`, `aria-label` ou `aria-labelledby`.',
      );
    }
  }, [uid, rest.label, ariaLabel, ariaLabelledBy]);

  const attacherInput = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as { current: HTMLInputElement | null }).current = node;
    },
    [ref],
  );

  /**
   * Le texte indicatif ne s'affiche que sans aucun tag, et jamais sous un
   * libellé flottant au repos : celui-ci occupe déjà cette place.
   */
  const effectivePlaceholder = rest.floatLabel || tags.length ? '' : (placeholder ?? '');

  const renderRow = (row: TagRow) => {
    if (row.kind === 'group') {
      return (
        <li
          key={row.key}
          className={cx('ui-input-tags-group', small && '_small')}
          role="presentation"
        >
          {renderGroup ? renderGroup(row.original) : row.label}
        </li>
      );
    }
    return (
      /*
        eslint-disable-next-line jsx-a11y/click-events-have-key-events --
        Motif combobox : clavier et focus sur le champ, option courante par
        `aria-activedescendant`.
      */
      <li
        key={row.key}
        id={row.id}
        className={cx(
          'ui-input-tags-option',
          small && '_small',
          row.index === focusedOption && '_focused',
          row.present && '_present',
          row.entry.disabled && '_disabled',
        )}
        role="option"
        aria-selected={row.present}
        aria-disabled={row.entry.disabled || undefined}
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => {
          if (focusOnHover && !row.entry.disabled) setFocusedOption(row.index);
        }}
        onClick={(event) => {
          event.preventDefault();
          selectRow(row);
        }}
      >
        {renderOption ? (
          renderOption({ option: row.entry.original, index: row.index })
        ) : (
          <span className="ui-input-tags-option-label">{row.entry.label}</span>
        )}
        {row.present && (
          <UiIcon className="ui-input-tags-option-check" name="check" size={iconSize} />
        )}
      </li>
    );
  };

  return (
    <div ref={containerRef} className={cx('ui-input-tags', className)}>
      <UiField
        label={rest.label}
        htmlFor={field.inputId}
        required={rest.required}
        size={rest.size}
        level={field.level}
        floatLabel={rest.floatLabel}
        filled={tags.length > 0 || inputText !== ''}
        disabled={disabled}
        readOnly={readOnly}
        autoHeight
        message={field.message}
        messageId={field.messageId}
        showMessageIcon={rest.showMessageIcon}
        messageIcon={rest.messageIcon}
        onBoxRef={position.setAnchor}
      >
        {/*
          eslint-disable-next-line jsx-a11y/no-static-element-interactions --
          Relais de pointeur vers la saisie ; le clavier vit sur le champ natif.
        */}
        <div className="ui-input-tags-control" onMouseDown={onBoxMouseDown}>
          {/* Le `listbox` n'enveloppe QUE les tags : il ne peut pas contenir de champ texte. */}
          <div
            className="ui-input-tags-list"
            role="listbox"
            aria-orientation="horizontal"
            id={listboxId}
            aria-label={ariaLabelledBy ? undefined : ariaLabel || rest.label}
            aria-labelledby={ariaLabelledBy}
          >
            {tagRows.map((tag) =>
              renderTag ? (
                <span
                  key={tag.index}
                  ref={(node) => {
                    tagRefs.current[tag.index] = node;
                  }}
                  className={cx('ui-input-tags-tag', '_custom', disabled && '_disabled')}
                  role="option"
                  aria-selected
                  aria-label={tag.label}
                  aria-setsize={tagRows.length}
                  aria-posinset={tag.index + 1}
                  tabIndex={disabled ? -1 : roving.tabIndexFor(tag.index)}
                  onKeyDown={(event) => onTagKeyDown(event, tag.index)}
                  onFocus={() => roving.setActiveIndex(tag.index)}
                >
                  {renderTag({
                    value: tag.value,
                    label: tag.label,
                    index: tag.index,
                    remove: () => removeAt(tag.index),
                  })}
                </span>
              ) : (
                // Le tag EST l'option focalisable : la puce en est l'hote.
                <UiChip
                  key={tag.index}
                  ref={(node) => {
                    tagRefs.current[tag.index] = node;
                  }}
                  className="ui-input-tags-tag"
                  role="option"
                  aria-selected
                  aria-label={tag.label}
                  aria-setsize={tagRows.length}
                  aria-posinset={tag.index + 1}
                  label={tag.label}
                  level={chipLevel}
                  subLevel={chipSubLevel}
                  size="small"
                  rounded={chipRounded}
                  disabled={disabled}
                  // Pas `removable` : son `<button>` serait imbriqué dans une `option`
                  // (`nested-interactive`). La croix est décorative, Suppr retire au clavier.
                  tabIndex={disabled ? -1 : roving.tabIndexFor(tag.index)}
                  onKeyDown={(event) => onTagKeyDown(event, tag.index)}
                  onFocus={() => roving.setActiveIndex(tag.index)}
                >
                  {canRemove && (
                    <span
                      className="ui-input-tags-remove"
                      aria-hidden="true"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={(event) => {
                        event.stopPropagation();
                        const restants = removeAt(tag.index);
                        if (restants === 0) focusInput();
                        else if (restants !== undefined)
                          focusTag(Math.min(tag.index, restants - 1));
                      }}
                    >
                      <UiIcon name="xmark" size="sm" />
                    </span>
                  )}
                </UiChip>
              ),
            )}
          </div>

          {/*
            eslint-disable-next-line jsx-a11y/aria-activedescendant-has-tabindex --
            `<input>` natif, focalisable : la règle ne sait pas évaluer `tabIndex ?? 0`
            ni le `role` conditionnel.
          */}
          <input
            ref={attacherInput}
            id={field.inputId}
            name={name}
            type="text"
            className={cx('ui-input-tags-input', small && '_small')}
            autoComplete="off"
            value={inputText}
            placeholder={effectivePlaceholder}
            disabled={disabled}
            readOnly={readOnly || isFull}
            maxLength={maxLength}
            tabIndex={tabIndex ?? 0}
            role={typeahead ? 'combobox' : undefined}
            aria-autocomplete={typeahead ? 'list' : undefined}
            aria-haspopup={typeahead ? 'listbox' : undefined}
            aria-expanded={typeahead ? open : undefined}
            aria-controls={typeahead && open ? panelListId : undefined}
            aria-activedescendant={activeDescendant}
            aria-describedby={field.describedBy}
            aria-invalid={field.ariaInvalid}
            onChange={onInputChange}
            onKeyDown={onInputKeyDown}
            onPaste={onPaste}
            onFocus={(event) => {
              if (disabled) return;
              roving.setActiveIndex(-1);
              if (typeahead && !queryDirty.current && completeOnFocus) runSearch(inputText);
              onFocus?.(event);
            }}
            onBlur={onInputBlur}
          />
        </div>
      </UiField>

      {typeahead && (
        <div
          ref={setPanel}
          // Fermé tant que la position n'est pas calculée, `computePosition` étant
          // asynchrone. Lu par `utils.overlay-motion`.
          data-unpositioned={position.isPositioned ? undefined : ''}
          popover="manual"
          className={cx('ui-input-tags-panel', panelClassName)}
          style={position.panelStyle as CSSProperties}
        >
          <div
            className={cx('ui-input-tags-scroller', small && '_small')}
            style={scrollHeight ? { maxHeight: scrollHeight } : undefined}
          >
            <ul className="ui-input-tags-list" role="listbox" id={panelListId}>
              {visibleRows.map(renderRow)}
              {!visibleRows.length && (
                <li className="ui-input-tags-empty" role="presentation">
                  {emptyMessage}
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
