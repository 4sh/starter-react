'use client';

import {
  useEffect,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
} from 'react';

import { UiIcon } from '../../base/ui-icon';
import type { UiLevel } from '../../core/types';
import { cx } from '../../core/utils';

import './ui-button.scss';

export type ButtonType = 'button' | 'submit' | 'reset';
export type ButtonSize = 'default' | 'small';
export type ButtonVariant = 'filled' | 'outlined' | 'ghost';
/** Luminosité du fond sur lequel le bouton est posé (voir la prop `onColor`). */
export type ButtonOnColor = 'dark' | 'light';
export type ButtonIconPos = 'left' | 'right' | 'top' | 'bottom';

/**
 * Props posées sur la racine, telles que `render` les reçoit.
 *
 * C'est le contrat du point d'extension : tout ce que le bouton aurait mis sur
 * son `<a>`, à reverser tel quel sur le composant de lien du projet.
 */
export interface UiButtonRootProps {
  className: string;
  href?: string;
  target?: string;
  rel?: string;
  tabIndex?: number;
  role?: string;
  'aria-label'?: string;
  'aria-disabled'?: 'true';
  /** Marqueur de l'onde de pression, lu par `UiRippleProvider`. */
  'data-ripple': 'on' | 'off';
  onClick: MouseEventHandler<HTMLElement>;
  /** Typée pour une ancre : les liens des routeurs transmettent leur ref à un `HTMLAnchorElement`. */
  ref?: Ref<HTMLAnchorElement>;
}

interface UiButtonOwnProps {
  /** Libellé textuel. Masqué visuellement en mode icône seule, où il devient le nom accessible. */
  label?: string;
  level?: UiLevel;
  variant?: ButtonVariant;
  /**
   * À renseigner **uniquement** quand le bouton est posé sur un fond de couleur
   * (bandeau, carte teintée, image) : indique la luminosité de ce fond, et le
   * bouton épingle son chrome en conséquence : `'dark'` donne du blanc,
   * `'light'` du sombre. Orthogonal à `level` et `variant`. Volontairement
   * **insensible au thème** : un bandeau violet reste violet en clair comme en
   * sombre.
   */
  onColor?: ButtonOnColor | null;
  size?: ButtonSize;
  /**
   * Icône. Une **chaîne** est un nom d'icône rendu par `ui-icon` ; un **nœud**
   * est rendu tel quel.
   */
  icon?: string | ReactNode;
  iconPos?: ButtonIconPos;
  /** Force le mode icône seule. Sinon il est déduit : une icône, aucun texte visible. */
  iconOnly?: boolean;
  loading?: boolean;
  /** Icône de chargement. Même règle que `icon` : chaîne ou nœud. */
  loadingIcon?: string | ReactNode;
  /** Occupe toute la largeur disponible. */
  expanded?: boolean;
  /** Présentation en pilule. */
  rounded?: boolean;
  /**
   * Onde de pression, quand elle est activée (`UiRippleProvider` ou
   * `useUiRippleScope`). `false` la coupe sur ce bouton, activation globale
   * comprise. Sans activation, le marqueur ne produit rien.
   */
  ripple?: boolean;
  disabled?: boolean;
  /** URL. Sa présence fait rendre un `<a>` au lieu d'un `<button>`. */
  href?: string;
  target?: string;
  /** `rel` de l'ancre. Par défaut `noopener noreferrer` quand `target="_blank"`. */
  rel?: string;
  /**
   * Rend la racine soi-même, pour brancher le composant de lien d'un routeur
   * (Next, React Router, TanStack), le kit n'en imposant aucun. Les props reçues
   * sont exactement celles que le bouton aurait posées sur son `<a>`.
   *
   * @example
   * ```tsx
   * <UiButton
   *   label="Voir la fiche"
   *   render={(props, children) => (
   *     <Link {...props} href="/fiche/12">
   *       {children}
   *     </Link>
   *   )}
   * />
   * ```
   */
  render?: (props: UiButtonRootProps, children: ReactNode) => ReactNode;
  /** Contenu projeté, à côté ou à la place du `label`. */
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

/**
 * La surface native reste ouverte : `...rest` transmet tout ce que le DOM
 * accepte (`aria-*`, `data-*`, `onFocus`, `form`, `name`…).
 */
export type UiButtonProps = UiButtonOwnProps &
  Omit<ComponentPropsWithRef<'button'>, keyof UiButtonOwnProps> &
  Pick<ComponentPropsWithoutRef<'a'>, 'download' | 'hrefLang' | 'ping' | 'referrerPolicy'>;

/** Avertissements déjà émis, pour rester idempotent sous `<StrictMode>`. */
const warned = new Set<string>();

/** Un nœud porte-t-il un contenu visible ? */
function hasContent(node: ReactNode): boolean {
  if (node === null || node === undefined || typeof node === 'boolean') return false;
  if (typeof node === 'string') return node.trim() !== '';
  if (typeof node === 'number') return true;
  if (Array.isArray(node)) return node.some(hasContent);
  return true;
}

/**
 * ui-button : bouton d'action.
 *
 * Trois axes de couleur qui se composent : `level` × `variant` × `onColor`.
 * Rend un `<button>` natif, ou un `<a>` dès que `href` est renseigné.
 */
export function UiButton({
  label,
  level = 'high',
  variant = 'filled',
  onColor = null,
  size = 'default',
  icon,
  iconPos = 'left',
  iconOnly = false,
  loading = false,
  loadingIcon = 'circle-notch',
  expanded = false,
  rounded = false,
  ripple = true,
  disabled = false,
  href,
  target,
  rel,
  render,
  children,
  type = 'button',
  className,
  onClick,
  tabIndex,
  // Hors de `...rest` : la racine est un <button> ou un <a>, la cible du ref change de type.
  ref,
  ...rest
}: UiButtonProps) {
  const ariaLabel = rest['aria-label'];

  const hasIcon = icon !== undefined && icon !== null && icon !== '';
  const hasVisibleText = Boolean(label) || hasContent(children);
  const stacked = iconPos === 'top' || iconPos === 'bottom';
  const iconBefore = iconPos === 'left' || iconPos === 'top';

  // Une icône empilée n'entre jamais en mode icône seule : elle suppose un libellé.
  const isIconOnly = iconOnly || (!stacked && !hasVisibleText && hasIcon);

  const accessibleLabel = ariaLabel ?? (isIconOnly ? label : undefined);

  const isLink = Boolean(href) || Boolean(render);
  const computedRel = rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (isIconOnly && !accessibleLabel) {
      const key = typeof icon === 'string' ? icon : 'node';
      if (warned.has(key)) return;
      warned.add(key);
      console.warn(
        `[ui-button] Bouton en icône seule sans nom accessible : renseignez ` +
          `\`aria-label\` (ou \`label\`, masqué visuellement dans ce mode).`,
      );
    }
  }, [isIconOnly, accessibleLabel, icon]);

  const classes = cx(
    'ui-button',
    `_${level}`,
    size !== 'default' && `_${size}`,
    variant !== 'filled' && `_${variant}`,
    onColor && `_on-${onColor}`,
    expanded && '_expanded',
    rounded && '_rounded',
    isIconOnly && '_icon-only',
    loading && '_loading',
    // Un `<a>` n'a pas de `disabled` natif : la classe porte l'état visuel.
    isLink && disabled && '_disabled',
    iconPos === 'top' && '_icon-top',
    iconPos === 'bottom' && '_icon-bottom',
    className,
  );

  const handleClick: MouseEventHandler<HTMLElement> = (event) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    (onClick as MouseEventHandler<HTMLElement> | undefined)?.(event as MouseEvent<HTMLElement>);
  };

  const iconNode = loading ? (
    typeof loadingIcon === 'string' ? (
      <i
        className={`ui-button-icon ui-button-icon-loading fa-solid fa-${loadingIcon} fa-spin`}
        aria-hidden="true"
      />
    ) : (
      loadingIcon
    )
  ) : !hasIcon ? null : typeof icon === 'string' ? (
    <UiIcon className="ui-button-icon" name={icon} size={size === 'small' ? 'sm' : 'default'} />
  ) : (
    icon
  );

  const inner = (
    <>
      {iconBefore && iconNode}
      {/* Toujours rendu : `.ui-button-content:empty` l'escamote quand il est vide. */}
      <span className="ui-button-content">
        {label && !isIconOnly && <span className="ui-button-label">{label}</span>}
        {children}
      </span>
      {!iconBefore && iconNode}
    </>
  );

  if (isLink) {
    const rootProps: UiButtonRootProps = {
      className: classes,
      href: disabled ? undefined : href,
      target,
      rel: computedRel,
      tabIndex: disabled ? -1 : tabIndex,
      role: 'button',
      'aria-label': accessibleLabel,
      'aria-disabled': disabled ? 'true' : undefined,
      'data-ripple': ripple ? 'on' : 'off',
      onClick: handleClick,
      ref: ref as Ref<HTMLAnchorElement> | undefined,
    };

    if (render) return <>{render(rootProps, inner)}</>;

    // Cast : les attributs propres au <button> (`form`, `name`…) sont ignorés par une ancre.
    const anchorRest = rest as ComponentPropsWithoutRef<'a'>;
    return (
      <a {...anchorRest} {...rootProps}>
        {inner}
      </a>
    );
  }

  return (
    <button
      {...rest}
      ref={ref as Ref<HTMLButtonElement> | undefined}
      className={classes}
      type={type}
      disabled={disabled || loading}
      tabIndex={tabIndex}
      aria-busy={loading ? true : undefined}
      aria-label={accessibleLabel}
      data-ripple={ripple ? 'on' : 'off'}
      onClick={handleClick}
    >
      {inner}
    </button>
  );
}
