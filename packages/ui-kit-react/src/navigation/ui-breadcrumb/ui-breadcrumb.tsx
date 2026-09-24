'use client';

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
} from 'react';

import { UiIcon, type UiIconSize } from '../../base/ui-icon';
import { cx } from '../../core/utils';

import './ui-breadcrumb.scss';

export type BreadcrumbSize = 'default' | 'small';

/** Charge passée à `command` et à `onItemClick`. */
export interface UiBreadcrumbItemCommandEvent {
  originalEvent: SyntheticEvent;
  item: UiBreadcrumbItem;
}

/**
 * Props posées sur le maillon, telles que `render` les reçoit.
 *
 * C'est le contrat du point d'extension : tout ce que le fil aurait mis sur son
 * `<a>`, à reverser tel quel sur le composant de lien du projet.
 */
export interface UiBreadcrumbItemRootProps {
  className: string;
  href?: string;
  target?: string;
  rel?: string;
  'aria-label'?: string;
  'aria-current'?: 'page';
  onClick: MouseEventHandler<HTMLElement>;
  /** Typée pour une ancre : les liens des routeurs transmettent leur ref à un `HTMLAnchorElement`. */
  ref?: Ref<HTMLAnchorElement>;
}

/**
 * Maillon déclaratif du fil.
 *
 * Il navigue par `url`, ou par `render` pour brancher un routeur, et peut
 * déclencher une `command`. Sans destination, ce n'est qu'un libellé.
 */
export interface UiBreadcrumbItem {
  /** Texte du maillon. */
  label?: string;
  /** Icône de tête, par son nom. Seule, elle fait un maillon d'icône. */
  icon?: string;
  /** Nom accessible. Obligatoire sur un maillon réduit à son icône. */
  ariaLabel?: string;
  /** Destination : le maillon devient une ancre. */
  url?: string;
  /** Cible de l'ancre. */
  target?: string;
  /** `rel` de l'ancre. Par défaut `noopener noreferrer` avec `target="_blank"`. */
  rel?: string;
  /** Appelée au clic sur le maillon. */
  command?: (event: UiBreadcrumbItemCommandEvent) => void;
  /** Maillon désactivé : plus de navigation, et hors du parcours clavier. */
  disabled?: boolean;
  /** Maillon masqué. */
  visible?: boolean;
  /** Classe(s) posée(s) sur le `<li>` du maillon. */
  className?: string;
  /**
   * Rend le maillon soi-même, en reversant les props reçues. C'est ainsi qu'on
   * branche le lien d'un routeur, le kit n'en imposant aucun.
   */
  render?: (props: UiBreadcrumbItemRootProps, children: ReactNode) => ReactNode;
}

/** Une entrée prête à rendre : un maillon, ou les points de suspension. */
interface BreadcrumbEntry {
  kind: 'item' | 'ellipsis';
  item?: UiBreadcrumbItem;
  key: string;
  last: boolean;
}

/** Descendants focalisables d'un maillon, natifs comme projetés par `render`. */
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Instances déjà averties, pour n'avertir qu'une fois chacune. */
const prevenus = new Set<UiBreadcrumbItem[]>();

export interface UiBreadcrumbProps extends Omit<
  ComponentPropsWithRef<'nav'>,
  'children' | 'onClick'
> {
  /** Les maillons, dans l'ordre de la hiérarchie. */
  items?: UiBreadcrumbItem[];
  /** Densité : `small` resserre le rendu. */
  size?: BreadcrumbSize;
  /** Ce qui sépare deux maillons. Une chaîne suffit, mais n'importe quel nœud passe. */
  separator?: ReactNode;
  /**
   * Nombre maximum de maillons affichés, minimum 2. Au-delà, le milieu se replie
   * derrière un bouton « … » : premier maillon, puis les derniers. Absent, rien
   * ne se replie.
   */
  maxItems?: number;
  /** Nom accessible du repère `<nav>`. */
  'aria-label'?: string;
  /** Nom accessible du bouton qui déplie les maillons masqués. */
  ellipsisAriaLabel?: string;
  /** Notifié au clic sur un maillon, jamais sur un maillon désactivé. */
  onItemClick?: (event: UiBreadcrumbItemCommandEvent) => void;
  /** Rend le contenu d'un maillon à la place de l'icône et du libellé. */
  renderItem?: (item: UiBreadcrumbItem, context: { last: boolean }) => ReactNode;
}

/**
 * ui-breadcrumb : le fil d'Ariane, qui situe la page dans sa hiérarchie.
 *
 * Chaque maillon rend l'élément natif qui correspond à sa sémantique, jamais une
 * enveloppe : une ancre s'il mène quelque part, un bouton s'il n'agit que, un
 * simple texte sinon. Le dernier maillon est la page courante, et porte
 * `aria-current="page"`.
 */
export function UiBreadcrumb({
  items = [],
  size = 'default',
  separator = '/',
  maxItems,
  ellipsisAriaLabel = 'Afficher les éléments masqués',
  onItemClick,
  renderItem,
  className,
  ...rest
}: UiBreadcrumbProps) {
  const ariaLabel = rest['aria-label'] ?? "Fil d'Ariane";
  delete rest['aria-label'];

  // Le dépliage se referme quand le modèle change : les maillons masqués ne sont plus les mêmes.
  const [expanded, setExpanded] = useState(false);
  const [lastItems, setLastItems] = useState(items);
  if (lastItems !== items) {
    setLastItems(items);
    setExpanded(false);
  }

  const listRef = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (prevenus.has(items)) return;
    const anonymes = items.filter(
      (item) => item.visible !== false && item.icon && !item.label && !item.ariaLabel,
    );
    if (!anonymes.length) return;
    prevenus.add(items);
    console.warn(
      '[ui-breadcrumb] Maillon réduit à son icône sans nom accessible : renseignez `ariaLabel`.',
      anonymes,
    );
  }, [items]);

  // Au dépliage, le focus passe au premier maillon révélé : le bouton qui le
  // portait disparaît, et il retomberait sur le corps.
  useEffect(() => {
    if (!expanded) return;
    const crumbs = [
      ...(listRef.current?.querySelectorAll<HTMLElement>('.ui-breadcrumb-item') ?? []),
    ];
    for (const crumb of crumbs.slice(1)) {
      const focusable = crumb.querySelector<HTMLElement>(FOCUSABLE);
      if (focusable) {
        focusable.focus();
        return;
      }
    }
  }, [expanded]);

  const iconSize: UiIconSize = size === 'small' ? 'sm' : 'default';

  const visible = items.filter((item) => item.visible !== false);
  const kept = maxItems != null ? Math.max(2, maxItems) : Infinity;

  let entries: BreadcrumbEntry[];
  if (!expanded && visible.length > kept) {
    const from = visible.length - (kept - 1);
    entries = [
      { kind: 'item', item: visible[0], key: 'item-0', last: false },
      { kind: 'ellipsis', key: 'ellipsis', last: false },
      ...visible.slice(from).map((item, index) => ({
        kind: 'item' as const,
        item,
        key: `item-${from + index}`,
        last: false,
      })),
    ];
  } else {
    entries = visible.map((item, index) => ({
      kind: 'item' as const,
      item,
      key: `item-${index}`,
      last: false,
    }));
  }
  if (entries.length) entries[entries.length - 1]!.last = true;

  const activate = (event: MouseEvent<HTMLElement>, item: UiBreadcrumbItem) => {
    if (item.disabled) return;
    item.command?.({ originalEvent: event, item });
    onItemClick?.({ originalEvent: event, item });
  };

  const content = (item: UiBreadcrumbItem): ReactNode => (
    <>
      {item.icon && <UiIcon className="ui-breadcrumb-icon" name={item.icon} size={iconSize} />}
      {item.label && <span className="ui-breadcrumb-label">{item.label}</span>}
    </>
  );

  const crumb = (item: UiBreadcrumbItem, last: boolean): ReactNode => {
    const custom = renderItem?.(item, { last });
    if (custom !== undefined) return custom;

    const inner = content(item);
    const current = last ? ('page' as const) : undefined;
    const rel = item.rel ?? (item.target === '_blank' ? 'noopener noreferrer' : undefined);

    if (!item.disabled && item.render) {
      return item.render(
        {
          className: 'ui-breadcrumb-link',
          href: item.url,
          target: item.target,
          rel,
          'aria-label': item.ariaLabel,
          'aria-current': current,
          onClick: (event) => activate(event, item),
        },
        inner,
      );
    }

    if (!item.disabled && item.url) {
      return (
        <a
          className="ui-breadcrumb-link"
          href={item.url}
          target={item.target}
          rel={rel}
          aria-label={item.ariaLabel}
          aria-current={current}
          onClick={(event) => activate(event, item)}
        >
          {inner}
        </a>
      );
    }

    if (!item.disabled && item.command) {
      return (
        <button
          type="button"
          className="ui-breadcrumb-link"
          aria-label={item.ariaLabel}
          aria-current={current}
          onClick={(event) => activate(event, item)}
        >
          {inner}
        </button>
      );
    }

    // Un maillon désactivé s'énonce `role="link"` + `aria-disabled` : le rôle
    // est requis, `aria-disabled` n'étant pas un attribut global.
    return (
      <span
        className={cx('ui-breadcrumb-text', last && '_current', item.disabled && '_disabled')}
        role={item.disabled ? 'link' : undefined}
        aria-disabled={item.disabled ? true : undefined}
        aria-label={item.ariaLabel}
        aria-current={current}
      >
        {inner}
      </span>
    );
  };

  return (
    <nav
      {...rest}
      className={cx('ui-breadcrumb', size !== 'default' && `_${size}`, className)}
      aria-label={ariaLabel || undefined}
    >
      <ol ref={listRef} className="ui-breadcrumb-list">
        {entries.map((entry, index) => (
          <Fragment key={entry.key}>
            {entry.kind === 'ellipsis' ? (
              <li className="ui-breadcrumb-item">
                <button
                  type="button"
                  className="ui-breadcrumb-ellipsis"
                  aria-label={ellipsisAriaLabel || undefined}
                  aria-expanded={false}
                  onClick={() => setExpanded(true)}
                >
                  <UiIcon name="ellipsis" size={iconSize} />
                </button>
              </li>
            ) : (
              <li className={cx('ui-breadcrumb-item', entry.item!.className)}>
                {crumb(entry.item!, entry.last)}
              </li>
            )}

            {index < entries.length - 1 && (
              <li className="ui-breadcrumb-separator" aria-hidden="true">
                {separator}
              </li>
            )}
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
