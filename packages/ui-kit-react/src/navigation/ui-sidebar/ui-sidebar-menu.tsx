'use client';

import {
  useId,
  useMemo,
  type ComponentPropsWithRef,
  type FocusEventHandler,
  type MouseEvent,
  type PointerEventHandler,
  type ReactNode,
  type Ref,
} from 'react';

import { UiIcon } from '../../base/ui-icon';
import { useControllableState } from '../../core/forms';
import type { UiFeedbackLevel, UiSubLevel } from '../../core/types';
import { cx } from '../../core/utils';
import { UiBadge } from '../../informative/ui-badge';
import { UiTooltip } from '../../informative/ui-tooltip';

import { useEnclosingSidebar } from './ui-sidebar';

import './ui-sidebar-menu.scss';

/** Densité du menu. */
export type SidebarMenuSize = 'default' | 'small';

/** Ce que reçoivent `command` et `onItemClick`. */
export interface UiSidebarMenuItemCommandEvent {
  originalEvent: MouseEvent<HTMLElement>;
  item: UiSidebarMenuItem;
}

/**
 * Props posées sur l'action d'une entrée, telles que `render` les reçoit : tout
 * ce que le menu aurait mis sur son `<a>`, à reverser sur le lien du routeur.
 */
export interface UiSidebarMenuItemRootProps {
  className: string;
  href?: string;
  target?: string;
  rel?: string;
  title?: string;
  'aria-label'?: string;
  'aria-current'?: 'page';
  'aria-describedby'?: string;
  /** Marqueur de l'onde de pression, lu par `UiRippleProvider`. */
  'data-ripple': 'on' | 'off';
  onClick: (event: MouseEvent<HTMLElement>) => void;
  onPointerEnter: PointerEventHandler<HTMLElement>;
  onPointerLeave: PointerEventHandler<HTMLElement>;
  onFocus: FocusEventHandler<HTMLElement>;
  onBlur: FocusEventHandler<HTMLElement>;
  /** Ref de rappel de l'info-bulle, à reverser pour qu'elle trouve son ancre. */
  ref: (node: HTMLElement | null) => void;
}

/**
 * Entrée déclarative du menu. Une entrée est un séparateur, une feuille
 * (commande, lien ou lien de routeur), une **section** libellée, ou un
 * **groupe** repliable (`toggleable`) qui révèle un sous-arbre.
 */
export interface UiSidebarMenuItem {
  /** Identifiant stable : il porte l'état déplié. À défaut, une clé de position. */
  id?: string;
  /** Texte de l'entrée ou de l'en-tête de groupe. */
  label?: string;
  /** Icône de tête, par son nom. Seule visible dans le rail replié. */
  icon?: string;
  /** Entrées enfants : l'entrée devient une section ou un groupe. */
  items?: UiSidebarMenuItem[];
  /** Rendre un séparateur à la place d'une entrée. */
  separator?: boolean;
  disabled?: boolean;
  /** Masquer l'entrée. Visible par défaut. */
  visible?: boolean;
  /** Appelée à l'activation de la feuille. */
  command?: (event: UiSidebarMenuItemCommandEvent) => void;
  /** Destination : la feuille devient une ancre. */
  url?: string;
  target?: string;
  /** Entrée courante. C'est l'application qui le sait, routeur ou non. */
  active?: boolean;
  /** Badge de fin (compte, statut), rendu par `ui-badge`. */
  badge?: string;
  /** Niveau du badge. `default` par défaut. */
  badgeLevel?: UiFeedbackLevel;
  /** Forcer l'icône « ouvre ailleurs ». Automatique avec `target="_blank"`. */
  external?: boolean;
  /**
   * Groupe repliable. Faux par défaut au premier niveau (un en-tête de section),
   * vrai pour un groupe imbriqué. Sans effet sur une entrée sans enfants.
   */
  toggleable?: boolean;
  /** Groupe déplié au départ. `expandedKeys` l'emporte. */
  expanded?: boolean;
  /** Nom accessible. */
  ariaLabel?: string;
  /** Classe(s) posée(s) sur l'élément de liste de l'entrée. */
  className?: string;
  /**
   * Rend l'action soi-même, en reversant les props reçues. C'est ainsi qu'on
   * branche le lien d'un routeur, le kit n'en imposant aucun.
   */
  render?: (props: UiSidebarMenuItemRootProps, children: ReactNode) => ReactNode;
}

export interface UiSidebarMenuProps extends Omit<ComponentPropsWithRef<'nav'>, 'children'> {
  items?: UiSidebarMenuItem[];
  /** Famille de jetons de navigation. */
  level?: UiSubLevel;
  size?: SidebarMenuSize;
  /** Rail replié en usage autonome. Une `UiSidebar` parente l'emporte. */
  collapsed?: boolean;
  /** Animer l'ouverture des groupes imbriqués. */
  motion?: boolean;
  /** Dans le rail replié, montrer le libellé de chaque entrée en info-bulle. */
  tooltips?: boolean;
  /**
   * Onde de pression sur les entrées, quand elle est activée. `false` la coupe
   * sur ce menu, activation globale comprise.
   */
  ripple?: boolean;
  /** Groupes dépliés imposés. Renseignés, le dépliage est contrôlé. */
  expandedKeys?: string[];
  defaultExpandedKeys?: string[];
  onExpandedKeysChange?: (keys: string[]) => void;
  /** Appelé à l'activation d'une feuille. */
  onItemClick?: (event: UiSidebarMenuItemCommandEvent) => void;
  ref?: Ref<HTMLElement>;
}

/** Nœud prêt à rendre. */
interface MenuNode {
  item: UiSidebarMenuItem;
  key: string;
  kind: 'separator' | 'section' | 'group' | 'item';
  children: MenuNode[];
  depth: number;
  /** Un descendant est actif : dépliage d'office et `_active-within`. */
  activeWithin: boolean;
}

function resolve(items: UiSidebarMenuItem[], depth: number, prefix: string): MenuNode[] {
  const nodes: MenuNode[] = [];
  items.forEach((item, index) => {
    if (item.visible === false) return;
    const key = item.id ?? `${prefix}-${index}`;
    if (item.separator) {
      nodes.push({ item, key, kind: 'separator', children: [], depth, activeWithin: false });
      return;
    }
    if (item.items?.length) {
      const children = resolve(item.items, depth + 1, key);
      const toggleable = item.toggleable ?? depth > 0;
      const activeWithin = children.some((c) => c.item.active || c.activeWithin);
      nodes.push({
        item,
        key,
        kind: toggleable ? 'group' : 'section',
        children,
        depth,
        activeWithin,
      });
      return;
    }
    nodes.push({ item, key, kind: 'item', children: [], depth, activeWithin: false });
  });
  return nodes;
}

function seedKeys(nodes: MenuNode[], out: string[] = []): string[] {
  for (const node of nodes) {
    if (node.kind === 'group' && (node.item.expanded || node.activeWithin)) out.push(node.key);
    if (node.children.length) seedKeys(node.children, out);
  }
  return out;
}

/**
 * ui-sidebar-menu : menu de navigation déclaratif pour `ui-sidebar`.
 *
 * Rend un modèle `UiSidebarMenuItem[]` dans un `<nav>` ; un groupe qui contient
 * l'entrée courante se déplie d'office. Posé dans une `UiSidebar`, il se replie
 * avec elle en rail d'icônes ; seul, `collapsed` pilote le rail.
 */
export function UiSidebarMenu({
  items = [],
  level = 'high',
  size = 'default',
  collapsed = false,
  motion = true,
  tooltips = false,
  ripple = true,
  expandedKeys,
  defaultExpandedKeys,
  onExpandedKeysChange,
  onItemClick,
  className,
  ...rest
}: UiSidebarMenuProps) {
  const uid = useId();
  const sidebar = useEnclosingSidebar();
  // Seule la barre qui CONTIENT le menu l'emporte, pas celle publiée par un fournisseur.
  const isCollapsed = sidebar ? sidebar.collapsed : collapsed;
  const showTooltips = tooltips && isCollapsed;

  const nodes = useMemo(() => resolve(items, 0, 'n'), [items]);

  // Tant que rien n'est déplié à la main, les groupes ouverts se déduisent du
  // modèle (`expanded`, entrée courante) ; le premier dépliage fige la liste.
  const [keys, setKeys] = useControllableState<string[] | undefined>({
    value: expandedKeys,
    defaultValue: defaultExpandedKeys,
    onChange: onExpandedKeysChange as ((next: string[] | undefined) => void) | undefined,
  });
  const expandedSet = new Set(keys ?? seedKeys(nodes));

  const toggle = (node: MenuNode) => {
    if (node.item.disabled) return;
    const next = new Set(expandedSet);
    if (next.has(node.key)) next.delete(node.key);
    else next.add(node.key);
    setKeys([...next]);
  };

  const activate = (event: MouseEvent<HTMLElement>, node: MenuNode) => {
    if (node.item.disabled) return;
    node.item.command?.({ originalEvent: event, item: node.item });
    onItemClick?.({ originalEvent: event, item: node.item });
  };

  /** Nom accessible, et cible d'info-bulle, dans le rail replié. */
  const railTitle = (node: MenuNode) =>
    isCollapsed ? (node.item.ariaLabel ?? node.item.label) : node.item.ariaLabel;

  /** Identifiants de DOM : préfixés par l'instance, deux menus ne se marchent pas dessus. */
  const domId = (node: MenuNode, suffix: string) => `${uid}${node.key}-${suffix}`;

  const icon = (name: string | undefined) =>
    name ? <UiIcon className="ui-sidebar-menu-icon" name={name} size="sm" /> : null;

  const badge = (node: MenuNode) =>
    node.item.badge ? (
      <UiBadge
        className="ui-sidebar-menu-badge"
        value={node.item.badge}
        level={node.item.badgeLevel ?? 'default'}
        size="small"
      />
    ) : null;

  const renderNodes = (list: MenuNode[]): ReactNode =>
    list.map((node) => {
      switch (node.kind) {
        case 'separator':
          return (
            <li
              key={node.key}
              className="ui-sidebar-menu-separator"
              role="separator"
              aria-hidden="true"
            />
          );

        case 'section':
          return (
            <li key={node.key} className={cx('ui-sidebar-menu-section', node.item.className)}>
              <span className="ui-sidebar-menu-section-header" id={domId(node, 'h')}>
                {icon(node.item.icon)}
                <span className="ui-sidebar-menu-label">{node.item.label}</span>
              </span>
              <ul className="ui-sidebar-menu-sub" role="list" aria-labelledby={domId(node, 'h')}>
                {renderNodes(node.children)}
              </ul>
            </li>
          );

        case 'group': {
          const open = expandedSet.has(node.key);
          const title = railTitle(node);
          return (
            <li
              key={node.key}
              className={cx(
                'ui-sidebar-menu-entry',
                node.activeWithin && '_active-within',
                node.item.className,
              )}
            >
              <UiTooltip
                content={node.item.label}
                position="right"
                disabled={!showTooltips}
                trigger={(tip) => (
                  <button
                    {...tip}
                    type="button"
                    className="ui-sidebar-menu-action _toggle"
                    data-ripple={ripple ? 'on' : 'off'}
                    aria-expanded={open}
                    aria-controls={domId(node, 'g')}
                    aria-label={title}
                    title={showTooltips ? undefined : title}
                    disabled={node.item.disabled}
                    onClick={() => {
                      tip.onClick();
                      toggle(node);
                    }}
                  >
                    {icon(node.item.icon)}
                    <span className="ui-sidebar-menu-label">{node.item.label}</span>
                    {badge(node)}
                    {/* `_open` et non `_expanded` : une classe utilitaire globale porte ce nom. */}
                    <UiIcon
                      className={cx('ui-sidebar-menu-chevron', open && '_open')}
                      name="chevron-down"
                      size="sm"
                    />
                  </button>
                )}
              />
              <div
                className={cx('ui-sidebar-menu-collapse', open && '_open')}
                id={domId(node, 'g')}
                inert={!open}
              >
                <div className="ui-sidebar-menu-collapse-inner">
                  <ul className="ui-sidebar-menu-sub _nested" role="list">
                    {renderNodes(node.children)}
                  </ul>
                </div>
              </div>
            </li>
          );
        }

        case 'item': {
          const { item } = node;
          const title = railTitle(node);
          const external = item.external === true || item.target === '_blank';
          const content = (
            <>
              {icon(item.icon)}
              <span className="ui-sidebar-menu-label">{item.label}</span>
              {external && (
                <UiIcon
                  className="ui-sidebar-menu-external"
                  name="arrow-up-right-from-square"
                  size="sm"
                  aria-hidden="true"
                />
              )}
              {badge(node)}
            </>
          );
          return (
            <li key={node.key} className={cx('ui-sidebar-menu-entry', item.className)}>
              <UiTooltip
                content={item.label}
                position="right"
                disabled={!showTooltips}
                trigger={(tip) => {
                  const onClick = (event: MouseEvent<HTMLElement>) => {
                    tip.onClick();
                    activate(event, node);
                  };
                  const shared = {
                    ...tip,
                    className: cx('ui-sidebar-menu-action', item.active && '_active'),
                    'data-ripple': ripple ? ('on' as const) : ('off' as const),
                    title: showTooltips ? undefined : title,
                    'aria-label': title,
                    onClick,
                  };

                  if ((item.render || item.url) && !item.disabled) {
                    const props: UiSidebarMenuItemRootProps = {
                      ...shared,
                      href: item.url,
                      target: item.target,
                      rel: item.target === '_blank' ? 'noopener noreferrer' : undefined,
                      'aria-current': item.active ? 'page' : undefined,
                    };
                    if (item.render) return item.render(props, content);
                    return <a {...props}>{content}</a>;
                  }
                  return (
                    <button
                      {...shared}
                      type="button"
                      aria-current={item.active ? 'true' : undefined}
                      disabled={item.disabled}
                    >
                      {content}
                    </button>
                  );
                }}
              />
            </li>
          );
        }
      }
    });

  return (
    <nav
      {...rest}
      className={cx(
        'ui-sidebar-menu',
        `_${level}`,
        size !== 'default' && `_${size}`,
        isCollapsed && '_collapsed',
        !motion && '_no-motion',
        className,
      )}
    >
      {/* `role="list"` explicite : Safari retire la sémantique d'une liste en `list-style: none`. */}
      <ul className="ui-sidebar-menu-list" role="list">
        {renderNodes(nodes)}
      </ul>
    </nav>
  );
}
