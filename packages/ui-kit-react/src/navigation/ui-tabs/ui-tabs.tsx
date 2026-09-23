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
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';

import { UiIcon } from '../../base/ui-icon';
import { focusableWithin } from '../../core/focus';
import { useControllableState } from '../../core/forms';
import { cx } from '../../core/utils';

import './ui-tabs.scss';

/** Identifiant d'un couple onglet / panneau, comparé à la valeur du conteneur. */
export type UiTabValue = string | number;
export type TabsOrientation = 'horizontal' | 'vertical';
export type TabIconPos = 'left' | 'right';

/** Charge émise quand l'onglet actif change. */
export interface UiTabsChangeEvent {
  /** Valeur de l'onglet devenu actif. */
  value: UiTabValue;
  /** L'événement DOM d'origine : clic, touche, ou prise de focus. */
  originalEvent: SyntheticEvent;
}

/** Ce que le conteneur partage avec la bande, les onglets et les panneaux. */
interface UiTabsApi {
  orientation: TabsOrientation;
  scrollable: boolean;
  lazy: boolean;
  selectOnFocus: boolean;
  showNavigators: boolean;
  motion: boolean;
  ripple: boolean;
  value: UiTabValue | null;
  isActive: (value: UiTabValue) => boolean;
  activate: (value: UiTabValue, event: SyntheticEvent) => void;
  tabId: (value: UiTabValue) => string;
  /** `undefined` quand aucun `UiTabPanels` n'est rendu : un `aria-controls` qui ne pointe sur rien est refusé. */
  panelId: (value: UiTabValue) => string | undefined;
  registerPanels: (node: HTMLElement | null) => void;
}

/** Ce que la bande partage avec ses onglets : le clavier vit sur les entrées. */
interface UiTabListApi {
  onTabKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onTabFocus: (element: HTMLButtonElement) => void;
}

const UiTabsContext = createContext<UiTabsApi | null>(null);
const UiTabListContext = createContext<UiTabListApi | null>(null);

function useUiTabs(part: string): UiTabsApi {
  const api = useContext(UiTabsContext);
  if (!api) throw new Error(`[ui-tabs] \`${part}\` doit être rendu dans un \`<UiTabs>\`.`);
  return api;
}

/** Onglets navigables de la bande, dans l'ordre du DOM. Les désactivés sont hors jeu. */
function enabledTabsIn(strip: HTMLElement | null): HTMLButtonElement[] {
  return [...(strip?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)') ?? [])];
}

// =====================================================================
// UiTabs : le conteneur, qui possède l'état et les options du groupe.
// =====================================================================

export interface UiTabsProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'defaultValue' | 'onChange'
> {
  /** Onglet actif imposé. Renseignée, la valeur est **contrôlée** ; `null` n'active rien. */
  value?: UiTabValue | null;
  defaultValue?: UiTabValue | null;
  onValueChange?: (value: UiTabValue) => void;
  /** Notifié au changement d'onglet, avec l'événement qui l'a provoqué. */
  onTabChange?: (event: UiTabsChangeEvent) => void;
  /** Axe de disposition : bande au-dessus, ou sur le côté. */
  orientation?: TabsOrientation;
  /** Rend la bande défilante quand elle déborde, avec ses deux navigateurs. */
  scrollable?: boolean;
  /** Défaut du groupe : ne rendre le contenu d'un panneau qu'à sa première activation. */
  lazy?: boolean;
  /** Activer un onglet dès qu'il reçoit le focus (activation automatique). */
  selectOnFocus?: boolean;
  /** Afficher les navigateurs quand `scrollable`. Ils restent inactifs sans débordement. */
  showNavigators?: boolean;
  /** Animer l'indicateur et l'apparition des panneaux. Le mouvement réduit gagne toujours. */
  motion?: boolean;
  /**
   * Onde de pression sur les en-têtes d'onglet, quand elle est activée. Pas sur
   * les navigateurs : ils font glisser la bande, ils ne mènent nulle part.
   */
  ripple?: boolean;
  children?: ReactNode;
}

/**
 * ui-tabs : conteneur qui orchestre une bande d'onglets et leurs panneaux.
 *
 * API de composition : `UiTabs` porte l'état, `UiTabList` rend la bande de
 * `UiTab` (plus l'indicateur glissant et, en mode défilant, les navigateurs),
 * et `UiTabPanels` groupe un `UiTabPanel` par onglet, apparié par `value`.
 */
export function UiTabs({
  value,
  defaultValue = null,
  onValueChange,
  onTabChange,
  orientation = 'horizontal',
  scrollable = false,
  lazy = false,
  selectOnFocus = false,
  showNavigators = true,
  motion = true,
  ripple = true,
  className,
  children,
  ...rest
}: UiTabsProps) {
  const uid = useId();
  const [active, setActive] = useControllableState<UiTabValue | null>({
    value,
    defaultValue,
    onChange: (next) => {
      if (next !== null) onValueChange?.(next);
    },
  });

  // Un `aria-controls` qui ne résout rien est refusé par axe, et certains
  // usages n'ont aucun panneau : la bande sert alors de menu de navigation et
  // c'est le routeur qui rend le contenu. Le groupe apprend la présence des
  // panneaux par la ref de rappel de `UiTabPanels`, qui tire au commit.
  const [hasPanels, setHasPanels] = useState(false);
  const registerPanels = useCallback((node: HTMLElement | null) => setHasPanels(node !== null), []);

  const api = useMemo<UiTabsApi>(
    () => ({
      orientation,
      scrollable,
      lazy,
      selectOnFocus,
      showNavigators,
      motion,
      ripple,
      value: active,
      isActive: (v) => active === v,
      activate: (next, event) => {
        if (active === next) return;
        setActive(next);
        onTabChange?.({ value: next, originalEvent: event });
      },
      tabId: (v) => `${uid}-tab-${v}`,
      panelId: (v) => (hasPanels ? `${uid}-panel-${v}` : undefined),
      registerPanels,
    }),
    [
      orientation,
      scrollable,
      lazy,
      selectOnFocus,
      showNavigators,
      motion,
      ripple,
      active,
      setActive,
      onTabChange,
      uid,
      hasPanels,
      registerPanels,
    ],
  );

  return (
    <div {...rest} className={cx('ui-tabs', orientation === 'vertical' && '_vertical', className)}>
      <UiTabsContext.Provider value={api}>{children}</UiTabsContext.Provider>
    </div>
  );
}

// =====================================================================
// UiTabList : la bande, son clavier, son indicateur et son défilement.
// =====================================================================

/** Géométrie mesurée de l'indicateur d'onglet actif. */
interface BarMetrics {
  /** Décalage sur l'axe principal, en px depuis l'origine de la bande. */
  offset: number;
  /** Longueur sur l'axe principal : largeur en horizontal, hauteur en vertical. */
  length: number;
}

export interface UiTabListProps extends ComponentPropsWithRef<'div'> {
  /** Nom accessible de la bande. Posé sur le `role="tablist"`, pas sur la racine. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Nom accessible du navigateur « précédents ». */
  prevAriaLabel?: string;
  /** Nom accessible du navigateur « suivants ». */
  nextAriaLabel?: string;
  children?: ReactNode;
}

/**
 * ui-tab-list : la bande de boutons d'onglet.
 *
 * Elle porte le `role="tablist"`, la navigation au clavier à focus glissant,
 * l'indicateur mesuré sur l'onglet actif et, en mode défilant, les deux
 * navigateurs qui font défiler la bande.
 */
export function UiTabList({
  prevAriaLabel = 'Défiler vers les onglets précédents',
  nextAriaLabel = 'Défiler vers les onglets suivants',
  className,
  children,
  ...rest
}: UiTabListProps) {
  const { orientation, scrollable, showNavigators, motion, value } = useUiTabs('UiTabList');
  // Sortis de `...rest` : la racine n'a pas de rôle, et un nom accessible sur
  // un `<div>` nu est refusé par axe. Ils vont sur le `role="tablist"`.
  const ariaLabel = rest['aria-label'];
  const ariaLabelledBy = rest['aria-labelledby'];
  delete rest['aria-label'];
  delete rest['aria-labelledby'];

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const horizontal = orientation === 'horizontal';

  const [bar, setBar] = useState<BarMetrics | null>(null);
  /** Incrémenté par le `ResizeObserver` pour re-mesurer. */
  const [resizeTick, setResizeTick] = useState(0);
  const [prevEnabled, setPrevEnabled] = useState(false);
  const [nextEnabled, setNextEnabled] = useState(false);

  const navigators = scrollable && showNavigators;

  const updateNavigators = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !scrollable) return;
    const [position, max] = horizontal
      ? [el.scrollLeft, el.scrollWidth - el.clientWidth]
      : [el.scrollTop, el.scrollHeight - el.clientHeight];
    setPrevEnabled(position > 1);
    setNextEnabled(position < max - 1);
  }, [scrollable, horizontal]);

  useEffect(() => {
    const viewport = scrollRef.current;
    const strip = stripRef.current;
    if (!viewport || !strip) return;
    // `ResizeObserver` tire une première fois dès qu'on observe : la mesure
    // initiale vient donc de son rappel, comme les suivantes, et il n'y a pas
    // de `setState` synchrone dans l'effet.
    const ro = new ResizeObserver(() => {
      setResizeTick((tick) => tick + 1);
      updateNavigators();
    });
    ro.observe(viewport);
    ro.observe(strip);
    return () => ro.disconnect();
  }, [updateNavigators]);

  /**
   * Mesure avant peinture : dans un effet ordinaire, une image montrerait
   * l'indicateur à son ancienne place. `offsetLeft` / `offsetWidth` et non un
   * rectangle : les transformations n'y sont pas incluses, donc la mesure reste
   * juste pendant que l'indicateur glisse.
   */
  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const activeTab = strip.querySelector<HTMLElement>(
      '[role="tab"][aria-selected="true"]:not(:disabled)',
    );
    if (!activeTab) {
      setBar((current) => (current === null ? current : null));
      return;
    }
    const next: BarMetrics = horizontal
      ? { offset: activeTab.offsetLeft, length: activeTab.offsetWidth }
      : { offset: activeTab.offsetTop, length: activeTab.offsetHeight };
    setBar((current) =>
      current && current.offset === next.offset && current.length === next.length ? current : next,
    );
  }, [value, horizontal, resizeTick]);

  /**
   * L'unique arrêt de tabulation du groupe, normalisé sur le DOM.
   *
   * `UiTab` rend déjà `tabIndex` selon son état actif, ce qui suffit dans le cas
   * courant. Reste celui où AUCUN onglet n'est actif : tous seraient à -1 et la
   * bande deviendrait inatteignable au clavier, là où l'APG veut le premier.
   * L'ordre des onglets est une propriété du DOM, pas de l'état React : les
   * relire ici couvre toutes les façons de les composer, là où le crochet
   * `useRovingTabIndex` les adresse par index et suppose de les connaître au
   * rendu.
   */
  useLayoutEffect(() => {
    const tabs = enabledTabsIn(stripRef.current);
    if (!tabs.length) return;
    const stop = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') ?? tabs[0];
    for (const tab of tabs) tab.tabIndex = tab === stop ? 0 : -1;
  });

  /**
   * Amène un onglet entièrement dans la fenêtre défilante, du minimum
   * nécessaire. La douceur vient du `scroll-behavior` CSS, que le système de
   * motion règle et que le mouvement réduit annule : pas de l'option JS.
   */
  const scrollIntoView = useCallback(
    (element: HTMLElement) => {
      const viewport = scrollRef.current;
      if (!scrollable || !viewport) return;
      const start = horizontal ? element.offsetLeft : element.offsetTop;
      const size = horizontal ? element.offsetWidth : element.offsetHeight;
      const viewStart = horizontal ? viewport.scrollLeft : viewport.scrollTop;
      const viewSize = horizontal ? viewport.clientWidth : viewport.clientHeight;
      if (viewSize === 0) return; // pas encore disposé : une passe suivante rejouera.

      let target: number;
      if (start < viewStart) target = start;
      else if (start + size > viewStart + viewSize) target = start + size - viewSize;
      else return; // déjà entièrement visible.

      viewport.scrollTo(horizontal ? { left: target } : { top: target });
    },
    [scrollable, horizontal],
  );

  const scrollByPage = (direction: -1 | 1) => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    const step = direction * (horizontal ? viewport.clientWidth : viewport.clientHeight) * 0.8;
    viewport.scrollBy(horizontal ? { left: step } : { top: step });
  };

  // Le clavier se branche sur les ONGLETS et non sur la bande : un conteneur
  // porteur d'un `onKeyDown` devrait être focalisable pour satisfaire
  // `jsx-a11y`, ce qu'un `role="tablist"` n'est justement pas.
  const listApi = useMemo<UiTabListApi>(
    () => ({
      onTabFocus: scrollIntoView,
      onTabKeyDown: (event) => {
        const nextKey = horizontal ? 'ArrowRight' : 'ArrowDown';
        const prevKey = horizontal ? 'ArrowLeft' : 'ArrowUp';
        if (![nextKey, prevKey, 'Home', 'End'].includes(event.key)) return;

        const tabs = enabledTabsIn(stripRef.current);
        const from = tabs.indexOf(event.currentTarget);
        if (from === -1) return;

        event.preventDefault();
        const last = tabs.length - 1;
        let position: number;
        if (event.key === nextKey) position = from === last ? 0 : from + 1;
        else if (event.key === prevKey) position = from === 0 ? last : from - 1;
        else if (event.key === 'Home') position = 0;
        else position = last;

        const target = tabs[position];
        if (!target) return;
        target.focus();
        scrollIntoView(target);
      },
    }),
    [horizontal, scrollIntoView],
  );

  return (
    <div
      {...rest}
      className={cx(
        'ui-tab-list',
        orientation === 'vertical' && '_vertical',
        scrollable && '_scrollable',
        !motion && '_no-motion',
        className,
      )}
    >
      {navigators && (
        <button
          type="button"
          className="ui-tab-list-nav _prev"
          aria-label={prevAriaLabel || undefined}
          tabIndex={-1}
          disabled={!prevEnabled}
          onClick={() => scrollByPage(-1)}
        >
          <UiIcon name={horizontal ? 'chevron-left' : 'chevron-up'} size="sm" />
        </button>
      )}

      <div ref={scrollRef} className="ui-tab-list-scroll" onScroll={updateNavigators}>
        <div
          ref={stripRef}
          className="ui-tab-list-tabs"
          role="tablist"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-orientation={orientation}
        >
          <UiTabListContext.Provider value={listApi}>{children}</UiTabListContext.Provider>

          <span
            className={cx('ui-tab-list-active-bar', !bar && '_hidden')}
            aria-hidden="true"
            style={{
              transform: bar ? `translate${horizontal ? 'X' : 'Y'}(${bar.offset}px)` : undefined,
              width: bar && horizontal ? bar.length : undefined,
              height: bar && !horizontal ? bar.length : undefined,
            }}
          />
        </div>
      </div>

      {navigators && (
        <button
          type="button"
          className="ui-tab-list-nav _next"
          aria-label={nextAriaLabel || undefined}
          tabIndex={-1}
          disabled={!nextEnabled}
          onClick={() => scrollByPage(1)}
        >
          <UiIcon name={horizontal ? 'chevron-right' : 'chevron-down'} size="sm" />
        </button>
      )}
    </div>
  );
}

// =====================================================================
// UiTab : un bouton d'onglet.
// =====================================================================

export interface UiTabProps extends Omit<ComponentPropsWithRef<'button'>, 'value' | 'type'> {
  /** Identifiant de cet onglet, apparié au panneau de même valeur. */
  value: UiTabValue;
  /** Onglet non sélectionnable, et sauté par la navigation au clavier. */
  disabled?: boolean;
  /** Nom d'icône, rendu avant le libellé. */
  icon?: string;
  /** Côté de l'icône. */
  iconPos?: TabIconPos;
  children?: ReactNode;
}

/**
 * ui-tab : un bouton d'onglet dans la bande.
 *
 * C'est un `<button role="tab">` natif : il n'y a pas d'élément hôte à
 * traverser, donc `.ui-tab` est le bouton lui-même. Il ne fait que rapporter
 * son état ; le clavier et l'indicateur appartiennent à la bande.
 */
export function UiTab({
  value,
  disabled = false,
  icon,
  iconPos = 'left',
  className,
  children,
  onClick,
  onFocus,
  onKeyDown,
  ...rest
}: UiTabProps) {
  const tabs = useUiTabs('UiTab');
  const list = useContext(UiTabListContext);
  const active = tabs.isActive(value);

  return (
    <button
      {...rest}
      type="button"
      role="tab"
      id={tabs.tabId(value)}
      className={cx(
        'ui-tab',
        active && '_active',
        iconPos === 'right' && '_icon-right',
        tabs.orientation === 'vertical' && '_vertical',
        className,
      )}
      aria-controls={tabs.panelId(value)}
      aria-selected={active}
      data-ripple={tabs.ripple ? 'on' : 'off'}
      disabled={disabled}
      tabIndex={active ? 0 : -1}
      onClick={(event) => {
        tabs.activate(value, event);
        onClick?.(event);
      }}
      onFocus={(event) => {
        if (tabs.selectOnFocus) tabs.activate(value, event);
        list?.onTabFocus(event.currentTarget);
        onFocus?.(event);
      }}
      onKeyDown={(event) => {
        list?.onTabKeyDown(event);
        onKeyDown?.(event);
      }}
    >
      {icon && <UiIcon className="ui-tab-icon" name={icon} size="default" />}
      <span className="ui-tab-label">{children}</span>
    </button>
  );
}

// =====================================================================
// UiTabPanels / UiTabPanel : la zone de contenu.
// =====================================================================

export interface UiTabPanelsProps extends ComponentPropsWithRef<'div'> {
  children?: ReactNode;
}

/** ui-tab-panels : enveloppe des panneaux, qui occupe la place restante. */
export function UiTabPanels({ className, children, ref, ...rest }: UiTabPanelsProps) {
  const { registerPanels } = useUiTabs('UiTabPanels');

  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      registerPanels(node);
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [registerPanels, ref],
  );

  return (
    <div {...rest} ref={attach} className={cx('ui-tab-panels', className)}>
      {children}
    </div>
  );
}

export interface UiTabPanelProps extends Omit<ComponentPropsWithRef<'div'>, 'hidden'> {
  /** Identifiant de ce panneau, apparié à l'onglet de même valeur. */
  value: UiTabValue;
  /** Ne rendre le contenu qu'à la première activation. Gagne sur le défaut du groupe. */
  lazy?: boolean;
  children?: ReactNode;
}

/**
 * ui-tab-panel : la zone de contenu liée à l'onglet de même `value`.
 *
 * Le panneau reste monté et se masque quand il est inactif, donc son état est
 * conservé. En `lazy`, son contenu n'est rendu qu'à la première activation.
 */
export function UiTabPanel({ value, lazy, className, children, ref, ...rest }: UiTabPanelProps) {
  const tabs = useUiTabs('UiTabPanel');
  const active = tabs.isActive(value);
  const isLazy = lazy ?? tabs.lazy;

  // Colle une fois le panneau activé : le rendre paresseux ne veut pas dire le
  // démonter à chaque fois qu'on en sort. L'ajustement se fait PENDANT le rendu
  // et non dans un effet : React rejoue le rendu aussitôt, sans peindre l'état
  // intermédiaire, là où un effet ferait clignoter le panneau vide.
  const [seen, setSeen] = useState(active);
  if (active && !seen) setSeen(true);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  /**
   * Un panneau dont le contenu est déjà atteignable au clavier n'a pas à être
   * un arrêt de plus : l'APG ne le rend focalisable que dans le cas contraire.
   * Le rendu pose `tabIndex={0}`, qui est le cas le plus fréquent et reste juste
   * sans JavaScript ; cette passe le rétrograde quand il y a de quoi tabuler.
   */
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.tabIndex = focusableWithin(panel).length === 0 ? 0 : -1;
  });

  return (
    <div
      {...rest}
      ref={attach}
      id={tabs.panelId(value)}
      className={cx('ui-tab-panel', active && '_active', !tabs.motion && '_no-motion', className)}
      role="tabpanel"
      tabIndex={0}
      aria-labelledby={tabs.tabId(value)}
      hidden={!active}
    >
      {(!isLazy || active || seen) && children}
    </div>
  );
}
