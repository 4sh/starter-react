'use client';

import {
  useEffect,
  type ComponentPropsWithRef,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
} from 'react';

import { UiIcon, type UiIconSize } from '../../base/ui-icon';
import { cx } from '../../core/utils';

import './ui-link.scss';

export type LinkSize = 'default' | 'small';

/**
 * Props posées sur la racine, telles que `render` les reçoit.
 *
 * C'est le contrat du point d'extension : tout ce que le lien aurait mis sur
 * son `<a>`, à reverser tel quel sur le composant de lien du projet.
 */
export interface UiLinkRootProps {
  className: string;
  href?: string;
  target?: string;
  rel?: string;
  tabIndex?: number;
  'aria-label'?: string;
  'aria-current'?: ComponentPropsWithRef<'a'>['aria-current'];
  'aria-disabled'?: 'true';
  onClick: MouseEventHandler<HTMLAnchorElement>;
  ref?: Ref<HTMLAnchorElement>;
}

/** Avertissements déjà émis, pour rester idempotent sous `<StrictMode>`. */
const warned = new Set<string>();

type NativeProps = Omit<ComponentPropsWithRef<'a'>, 'href' | 'target' | 'rel' | 'ref'>;

export interface UiLinkProps extends NativeProps {
  /** Texte du lien. Absent, le contenu projeté ou l'icône en tient lieu. */
  label?: string;
  size?: LinkSize;
  href?: string;
  target?: string;
  /** `rel` de l'ancre. Par défaut `noopener noreferrer` quand `target="_blank"`. */
  rel?: string;
  /** Raccourci lien externe : pose `target="_blank"` et un `rel` sûr. */
  external?: boolean;
  /** Nom d'icône, rendu avant le texte. */
  iconLeft?: string;
  /** Nom d'icône, rendu après le texte. */
  iconRight?: string;
  /** Neutralise le lien : plus de `href`, hors du parcours clavier, clic annulé. */
  disabled?: boolean;
  /** Nom accessible. Obligatoire en icône seule. */
  'aria-label'?: string;
  /**
   * Rend la racine avec un autre composant, typiquement le lien d'un routeur
   * (Next, React Router, TanStack).
   *
   * Le kit n'impose aucun routeur : là où la version Angular dépendait de
   * `RouterLink`, celle-ci passe la main. Les props reçues sont exactement
   * celles que le lien aurait posées sur son `<a>`.
   *
   * @example
   * ```tsx
   * <UiLink
   *   label="Voir la fiche"
   *   render={(props, children) => (
   *     <Link {...props} href="/fiche/12">
   *       {children}
   *     </Link>
   *   )}
   * />
   * ```
   */
  render?: (props: UiLinkRootProps, children: ReactNode) => ReactNode;
  children?: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
}

/**
 * ui-link : lien textuel en ligne, qui rend une vraie ancre.
 *
 * Le choix se fait sur le sens, pas sur l'apparence. Ce qui **navigue** vers une
 * URL est un lien ; ce qui **déclenche** une action est un `ui-button`, même
 * quand le design demande l'inverse de ce qu'on attendrait.
 *
 * Les états interactifs viennent du CSS, jamais des props.
 */
export function UiLink({
  label,
  size = 'default',
  href,
  target,
  rel,
  external = false,
  iconLeft,
  iconRight,
  disabled = false,
  render,
  children,
  className,
  tabIndex,
  onClick,
  ref,
  ...rest
}: UiLinkProps) {
  const ariaLabel = rest['aria-label'];

  const isIconOnly = !label && !children && Boolean(iconLeft ?? iconRight);
  const accessibleLabel = ariaLabel ?? (isIconOnly ? label : undefined);

  const computedTarget = target ?? (external ? '_blank' : undefined);
  const computedRel = rel ?? (computedTarget === '_blank' ? 'noopener noreferrer' : undefined);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (isIconOnly && !accessibleLabel) {
      const key = iconLeft ?? iconRight ?? 'icon';
      if (warned.has(key)) return;
      warned.add(key);
      console.warn(
        `[ui-link] Lien en icône seule sans nom accessible : renseignez \`aria-label\`.`,
      );
    }
  }, [isIconOnly, accessibleLabel, iconLeft, iconRight]);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  const iconSize: UiIconSize = size === 'small' ? 'sm' : 'default';

  const inner = (
    <>
      {iconLeft && <UiIcon className="ui-link-icon" name={iconLeft} size={iconSize} />}
      <span className="ui-link-content">
        {label && !isIconOnly && <span className="ui-link-label">{label}</span>}
        {children}
      </span>
      {iconRight && <UiIcon className="ui-link-icon" name={iconRight} size={iconSize} />}
    </>
  );

  const rootProps: UiLinkRootProps = {
    className: cx(
      'ui-link',
      size !== 'default' && `_${size}`,
      isIconOnly && '_icon-only',
      disabled && '_disabled',
      className,
    ),
    // Une ancre n'a pas de `disabled` natif : retirer le `href` est ce qui la
    // sort réellement du parcours, le reste n'est que cosmétique.
    href: disabled ? undefined : href,
    target: computedTarget,
    rel: computedRel,
    tabIndex: disabled ? -1 : tabIndex,
    'aria-label': accessibleLabel,
    'aria-current': rest['aria-current'],
    'aria-disabled': disabled ? 'true' : undefined,
    onClick: handleClick,
    ref,
  };

  if (render) return <>{render(rootProps, inner)}</>;

  return (
    <a {...rest} {...rootProps}>
      {inner}
    </a>
  );
}
