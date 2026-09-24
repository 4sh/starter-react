'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
} from 'react';

import { UiIcon } from '../../base/ui-icon';
import { useRovingTabIndex } from '../../core/focus';
import { useControllableState } from '../../core/forms';
import { useCloseOnNavigation, useUiDismiss, useUiPosition } from '../../core/overlay';
import type { UiSubLevel } from '../../core/types';
import { cx } from '../../core/utils';
import { UiSeparator } from '../../informative/ui-separator';

import './ui-menu.scss';

/** Densité du menu : `small` pour les menus d'actions « … ». */
export type MenuSize = 'default' | 'small';

/**
 * Rendu des groupes : `inline` = sections titrées et accordéons dans le
 * panneau ; `flyout` = panneaux latéraux en cascade, un par groupe.
 */
export type MenuSubmenuMode = 'inline' | 'flyout';

/** Écart entre le déclencheur et le panneau. */
const PANEL_OFFSET = 8;

/** Charge passée à `command` et à `onItemClick`. */
export interface UiMenuItemCommandEvent {
  originalEvent: SyntheticEvent;
  item: UiMenuItem;
}

/**
 * Props posées sur l'entrée, telles que `render` les reçoit.
 *
 * C'est le contrat du point d'extension : tout ce que le menu aurait mis sur
 * son `<a>`, à reverser tel quel sur le composant de lien du projet.
 */
export interface UiMenuItemRootProps {
  className: string;
  role: 'menuitem';
  tabIndex: number;
  href?: string;
  target?: string;
  rel?: string;
  title?: string;
  'aria-label'?: string;
  'data-key': string;
  /** Marqueur de l'onde de pression, lu par `UiRippleProvider`. */
  'data-ripple': 'on' | 'off';
  onClick: MouseEventHandler<HTMLElement>;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onMouseEnter: () => void;
  onFocus: () => void;
  /**
   * Typé pour une ancre : `render` existe pour rendre un **lien**, et les
   * composants de lien des routeurs reversent tous leur ref à un
   * `HTMLAnchorElement`. Le cast vit ici, une seule fois, plutôt que chez
   * chaque consommateur.
   */
  ref?: Ref<HTMLAnchorElement>;
}

/**
 * Entrée déclarative du menu.
 *
 * Une entrée est soit un séparateur, soit une feuille (commande, lien), soit un
 * groupe (`items`) dont l'en-tête est un libellé simple ou une bascule.
 */
export interface UiMenuItem {
  /** Identifiant stable. Requis pour piloter l'entrée par `expandedKeys`. */
  id?: string;
  /** Libellé de l'entrée ou de l'en-tête de groupe. */
  label?: string;
  /** Icône de tête, par son nom. */
  icon?: string;
  /** Enfants : l'entrée devient un groupe (section titrée ou sous-menu). */
  items?: UiMenuItem[];
  /** Rend un filet séparateur à la place d'une entrée. */
  separator?: boolean;
  /** Entrée désactivée, sautée par la navigation clavier. */
  disabled?: boolean;
  /** Entrée masquée. */
  visible?: boolean;
  /** Appelé au clic et à l'activation clavier. */
  command?: (event: UiMenuItemCommandEvent) => void;
  /** URL : l'entrée rend une ancre native. */
  url?: string;
  /** Cible de l'ancre. `_blank` ajoute le `rel` de sécurité. */
  target?: string;
  /**
   * Rend l'entrée avec le composant de lien du projet (Next, React Router,
   * TanStack). Le kit n'impose aucun routeur.
   */
  render?: (props: UiMenuItemRootProps, children: ReactNode) => ReactNode;
  /** Entrée de la page courante : l'appelant connaît sa route, le kit non. */
  active?: boolean;
  /**
   * En-tête de groupe repliable. Par défaut `true` pour un groupe imbriqué et
   * `false` au premier niveau, où le groupe est une section titrée.
   */
  toggleable?: boolean;
  /** État ouvert initial d'un groupe repliable. `expandedKeys` gagne. */
  expanded?: boolean;
  /** Infobulle native. */
  title?: string;
  /** Nom accessible de l'entrée. */
  ariaLabel?: string;
  /** Classe(s) sur le `<li>` de l'entrée. */
  className?: string;
}

/** Nœud de rendu résolu : l'entrée, plus ce qui s'en déduit. */
interface MenuNode {
  item: UiMenuItem;
  /** `item.id`, sinon une clé positionnelle. */
  key: string;
  kind: 'separator' | 'header' | 'toggle' | 'flyout' | 'item';
  children: MenuNode[];
  expanded: boolean;
}

/**
 * Props à reverser sur le déclencheur du popup. Le menu ne mute pas le DOM du
 * déclencheur pour y poser son état ARIA : il le rend, et React s'occupe du reste.
 */
export interface UiMenuTriggerProps {
  /** Ref de rappel, et non un `Ref<HTMLElement>` : l'union ne se reverse pas
   * sur un `<button>`, dont la ref attend un `HTMLButtonElement`. */
  ref: (node: HTMLElement | null) => void;
  'aria-haspopup': 'menu';
  'aria-expanded': boolean;
  'aria-controls': string | undefined;
  onClick: () => void;
}

type NativeProps = Omit<HTMLAttributes<HTMLElement>, 'children'>;

export interface UiMenuProps extends NativeProps {
  /** Entrées du menu. */
  items?: UiMenuItem[];

  /** Mode popup : le panneau vit dans le calque supérieur, ancré au déclencheur. */
  popup?: boolean;
  /** Ouverture imposée du popup. Renseignée, le menu est contrôlé. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Rend le déclencheur du popup. Reçoit les props à lui reverser : la `ref`
   * qui sert d'ancre, l'état ARIA et le basculement au clic.
   */
  trigger?: (props: UiMenuTriggerProps) => ReactNode;
  /** Retourner le panneau au-dessus du déclencheur quand la place manque. */
  autoFlip?: boolean;

  /**
   * Groupes repliables ouverts, indexés par l'`id` de l'entrée. Une clé absente
   * retombe sur l'`expanded` de l'entrée, puis sur fermé.
   */
  expandedKeys?: Record<string, boolean>;
  defaultExpandedKeys?: Record<string, boolean>;
  onExpandedKeysChange?: (keys: Record<string, boolean>) => void;

  /** Famille de couleur : `high` ou `low`. */
  level?: UiSubLevel;
  /** Densité. `small` pour un menu d'actions compact. */
  size?: MenuSize;
  /** Rendu des groupes : sections et accordéons, ou panneaux en cascade. */
  submenus?: MenuSubmenuMode;
  /** Couper l'animation d'ouverture et celle du repli. */
  motionDisabled?: boolean;
  /**
   * Onde de pression sur les entrées, quand elle est activée. `false` la coupe
   * sur ce menu, activation globale comprise.
   */
  ripple?: boolean;

  /** Contenu d'une entrée, à la place de l'icône et du libellé. */
  renderItem?: (item: UiMenuItem) => ReactNode;
  /** Contenu d'un en-tête de groupe. */
  renderHeader?: (item: UiMenuItem) => ReactNode;
  /** Contenu libre avant la liste. */
  start?: ReactNode;
  /** Contenu libre après la liste. */
  end?: ReactNode;

  /** Une feuille a été activée, au clic ou au clavier. Jamais si désactivée. */
  onItemClick?: (event: UiMenuItemCommandEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;

  /** Nom accessible de la liste. Recommandé. */
  'aria-label'?: string;
  'aria-labelledby'?: string;

  ref?: Ref<HTMLElement>;
}

/** Nœuds de rendu, calculés depuis le modèle. */
function buildNodes(
  items: UiMenuItem[],
  parentKey: string,
  depth: number,
  flyout: boolean,
  expandedKeys: Record<string, boolean>,
): MenuNode[] {
  return items
    .filter((item) => item.visible !== false)
    .map((item, index) => {
      const key = item.id ?? `${parentKey}_${index}`;
      if (item.separator) {
        return { item, key, kind: 'separator', children: [], expanded: false } satisfies MenuNode;
      }
      if (item.items) {
        if (flyout) {
          return {
            item,
            key,
            kind: 'flyout',
            children: [],
            // Même sens qu'en rendu `inline` : le panneau latéral s'ouvre au repos.
            expanded: item.expanded ?? false,
          } satisfies MenuNode;
        }
        const toggleable = item.toggleable ?? depth > 0;
        const expanded = toggleable ? (expandedKeys[key] ?? item.expanded ?? false) : true;
        return {
          item,
          key,
          kind: toggleable ? 'toggle' : 'header',
          children: buildNodes(item.items, key, depth + 1, flyout, expandedKeys),
          expanded,
        } satisfies MenuNode;
      }
      return { item, key, kind: 'item', children: [], expanded: false } satisfies MenuNode;
    });
}

/** Clés des entrées atteignables au clavier, dans l'ordre visuel. */
function focusPath(nodes: MenuNode[]): string[] {
  const keys: string[] = [];
  const walk = (list: MenuNode[]): void => {
    for (const node of list) {
      if (node.kind === 'separator') continue;
      if (node.kind === 'header') {
        walk(node.children);
        continue;
      }
      if (node.item.disabled) continue;
      keys.push(node.key);
      // Un groupe replié sort du parcours : son contenu est `inert`.
      if (node.kind === 'toggle' && node.expanded) walk(node.children);
    }
  };
  walk(nodes);
  return keys;
}

/**
 * ui-menu : menu de navigation et de commandes, statique ou en popup.
 *
 * Piloté par un modèle déclaratif `items`. En popup, le panneau vit dans le
 * **calque supérieur** : ni z-index, ni rognage par un ancêtre en `overflow: hidden`.
 * Le clavier suit le motif menu de l'APG.
 */
export function UiMenu({
  items = [],
  popup = false,
  open,
  defaultOpen = false,
  onOpenChange,
  trigger,
  autoFlip = true,
  expandedKeys,
  defaultExpandedKeys,
  onExpandedKeysChange,
  level = 'high',
  size = 'default',
  submenus = 'inline',
  motionDisabled = false,
  ripple = true,
  renderItem,
  renderHeader,
  start,
  end,
  onItemClick,
  onOpen,
  onClose,
  className,
  style,
  ref,
  // Sortis de `...rest` : le nom va au `role="menu"`, axe refuse un `<div>` sans rôle nommé.
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...rest
}: UiMenuProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const uid = useId();

  const [isOpen, setOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const [expanded, setExpandedKeys] = useControllableState<Record<string, boolean>>({
    value: expandedKeys,
    defaultValue: defaultExpandedKeys ?? {},
    onChange: onExpandedKeysChange,
  });

  const nodes = useMemo(
    () => buildNodes(items, uid, 0, submenus === 'flyout', expanded),
    [items, uid, submenus, expanded],
  );
  const path = useMemo(() => focusPath(nodes), [nodes]);

  /** Clé du sous-menu en cascade ouvert, et si son ouverture doit prendre le focus. */
  const [flyout, setFlyout] = useState<{ key: string; focus: boolean } | null>(() => {
    const first = nodes.find((node) => node.kind === 'flyout' && node.expanded);
    return first ? { key: first.key, focus: false } : null;
  });
  /** Clé de l'entrée qui porte l'arrêt de tabulation. */
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  // Masquer un panneau émet un `mouseenter` sous un pointeur immobile : levé à
  // l'activation, ce drapeau l'ignore jusqu'au prochain `pointermove`.
  const pointerStale = useRef(false);

  // --- Focus glissant -----------------------------------------------------
  // L'index se déduit de la clé : la liste change de longueur quand un groupe se replie.
  const activeIndex = focusedKey ? path.indexOf(focusedKey) : -1;

  // Focus du DOM seulement : l'`onFocus` de l'entrée pose `focusedKey`, ce qui
  // évite un `setState` dans l'effet d'ouverture.
  const focusEntry = useCallback((key: string | undefined) => {
    if (!key) return;
    // Après le rendu qui pose le `tabIndex`. `setTimeout` : un
    // `requestAnimationFrame` ne tire pas dans un onglet en arrière-plan.
    window.setTimeout(() =>
      panelRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.focus(),
    );
  }, []);

  const roving = useRovingTabIndex({
    count: path.length,
    orientation: 'vertical',
    // Rien de focalisé encore : l'arrêt de tabulation est la première entrée.
    activeIndex: activeIndex < 0 ? 0 : activeIndex,
    onActiveIndexChange: (index) => focusEntry(path[index]),
  });

  // --- Popup --------------------------------------------------------------
  // Le focus est rendu par l'effet qui masque le panneau : cette fonction est
  // atteignable depuis le rendu, où une ref ne se lit pas.
  const close = useCallback(() => {
    // `useControllableState` n'accepte pas de fonction de mise à jour : on lit l'état.
    if (isOpen) {
      setOpen(false);
      onClose?.();
    }
    setFlyout(null);
    setFocusedKey(null);
  }, [isOpen, onClose, setOpen]);

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
      else if (ref) (ref as { current: HTMLElement | null }).current = node;
    },
    [popup, setPanel, ref],
  );

  // L'état pilote le popover, jamais l'inverse : son événement `toggle` peut se faire attendre.
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
    // Un popover `manual` ne rend pas le focus : on le restitue, s'il était dans le panneau.
    if (hadFocus) triggerRef.current?.focus();
  }, [isOpen, popup]);

  useEffect(() => {
    if (!popup || !isOpen) return;
    onOpen?.();
    focusEntry(path[0]);
    // `path` et `onOpen` hors dépendances : les garder refocaliserait le menu en cours d'usage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popup, isOpen]);

  // `manual` et non `auto` : le light-dismiss natif fermerait aussi sur un clic
  // sur le déclencheur, qui rouvrirait aussitôt. `useUiDismiss` connaît l'ancre.
  useUiDismiss({
    open: popup && isOpen,
    onDismiss: () => close(),
    panelRef,
    anchorRef: triggerRef,
  });

  useCloseOnNavigation(popup && isOpen, close);

  // --- Interactions -------------------------------------------------------
  const setExpanded = useCallback(
    (node: MenuNode, next: boolean) => {
      if (node.expanded === next) return;
      setExpandedKeys({ ...expanded, [node.key]: next });
    },
    [expanded, setExpandedKeys],
  );

  const activate = useCallback(
    (event: MouseEvent<HTMLElement>, node: MenuNode) => {
      const { item } = node;
      if (item.disabled) {
        event.preventDefault();
        return;
      }
      // Pas de navigation sans URL, sauf si un `render` pose son propre `href`.
      if (!item.url && !item.render) event.preventDefault();
      setFocusedKey(node.key);
      const payload = { originalEvent: event, item };
      item.command?.(payload);
      onItemClick?.(payload);
      pointerStale.current = true;
      setFlyout(null);
      if (popup) close();
    },
    [onItemClick, popup, close],
  );

  const onEntryKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>, node: MenuNode) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowLeft': {
          const forward = event.key === 'ArrowRight';
          if (node.kind === 'toggle') {
            event.preventDefault();
            setExpanded(node, forward);
          } else if (node.kind === 'flyout') {
            event.preventDefault();
            setFlyout(forward ? { key: node.key, focus: true } : null);
          }
          return;
        }
        case ' ':
          // Espace active aussi une ancre, ce que le natif ne fait que sur un bouton.
          if (event.currentTarget.tagName === 'A') {
            event.preventDefault();
            event.currentTarget.click();
          }
          return;
        case 'Escape':
          // Confiée à `useUiDismiss`, qui ne consomme la touche que si elle ferme quelque chose.
          return;
        default:
          roving.onKeyDown(event);
      }
    },
    [setExpanded, roving],
  );

  const entryProps = useCallback(
    (node: MenuNode): MenuEntryProps => ({
      // Désactivée, l'entrée est hors du parcours : `indexOf` rend -1, `tabIndexFor` aussi.
      tabIndex: roving.tabIndexFor(path.indexOf(node.key)),
      'data-key': node.key,
      'data-ripple': ripple ? 'on' : 'off',
      title: node.item.title || undefined,
      'aria-label': node.item.ariaLabel || undefined,
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => onEntryKeyDown(event, node),
      onMouseEnter: () => {
        if (pointerStale.current) return;
        setFlyout(node.kind === 'flyout' ? { key: node.key, focus: false } : null);
      },
      onFocus: () => setFocusedKey(node.key),
    }),
    [roving, path, onEntryKeyDown, ripple],
  );

  /** Icône et libellé, ou le contenu fourni par l'appelant. */
  const entryContent = (item: UiMenuItem, header: boolean): ReactNode => {
    const custom = header ? renderHeader?.(item) : renderItem?.(item);
    if (custom !== undefined) return custom;
    return (
      <>
        {item.icon && <UiIcon className="ui-menu-item-icon" name={item.icon} size="sm" />}
        <span className="ui-menu-item-label">{item.label}</span>
      </>
    );
  };

  const renderNodes = (list: MenuNode[]): ReactNode =>
    list.map((node) => {
      const { item, key } = node;

      if (node.kind === 'separator') {
        // Le `<li>`, seul enfant permis d'un `role="menu"`, porte la sémantique : filet décoratif.
        return (
          <li key={key} className="ui-menu-separator" role="separator">
            <UiSeparator aria-hidden="true" />
          </li>
        );
      }

      if (node.kind === 'header') {
        const headerId = `${uid}-${key}-label`;
        return (
          <li key={key} className={cx('ui-menu-section', item.className)} role="none">
            <span className="ui-menu-header" id={headerId}>
              {entryContent(item, true)}
            </span>
            <ul className="ui-menu-group" role="group" aria-labelledby={headerId}>
              {renderNodes(node.children)}
            </ul>
          </li>
        );
      }

      if (node.kind === 'toggle') {
        const groupId = `${uid}-${key}-group`;
        return (
          <li key={key} className={cx('ui-menu-entry', item.className)} role="none">
            <button
              type="button"
              className="ui-menu-action _toggle"
              role="menuitem"
              aria-expanded={node.expanded}
              aria-controls={groupId}
              disabled={item.disabled ?? false}
              {...entryProps(node)}
              onClick={() => {
                setFocusedKey(key);
                setExpanded(node, !node.expanded);
              }}
            >
              {entryContent(item, true)}
              {/* `_open` et non `_expanded` : `._expanded` est une classe utilitaire globale. */}
              <UiIcon
                className={cx('ui-menu-chevron', node.expanded && '_open')}
                name="chevron-down"
                size="sm"
              />
            </button>
            <div
              className={cx('ui-menu-collapse', node.expanded && '_open')}
              id={groupId}
              inert={!node.expanded}
            >
              <div className="ui-menu-collapse-inner">
                <ul className="ui-menu-group _nested" role="group">
                  {renderNodes(node.children)}
                </ul>
              </div>
            </div>
          </li>
        );
      }

      if (node.kind === 'flyout') {
        return (
          <MenuFlyoutEntry
            key={key}
            node={node}
            open={flyout?.key === key}
            takeFocus={flyout?.key === key && flyout.focus}
            level={level}
            size={size}
            motionDisabled={motionDisabled}
            renderItem={renderItem}
            renderHeader={renderHeader}
            entryProps={entryProps(node)}
            content={entryContent(item, false)}
            // Le clic ouvre sans basculer : le survol l'a déjà ouvert, une bascule le refermerait.
            onOpenFlyout={() => {
              setFocusedKey(key);
              setFlyout({ key, focus: false });
            }}
            onCloseFlyout={() => {
              setFlyout(null);
              focusEntry(key);
            }}
            onChildItemClick={(payload) => {
              onItemClick?.(payload);
              pointerStale.current = true;
              setFlyout(null);
              if (popup) close();
            }}
          />
        );
      }

      // --- Feuille ---------------------------------------------------------
      const shared = entryProps(node);
      const rootProps: UiMenuItemRootProps = {
        className: cx('ui-menu-action', item.active && '_active'),
        role: 'menuitem',
        tabIndex: shared.tabIndex,
        title: shared.title,
        'aria-label': shared['aria-label'],
        'data-key': key,
        'data-ripple': shared['data-ripple'],
        onClick: (event) => activate(event, node),
        onKeyDown: shared.onKeyDown,
        onMouseEnter: shared.onMouseEnter,
        onFocus: shared.onFocus,
      };

      return (
        <li key={key} className={cx('ui-menu-entry', item.className)} role="none">
          {item.render && !item.disabled ? (
            item.render(rootProps, entryContent(item, false))
          ) : item.url && !item.disabled ? (
            <a
              {...rootProps}
              href={item.url}
              target={item.target || undefined}
              rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
            >
              {entryContent(item, false)}
            </a>
          ) : (
            <button
              type="button"
              className={rootProps.className}
              role="menuitem"
              disabled={item.disabled ?? false}
              {...shared}
              onClick={(event) => activate(event, node)}
            >
              {entryContent(item, false)}
            </button>
          )}
        </li>
      );
    });

  const panel = (
    <div
      {...rest}
      ref={attachPanel}
      className={cx(
        'ui-menu',
        `_${level}`,
        size !== 'default' && `_${size}`,
        popup && '_popup',
        className,
      )}
      onPointerMove={(event) => {
        pointerStale.current = false;
        rest.onPointerMove?.(event);
      }}
      // `--ui-motion-duration` règle à la fois le repli et l'entrée du panneau.
      style={
        motionDisabled
          ? { ...(popup ? panelStyle : null), ['--ui-motion-duration' as string]: '0ms', ...style }
          : { ...(popup ? panelStyle : null), ...style }
      }
      {...(popup
        ? {
            popover: 'manual' as const,
            id: uid,
            // Invisible tant que la position, asynchrone, n'est pas calculée.
            'data-unpositioned': isPositioned ? undefined : '',
          }
        : null)}
    >
      {start && <div className="ui-menu-start">{start}</div>}
      {/* Clavier sur les entrées, pas sur la liste : `jsx-a11y` la voudrait focalisable. */}
      <ul
        className="ui-menu-list"
        role="menu"
        aria-label={ariaLabel || undefined}
        aria-labelledby={ariaLabelledBy || undefined}
      >
        {/* Faux positif de `react-hooks/refs` : refs lues seulement dans des gestionnaires. */}
        {/* eslint-disable react-hooks/refs */}
        {renderNodes(nodes)}
        {/* eslint-enable react-hooks/refs */}
      </ul>
      {end && <div className="ui-menu-end">{end}</div>}
    </div>
  );

  if (!popup) return panel;

  const triggerProps: UiMenuTriggerProps = {
    ref: attachTrigger,
    'aria-haspopup': 'menu',
    'aria-expanded': isOpen,
    'aria-controls': isOpen ? uid : undefined,
    onClick: () => (isOpen ? close() : setOpen(true)),
  };

  return (
    <>
      {/* Faux positif de `react-hooks/refs` : une ref de rappel est transmise, pas lue. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      {trigger?.(triggerProps)}
      {panel}
    </>
  );
}

/** Props communes à toutes les entrées, calculées par le menu. */
interface MenuEntryProps {
  tabIndex: number;
  'data-key': string;
  'data-ripple': 'on' | 'off';
  title?: string;
  'aria-label'?: string;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onMouseEnter: () => void;
  onFocus: () => void;
}

/** Props internes de l'entrée à sous-menu en cascade. */
interface MenuFlyoutEntryProps {
  node: MenuNode;
  open: boolean;
  takeFocus: boolean;
  level: UiSubLevel;
  size: MenuSize;
  motionDisabled: boolean;
  renderItem?: (item: UiMenuItem) => ReactNode;
  renderHeader?: (item: UiMenuItem) => ReactNode;
  entryProps: MenuEntryProps;
  content: ReactNode;
  onOpenFlyout: () => void;
  onCloseFlyout: () => void;
  onChildItemClick: (event: UiMenuItemCommandEvent) => void;
}

/**
 * Entrée qui ouvre un sous-menu en cascade. Un composant, et non une branche du
 * rendu récursif : chaque sous-menu a son propre crochet de positionnement.
 */
function MenuFlyoutEntry({
  node,
  open,
  takeFocus,
  level,
  size,
  motionDisabled,
  renderItem,
  renderHeader,
  entryProps,
  content,
  onOpenFlyout,
  onCloseFlyout,
  onChildItemClick,
}: MenuFlyoutEntryProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { setAnchor, setPanel, panelStyle, isPositioned } = useUiPosition<
    HTMLLIElement,
    HTMLDivElement
  >({
    placement: 'right-start',
    // Remonté de sa gouttière : son premier item s'aligne sur l'item parent.
    offset: { main: 0, cross: -PANEL_OFFSET },
    open,
  });

  const attachPanel = useCallback(
    (element: HTMLDivElement | null) => {
      panelRef.current = element;
      setPanel(element);
    },
    [setPanel],
  );

  useEffect(() => {
    const element = panelRef.current;
    if (!element) return;
    const shown = element.matches(':popover-open');
    if (open && !shown) element.showPopover();
    else if (!open && shown) element.hidePopover();
  }, [open]);

  // Le focus n'entre qu'à une ouverture au clavier, pas au survol.
  useEffect(() => {
    if (!open || !takeFocus) return;
    window.setTimeout(() =>
      panelRef.current?.querySelector<HTMLElement>('[data-key]:not([disabled])')?.focus(),
    );
  }, [open, takeFocus]);

  return (
    <li ref={setAnchor} className={cx('ui-menu-entry', node.item.className)} role="none">
      <button
        type="button"
        className={cx('ui-menu-action', '_has-sub', open && '_sub-open')}
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={node.item.disabled ?? false}
        {...entryProps}
        onClick={onOpenFlyout}
      >
        {content}
        <UiIcon className="ui-menu-chevron" name="chevron-right" size="sm" />
      </button>

      {/* Calque supérieur : sinon le `overflow: auto` du panneau parent le rognerait. */}
      <div
        ref={attachPanel}
        popover="manual"
        // Invisible tant que sa position n'est pas calculée (lu par `utils.overlay-motion-enter`).
        data-unpositioned={isPositioned ? undefined : ''}
        className="ui-menu-flyout"
        style={panelStyle}
      >
        <UiMenu
          items={node.item.items ?? []}
          level={level}
          size={size}
          submenus="flyout"
          motionDisabled={motionDisabled}
          renderItem={renderItem}
          renderHeader={renderHeader}
          className="_floating"
          aria-label={node.item.label}
          onItemClick={onChildItemClick}
          // Sur le panneau du sous-menu, pas sur l'enveloppe, pur porteur de coordonnées.
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'Escape') return;
            event.preventDefault();
            // Sinon Échap fermerait aussi le menu parent.
            event.stopPropagation();
            onCloseFlyout();
          }}
        />
      </div>
    </li>
  );
}
