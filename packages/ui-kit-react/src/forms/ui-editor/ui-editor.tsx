'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ClipboardEvent,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
} from 'react';

import { UiButton } from '../../actions/ui-button';
import {
  joinIds,
  useControllableState,
  useUiField,
  type UiFieldSharedProps,
} from '../../core/forms';
import { cx } from '../../core/utils';
import { UiField } from '../ui-field';
import { UiSelect } from '../ui-select';
import { UiSwatchPicker, type UiSwatch } from '../ui-swatch-picker';

import {
  applyCommand,
  applyFontFamily,
  applyFontSize,
  applyHighlightColor,
  applyLink,
  applyTextColor,
  clearFormatMarkers,
  clearMarkerClass,
  convertColorMarkers,
  convertFontMarkers,
  convertHighlightMarkers,
  convertSizeMarkers,
  DEFAULT_EDITOR_TOOLS,
  EDITOR_COLORS,
  EDITOR_FONTS,
  EDITOR_HIGHLIGHTS,
  EDITOR_SELECT_TOOLS,
  EDITOR_SIZES,
  EDITOR_TOOL_META,
  emptyEditorState,
  htmlToText,
  insertHtml,
  insertText,
  isEmptyHtml,
  normalizeHtml,
  readEditorState,
  readFontFamily,
  readFontSize,
  readHighlightColor,
  readTextColor,
  removeLink,
  resolveFontLabel,
  scrubInPlace,
  toggleCodeBlock,
  type EditorButtonTool,
  type EditorFont,
  type EditorSelectTool,
  type EditorSize,
  type EditorState,
  type EditorTool,
} from './ui-editor-commands';
import { htmlToNodes, sanitizeHtml } from './ui-editor-sanitize';

import './ui-editor.scss';

/** Place de la barre d'outils par rapport à la zone de saisie. */
export type EditorToolbarPosition = 'top' | 'bottom';

/** Raccourci clavier → outil. Le navigateur les applique seul ; on relit l'état. */
const SHORTCUTS: Record<string, EditorTool> = { b: 'bold', i: 'italic', u: 'underline' };

type NativeProps = Omit<
  ComponentPropsWithRef<'div'>,
  | 'defaultValue'
  | 'onChange'
  | 'children'
  | 'onInput'
  | 'onBeforeInput'
  | 'onPaste'
  | 'onKeyDown'
  | 'onKeyUp'
  | 'onMouseUp'
  | 'contentEditable'
  | 'role'
  | 'placeholder'
  | 'ref'
>;

export interface UiEditorProps extends UiFieldSharedProps, NativeProps {
  /** Valeur HTML imposée. Renseignée, l'éditeur est **contrôlé**. */
  value?: string;
  /** Valeur de départ quand l'éditeur est non contrôlé. */
  defaultValue?: string;
  /** Notifié à chaque modification, avec le nouveau HTML. */
  onValueChange?: (value: string) => void;
  /**
   * Outils de la barre, dans l'ordre (`separator` trace un séparateur). Une
   * liste vide ou absente rend le jeu par défaut.
   */
  tools?: readonly EditorTool[];
  /** Texte indicatif tant que l'éditeur est vide. */
  placeholder?: string;
  /** Hauteur minimale de la zone de saisie, en lignes de texte. */
  minRows?: number;
  /** Nombre maximal de caractères de **texte** (le balisage ne compte pas). */
  maxLength?: number;
  /** Affiche un compteur de caractères sous le champ. */
  showCount?: boolean;
  toolbarPosition?: EditorToolbarPosition;
  /** Notifié quand la mise en forme sous le curseur change. */
  onSelectionChange?: (state: EditorState) => void;
  /** Ref de la zone de saisie, pour la focaliser. */
  ref?: Ref<HTMLDivElement>;
}

const noSubscribe = () => () => {};

/**
 * Les noms réels des familles, lus sur les jetons. Une chaîne et non un
 * tableau : `useSyncExternalStore` compare ses instantanés par identité.
 */
function readFontLabels(): string {
  return EDITOR_FONTS.map((f) => resolveFontLabel(f.cssVar, f.label)).join('|');
}
const serverFontLabels = () => EDITOR_FONTS.map((f) => f.label).join('|');

/**
 * ui-editor : champ de texte riche, bâti sur la coquille `ui-field` en mode
 * multiligne, une zone `contenteditable` et sa barre d'outils.
 *
 * Aucun moteur tiers : les commandes de mise en forme vivent dans
 * `ui-editor-commands`, le seul endroit qui touche l'API d'édition historique.
 * La valeur est une chaîne HTML, nettoyée à l'entrée par `sanitizeHtml` (le
 * portage du `DomSanitizer` d'Angular) et ramenée à une petite liste de balises
 * au collage.
 *
 * La zone possède son propre DOM pendant la frappe : la valeur n'y est donc
 * jamais rendue par React, ce qui effondrerait le curseur à chaque touche. Le DOM
 * n'est réécrit que quand la valeur change de l'extérieur, et par des nœuds, pas
 * par `innerHTML`.
 */
export function UiEditor({
  value,
  defaultValue = '',
  onValueChange,
  tools: toolsProp,
  placeholder,
  minRows = 4,
  maxLength,
  showCount = false,
  toolbarPosition = 'top',
  onSelectionChange,
  // --- Props partagées de la coquille ---
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
  tabIndex,
  ref,
  ...rest
}: UiEditorProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const [html, setHtml] = useControllableState<string>({
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

  const tools = toolsProp?.length ? toolsProp : DEFAULT_EDITOR_TOOLS;
  const isEditable = !disabled && !readOnly;

  // --- État sous le curseur ----------------------------------------------------
  const [state, setState] = useState<EditorState>(emptyEditorState);
  const stateRef = useRef(state);
  const [currentFont, setCurrentFont] = useState<EditorFont | null>(null);
  const [currentSize, setCurrentSize] = useState<EditorSize | null>(null);
  const [currentTextColor, setCurrentTextColor] = useState<string | null>(null);
  const [currentHighlight, setCurrentHighlight] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState(0);
  const [textColorOpen, setTextColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);

  /**
   * Dernier HTML écrit par l'éditeur lui-même. Une valeur qui revient égale
   * n'est que l'écho de notre propre saisie : réécrire le DOM effondrerait le
   * curseur en pleine frappe.
   */
  const lastEmitted = useRef<string | null>(null);

  /**
   * Dernière sélection vue dans la zone. Les boutons annulent leur `mousedown`
   * et ne prennent jamais le focus, mais une liste déroulante et un nuancier le
   * prennent, et un `contenteditable` perd sa sélection avec lui.
   */
  const savedRange = useRef<Range | null>(null);

  const fontLabels = useSyncExternalStore(noSubscribe, readFontLabels, serverFontLabels);
  const fonts = useMemo(() => {
    const labels = fontLabels.split('|');
    return EDITOR_FONTS.map((f, i) => ({ ...f, label: labels[i] || f.label }));
  }, [fontLabels]);

  // --- Valeur → DOM, seulement quand elle vient de l'extérieur ------------------
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (html === lastEmitted.current) return;
    const safe = sanitizeHtml(html);
    if (el.innerHTML !== safe) el.replaceChildren(...htmlToNodes(safe));
    lastEmitted.current = html;
  }, [html]);

  const charCount = useMemo(() => htmlToText(sanitizeHtml(html)).length, [html]);
  const overLimit = maxLength != null && charCount > maxLength;
  const showPlaceholder = !!placeholder && !(floatLabel && label) && charCount === 0;

  // --- Sélection ----------------------------------------------------------------
  const rememberSelection = useCallback(() => {
    const el = contentRef.current;
    const selection = document.getSelection();
    if (!el || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (el.contains(range.commonAncestorContainer)) savedRange.current = range.cloneRange();
  }, []);

  const restoreSelection = () => {
    contentRef.current?.focus();
    const range = savedRange.current;
    if (!range) return;
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const refreshState = () => {
    rememberSelection();
    const anchor = document.getSelection()?.anchorNode ?? null;
    setCurrentFont(readFontFamily(anchor));
    setCurrentSize(readFontSize(anchor));
    setCurrentTextColor(readTextColor(anchor));
    setCurrentHighlight(readHighlightColor(anchor));

    const next = readEditorState();
    const prev = stateRef.current;
    if ((Object.keys(next) as (keyof EditorState)[]).every((k) => next[k] === prev[k])) return;
    stateRef.current = next;
    setState(next);
    onSelectionChange?.(next);
  };

  // --- Saisie -------------------------------------------------------------------
  /** La seule source de la valeur, de la vue vers l'appelant. */
  const onInput = () => {
    const el = contentRef.current;
    if (!el) return;
    const next = isEmptyHtml(el.innerHTML) ? '' : el.innerHTML;
    lastEmitted.current = next;
    setHtml(next);
    refreshState();
  };

  // `maxLength` porte sur le texte, pas sur le balisage. Suppressions et mise en
  // forme restent possibles une fois la limite atteinte : seules les intentions
  // d'insertion sont annulées. Écouteur natif : le `onBeforeInput` de React est
  // une émulation sans `inputType`.
  useEffect(() => {
    const el = contentRef.current;
    if (!el || maxLength == null) return;
    const onBeforeInput = (event: InputEvent) => {
      if (!event.inputType.startsWith('insert')) return;
      const selection = document.getSelection();
      const replaced = selection && !selection.isCollapsed ? selection.toString().length : 0;
      const incoming = event.data?.length ?? 1;
      if (htmlToText(el.innerHTML).length - replaced + incoming > maxLength) event.preventDefault();
    };
    el.addEventListener('beforeinput', onBeforeInput);
    return () => el.removeEventListener('beforeinput', onBeforeInput);
  }, [maxLength]);

  /** Le collage est ramené à la liste de balises de l'éditeur. */
  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (!isEditable) return;
    event.preventDefault();
    const clipboard = event.clipboardData;
    const pasted = clipboard.getData('text/html');
    if (pasted) {
      insertHtml(sanitizeHtml(normalizeHtml(pasted)));
      // `insertHTML` redécore ce qu'il insère : on le nettoie en place, nœud par
      // nœud, pour ne pas perdre le curseur.
      if (contentRef.current) scrubInPlace(contentRef.current);
    } else {
      insertText(clipboard.getData('text/plain'));
    }
    onInput();
  };

  /** Ctrl/Cmd+B/I/U : le navigateur applique, on relit l'état. */
  const onContentKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    if (!SHORTCUTS[event.key.toLowerCase()]) return;
    queueMicrotask(refreshState);
  };

  // --- Barre d'outils ---------------------------------------------------------
  const toolbar = tools.map((tool, index) => {
    const isSeparator = tool === 'separator';
    const select = EDITOR_SELECT_TOOLS.includes(tool as EditorSelectTool)
      ? (tool as EditorSelectTool)
      : null;
    const buttonTool = isSeparator || select ? null : (tool as EditorButtonTool);
    return { tool, index, isSeparator, select, buttonTool };
  });
  const hasToolbar = tools.some((t) => t !== 'separator');
  const actionable = toolbar.filter((entry) => !entry.isSeparator);
  const tabStop = !actionable.length
    ? -1
    : actionable.some((entry) => entry.index === activeTool)
      ? activeTool
      : actionable[0]!.index;

  const clearFormat = () => {
    applyCommand('clearFormat');
    const el = contentRef.current;
    const selection = document.getSelection();
    if (!el || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    clearFormatMarkers(el, range);
  };

  /** Premier jet du lien : l'invite native, comme la version Angular. */
  const promptForLink = () => {
    const href = window.prompt('Adresse du lien (laisser vide pour retirer le lien)');
    if (href === null) return;
    if (href.trim() === '') removeLink();
    else applyLink(href.trim());
  };

  const runTool = (tool: EditorButtonTool, index: number) => {
    if (!isEditable) return;
    setActiveTool(index);
    contentRef.current?.focus();
    if (tool === 'link') promptForLink();
    else if (tool === 'codeBlock') toggleCodeBlock();
    else if (tool === 'clearFormat') clearFormat();
    else if (tool !== 'textColor' && tool !== 'highlightColor') applyCommand(tool);
    onInput();
  };

  /** Couleur de texte choisie : le nuancier a pris le focus, on rend le curseur d'abord. */
  const onTextColorSelect = (swatch: UiSwatch | null) => {
    if (!isEditable) return;
    restoreSelection();
    const el = contentRef.current;
    if (swatch) {
      applyTextColor();
      if (el) convertColorMarkers(el, `ui-editor-color-${swatch.key}`);
    } else if (el && savedRange.current) {
      for (const color of EDITOR_COLORS) clearMarkerClass(el, savedRange.current, color.className);
    }
    onInput();
  };

  const onHighlightSelect = (swatch: UiSwatch | null) => {
    if (!isEditable) return;
    restoreSelection();
    const el = contentRef.current;
    if (swatch) {
      applyHighlightColor();
      if (el) convertHighlightMarkers(el, `ui-editor-highlight-${swatch.key}`);
    } else if (el && savedRange.current) {
      for (const color of EDITOR_HIGHLIGHTS)
        clearMarkerClass(el, savedRange.current, color.className);
    }
    onInput();
  };

  const selectOptions = (tool: EditorSelectTool) =>
    tool === 'fontFamily'
      ? fonts.map((font) => ({ value: font.key, label: font.label }))
      : EDITOR_SIZES.map((s) => ({ value: s.key, label: s.label }));

  /**
   * Valeur affichée d'une liste. Sans classe posée, le texte est bel et bien
   * rendu dans la famille de base à la taille normale : le dire est un fait.
   */
  const selectValue = (tool: EditorSelectTool) =>
    tool === 'fontFamily' ? (currentFont ?? 'base') : (currentSize ?? 'default');

  const selectLabel = (tool: EditorSelectTool) =>
    tool === 'fontFamily' ? 'Police' : 'Taille du texte';

  const onSelectValueChange = (tool: EditorSelectTool, next: unknown, index: number) => {
    setActiveTool(index);
    if (!isEditable || next == null) return;
    restoreSelection();
    const el = contentRef.current;
    if (tool === 'fontFamily') {
      const choice = fonts.find((f) => f.key === next);
      if (!choice) return;
      applyFontFamily();
      if (el) convertFontMarkers(el, choice.className);
    } else {
      const choice = EDITOR_SIZES.find((s) => s.key === next);
      if (!choice) return;
      applyFontSize();
      if (el) convertSizeMarkers(el, choice.className);
    }
    onInput();
  };

  /**
   * Le focus va sur le contrôle qui porte l'arrêt de tabulation. Cherché dans la
   * barre vivante, dans l'ordre du DOM qui est l'ordre visuel : une liste
   * déroulante y est une enveloppe, son déclencheur un `<button>`.
   */
  const focusTool = (index: number) => {
    const position = actionable.findIndex((entry) => entry.index === index);
    const tool = toolbarRef.current?.querySelectorAll<HTMLElement>('.ui-editor-tool')[position];
    const control = tool?.matches('button') ? tool : tool?.querySelector<HTMLElement>('button');
    control?.focus();
  };

  /** Tabindex glissant : la barre est un arrêt de tabulation, les flèches s'y déplacent. */
  const onToolbarKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Une liste ouverte a déjà traité sa touche (Début, Fin, Échap) : elle est à elle.
    if (event.defaultPrevented) return;
    const indexes = actionable.map((entry) => entry.index);
    if (!indexes.length) return;
    const current = Math.max(0, indexes.indexOf(tabStop));

    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = indexes[(current + 1) % indexes.length]!;
        break;
      case 'ArrowLeft':
        next = indexes[(current - 1 + indexes.length) % indexes.length]!;
        break;
      case 'Home':
        next = indexes[0]!;
        break;
      case 'End':
        next = indexes[indexes.length - 1]!;
        break;
      case 'Escape':
        event.preventDefault();
        contentRef.current?.focus();
        return;
      default:
        return;
    }
    event.preventDefault();
    setActiveTool(next);
    focusTool(next);
  };

  /** Les boutons gardent le curseur dans la zone : leur `mousedown` est annulé. */
  const onToolbarMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const colorIndicator = (tool: EditorButtonTool): CSSProperties | undefined => {
    const key =
      tool === 'textColor' ? currentTextColor : tool === 'highlightColor' ? currentHighlight : null;
    const table = tool === 'textColor' ? EDITOR_COLORS : EDITOR_HIGHLIGHTS;
    const swatch = key ? table.find((c) => c.key === key) : undefined;
    return swatch
      ? ({ '--ui-editor-swatch-indicator-color': `var(${swatch.cssVar})` } as CSSProperties)
      : undefined;
  };

  const renderTool = (entry: (typeof toolbar)[number]) => {
    const { index } = entry;
    const toolTabIndex = index === tabStop ? 0 : -1;

    if (entry.isSeparator) {
      return <span key={index} className="ui-editor-toolbar-separator" aria-hidden="true" />;
    }

    if (entry.select) {
      const select = entry.select;
      return (
        <UiSelect
          key={index}
          className="ui-editor-tool ui-editor-select"
          size="small"
          options={selectOptions(select)}
          optionLabel="label"
          optionValue="value"
          value={selectValue(select)}
          aria-label={selectLabel(select)}
          disabled={!isEditable}
          tabIndex={toolTabIndex}
          onValueChange={(next) => onSelectValueChange(select, next, index)}
        />
      );
    }

    const tool = entry.buttonTool!;
    const meta = EDITOR_TOOL_META[tool];
    const common = {
      className: cx(
        'ui-editor-tool',
        (tool === 'textColor' || tool === 'highlightColor') && '_colorTool',
      ),
      variant: 'ghost' as const,
      level: 'low' as const,
      size: 'small' as const,
      iconOnly: true,
      icon: meta.icon,
      'aria-label': meta.label,
      disabled: !isEditable,
      tabIndex: toolTabIndex,
    };

    if (tool === 'textColor' || tool === 'highlightColor') {
      const isText = tool === 'textColor';
      return (
        <UiSwatchPicker
          key={index}
          popup
          size="small"
          allowClear
          value={isText ? currentTextColor : currentHighlight}
          aria-label={meta.label}
          open={isText ? textColorOpen : highlightOpen}
          onOpenChange={isText ? setTextColorOpen : setHighlightOpen}
          onSwatchSelect={isText ? onTextColorSelect : onHighlightSelect}
          trigger={(trigger) => (
            <UiButton
              {...common}
              {...trigger}
              style={colorIndicator(tool)}
              onClick={() => {
                setActiveTool(index);
                rememberSelection();
                trigger.onClick();
              }}
            />
          )}
        />
      );
    }

    const pressed = tool in state ? state[tool as keyof EditorState] : undefined;
    return (
      <UiButton
        key={index}
        {...common}
        aria-pressed={pressed}
        onClick={() => runTool(tool, index)}
      />
    );
  };

  const toolbarNode = hasToolbar ? (
    // Motif toolbar de l'ARIA : le clavier est délégué au conteneur, le focus vit
    // sur les outils (tabindex glissant), comme dans `ui-menu`.
    <div
      ref={toolbarRef}
      className={cx('ui-editor-toolbar', toolbarPosition === 'bottom' && '_bottom')}
      role="toolbar"
      aria-label="Mise en forme"
      aria-orientation="horizontal"
      onMouseDown={onToolbarMouseDown}
      onKeyDown={onToolbarKeyDown}
    >
      {toolbar.map(renderTool)}
    </div>
  ) : null;

  const countId = `${field.inputId}-count`;
  const describedBy = joinIds(field.describedBy, showCount && countId);

  return (
    <UiField
      className={className}
      label={label}
      htmlFor={field.inputId}
      required={required}
      size={size}
      level={field.level}
      floatLabel={floatLabel}
      filled={charCount > 0}
      disabled={disabled}
      readOnly={readOnly}
      multiline
      message={field.message}
      messageId={field.messageId}
      showMessageIcon={showMessageIcon}
      messageIcon={messageIcon}
      footer={
        showCount ? (
          <span
            id={countId}
            className={cx(
              'ui-editor-count',
              size === 'small' && '_small',
              disabled && '_disabled',
              overLimit && '_over',
            )}
          >
            {charCount}
            {maxLength != null && ` / ${maxLength}`}
          </span>
        ) : undefined
      }
    >
      <div
        className={cx('ui-editor', size === 'small' && '_small')}
        style={{ '--_rows': minRows } as CSSProperties}
      >
        {toolbarPosition === 'top' && toolbarNode}

        <div className="ui-editor-area">
          <div
            {...rest}
            ref={(node) => {
              contentRef.current = node;
              if (typeof ref === 'function') ref(node);
              else if (ref) ref.current = node;
            }}
            className={cx('ui-editor-content', size === 'small' && '_small')}
            id={field.inputId}
            role="textbox"
            aria-multiline="true"
            contentEditable={isEditable}
            tabIndex={disabled ? -1 : (tabIndex ?? 0)}
            // `<label for>` n'étiquette que les éléments étiquetables, et une
            // `<div>` éditable n'en est pas un : le libellé devient le nom.
            aria-label={rest['aria-label'] || label || undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            aria-readonly={readOnly || undefined}
            aria-disabled={disabled || undefined}
            aria-invalid={field.ariaInvalid}
            onInput={onInput}
            onPaste={onPaste}
            onKeyDown={onContentKeyDown}
            onKeyUp={refreshState}
            onMouseUp={refreshState}
          />

          {showPlaceholder && (
            <span className="ui-editor-placeholder" aria-hidden="true">
              {placeholder}
            </span>
          )}
        </div>

        {toolbarPosition === 'bottom' && toolbarNode}
      </div>
    </UiField>
  );
}
