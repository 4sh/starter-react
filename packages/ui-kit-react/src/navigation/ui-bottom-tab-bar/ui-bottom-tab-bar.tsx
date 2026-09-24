'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';

import { UiIcon, type UiIconType } from '../../base/ui-icon';
import { useControllableState } from '../../core/forms';
import type { UiLevel } from '../../core/types';
import { cx } from '../../core/utils';

import './ui-bottom-tab-bar.scss';

/** Identifiant d'un onglet, comparé à la valeur de la barre. */
export type UiBottomTabValue = string | number;

/** Charge émise quand la destination active change. */
export interface UiBottomTabBarChangeEvent {
  /** Valeur de l'onglet devenu actif. */
  value: UiBottomTabValue;
  /** L'événement DOM d'origine : clic ou touche. */
  originalEvent: SyntheticEvent;
}

/** Les contrôles que les flèches parcourent. */
const CONTROL_SELECTOR = '.ui-bottom-tab, .ui-bottom-tab-action';

/** Instances déjà averties, pour n'avertir qu'une fois chacune. */
const prevenus = new Set<string>();

/** Ce que la barre partage avec ses onglets. */
interface UiBottomTabBarApi {
  showLabels: boolean;
  ripple: boolean;
  isActive: (value: UiBottomTabValue) => boolean;
  activate: (value: UiBottomTabValue, event: MouseEvent<HTMLElement>) => void;
  onControlKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

const UiBottomTabBarContext = createContext<UiBottomTabBarApi | null>(null);

/**
 * Les contrôles atteignables de la barre, dans l'ordre du DOM, lus depuis le
 * contrôle qui a reçu la touche : onglets et action surélevée confondus.
 */
function controlsAround(from: HTMLElement): HTMLElement[] {
  const bar = from.closest('.ui-bottom-tab-bar');
  return [...(bar?.querySelectorAll<HTMLElement>(CONTROL_SELECTOR) ?? [])].filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('tabindex') !== '-1',
  );
}

// =====================================================================
// UiBottomTabBar : le repère de navigation, qui possède la destination active.
// =====================================================================

export interface UiBottomTabBarProps extends Omit<
  ComponentPropsWithRef<'nav'>,
  'defaultValue' | 'onChange'
> {
  /** Destination active. Renseignée, la barre est **contrôlée**. */
  value?: UiBottomTabValue;
  defaultValue?: UiBottomTabValue;
  onValueChange?: (value: UiBottomTabValue) => void;
  /** Notifié au changement de destination, avec l'événement qui l'a provoqué. */
  onTabChange?: (event: UiBottomTabBarChangeEvent) => void;
  /** Nom accessible du repère de navigation. */
  'aria-label'?: string;
  /** Afficher les libellés. `false` donne une barre d'icônes seules. */
  showLabels?: boolean;
  /** Réserver l'incrustation système sous la barre : barre d'accueil iOS, gestes Android. */
  safeArea?: boolean;
  /** Poser la barre dans son ancêtre positionné au lieu de la fenêtre. */
  contained?: boolean;
  /**
   * Onde de pression sur les onglets, quand elle est activée. `false` la coupe
   * sur cette barre ; l'action surélevée a sa propre prop.
   */
  ripple?: boolean;
  children?: ReactNode;
}

/**
 * ui-bottom-tab-bar : la barre de navigation basse des appareils tactiles.
 *
 * Un repère `<nav>` épinglé en bas, trois à cinq destinations et, au besoin, un
 * bouton d'action surélevé. Elle réserve l'incrustation du système, tient la
 * cible tactile de 44 px, coupe le délai de double frappe et disparaît à
 * l'impression.
 */
export function UiBottomTabBar({
  value,
  defaultValue,
  onValueChange,
  onTabChange,
  showLabels = true,
  safeArea = true,
  contained = false,
  ripple = true,
  className,
  children,
  ...rest
}: UiBottomTabBarProps) {
  const ariaLabel = rest['aria-label'] ?? 'Navigation principale';
  delete rest['aria-label'];

  const [active, setActive] = useControllableState<UiBottomTabValue | undefined>({
    value,
    defaultValue,
    onChange: (next) => {
      if (next !== undefined) onValueChange?.(next);
    },
  });

  const api = useMemo<UiBottomTabBarApi>(
    () => ({
      showLabels,
      ripple,
      isActive: (candidate) => active === candidate,
      activate: (candidate, event) => {
        if (active === candidate) return;
        setActive(candidate);
        onTabChange?.({ value: candidate, originalEvent: event });
      },
      // Les flèches s'ajoutent à la tabulation, sans focus glissant : chaque
      // contrôle d'un repère de navigation garde sa place dans l'ordre de tabulation.
      onControlKeyDown: (event) => {
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
        const controls = controlsAround(event.currentTarget);
        let position = controls.indexOf(event.currentTarget);
        if (position === -1) return;

        event.preventDefault();
        const last = controls.length - 1;
        if (event.key === 'ArrowRight') position = position === last ? 0 : position + 1;
        else if (event.key === 'ArrowLeft') position = position === 0 ? last : position - 1;
        else if (event.key === 'Home') position = 0;
        else position = last;

        controls[position]?.focus();
      },
    }),
    [showLabels, ripple, active, setActive, onTabChange],
  );

  return (
    <nav
      {...rest}
      className={cx(
        'ui-bottom-tab-bar',
        contained && '_contained',
        !safeArea && '_no-safe-area',
        !showLabels && '_no-labels',
        className,
      )}
      aria-label={ariaLabel || undefined}
    >
      <UiBottomTabBarContext.Provider value={api}>{children}</UiBottomTabBarContext.Provider>
    </nav>
  );
}

// =====================================================================
// UiBottomTab : une destination de la barre.
// =====================================================================

/** Props posées sur le contrôle, telles que `render` les reçoit. */
export interface UiBottomTabRootProps {
  className: string;
  href?: string;
  target?: string;
  rel?: string;
  tabIndex?: number;
  'aria-label'?: string;
  'aria-current'?: 'page';
  /** Marqueur de l'onde de pression, lu par `UiRippleProvider`. */
  'data-ripple': 'on' | 'off';
  'aria-disabled'?: true;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

export interface UiBottomTabProps extends Omit<ComponentPropsWithRef<'button'>, 'value' | 'type'> {
  /** Identifiant de cette destination, comparé à la valeur de la barre. */
  value: UiBottomTabValue;
  /** Libellé sous l'icône. Absent, l'onglet n'a que son icône et exige un `aria-label`. */
  label?: string;
  /** Icône au repos. */
  icon?: string;
  /** Icône une fois actif. À défaut, `icon`. */
  activeIcon?: string;
  /**
   * Variante de l'icône au repos. `outline` donne l'échange contour vers plein à
   * l'activation, `activeIconType` valant déjà `solid` ; encore faut-il que
   * l'icône existe dans le jeu contour de la famille.
   */
  iconType?: UiIconType;
  /** Variante de l'icône une fois actif. */
  activeIconType?: UiIconType;
  disabled?: boolean;
  /** Onde de pression sur cet onglet. `false` le retire, activation globale comprise. */
  ripple?: boolean;
  /** Destination : le contrôle devient une ancre. */
  href?: string;
  target?: string;
  /** `rel` de l'ancre. Par défaut `noopener noreferrer` avec `target="_blank"`. */
  rel?: string;
  /** Rend le contrôle soi-même, pour brancher le lien d'un routeur. */
  render?: (props: UiBottomTabRootProps, children: ReactNode) => ReactNode;
  /** Ornement posé sur l'icône : un badge de compteur, une pastille. */
  children?: ReactNode;
}

/**
 * ui-bottom-tab : une destination de la barre.
 *
 * Un `<button>` natif, ou un `<a>` dès qu'il y a une destination, pour que le
 * clic milieu et « ouvrir dans un nouvel onglet » continuent de marcher. L'état
 * actif s'annonce par `aria-current="page"`, motif d'un repère de navigation, et
 * non par `role="tab"`, qui exigerait un panneau associé.
 */
export function UiBottomTab({
  value,
  label,
  icon,
  activeIcon,
  iconType = 'solid',
  activeIconType = 'solid',
  disabled = false,
  ripple = true,
  href,
  target,
  rel,
  render,
  className,
  children,
  onClick,
  onKeyDown,
  ...rest
}: UiBottomTabProps) {
  const bar = useContext(UiBottomTabBarContext);
  if (!bar)
    throw new Error(
      '[ui-bottom-tab-bar] `UiBottomTab` doit être rendu dans un `<UiBottomTabBar>`.',
    );

  const active = bar.isActive(value);
  const rippleAttr = ripple && bar.ripple ? ('on' as const) : ('off' as const);
  const labelVisible = Boolean(label) && bar.showLabels;
  const ariaLabel = rest['aria-label'] ?? (labelVisible ? undefined : label);
  delete rest['aria-label'];

  // Garde-fou d'accessibilité : un onglet sans texte visible n'annonce rien.
  const key = String(value);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (labelVisible || ariaLabel || prevenus.has(key)) return;
    prevenus.add(key);
    console.warn(
      '[ui-bottom-tab] Onglet sans libellé visible ni nom accessible : renseignez `aria-label` ou `label`.',
    );
  }, [key, labelVisible, ariaLabel]);

  const activate = (event: MouseEvent<HTMLElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event as MouseEvent<HTMLButtonElement>);
    bar.activate(value, event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    bar.onControlKeyDown(event);
    onKeyDown?.(event as KeyboardEvent<HTMLButtonElement>);
  };

  const inner = (
    <>
      <span className="ui-bottom-tab-icon-box">
        {(active ? (activeIcon ?? icon) : icon) && (
          <UiIcon
            className="ui-bottom-tab-icon"
            name={(active ? (activeIcon ?? icon) : icon)!}
            type={active ? activeIconType : iconType}
            size="default"
          />
        )}
        {/* Ornement (badge, pastille) : transparent au pointeur, la frappe touche le contrôle. */}
        <span className="ui-bottom-tab-adornment">{children}</span>
      </span>
      {labelVisible && <span className="ui-bottom-tab-label">{label}</span>}
    </>
  );

  const classes = cx(
    'ui-bottom-tab',
    active && '_active',
    disabled && '_disabled',
    !labelVisible && '_no-label',
    className,
  );

  if (render || href) {
    const linkProps: UiBottomTabRootProps = {
      className: classes,
      href: disabled ? undefined : href,
      target,
      rel: rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined),
      // Une ancre n'a pas de `disabled` natif : elle sort du parcours clavier.
      tabIndex: disabled ? -1 : undefined,
      'aria-label': ariaLabel,
      'aria-current': active ? 'page' : undefined,
      'data-ripple': rippleAttr,
      'aria-disabled': disabled ? true : undefined,
      onClick: activate,
      onKeyDown: handleKeyDown,
    };

    if (render) return render(linkProps, inner);
    return <a {...linkProps}>{inner}</a>;
  }

  return (
    <button
      {...rest}
      type="button"
      className={classes}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      data-ripple={rippleAttr}
      onClick={activate}
      onKeyDown={handleKeyDown}
    >
      {inner}
    </button>
  );
}

// =====================================================================
// UiBottomTabAction : le bouton circulaire surélevé.
// =====================================================================

export interface UiBottomTabActionProps extends Omit<ComponentPropsWithRef<'button'>, 'type'> {
  icon?: string;
  iconType?: UiIconType;
  /** Famille de couleur, prise dans les jetons `actions`. */
  level?: UiLevel;
  /** Nom accessible. Obligatoire : le bouton n'a aucun texte visible. */
  'aria-label'?: string;
  disabled?: boolean;
  /** Onde de pression sur l'action. Indépendante de celle de la barre. */
  ripple?: boolean;
}

/**
 * ui-bottom-tab-action : l'action circulaire surélevée au-dessus de la barre.
 *
 * Une commande, pas une destination : elle ne porte jamais l'état actif. Elle se
 * place où on veut parmi les onglets, entre le deuxième et le troisième pour la
 * disposition centrée classique.
 */
export function UiBottomTabAction({
  icon = 'plus',
  iconType = 'solid',
  level = 'high',
  disabled = false,
  ripple = true,
  className,
  onKeyDown,
  ...rest
}: UiBottomTabActionProps) {
  const bar = useContext(UiBottomTabBarContext);
  const ariaLabel = rest['aria-label'];

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (ariaLabel || prevenus.has(`action:${icon}`)) return;
    prevenus.add(`action:${icon}`);
    console.warn(
      '[ui-bottom-tab-action] Action réduite à son icône sans nom accessible : renseignez `aria-label`.',
    );
  }, [ariaLabel, icon]);

  return (
    <button
      {...rest}
      type="button"
      className={cx('ui-bottom-tab-action', `_${level}`, className)}
      disabled={disabled}
      data-ripple={ripple ? 'on' : 'off'}
      onKeyDown={(event) => {
        bar?.onControlKeyDown(event);
        onKeyDown?.(event);
      }}
    >
      <UiIcon className="ui-bottom-tab-action-icon" name={icon} type={iconType} size="xl" />
    </button>
  );
}
