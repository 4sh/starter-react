'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
  type Ref,
} from 'react';

import { UiIcon } from '../../base/ui-icon';
import { useControllableState } from '../../core/forms';
import { useUiScrollLock } from '../../core/overlay';
import { cx } from '../../core/utils';

import './ui-sidebar.scss';

/** Bord auquel la barre est ancrée. */
export type SidebarSide = 'left' | 'right';

/**
 * Stratégie de présentation :
 * - `static` : la barre vit dans le flux et pousse le contenu. Elle peut se
 *   replier en rail d'icônes (`collapsed`).
 * - `overlay` : la barre flotte au-dessus du contenu, en panneau hors champ
 *   piloté par `visible`.
 *
 * Avec `responsive`, une barre `static` passe en `overlay` sous `breakpoint`,
 * et revient au rail au-dessus.
 */
export type SidebarMode = 'static' | 'overlay';

/**
 * Ce que la barre expose à ses descendants, à ses zones d'en-tête et de pied,
 * et aux déclencheurs placés sous un `UiSidebarProvider`.
 */
export interface UiSidebarApi {
  /** Identifiant du panneau, pour l'`aria-controls` d'un déclencheur. */
  controlsId: string;
  /**
   * État replié RÉSOLU : faux en présentation superposée, et faux le temps
   * qu'un rail `openOnHover` est survolé ou contient le focus.
   */
  collapsed: boolean;
  /** Ce qu'un déclencheur annonce dans `aria-expanded`. */
  expanded: boolean;
  /** La barre est présentée en panneau superposé. */
  isOverlay: boolean;
  /** Bascule : l'ouverture en présentation superposée, le repli sinon. */
  toggle: () => void;
  /** Ouvre ou déplie. */
  open: () => void;
  /** Ferme ou replie. */
  close: () => void;
}

/** Une zone d'en-tête ou de pied : un nœud, ou une fonction de l'état de la barre. */
export type UiSidebarSlot = ReactNode | ((sidebar: UiSidebarApi) => ReactNode);

export interface UiSidebarProps extends Omit<ComponentPropsWithRef<'aside'>, 'children' | 'ref'> {
  side?: SidebarSide;
  mode?: SidebarMode;

  /** Autorise le repli en rail d'icônes (présentation statique). */
  collapsible?: boolean;
  /** Rail replié imposé. Renseigné, le repli est contrôlé. Présentation statique. */
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;

  /** Ouverture imposée. Renseignée, l'ouverture est contrôlée. Présentation superposée. */
  visible?: boolean;
  defaultVisible?: boolean;
  onVisibleChange?: (visible: boolean) => void;

  /** Un rail replié se déploie par-dessus le contenu au survol et au focus. */
  openOnHover?: boolean;

  /**
   * Voile : arrière-plan assombri et inerte, défilement bloqué. Sans lui, le
   * panneau superposé est non modal et la page reste utilisable.
   */
  backdrop?: boolean;
  /** Fermer au clic sur le voile et par Échap. */
  dismissable?: boolean;
  /** Fermer par Échap. N'agit qu'avec `dismissable`. */
  closeOnEscape?: boolean;
  /** Rendre le bouton de fermeture de la présentation superposée. */
  showCloseButton?: boolean;

  /** Passer en présentation superposée sous `breakpoint`. */
  responsive?: boolean;
  /**
   * Largeur sous laquelle une barre `responsive` devient un panneau superposé.
   * Toute longueur CSS ; de préférence une valeur de l'échelle des points de
   * rupture du Design System.
   */
  breakpoint?: string;

  'aria-label'?: string;
  'aria-labelledby'?: string;

  closeIcon?: string;
  closeAriaLabel?: string;

  /**
   * Cantonner la présentation superposée au premier ancêtre positionné, sans
   * voile ni blocage du défilement. Pour une barre embarquée dans une zone
   * bornée (aperçu de doc, panneau scindé).
   */
  contained?: boolean;
  /** Couper l'animation pour cette barre, sans toucher au réglage global. */
  motionDisabled?: boolean;

  /** En-tête : logo, sélecteur d'espace de travail. */
  header?: UiSidebarSlot;
  /** Pied : carte utilisateur, actions. */
  footer?: UiSidebarSlot;

  /** Appelé quand le panneau superposé s'ouvre. */
  onShow?: () => void;
  /** Appelé quand le panneau superposé se ferme. */
  onHide?: () => void;

  /** Le corps de la barre, typiquement un `UiSidebarMenu`. */
  children?: ReactNode;
  /** Ref du panneau : `<aside>` en présentation statique, `<dialog>` en superposée. */
  ref?: Ref<HTMLElement>;
}

// --- Contexte et fournisseur ---------------------------------------------------

/** L'état de la barre, lu par ses descendants (menu, contenu des zones). */
const SidebarContext = createContext<UiSidebarApi | null>(null);

/**
 * Magasin d'un `UiSidebarProvider`, et non un état React : c'est l'enfant qui
 * publie vers le parent, et un `setState` du parent rendrait l'arbre deux fois.
 */
interface SidebarStore {
  get: () => UiSidebarApi | null;
  set: (api: UiSidebarApi | null) => void;
  subscribe: (listener: () => void) => () => void;
}

function createSidebarStore(): SidebarStore {
  let current: UiSidebarApi | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: (api) => {
      current = api;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const StoreContext = createContext<SidebarStore | null>(null);

/**
 * Rend l'état d'une barre lisible hors de celle-ci : un bouton de menu dans la
 * barre d'application, par exemple. Un fournisseur porte UNE barre ; deux
 * barres pilotées séparément prennent chacune le leur.
 */
export function UiSidebarProvider({ children }: { children?: ReactNode }) {
  const [store] = useState(createSidebarStore);
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

/**
 * La barre qui CONTIENT l'appelant, et elle seule. Interne : c'est ce que lit
 * `UiSidebarMenu`, qui ne doit pas se replier avec une barre voisine publiée
 * par un fournisseur.
 */
export function useEnclosingSidebar(): UiSidebarApi | null {
  return useContext(SidebarContext);
}

const noSubscribe = () => () => {};
const noSnapshot = () => null;

/**
 * L'état de la barre la plus proche : celle qui contient l'appelant, sinon celle
 * du `UiSidebarProvider` qui l'entoure. `null` s'il n'y en a aucune.
 */
export function useUiSidebar(): UiSidebarApi | null {
  const own = useContext(SidebarContext);
  const store = useContext(StoreContext);
  const published = useSyncExternalStore(
    store?.subscribe ?? noSubscribe,
    store?.get ?? noSnapshot,
    noSnapshot,
  );
  return own ?? published;
}

/** Props à reverser sur le contrôle qui bascule une barre. */
export interface UiSidebarTriggerProps {
  'aria-controls': string | undefined;
  'aria-expanded': boolean | undefined;
  onClick: () => void;
}

/** Les props de déclencheur d'une barre donnée. Utile dans `header` ou `footer`. */
export function getUiSidebarTriggerProps(sidebar: UiSidebarApi | null): UiSidebarTriggerProps {
  return {
    'aria-controls': sidebar?.controlsId,
    'aria-expanded': sidebar?.expanded,
    onClick: () => sidebar?.toggle(),
  };
}

/**
 * Les props du contrôle qui bascule la barre la plus proche : `aria-controls`,
 * `aria-expanded`, et la bascule au clic. `Entrée` et `Espace` viennent seuls sur
 * un `<button>`.
 *
 * @example
 * ```tsx
 * const trigger = useUiSidebarTrigger();
 * <UiButton {...trigger} icon="bars" iconOnly aria-label="Menu" />
 * ```
 */
export function useUiSidebarTrigger(): UiSidebarTriggerProps {
  return getUiSidebarTriggerProps(useUiSidebar());
}

// --- Point de rupture ----------------------------------------------------------

/** La requête média, juste sous le point de rupture pour ne jamais chevaucher `min-width`. */
function toMediaQuery(breakpoint: string): string {
  const bp = breakpoint.trim();
  const match = /^(-?\d*\.?\d+)px$/.exec(bp);
  if (match) return `(max-width: ${Number.parseFloat(match[1]!) - 0.02}px)`;
  return `(max-width: ${bp})`;
}

function useBelowBreakpoint(enabled: boolean, breakpoint: string): boolean {
  const query = toMediaQuery(breakpoint);
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!enabled || typeof window === 'undefined') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [enabled, query],
  );
  const read = () => enabled && typeof window !== 'undefined' && window.matchMedia(query).matches;
  return useSyncExternalStore(subscribe, read, () => false);
}

/** Instances déjà averties, pour rester idempotent sous `<StrictMode>`. */
const warned = new Set<string>();

/**
 * ui-sidebar : barre latérale applicative, ancrée à gauche ou à droite.
 *
 * Statique, dans le flux, elle se replie en rail d'icônes ; superposée, c'est un
 * `<dialog>` natif ancré au bord. Ses descendants lisent son état par contexte ;
 * un déclencheur placé ailleurs passe par `UiSidebarProvider` et `useUiSidebarTrigger()`.
 */
export function UiSidebar({
  side = 'left',
  mode = 'static',
  collapsible = true,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  visible: visibleProp,
  defaultVisible = false,
  onVisibleChange,
  openOnHover = false,
  backdrop = true,
  dismissable = true,
  closeOnEscape = true,
  showCloseButton = true,
  responsive = false,
  breakpoint = '1024px',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  closeIcon = 'xmark',
  closeAriaLabel = 'Fermer',
  contained = false,
  motionDisabled = false,
  header,
  footer,
  onShow,
  onHide,
  id,
  className,
  style,
  children,
  ref,
  ...rest
}: UiSidebarProps) {
  const uid = useId();
  const controlsId = id ?? `ui-sidebar-${uid.replace(/:/g, '')}`;
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const store = useContext(StoreContext);

  const [collapsed, setCollapsed] = useControllableState<boolean>({
    value: collapsedProp,
    defaultValue: defaultCollapsed,
    onChange: onCollapsedChange,
  });
  const [visible, setVisible] = useControllableState<boolean>({
    value: visibleProp,
    defaultValue: defaultVisible,
    onChange: onVisibleChange,
  });
  const [hovering, setHovering] = useState(false);

  const below = useBelowBreakpoint(responsive, breakpoint);
  const isOverlay = mode === 'overlay' || (responsive && below);
  const isOpen = isOverlay && visible;
  const isModal = backdrop && !contained;

  const effectiveCollapsed = !isOverlay && collapsed && !(openOnHover && hovering);
  const expanded = isOverlay ? visible : !collapsed;
  const railCollapsed = !isOverlay && collapsed;
  const floating = openOnHover && collapsed && hovering && !isOverlay;

  const toggle = useCallback(() => {
    if (isOverlay) setVisible(!visible);
    else if (collapsible) setCollapsed(!collapsed);
  }, [isOverlay, visible, setVisible, collapsible, collapsed, setCollapsed]);
  const open = useCallback(() => {
    if (isOverlay) setVisible(true);
    else setCollapsed(false);
  }, [isOverlay, setVisible, setCollapsed]);
  const close = useCallback(() => {
    if (isOverlay) setVisible(false);
    else if (collapsible) setCollapsed(true);
  }, [isOverlay, setVisible, collapsible, setCollapsed]);

  const api = useMemo<UiSidebarApi>(
    () => ({
      controlsId,
      collapsed: effectiveCollapsed,
      expanded,
      isOverlay,
      toggle,
      open,
      close,
    }),
    [controlsId, effectiveCollapsed, expanded, isOverlay, toggle, open, close],
  );

  // Publication vers le fournisseur, pour les déclencheurs placés hors de la barre.
  useLayoutEffect(() => {
    if (!store) return;
    store.set(api);
    return () => {
      if (store.get() === api) store.set(null);
    };
  }, [store, api]);

  useUiScrollLock(isOpen && isModal);

  // Hors présentation superposée, `visible` retombe à faux : sinon la barre se
  // rouvrirait d'elle-même au prochain passage sous le point de rupture.
  useEffect(() => {
    if (!isOverlay && visible) setVisible(false);
  }, [isOverlay, visible, setVisible]);

  // L'ÉTAT est la source de vérité, le `<dialog>` suit. Il s'ouvre par une
  // méthode : `open` posé en JSX le rendrait sans calque supérieur ni piège de focus.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      if (isModal) dialog.showModal();
      else dialog.show();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen, isModal]);

  // `onShow` et `onHide` suivent l'état et non le `<dialog>`, qui disparaît sans
  // se fermer quand la barre repasse en statique.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      wasOpen.current = true;
      onShow?.();
    } else if (!isOpen && wasOpen.current) {
      wasOpen.current = false;
      onHide?.();
    }
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Échap par `keydown` : un dialogue non modal ne reçoit pas `cancel`.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      if (dismissable && closeOnEscape) setVisible(false);
    };
    // `cancel` couvre les autres demandes de fermeture (geste retour) : l'état décide.
    const onCancel = (event: Event) => {
      event.preventDefault();
      if (dismissable && closeOnEscape) setVisible(false);
    };
    // Un clic sur le voile vise le `<dialog>` lui-même, hors de sa boîte.
    const onClick = (event: MouseEvent) => {
      if (!isModal || !dismissable || event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      const inside =
        event.clientX >= box.left &&
        event.clientX <= box.right &&
        event.clientY >= box.top &&
        event.clientY <= box.bottom;
      if (!inside) setVisible(false);
    };

    dialog.addEventListener('keydown', onKeyDown);
    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('click', onClick);
    return () => {
      dialog.removeEventListener('keydown', onKeyDown);
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('click', onClick);
    };
  });

  // Garde-fou d'accessibilité : une région de navigation se nomme.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (ariaLabel || ariaLabelledBy || warned.has(uid)) return;
    warned.add(uid);
    console.warn(
      '[ui-sidebar] Barre sans nom explicite : renseignez `aria-label` ou `aria-labelledby`.',
    );
  }, [ariaLabel, ariaLabelledBy, uid]);

  const setPanelRef = useCallback(
    (node: HTMLElement | null) => {
      dialogRef.current = node instanceof HTMLDialogElement ? node : null;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const renderSlot = (slot: UiSidebarSlot) => (typeof slot === 'function' ? slot(api) : slot);

  const shell = (
    <>
      {isOverlay && showCloseButton && (
        <button
          type="button"
          className="ui-sidebar-close"
          aria-label={closeAriaLabel}
          onClick={() => setVisible(false)}
        >
          <UiIcon name={closeIcon} size="sm" />
        </button>
      )}
      {header != null && header !== false && (
        <div className="ui-sidebar-header">{renderSlot(header)}</div>
      )}
      <div className="ui-sidebar-body">{children}</div>
      {footer != null && footer !== false && (
        <div className="ui-sidebar-footer">{renderSlot(footer)}</div>
      )}
    </>
  );

  const panelClass = cx(
    'ui-sidebar',
    `_${side}`,
    effectiveCollapsed && '_collapsed',
    floating && '_floating',
    isOverlay && '_overlay',
    isOverlay && contained && '_contained',
    className,
  );
  const motionStyle: CSSProperties | undefined = motionDisabled
    ? ({ '--ui-motion-duration': '0ms' } as CSSProperties)
    : undefined;
  const labelledBy = ariaLabelledBy || undefined;
  const label = labelledBy ? undefined : (ariaLabel ?? 'Navigation');

  const onRailBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!openOnHover) return;
    const next = event.relatedTarget as Node | null;
    if (!next || !event.currentTarget.contains(next)) setHovering(false);
  };

  return (
    <SidebarContext.Provider value={api}>
      {isOverlay ? (
        <dialog
          {...rest}
          ref={setPanelRef}
          id={controlsId}
          className={panelClass}
          style={{ ...motionStyle, ...style }}
          aria-label={label}
          aria-labelledby={labelledBy}
        >
          {shell}
        </dialog>
      ) : (
        <div
          className={cx('ui-sidebar-rail', railCollapsed && '_collapsed', `_${side}`)}
          style={motionStyle}
          onPointerEnter={() => openOnHover && setHovering(true)}
          onPointerLeave={() => openOnHover && setHovering(false)}
          onFocus={() => openOnHover && setHovering(true)}
          onBlur={onRailBlur}
        >
          <aside
            {...rest}
            ref={setPanelRef}
            id={controlsId}
            className={panelClass}
            style={style}
            aria-label={label}
            aria-labelledby={labelledBy}
            tabIndex={-1}
          >
            {shell}
          </aside>
        </div>
      )}
    </SidebarContext.Provider>
  );
}
