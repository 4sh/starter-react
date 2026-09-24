'use client';

import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
} from 'react';

import { UiIcon } from '../../base/ui-icon';
import { focusableWithin } from '../../core/focus';
import { useControllableState } from '../../core/forms';
import { cx, getFieldPath } from '../../core/utils';
import { UiCheckbox } from '../../forms/ui-checkbox';
import { UiRadio } from '../../forms/ui-radio';
import { UiEmptyState } from '../../informative/ui-empty-state';
import { UiSpinner } from '../../informative/ui-spinner';
import { UiPaginator, type UiPaginatorPageEvent } from '../ui-paginator';

import './ui-table.scss';

/** Densité des cellules. */
export type TableSize = 'default' | 'small' | 'large';
/** Comportement de sélection. `null` : pas de sélection. */
export type TableSelectionMode = 'single' | 'multiple' | null;
/** Une colonne à la fois, ou plusieurs avec Ctrl et Cmd. */
export type TableSortMode = 'single' | 'multiple';
/** Bord auquel une colonne figée se colle. */
export type TableFrozenAlign = 'left' | 'right';

/** Un couple (champ, direction) d'un tri multiple. */
export interface UiTableSortMeta {
  field: string;
  /** 1 croissant, -1 décroissant. */
  order: number;
}

/** État de tri, quel que soit le mode. */
export interface UiTableSortState {
  /** Mode simple : champ trié. */
  field?: string;
  /** Mode simple : 1 croissant, -1 décroissant. */
  order?: number;
  /** Mode multiple : tris composés, dans l'ordre de priorité. */
  multi?: UiTableSortMeta[];
}

/** Charge passée à `onSortChange`, et à `onSortFunction` en tri délégué. */
export interface UiTableSortChangeEvent {
  mode: TableSortMode;
  field?: string;
  order?: number;
  multiSortMeta?: UiTableSortMeta[];
}

/** Charge passée à `onSortFunction` : à trier par l'appelant. */
export interface UiTableSortEvent<T = unknown> extends UiTableSortChangeEvent {
  /** Les données à trier. */
  data: T[];
}

/** Charge passée à `onRowSelect` et `onRowUnselect`. */
export interface UiTableRowSelectEvent<T = unknown> {
  originalEvent?: SyntheticEvent;
  data: T;
  index?: number;
  /** L'interaction qui a provoqué le changement. */
  type: 'row' | 'checkbox' | 'radio';
}

/** Charge passée à `onHeaderCheckboxToggle`. */
export interface UiTableHeaderCheckboxToggleEvent {
  originalEvent?: SyntheticEvent;
  checked: boolean;
}

/** Charge passée à `onPageChange`, identique à celle de `ui-paginator`. */
export type UiTablePageEvent = UiPaginatorPageEvent;

/** Charge passée à `onRowReorder`. */
export interface UiTableRowReorderEvent<T = unknown> {
  dragIndex: number;
  dropIndex: number;
  /** Copie réordonnée de `value`, à rebrancher sur le tableau. */
  value: T[];
}

/** Charge passée à `onLazyLoad`, en défilement virtuel paresseux. */
export interface UiTableLazyLoadEvent {
  /** Index de la première ligne rendue. */
  first: number;
  /** Index juste après la dernière ligne rendue. */
  last: number;
}

/** Charge passée à `onRowExpand` et `onRowCollapse`. */
export interface UiTableRowExpandEvent<T = unknown> {
  originalEvent?: SyntheticEvent;
  data: T;
}

/** Charge passée à `onColResize`. */
export interface UiTableColResizeEvent {
  /** La cellule d'en-tête redimensionnée. */
  element: HTMLElement;
  /** Écart horizontal appliqué, en pixels. */
  delta: number;
}

/** Props à reverser sur un `<th>` triable. */
export interface UiTableSortableColumnProps {
  className: string;
  role: 'columnheader';
  tabIndex?: number;
  'aria-sort': 'none' | 'ascending' | 'descending';
  onClick: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/** Props à reverser sur un `<tr>` sélectionnable. */
export interface UiTableSelectableRowProps {
  className: string;
  tabIndex?: number;
  'aria-selected': boolean;
  ref: (node: HTMLTableRowElement | null) => void;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/** Props à reverser sur le bouton de dépliage d'une ligne. */
export interface UiTableRowTogglerProps {
  'aria-expanded': boolean;
  onClick: (event: MouseEvent<HTMLElement>) => void;
}

/** Props à reverser sur un `<tr>` déplaçable. */
export interface UiTableReorderableRowProps {
  className: string;
  draggable: true;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
}

/**
 * Ce que le tableau met à disposition du balisage projeté : des **fabriques de
 * props**, à reverser sur les éléments que l'appelant rend lui-même. Pas des
 * crochets, à dessein : une ligne se rend dans une boucle, où un crochet est interdit.
 */
export interface UiTableApi<T = unknown> {
  /** Rend un `<th>` triable : clic, clavier, et `aria-sort`. */
  sortableColumn: (field: string, options?: { disabled?: boolean }) => UiTableSortableColumnProps;
  /** Rend un `<tr>` sélectionnable : clic, clavier, focus glissant. */
  selectableRow: (
    data: T,
    index: number,
    options?: { disabled?: boolean },
  ) => UiTableSelectableRowProps;
  /** Rend un bouton qui déplie une ligne. */
  rowToggler: (data: T) => UiTableRowTogglerProps;
  /** Rend un `<tr>` déplaçable par glisser-déposer. */
  reorderableRow: (index: number) => UiTableReorderableRowProps;
  /**
   * Fige une colonne. À poser sur **chaque** cellule de la colonne, en-tête
   * comprise : les décalages sont calculés par le tableau, qui voit toute la
   * ligne.
   */
  frozenColumn: (options?: { align?: TableFrozenAlign; frozen?: boolean }) => {
    className: string;
  };
  /** Marque un `<th>` redimensionnable. Y placer un `<UiTableColumnResizer />`. */
  resizableColumn: () => { className: string };

  /** Direction de tri d'une colonne : 1, -1, ou 0 quand elle n'est pas triée. */
  getSortOrder: (field: string) => number;
  isSelected: (row: T) => boolean;
  isRowExpanded: (row: T) => boolean;
  /** Bascule le dépliage d'une ligne. */
  toggleRow: (row: T, event?: SyntheticEvent) => void;
}

/** Contexte d'une ligne, passé à `renderBody` et `renderExpandedRow`. */
export interface UiTableBodyContext<T = unknown> {
  row: T;
  /** Index absolu dans le jeu de données trié. */
  rowIndex: number;
  /** Position paire dans la page rendue, pour un zébrage manuel. */
  even: boolean;
  selected: boolean;
  expanded: boolean;
  /** Vrai quand la ligne vient de `frozenValue`. */
  frozen: boolean;
  /** Les fabriques de props du tableau. */
  table: UiTableApi<T>;
}

/** Comparaison sûre pour null, et sensible à la locale sur les chaînes. */
function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
  const left = a as number;
  const right = b as number;
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Largeur minimale d'une colonne redimensionnée, en pixels. */
const COLUMN_MIN_WIDTH = 64;

/** Lignes rendues de part et d'autre de la fenêtre visible. */
const VIRTUAL_BUFFER = 5;

/** Avertissements déjà émis, pour rester idempotent sous `<StrictMode>`. */
const warned = new Set<string>();

function warnOnce(key: string, message: string): void {
  if (process.env.NODE_ENV === 'production' || warned.has(key)) return;
  warned.add(key);
  console.warn(message);
}

const UiTableContext = createContext<UiTableApi<never> | null>(null);

/**
 * Accès au tableau depuis un composant rendu dans son balisage.
 *
 * Sert aux parties (`UiTableSortIcon`, `UiTableCheckbox`…). Le balisage
 * projeté, lui, reçoit la même API en argument de `renderHeader` et
 * `renderBody`, ce qui évite d'appeler un crochet dans une boucle de lignes.
 */
export function useUiTable<T = unknown>(): UiTableApi<T> {
  const api = useContext(UiTableContext);
  if (!api) {
    throw new Error('[ui-table] Cette partie doit être rendue dans le balisage d’un `<UiTable>`.');
  }
  return api as UiTableApi<T>;
}

type NativeProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'>;

export interface UiTableProps<T = unknown> extends NativeProps {
  /** Lignes à afficher. */
  value?: readonly T[];
  /**
   * Champ identifiant une ligne, en notation pointée. Requis pour le
   * dépliage, recommandé pour la sélection.
   */
  dataKey?: string;
  size?: TableSize;
  /** Traits de séparation entre les cellules. */
  showGridlines?: boolean;
  /** Fond alterné une ligne sur deux. */
  stripedRows?: boolean;
  /** Surligner la ligne survolée. Implicite dès qu'une sélection est active. */
  rowHover?: boolean;
  /** Styles posés sur le `<table>` interne, par exemple une largeur minimale. */
  tableStyle?: CSSProperties;

  // --- Sélection ---------------------------------------------------------
  selectionMode?: TableSelectionMode;
  /** Ligne ou lignes sélectionnées. Renseignée, la sélection est contrôlée. */
  selection?: T | T[] | null;
  defaultSelection?: T | T[] | null;
  onSelectionChange?: (selection: T | T[] | null) => void;
  /** Sélection à la façon d'un bureau : clic remplace, Ctrl bascule, Maj étend. */
  metaKeySelection?: boolean;

  // --- Tri ---------------------------------------------------------------
  sortMode?: TableSortMode;
  /** État de tri. Renseigné, le tri est contrôlé. */
  sort?: UiTableSortState;
  defaultSort?: UiTableSortState;
  onSortChange?: (event: UiTableSortChangeEvent) => void;
  /** Direction appliquée quand une colonne devient triée. */
  defaultSortOrder?: number;
  /** Délègue le tri : le tableau ne trie plus et appelle `onSortFunction`. */
  customSort?: boolean;
  onSortFunction?: (event: UiTableSortEvent<T>) => void;

  // --- Pagination --------------------------------------------------------
  paginator?: boolean;
  /** Lignes par page. Renseignée, la valeur est contrôlée. */
  rows?: number;
  defaultRows?: number;
  onRowsChange?: (rows: number) => void;
  /** Index de la première ligne affichée. Renseigné, la position est contrôlée. */
  first?: number;
  defaultFirst?: number;
  onFirstChange?: (first: number) => void;
  rowsPerPageOptions?: readonly number[];
  pageLinks?: number;
  /** Total côté serveur, en mode `lazy`. Ignoré sinon. */
  totalRecords?: number;
  onPageChange?: (event: UiTablePageEvent) => void;

  // --- Défilement --------------------------------------------------------
  /** Coquille défilante, en-tête collée dans le viewport. */
  scrollable?: boolean;
  /** Hauteur du viewport : une taille CSS, ou `flex` pour remplir le parent. */
  scrollHeight?: string;

  /** Lignes épinglées au-dessus du corps pendant le défilement. */
  frozenValue?: readonly T[];

  // --- Dépliage ----------------------------------------------------------
  /** Lignes dépliées, indexées par la valeur de `dataKey`. */
  expandedRowKeys?: Record<string, boolean>;
  defaultExpandedRowKeys?: Record<string, boolean>;
  onExpandedRowKeysChange?: (keys: Record<string, boolean>) => void;
  onRowExpand?: (event: UiTableRowExpandEvent<T>) => void;
  onRowCollapse?: (event: UiTableRowExpandEvent<T>) => void;

  /** Colonnes redimensionnables : la colonne suivante absorbe l'écart. */
  resizableColumns?: boolean;
  onColResize?: (event: UiTableColResizeEvent) => void;

  /** Voile et attente au-dessus du tableau pendant un chargement. */
  loading?: boolean;
  loadingAriaLabel?: string;

  emptyMessage?: string;
  emptyIcon?: string;

  /** Ne rend que les lignes visibles. Exige `scrollable` et un `scrollHeight` fixe. */
  virtualScroll?: boolean;
  /** Hauteur d'une ligne, en pixels. À appliquer aussi au `<tr>` du corps. */
  virtualScrollItemSize?: number;
  onLazyLoad?: (event: UiTableLazyLoadEvent) => void;

  /**
   * Mode serveur : l'appelant possède le tri et la pagination. `value` est la
   * page chargée, et le tableau ne trie ni ne découpe plus rien.
   */
  lazy?: boolean;

  onRowSelect?: (event: UiTableRowSelectEvent<T>) => void;
  onRowUnselect?: (event: UiTableRowSelectEvent<T>) => void;
  onHeaderCheckboxToggle?: (event: UiTableHeaderCheckboxToggleEvent) => void;
  onRowReorder?: (event: UiTableRowReorderEvent<T>) => void;

  // --- Balisage projeté ---------------------------------------------------
  /** Contenu libre au-dessus du tableau. */
  renderCaption?: () => ReactNode;
  /** Le `<tr>` des cellules d'en-tête. */
  renderHeader?: (table: UiTableApi<T>) => ReactNode;
  /** Le `<tr>` d'une ligne. Reçoit la ligne et les fabriques de props. */
  renderBody?: (context: UiTableBodyContext<T>) => ReactNode;
  /** Le `<tr>` des cellules de pied. */
  renderFooter?: (table: UiTableApi<T>) => ReactNode;
  /** Un `<tr>` supplémentaire, rendu sous une ligne dépliée. */
  renderExpandedRow?: (context: UiTableBodyContext<T>) => ReactNode;
  /** Contenu de la cellule « aucune donnée ». */
  renderEmpty?: () => ReactNode;

  ref?: Ref<HTMLDivElement>;
}

/**
 * ui-table : tableau de données headless.
 *
 * L'appelant rend le **balisage** (`renderHeader`, `renderBody`, `renderFooter`) et y
 * attache les fabriques de props de {@link UiTableApi} et les parties (`UiTableCheckbox`…).
 * Le composant possède le **pipeline** (tri puis pagination, sauf en `lazy`), la
 * sélection, le dépliage, la coquille défilante et la barre de pagination.
 */
export function UiTable<T = unknown>({
  value = [],
  dataKey,
  size = 'default',
  showGridlines = false,
  stripedRows = false,
  rowHover = false,
  tableStyle,
  selectionMode = null,
  selection,
  defaultSelection = null,
  onSelectionChange,
  metaKeySelection = false,
  sortMode = 'single',
  sort,
  defaultSort,
  onSortChange,
  defaultSortOrder = 1,
  customSort = false,
  onSortFunction,
  paginator = false,
  rows,
  defaultRows = 10,
  onRowsChange,
  first,
  defaultFirst = 0,
  onFirstChange,
  rowsPerPageOptions,
  pageLinks = 5,
  totalRecords,
  onPageChange,
  scrollable = false,
  scrollHeight,
  frozenValue,
  expandedRowKeys,
  defaultExpandedRowKeys,
  onExpandedRowKeysChange,
  onRowExpand,
  onRowCollapse,
  resizableColumns = false,
  onColResize,
  loading = false,
  loadingAriaLabel = 'Chargement des données',
  emptyMessage = 'Aucune donnée à afficher',
  emptyIcon = 'inbox',
  virtualScroll = false,
  virtualScrollItemSize = 50,
  onLazyLoad,
  lazy = false,
  onRowSelect,
  onRowUnselect,
  onHeaderCheckboxToggle,
  onRowReorder,
  renderCaption,
  renderHeader,
  renderBody,
  renderFooter,
  renderExpandedRow,
  renderEmpty,
  className,
  ref,
  ...rest
}: UiTableProps<T>) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const theadRef = useRef<HTMLTableSectionElement | null>(null);

  const [selectionValue, setSelection] = useControllableState<T | T[] | null>({
    value: selection,
    defaultValue: defaultSelection,
    onChange: onSelectionChange,
  });
  const [expanded, setExpandedKeys] = useControllableState<Record<string, boolean>>({
    value: expandedRowKeys,
    defaultValue: defaultExpandedRowKeys ?? {},
    onChange: onExpandedRowKeysChange,
  });
  const [rowsValue, setRows] = useControllableState<number>({
    value: rows,
    defaultValue: defaultRows,
    onChange: onRowsChange,
  });
  const [firstValue, setFirst] = useControllableState<number>({
    value: first,
    defaultValue: defaultFirst,
    onChange: onFirstChange,
  });

  // Pas d'`onChange` : `onSortChange` est émis à la main, sa charge porte en plus le mode.
  const [sortValue, setSortState] = useControllableState<UiTableSortState>({
    value: sort,
    defaultValue: defaultSort ?? {},
  });

  /** Faits MESURÉS dans le DOM : nombre de colonnes, hauteur d'en-tête, viewport. */
  const [columnCount, setColumnCount] = useState(1);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  /**
   * La zone défilante a besoin d'un arrêt de tabulation, supposé d'emblée : avant
   * la mesure, axe refuserait une région défilante sans accès clavier.
   */
  const [wrapperNeedsFocus, setWrapperNeedsFocus] = useState(true);

  /** Index de la ligne en cours de glissement, et ancre de la sélection par plage. */
  const draggedRowIndex = useRef<number | null>(null);
  const anchorRowIndex = useRef<number | null>(null);
  /** Registre des lignes sélectionnables, pour Maj et les flèches. */
  const rowRefs = useRef(new Map<Element, { data: T; index: number }>());
  /** Bord de dépose visé, par index de ligne survolée. */
  const [dropTarget, setDropTarget] = useState<{ index: number; side: 'above' | 'below' } | null>(
    null,
  );

  // --- Avertissements de développement ------------------------------------
  useEffect(() => {
    if (Object.keys(expanded).length && !dataKey) {
      warnOnce(
        'expand-key',
        '[ui-table] `expandedRowKeys` exige `dataKey` pour identifier les lignes.',
      );
    }
    if (virtualScroll && (!scrollable || !scrollHeight || scrollHeight === 'flex')) {
      warnOnce(
        'virtual-scroll',
        '[ui-table] `virtualScroll` exige `scrollable` et un `scrollHeight` fixe.',
      );
    }
    if (totalRecords !== undefined && !lazy) {
      warnOnce('total-records', '[ui-table] `totalRecords` est ignoré sans `lazy`.');
    }
    if (lazy && paginator && totalRecords === undefined) {
      warnOnce(
        'lazy-total',
        '[ui-table] `lazy` avec `paginator` exige `totalRecords`, le total du serveur.',
      );
    }
  }, [expanded, dataKey, virtualScroll, scrollable, scrollHeight, totalRecords, lazy, paginator]);

  // --- Pipeline de données -------------------------------------------------
  const processedData = useMemo<readonly T[]>(() => {
    const data = value;
    // En mode serveur, l'ordre appartient à l'appelant.
    if (!data.length || customSort || lazy) return data;
    if (sortMode === 'single') {
      if (!sortValue.field) return data;
      const field = sortValue.field;
      const order = sortValue.order ?? 1;
      return [...data].sort(
        (a, b) => order * compareValues(getFieldPath(a, field), getFieldPath(b, field)),
      );
    }
    const metas = sortValue.multi ?? [];
    if (!metas.length) return data;
    return [...data].sort((a, b) => {
      for (const meta of metas) {
        const result =
          meta.order * compareValues(getFieldPath(a, meta.field), getFieldPath(b, meta.field));
        if (result !== 0) return result;
      }
      return 0;
    });
  }, [value, customSort, lazy, sortMode, sortValue]);

  const perPage = Math.max(1, rowsValue);
  const effectiveTotal = lazy ? (totalRecords ?? processedData.length) : processedData.length;
  const pageCount = Math.max(1, Math.ceil(effectiveTotal / perPage));
  const clampedFirst = Math.min(Math.max(0, firstValue), (pageCount - 1) * perPage);

  /**
   * Fenêtre du défilement virtuel, sans `core/virtual` : ses entrées en absolu
   * sortiraient de la mise en page du tableau. Deux lignes d'espacement la bordent.
   */
  const virtualRange = useMemo(() => {
    const total = processedData.length;
    if (!virtualScroll) return { start: 0, end: total };
    const itemSize = Math.max(1, virtualScrollItemSize);
    const start = Math.max(0, Math.floor(scrollTop / itemSize) - VIRTUAL_BUFFER);
    const visible = Math.ceil(Math.max(0, viewportHeight) / itemSize) + 2 * VIRTUAL_BUFFER;
    return { start, end: Math.min(total, start + visible) };
  }, [processedData.length, virtualScroll, virtualScrollItemSize, scrollTop, viewportHeight]);

  const virtualPadding = virtualScroll
    ? {
        top: virtualRange.start * Math.max(1, virtualScrollItemSize),
        bottom: (processedData.length - virtualRange.end) * Math.max(1, virtualScrollItemSize),
      }
    : { top: 0, bottom: 0 };

  const pageOffset = virtualScroll ? virtualRange.start : paginator ? clampedFirst : 0;

  const pageData = useMemo<readonly T[]>(() => {
    if (virtualScroll) return processedData.slice(virtualRange.start, virtualRange.end);
    // Pagination serveur : `value` EST la page, il ne faut pas la redécouper.
    if (!paginator || lazy) return processedData;
    return processedData.slice(clampedFirst, clampedFirst + perPage);
  }, [processedData, virtualScroll, virtualRange, paginator, lazy, clampedFirst, perPage]);

  // `onLazyLoad` est hors dépendances : recréé à chaque rendu, il émettrait en boucle.
  const lastRange = useRef<UiTableLazyLoadEvent | null>(null);
  useEffect(() => {
    if (!virtualScroll || !lazy) return;
    const range = { first: virtualRange.start, last: virtualRange.end };
    if (lastRange.current?.first === range.first && lastRange.current?.last === range.last) return;
    lastRange.current = range;
    onLazyLoad?.(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [virtualScroll, lazy, virtualRange.start, virtualRange.end]);

  // --- Faits mesurés dans le DOM ------------------------------------------
  /**
   * Un seul `ResizeObserver` pour tout ce qui se mesure. Il tire dès qu'on observe :
   * la mesure initiale vient de son rappel, sans `setState` synchrone dans l'effet.
   */
  useEffect(() => {
    const thead = theadRef.current;
    const table = tableRef.current;
    const wrapper = wrapperRef.current;

    const measure = () => {
      if (thead) {
        const cells = thead.querySelectorAll('th').length;
        if (cells > 0) setColumnCount(cells);
        const height = thead.getBoundingClientRect().height;
        setHeaderHeight(Math.floor(height));
        stackFrozenRows(thead, height);
      }
      if (table) positionFrozenColumns(table);
      if (wrapper) {
        setViewportHeight(wrapper.clientHeight);
        // `tabIndex` seulement si la région déborde sans rien de focalisable : sinon
        // le clavier atteint déjà son contenu.
        const overflows =
          wrapper.scrollHeight > wrapper.clientHeight || wrapper.scrollWidth > wrapper.clientWidth;
        setWrapperNeedsFocus(overflows && focusableWithin(wrapper).length === 0);
      }
    };

    if (typeof ResizeObserver === 'undefined') {
      measure();
      return;
    }
    const observer = new ResizeObserver(measure);
    if (thead) observer.observe(thead);
    if (table) observer.observe(table);
    if (wrapper) observer.observe(wrapper);
    return () => observer.disconnect();
    // Une fois par montage : reconnecté à chaque rendu, il perdrait son premier
    // rappel (asynchrone). Un changement de contenu change une taille, qu'il voit.
  }, []);

  const onWrapperScroll = useCallback(() => {
    if (!virtualScroll) return;
    const wrapper = wrapperRef.current;
    if (wrapper) setScrollTop(wrapper.scrollTop);
  }, [virtualScroll]);

  // --- Tri ------------------------------------------------------------------
  const getSortOrder = useCallback(
    (field: string): number => {
      if (sortMode === 'single') {
        return sortValue.field === field ? (sortValue.order ?? 1) : 0;
      }
      return (sortValue.multi ?? []).find((meta) => meta.field === field)?.order ?? 0;
    },
    [sortMode, sortValue],
  );

  const toggleColumnSort = useCallback(
    (field: string, event: SyntheticEvent) => {
      const step = defaultSortOrder || 1;
      let next: UiTableSortState;

      if (sortMode === 'single') {
        // Cycle croissant, décroissant, plus de tri.
        if (sortValue.field === field) {
          next = sortValue.order === step ? { field, order: -step } : {};
        } else {
          next = { field, order: step };
        }
      } else {
        const metas = [...(sortValue.multi ?? [])];
        const index = metas.findIndex((meta) => meta.field === field);
        const native = event.nativeEvent;
        const metaKey = native instanceof MouseEvent && (native.metaKey || native.ctrlKey);
        if (!metaKey) {
          // Clic simple : on repart d'un tri sur cette seule colonne.
          const existing = index >= 0 ? metas[index] : undefined;
          next = { multi: [{ field, order: existing ? -existing.order : step }] };
        } else if (index >= 0) {
          metas[index] = { field, order: -metas[index]!.order };
          next = { multi: metas };
        } else {
          next = { multi: [...metas, { field, order: step }] };
        }
      }

      setSortState(next);

      const payload: UiTableSortChangeEvent = {
        mode: sortMode,
        field: sortMode === 'single' ? next.field : undefined,
        order: sortMode === 'single' ? (next.order ?? 0) : undefined,
        multiSortMeta: sortMode === 'multiple' ? next.multi : undefined,
      };
      if (customSort) onSortFunction?.({ ...payload, data: [...value] });
      onSortChange?.(payload);
      // Un tri change l'ordre : rester à la page 5 n'aurait plus de sens.
      if (paginator) setFirst(0);
    },
    [
      defaultSortOrder,
      sortMode,
      sortValue,
      setSortState,
      customSort,
      onSortFunction,
      onSortChange,
      value,
      paginator,
      setFirst,
    ],
  );

  // --- Sélection ------------------------------------------------------------
  const rowEquals = useCallback(
    (a: T, b: T): boolean =>
      dataKey ? getFieldPath(a, dataKey) === getFieldPath(b, dataKey) : a === b,
    [dataKey],
  );

  const selectionArray = useMemo<readonly T[]>(() => {
    if (selectionValue == null) return [];
    return Array.isArray(selectionValue) ? selectionValue : [selectionValue];
  }, [selectionValue]);

  const isSelected = useCallback(
    (row: T): boolean => selectionArray.some((entry) => rowEquals(entry, row)),
    [selectionArray, rowEquals],
  );

  const allSelected =
    processedData.length > 0 &&
    processedData.every((row) => selectionArray.some((entry) => rowEquals(entry, row)));
  const partiallySelected = !allSelected && selectionArray.length > 0;

  /** Index d'une ligne dans `processedData`, page-local en pagination serveur. */
  const dataIndex = useCallback(
    (index: number): number => (lazy && paginator && !virtualScroll ? index - clampedFirst : index),
    [lazy, paginator, virtualScroll, clampedFirst],
  );

  const selectRange = useCallback(
    (event: SyntheticEvent, index: number) => {
      const anchorRaw = anchorRowIndex.current;
      const anchorLocal = anchorRaw == null ? null : dataIndex(anchorRaw);
      // Une ancre venue d'une page qui n'est plus chargée ne peut pas amorcer
      // de plage : on repart de ce clic.
      const anchor =
        anchorLocal == null || anchorLocal < 0 || anchorLocal >= processedData.length
          ? index
          : anchorRaw!;
      anchorRowIndex.current = anchor;
      const start = Math.min(anchor, index);
      const end = Math.max(anchor, index);
      const range = processedData.slice(dataIndex(start), dataIndex(end) + 1);
      setSelection([...range]);
      range.forEach((data, offset) =>
        onRowSelect?.({ originalEvent: event, data, index: start + offset, type: 'row' }),
      );
    },
    [dataIndex, processedData, setSelection, onRowSelect],
  );

  const unselectRow = useCallback(
    (event: SyntheticEvent, data: T, index: number) => {
      if (selectionMode === 'single') setSelection(null);
      else setSelection(selectionArray.filter((entry) => !rowEquals(entry, data)));
      onRowUnselect?.({ originalEvent: event, data, index, type: 'row' });
    },
    [selectionMode, setSelection, selectionArray, rowEquals, onRowUnselect],
  );

  const handleRowClick = useCallback(
    (event: SyntheticEvent, data: T, index: number) => {
      if (!selectionMode) return;
      // Un clic sur un descendant interactif appartient à ce contrôle, pas à la
      // sélection de la ligne.
      const target = event.target as HTMLElement | null;
      if (target?.closest('button, a, input, label, select, textarea')) return;

      const native = event.nativeEvent;
      const pointer = native instanceof MouseEvent ? native : null;
      if (selectionMode === 'multiple' && pointer?.shiftKey && anchorRowIndex.current != null) {
        selectRange(event, index);
        return;
      }

      const selected = isSelected(data);
      const metaKey = !!pointer && (pointer.metaKey || pointer.ctrlKey);
      const select = (next: T | T[]) => {
        setSelection(next);
        onRowSelect?.({ originalEvent: event, data, index, type: 'row' });
      };

      if (metaKeySelection) {
        if (selected && metaKey) unselectRow(event, data, index);
        else if (selectionMode === 'single') select(data);
        else select(metaKey ? [...selectionArray, data] : [data]);
      } else if (selected) {
        unselectRow(event, data, index);
      } else if (selectionMode === 'single') {
        select(data);
      } else {
        select([...selectionArray, data]);
      }
      anchorRowIndex.current = index;
    },
    [
      selectionMode,
      selectRange,
      isSelected,
      metaKeySelection,
      selectionArray,
      setSelection,
      onRowSelect,
      unselectRow,
    ],
  );

  const toggleRowWithCheckbox = useCallback(
    (event: SyntheticEvent | undefined, data: T, index?: number) => {
      if (isSelected(data)) {
        setSelection(selectionArray.filter((entry) => !rowEquals(entry, data)));
        onRowUnselect?.({ originalEvent: event, data, index, type: 'checkbox' });
      } else {
        setSelection([...selectionArray, data]);
        onRowSelect?.({ originalEvent: event, data, index, type: 'checkbox' });
      }
      anchorRowIndex.current = index ?? null;
    },
    [isSelected, setSelection, selectionArray, rowEquals, onRowSelect, onRowUnselect],
  );

  const toggleAllRows = useCallback(
    (event: SyntheticEvent | undefined, checked: boolean) => {
      setSelection(checked ? [...processedData] : []);
      onHeaderCheckboxToggle?.({ originalEvent: event, checked });
    },
    [setSelection, processedData, onHeaderCheckboxToggle],
  );

  const selectRowWithRadio = useCallback(
    (event: SyntheticEvent | undefined, data: T, index?: number) => {
      if (isSelected(data)) return;
      setSelection(data);
      onRowSelect?.({ originalEvent: event, data, index, type: 'radio' });
      anchorRowIndex.current = index ?? null;
    },
    [isSelected, setSelection, onRowSelect],
  );

  const selectAllRows = useCallback(
    (event: SyntheticEvent) => {
      if (selectionMode !== 'multiple') return;
      setSelection([...processedData]);
      onHeaderCheckboxToggle?.({ originalEvent: event, checked: true });
    },
    [selectionMode, setSelection, processedData, onHeaderCheckboxToggle],
  );

  const selectRangeToEdge = useCallback(
    (index: number, edge: 'start' | 'end') => {
      if (selectionMode !== 'multiple') return;
      const local = dataIndex(index);
      const range =
        edge === 'start' ? processedData.slice(0, local + 1) : processedData.slice(local);
      setSelection([...range]);
      anchorRowIndex.current = index;
    },
    [selectionMode, dataIndex, processedData, setSelection],
  );

  /** Ligne qui porte l'arrêt de tabulation : la première sélectionnée, sinon la première. */
  const tabbableRow = pageData.find((row) => isSelected(row)) ?? pageData[0];

  // --- Dépliage -------------------------------------------------------------
  const isRowExpanded = useCallback(
    (row: T): boolean => (dataKey ? !!expanded[String(getFieldPath(row, dataKey))] : false),
    [dataKey, expanded],
  );

  const toggleRow = useCallback(
    (row: T, event?: SyntheticEvent) => {
      if (!dataKey) {
        warnOnce('toggle-key', '[ui-table] Le dépliage d’une ligne exige `dataKey`.');
        return;
      }
      const key = String(getFieldPath(row, dataKey));
      const next = { ...expanded };
      if (next[key]) {
        delete next[key];
        setExpandedKeys(next);
        onRowCollapse?.({ originalEvent: event, data: row });
      } else {
        next[key] = true;
        setExpandedKeys(next);
        onRowExpand?.({ originalEvent: event, data: row });
      }
    },
    [dataKey, expanded, setExpandedKeys, onRowExpand, onRowCollapse],
  );

  // --- Réordonnancement par glisser-déposer --------------------------------
  const dropRow = useCallback(
    (dropIndex: number) => {
      const dragIndex = draggedRowIndex.current;
      draggedRowIndex.current = null;
      if (dragIndex == null || dragIndex === dropIndex) return;
      const next = [...value];
      if (dragIndex < 0 || dragIndex >= next.length || dropIndex < 0 || dropIndex >= next.length) {
        return;
      }
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, moved!);
      onRowReorder?.({ dragIndex, dropIndex, value: next });
    },
    [value, onRowReorder],
  );

  // --- Redimensionnement de colonne ----------------------------------------
  /** Fige toutes les largeurs en pixels, pour que le glissement ne bouge que l'arête partagée. */
  const lockColumnWidths = useCallback(() => {
    const table = tableRef.current;
    const headerRow = table?.querySelector('thead tr');
    if (!table || !headerRow) return;
    // Tout mesurer AVANT de muter : poser une largeur relayoute le tableau.
    const tableWidth = table.getBoundingClientRect().width;
    const cells = [...headerRow.children] as HTMLElement[];
    const widths = cells.map((cell) => cell.getBoundingClientRect().width);
    cells.forEach((cell, index) => (cell.style.width = `${widths[index]}px`));
    table.style.tableLayout = 'fixed';
    table.style.width = `${tableWidth}px`;
  }, []);

  const resizeColumnFit = useCallback(
    (cell: HTMLElement, startWidth: number, nextStartWidth: number, delta: number): boolean => {
      const next = cell.nextElementSibling as HTMLElement | null;
      if (!next) return false;
      const width = startWidth + delta;
      const nextWidth = nextStartWidth - delta;
      if (width < COLUMN_MIN_WIDTH || nextWidth < COLUMN_MIN_WIDTH) return false;
      cell.style.width = `${width}px`;
      next.style.width = `${nextWidth}px`;
      return true;
    },
    [],
  );

  const notifyColResize = useCallback(
    (element: HTMLElement, delta: number) => onColResize?.({ element, delta }),
    [onColResize],
  );

  // --- Les fabriques de props ----------------------------------------------
  const api = useMemo<UiTableApi<T>>(() => {
    /** Voisin sélectionnable le plus proche, en sautant les lignes de dépliage. */
    const siblingRow = (from: HTMLElement, direction: 'next' | 'previous') => {
      let node: Element | null = from;
      while (
        (node = direction === 'next' ? node.nextElementSibling : node.previousElementSibling)
      ) {
        if (node.classList.contains('ui-table-selectable-row')) return node as HTMLElement;
      }
      return null;
    };
    const edgeRow = (from: HTMLElement, edge: 'start' | 'end') => {
      const list = from.closest('table')?.querySelectorAll<HTMLElement>('.ui-table-selectable-row');
      if (!list?.length) return null;
      return edge === 'start' ? list[0]! : list[list.length - 1]!;
    };

    return {
      sortableColumn: (field, options) => {
        const order = getSortOrder(field);
        const trigger = (event: SyntheticEvent) => {
          if (options?.disabled) return;
          event.preventDefault();
          toggleColumnSort(field, event);
        };
        return {
          className: cx('ui-table-sortable-column', order !== 0 && '_sorted'),
          role: 'columnheader',
          tabIndex: options?.disabled ? undefined : 0,
          'aria-sort': order === 0 ? 'none' : order > 0 ? 'ascending' : 'descending',
          onClick: trigger,
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') trigger(event);
          },
        };
      },

      selectableRow: (data, index, options) => ({
        className: cx('ui-table-selectable-row', isSelected(data) && '_selected'),
        tabIndex: options?.disabled
          ? undefined
          : tabbableRow !== undefined && rowEquals(tabbableRow, data)
            ? 0
            : -1,
        'aria-selected': isSelected(data),
        ref: (node) => {
          if (node) rowRefs.current.set(node, { data, index });
        },
        onClick: (event) => {
          if (options?.disabled) return;
          handleRowClick(event, data, index);
        },
        onKeyDown: (event) => {
          if (options?.disabled) return;
          const meta = event.metaKey || event.ctrlKey;
          const host = event.currentTarget as HTMLElement;
          switch (event.key) {
            case 'ArrowDown':
            case 'ArrowUp': {
              event.preventDefault();
              const target = siblingRow(host, event.key === 'ArrowDown' ? 'next' : 'previous');
              if (!target) return;
              target.focus();
              if (event.shiftKey) {
                const entry = rowRefs.current.get(target);
                if (entry) selectRange(event, entry.index);
              }
              break;
            }
            case 'Home':
            case 'End': {
              event.preventDefault();
              const edge = event.key === 'Home' ? 'start' : 'end';
              edgeRow(host, edge)?.focus();
              if (meta && event.shiftKey) selectRangeToEdge(index, edge);
              break;
            }
            case 'Enter':
              event.preventDefault();
              handleRowClick(event, data, index);
              break;
            case ' ':
              event.preventDefault();
              // Maj et Espace étendent depuis la dernière ancre.
              if (event.shiftKey) selectRange(event, index);
              else handleRowClick(event, data, index);
              break;
            case 'a':
            case 'A':
              if (!meta) return;
              event.preventDefault();
              selectAllRows(event);
              break;
          }
        },
      }),

      rowToggler: (data) => ({
        'aria-expanded': isRowExpanded(data),
        onClick: (event) => {
          toggleRow(data, event);
          // Sinon le clic remonterait à la ligne et la sélectionnerait.
          event.stopPropagation();
        },
      }),

      reorderableRow: (index) => ({
        className: cx(
          'ui-table-reorderable-row',
          dropTarget?.index === index && dropTarget.side === 'above' && '_drop-above',
          dropTarget?.index === index && dropTarget.side === 'below' && '_drop-below',
        ),
        draggable: true,
        onDragStart: (event) => {
          draggedRowIndex.current = index;
          // Firefox exige une donnée pour démarrer le glissement.
          event.dataTransfer?.setData('text/plain', String(index));
          if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
        },
        onDragOver: (event) => {
          if (draggedRowIndex.current == null) return;
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          setDropTarget({
            index,
            side: event.clientY < rect.top + rect.height / 2 ? 'above' : 'below',
          });
        },
        onDragLeave: () => setDropTarget(null),
        onDrop: (event) => {
          event.preventDefault();
          const side = dropTarget?.index === index ? dropTarget.side : null;
          setDropTarget(null);
          if (side == null) return;
          const drag = draggedRowIndex.current;
          let drop = side === 'above' ? index : index + 1;
          if (drag != null && drag < drop) drop -= 1;
          dropRow(drop);
        },
        onDragEnd: () => {
          setDropTarget(null);
          draggedRowIndex.current = null;
        },
      }),

      frozenColumn: (options) => ({
        className:
          options?.frozen === false
            ? ''
            : options?.align === 'right'
              ? 'ui-table-frozen-column _frozen-right'
              : 'ui-table-frozen-column _frozen-left',
      }),

      resizableColumn: () => ({ className: 'ui-table-resizable-column' }),

      getSortOrder,
      isSelected,
      isRowExpanded,
      toggleRow,
    };
  }, [
    getSortOrder,
    toggleColumnSort,
    isSelected,
    tabbableRow,
    rowEquals,
    handleRowClick,
    selectRange,
    selectRangeToEdge,
    selectAllRows,
    isRowExpanded,
    toggleRow,
    dropTarget,
    dropRow,
  ]);

  const parts = useMemo<UiTablePartsValue<T>>(
    () => ({
      api,
      allSelected,
      partiallySelected,
      toggleRowWithCheckbox,
      toggleAllRows,
      selectRowWithRadio,
      lockColumnWidths,
      resizeColumnFit,
      notifyColResize,
    }),
    [
      api,
      allSelected,
      partiallySelected,
      toggleRowWithCheckbox,
      toggleAllRows,
      selectRowWithRadio,
      lockColumnWidths,
      resizeColumnFit,
      notifyColResize,
    ],
  );

  // --- Rendu ----------------------------------------------------------------
  const rowContext = (row: T, pageIndex: number, frozen = false): UiTableBodyContext<T> => ({
    row,
    rowIndex: frozen ? pageIndex : pageOffset + pageIndex,
    even: pageIndex % 2 === 1,
    selected: isSelected(row),
    expanded: isRowExpanded(row),
    frozen,
    table: api,
  });

  const rowKeyOf = (row: T, pageIndex: number, prefix = ''): string =>
    dataKey ? `${prefix}${String(getFieldPath(row, dataKey))}` : `${prefix}${pageIndex}`;

  const isFlexScroll = scrollable && scrollHeight === 'flex';
  const maxHeight =
    scrollable && scrollHeight && scrollHeight !== 'flex' ? scrollHeight : undefined;

  const attachWrapper = useCallback((node: HTMLDivElement | null) => {
    wrapperRef.current = node;
  }, []);

  const attachRoot = useCallback(
    (node: HTMLDivElement | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
    },
    [ref],
  );

  const emptyCell = (
    <tr className="ui-table-empty-row">
      <td className="ui-table-empty-cell" colSpan={columnCount}>
        {renderEmpty ? (
          renderEmpty()
        ) : (
          <UiEmptyState size="small" icon={emptyIcon} title={emptyMessage} />
        )}
      </td>
    </tr>
  );

  return (
    <UiTablePartsContext.Provider value={parts as UiTablePartsValue<never>}>
      <div
        {...rest}
        ref={attachRoot}
        aria-busy={loading ? 'true' : undefined}
        className={cx(
          'ui-table',
          size !== 'default' && `_${size}`,
          showGridlines && '_gridlines',
          stripedRows && '_striped',
          (rowHover || selectionMode) && '_hoverable',
          scrollable && '_scrollable',
          isFlexScroll && '_flex-scroll',
          resizableColumns && '_resizable',
          virtualScroll && '_virtual',
          className,
        )}
      >
        {renderCaption && <div className="ui-table-caption">{renderCaption()}</div>}

        <div className="ui-table-container">
          {/* axe exige ce `tabIndex` (région défilante), que jsx-a11y refuse : axe prime. */}
          {/* eslint-disable jsx-a11y/no-noninteractive-tabindex */}
          <div
            ref={attachWrapper}
            className="ui-table-wrapper"
            tabIndex={scrollable && wrapperNeedsFocus ? 0 : undefined}
            style={
              {
                maxHeight,
                '--_frozen-top': `${headerHeight}px`,
              } as CSSProperties
            }
            onScroll={onWrapperScroll}
          >
            <table ref={tableRef} className="ui-table-table" style={tableStyle}>
              {renderHeader && (
                <thead ref={theadRef} className="ui-table-thead">
                  {renderHeader(api)}
                </thead>
              )}

              {!loading && frozenValue && frozenValue.length > 0 && renderBody && (
                <tbody className="ui-table-tbody _frozen-rows">
                  {frozenValue.map((row, index) => (
                    <Fragment key={rowKeyOf(row, index, 'frozen-')}>
                      {renderBody(rowContext(row, index, true))}
                    </Fragment>
                  ))}
                </tbody>
              )}

              <tbody className="ui-table-tbody">
                {loading ? (
                  <tr className="ui-table-loading-row">
                    <td className="ui-table-loading-cell" colSpan={columnCount}>
                      <UiSpinner aria-label={loadingAriaLabel} />
                    </td>
                  </tr>
                ) : pageData.length === 0 ? (
                  emptyCell
                ) : (
                  <>
                    {virtualPadding.top > 0 && (
                      <tr className="ui-table-virtual-spacer" aria-hidden="true">
                        <td colSpan={columnCount} style={{ height: virtualPadding.top }} />
                      </tr>
                    )}

                    {pageData.map((row, index) => {
                      const context = rowContext(row, index);
                      return (
                        <Fragment key={rowKeyOf(row, index)}>
                          {renderBody?.(context)}
                          {renderExpandedRow && context.expanded && renderExpandedRow(context)}
                        </Fragment>
                      );
                    })}

                    {virtualPadding.bottom > 0 && (
                      <tr className="ui-table-virtual-spacer" aria-hidden="true">
                        <td colSpan={columnCount} style={{ height: virtualPadding.bottom }} />
                      </tr>
                    )}
                  </>
                )}
              </tbody>

              {renderFooter && <tfoot className="ui-table-tfoot">{renderFooter(api)}</tfoot>}
            </table>
          </div>
          {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
        </div>

        {paginator && (
          <UiPaginator
            totalRecords={effectiveTotal}
            rows={perPage}
            onRowsChange={setRows}
            first={clampedFirst}
            onFirstChange={setFirst}
            pageLinks={pageLinks}
            rowsPerPageOptions={rowsPerPageOptions}
            aria-label="Pagination du tableau"
            onPageChange={(event) => onPageChange?.(event)}
          />
        )}
      </div>
    </UiTablePartsContext.Provider>
  );
}

/**
 * Empile les décalages collants des lignes figées, ARRONDIS VERS LE BAS : vers le
 * haut, un interstice d'un sous-pixel laisserait voir le contenu défilant.
 */
function stackFrozenRows(thead: HTMLTableSectionElement, headerHeight: number): void {
  const frozen = thead.parentElement?.querySelector<HTMLTableSectionElement>('tbody._frozen-rows');
  if (!frozen) return;
  let offset = headerHeight;
  for (const row of [...frozen.rows]) {
    for (const cell of [...row.cells]) cell.style.top = `${Math.floor(offset)}px`;
    offset += row.getBoundingClientRect().height;
  }
}

/**
 * Place les colonnes figées : le décalage d'une cellule est la largeur cumulée
 * des colonnes figées qui la précèdent sur le même bord.
 */
function positionFrozenColumns(table: HTMLTableElement): void {
  for (const row of [...table.rows]) {
    let left = 0;
    for (const cell of [...row.cells]) {
      if (!cell.classList.contains('_frozen-left')) continue;
      cell.style.left = `${left}px`;
      cell.style.right = '';
      left += cell.getBoundingClientRect().width;
    }
    let right = 0;
    for (const cell of [...row.cells].reverse()) {
      if (!cell.classList.contains('_frozen-right')) continue;
      cell.style.right = `${right}px`;
      cell.style.left = '';
      right += cell.getBoundingClientRect().width;
    }
  }
}

// =====================================================================
// Les parties : contrôles rendus DANS le balisage projeté.
// =====================================================================

/** Ce que les parties lisent, en plus de l'API publique. */
interface UiTablePartsValue<T = unknown> {
  api: UiTableApi<T>;
  allSelected: boolean;
  partiallySelected: boolean;
  toggleRowWithCheckbox: (event: SyntheticEvent | undefined, data: T, index?: number) => void;
  toggleAllRows: (event: SyntheticEvent | undefined, checked: boolean) => void;
  selectRowWithRadio: (event: SyntheticEvent | undefined, data: T, index?: number) => void;
  lockColumnWidths: () => void;
  resizeColumnFit: (
    cell: HTMLElement,
    startWidth: number,
    nextStartWidth: number,
    delta: number,
  ) => boolean;
  notifyColResize: (element: HTMLElement, delta: number) => void;
}

const UiTablePartsContext = createContext<UiTablePartsValue<never> | null>(null);

function useParts<T>(part: string): UiTablePartsValue<T> {
  const parts = useContext(UiTablePartsContext);
  if (!parts) {
    throw new Error(`[ui-table] \`${part}\` doit être rendu dans le balisage d’un \`<UiTable>\`.`);
  }
  return parts as UiTablePartsValue<T>;
}

export interface UiTableSortIconProps {
  /** Champ de la colonne dont l'icône reflète le tri. */
  field: string;
}

/**
 * Indicateur de direction d'une colonne triable.
 *
 * Décoratif : l'état accessible vit sur le `<th>`, dans `aria-sort`.
 */
export function UiTableSortIcon({ field }: UiTableSortIconProps) {
  const { api } = useParts('UiTableSortIcon');
  const order = api.getSortOrder(field);
  const name = order === 0 ? 'sort' : order > 0 ? 'sort-up' : 'sort-down';
  return <UiIcon className="ui-table-sort-icon" name={name} size="sm" />;
}

export interface UiTableCheckboxProps<T = unknown> {
  /** Ligne que cette case sélectionne. */
  value: T;
  /** Index absolu de la ligne, reversé aux événements de sélection. */
  index?: number;
  disabled?: boolean;
  'aria-label'?: string;
}

/** Case à cocher d'une ligne, pour une sélection multiple par cases. */
export function UiTableCheckbox<T = unknown>({
  value,
  index,
  disabled = false,
  'aria-label': ariaLabel = 'Sélectionner la ligne',
}: UiTableCheckboxProps<T>) {
  const { api, toggleRowWithCheckbox } = useParts<T>('UiTableCheckbox');
  return (
    <UiCheckbox
      value={api.isSelected(value)}
      disabled={disabled}
      aria-label={ariaLabel}
      onValueChange={() => toggleRowWithCheckbox(undefined, value, index)}
    />
  );
}

export interface UiTableHeaderCheckboxProps {
  disabled?: boolean;
  'aria-label'?: string;
}

/**
 * Case à cocher d'en-tête : cochée quand tout est sélectionné, indéterminée sur
 * une sélection partielle.
 */
export function UiTableHeaderCheckbox({
  disabled = false,
  'aria-label': ariaLabel = 'Tout sélectionner',
}: UiTableHeaderCheckboxProps) {
  const { allSelected, partiallySelected, toggleAllRows } = useParts('UiTableHeaderCheckbox');
  return (
    <UiCheckbox
      value={allSelected}
      indeterminate={partiallySelected}
      disabled={disabled}
      aria-label={ariaLabel}
      onValueChange={(checked) => toggleAllRows(undefined, checked === true)}
    />
  );
}

export interface UiTableRadioProps<T = unknown> {
  /** Ligne que ce bouton radio sélectionne. */
  value: T;
  index?: number;
  /** Nom du groupe natif, partagé par toutes les lignes du tableau. */
  name?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

/** Bouton radio d'une ligne, pour une sélection simple par boutons. */
export function UiTableRadio<T = unknown>({
  value,
  index,
  name = 'ui-table-radio',
  disabled = false,
  'aria-label': ariaLabel = 'Sélectionner la ligne',
}: UiTableRadioProps<T>) {
  const { api, selectRowWithRadio } = useParts<T>('UiTableRadio');
  const selected = api.isSelected(value);
  const rowId = `row-${index ?? 0}`;
  return (
    <UiRadio
      // Le groupe porte la valeur (contrat de `ui-radio`) : celle du bouton est la clé
      // de la ligne, pas la ligne, un objet ne se comparant pas.
      value={rowId}
      groupValue={selected ? rowId : ''}
      name={name}
      disabled={disabled}
      aria-label={ariaLabel}
      onValueChange={() => selectRowWithRadio(undefined, value, index)}
    />
  );
}

/**
 * Poignée de redimensionnement, à placer dans un `<th>` marqué par
 * `table.resizableColumn()`.
 */
export function UiTableColumnResizer() {
  const { lockColumnWidths, resizeColumnFit, notifyColResize } = useParts('UiTableColumnResizer');
  const drag = useRef<{ cell: HTMLElement; start: number; width: number; next: number } | null>(
    null,
  );
  const applied = useRef(0);

  const onPointerDown = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const cell = event.currentTarget.closest('th') as HTMLElement | null;
    const next = cell?.nextElementSibling as HTMLElement | null;
    if (!cell || !next) return;
    event.preventDefault();
    lockColumnWidths();
    drag.current = {
      cell,
      start: event.clientX,
      width: cell.getBoundingClientRect().width,
      next: next.getBoundingClientRect().width,
    };
    applied.current = 0;

    const onMove = (move: PointerEvent) => {
      const state = drag.current;
      if (!state) return;
      const delta = move.clientX - state.start;
      if (resizeColumnFit(state.cell, state.width, state.next, delta)) applied.current = delta;
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      const state = drag.current;
      drag.current = null;
      if (state && applied.current !== 0) notifyColResize(state.cell, applied.current);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  return (
    <span className="ui-table-column-resizer" aria-hidden="true" onPointerDown={onPointerDown} />
  );
}
