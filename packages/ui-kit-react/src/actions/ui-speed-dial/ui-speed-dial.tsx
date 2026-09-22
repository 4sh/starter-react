'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type SyntheticEvent,
} from 'react';

import { UiTooltip, type TooltipPosition } from '../../informative/ui-tooltip';
import { useControllableState } from '../../core/forms';
import { motionEnterClass, useUiMotion, type UiMotionPreset } from '../../core/motion';
import { useCloseOnNavigation } from '../../core/overlay';
import type { UiLevel } from '../../core/types';
import { cx } from '../../core/utils';
import type { UiMenuItem } from '../../navigation/ui-menu';
import { UiButton, type ButtonSize, type ButtonVariant, type UiButtonProps } from '../ui-button';

import './ui-speed-dial.scss';

/**
 * Axe le long duquel les actions se déploient.
 *
 * `linear` et `semi-circle` lisent les quatre points cardinaux ;
 * `quarter-circle` lit les quatre coins, et retombe sur `up-right` si on lui
 * donne un cardinal.
 */
export type SpeedDialDirection =
  'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

/**
 * `linear` empile les actions le long de `direction`. Les trois autres les
 * posent sur un arc autour du déclencheur, à `radius` : l'anneau entier pour
 * `circle`, une moitié centrée sur `direction` pour `semi-circle`, un quart
 * dans le coin de `direction` pour `quarter-circle`.
 */
export type SpeedDialType = 'linear' | 'circle' | 'semi-circle' | 'quarter-circle';

/**
 * Une action révélée par le bouton, le sous-ensemble feuille de `UiMenuItem`
 * qu'un `ui-button` sait rendre : ni groupe ni séparateur.
 */
export type UiSpeedDialItem = Pick<
  UiMenuItem,
  'id' | 'label' | 'icon' | 'command' | 'disabled' | 'url' | 'target' | 'ariaLabel'
> & {
  /**
   * Rend l'action soi-même, pour brancher le lien d'un routeur. Typé pour
   * `ui-button`, et non pour `ui-menu` : c'est un bouton que l'action rend, et
   * ses props ne sont pas celles d'une entrée de menu.
   */
  render?: UiButtonProps['render'];
};

/** Charge de `onItemClick` et de la `command` d'une action. */
export interface UiSpeedDialItemClickEvent {
  originalEvent: SyntheticEvent;
  item: UiSpeedDialItem;
}

/** Une action prête à rendre : son entrée, sa clé stable et son rang. */
interface SpeedDialNode {
  item: UiSpeedDialItem;
  key: string;
  index: number;
}

/** Arrondit le bruit flottant qu'un `calc()` CSS ne sait pas lire. */
const round = (value: number): number => Math.round(value * 1e6) / 1e6;

/**
 * L'ouverture angulaire d'un arc, en degrés horaires depuis le haut : 0° en
 * haut, 90° à droite, 180° en bas, 270° à gauche.
 *
 * `circle` ignore `direction`, un anneau entier n'ayant pas de côté.
 * `semi-circle` centre sa moitié dessus. `quarter-circle` remplit le quart du
 * coin nommé, et retombe sur `up-right` pour un cardinal, n'ayant lui-même pas
 * de « haut ».
 */
function arcSpan(
  type: Exclude<SpeedDialType, 'linear'>,
  direction: SpeedDialDirection,
): { start: number; span: number } {
  if (type === 'circle') return { start: 0, span: 360 };
  if (type === 'semi-circle') {
    const center = { up: 0, right: 90, down: 180, left: 270 }[direction as string] ?? 0;
    return { start: center - 90, span: 180 };
  }
  const start =
    { 'up-right': 0, 'down-right': 90, 'down-left': 180, 'up-left': 270 }[direction as string] ?? 0;
  return { start, span: 90 };
}

export interface UiSpeedDialProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'onClick'
> {
  /** Les actions révélées par le bouton. */
  items: UiSpeedDialItem[];
  /** Ouverture imposée. Renseignée, le bouton est **contrôlé**. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  /** Disposition : empilée, anneau entier, moitié ou quart. */
  type?: SpeedDialType;
  /** Axe de déploiement. Inutilisé par `circle`, qui fait toujours le tour. */
  direction?: SpeedDialDirection;
  /** Rayon de l'arc en px, pour tout sauf `linear`. Absent, le défaut du SCSS sert. */
  radius?: number;

  /** Niveau sémantique du déclencheur. */
  level?: UiLevel;
  /**
   * Niveau sémantique des actions. `low` par défaut, délibérément différent de
   * celui du déclencheur : une action en `high` se lirait comme un second
   * bouton principal plutôt que comme une option révélée.
   */
  itemLevel?: UiLevel;
  variant?: ButtonVariant;
  size?: ButtonSize;

  /** Icône du déclencheur fermé. */
  showIcon?: string;
  /** Icône du déclencheur ouvert. Absente, `showIcon` pivote sur place. */
  hideIcon?: string;
  /** Anime la rotation de l'icône du déclencheur, quand il n'y a pas de `hideIcon`. */
  rotateAnimation?: boolean;

  /** Assombrit la page derrière le bouton ouvert. */
  mask?: boolean;
  /** Referme au clic en dehors. */
  hideOnClickOutside?: boolean;
  /** Désactive le déclencheur et toutes les actions. */
  disabled?: boolean;

  /** Affiche le libellé de chaque action en bulle d'aide. */
  showTooltips?: boolean;
  /** Anime le déclencheur et les actions. Le mouvement réduit gagne toujours. */
  motion?: boolean;

  /** Notifié au clic sur le déclencheur, jamais quand il est désactivé. */
  onTriggerClick?: (event: MouseEvent<HTMLElement>) => void;
  /** Notifié à l'activation d'une action, jamais sur une action désactivée. */
  onItemClick?: (event: UiSpeedDialItemClickEvent) => void;
}

/**
 * ui-speed-dial : un bouton flottant qui déploie ses actions autour de lui.
 *
 * Les actions viennent d'un modèle déclaratif, le même sous-ensemble feuille
 * que `ui-menu`, donc les entrées d'un menu alimentent un bouton sans être
 * remodelées. Quatre dispositions : empilée le long de `direction`, ou posée
 * sur un anneau, une moitié ou un quart d'arc.
 *
 * Les actions ne sont rendues qu'à l'ouverture, donc ni lues ni atteignables
 * une fois refermées, et elles forment **un seul** arrêt de tabulation. Le
 * placement du bouton dans la page appartient à l'appelant.
 */
export function UiSpeedDial({
  items,
  open,
  defaultOpen = false,
  onOpenChange,
  type = 'linear',
  direction = 'up',
  radius,
  level = 'high',
  itemLevel = 'low',
  variant = 'filled',
  size = 'default',
  showIcon = 'plus',
  hideIcon,
  rotateAnimation = true,
  mask = false,
  hideOnClickOutside = true,
  disabled = false,
  showTooltips = false,
  motion = true,
  onTriggerClick,
  onItemClick,
  className,
  style,
  tabIndex,
  ref,
  ...rest
}: UiSpeedDialProps) {
  const uid = useId();
  const ariaLabel = rest['aria-label'];
  const ariaLabelledBy = rest['aria-labelledby'];
  delete rest['aria-label'];
  delete rest['aria-labelledby'];

  const [isOpen, setOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const hostRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  const attachHost = useCallback(
    (node: HTMLDivElement | null) => {
      hostRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  /**
   * Un seul mouvement pour toute la liste, et non un par action.
   *
   * La sortie décalée a été essayée côté Angular puis annulée : une action dont
   * le délai est plus court finit avant ses voisines, perd sa classe de sortie
   * et revient à pleine opacité le temps qu'elles terminent, ce qui se lit
   * comme un clignotement. Les actions partent donc ensemble, ce qu'une seule
   * disparition de la liste donne gratuitement, et l'entrée reste décalée par
   * `--_stagger-index`.
   */
  const {
    present,
    ref: attachMotion,
    className: motionClassName,
    style: motionStyle,
  } = useUiMotion(isOpen, { preset: 'fade', disabled: !motion });

  const close = useCallback(() => {
    setOpen(false);
    setFocusedKey(null);
  }, [setOpen]);

  // Un bouton déclaré dans une coquille d'application survit à la vue routée :
  // on le referme plutôt que de le laisser ouvert par-dessus la page suivante.
  useCloseOnNavigation(isOpen, close);

  // Fermeture au clic en dehors, branchée seulement tant que c'est ouvert.
  useEffect(() => {
    if (!isOpen || !hideOnClickOutside) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && hostRef.current?.contains(event.target)) return;
      close();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [isOpen, hideOnClickOutside, close]);

  const nodes: SpeedDialNode[] = items.map((item, index) => ({
    item,
    key: item.id ?? `${uid}_${index}`,
    index,
  }));
  const focusableKeys = nodes.filter((node) => !node.item.disabled).map((node) => node.key);
  const tabStop =
    focusedKey && focusableKeys.includes(focusedKey) ? focusedKey : (focusableKeys[0] ?? null);

  const focusKey = useCallback((key: string | undefined) => {
    if (!key) return;
    setFocusedKey(key);
    listRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.focus();
  }, []);

  // À l'ouverture au clavier, le focus part sur l'arrêt de tabulation, déjà
  // posé dans le DOM : le relire évite de recopier la règle qui l'a choisi.
  const openedByKeyboard = useRef(false);
  useEffect(() => {
    if (!isOpen || !openedByKeyboard.current) return;
    openedByKeyboard.current = false;
    listRef.current?.querySelector<HTMLElement>('[data-key][tabindex="0"]')?.focus();
  }, [isOpen]);

  // Le focus revient au déclencheur quand il était dans la liste qui se ferme.
  const wasOpen = useRef(isOpen);
  useEffect(() => {
    const closing = wasOpen.current && !isOpen;
    wasOpen.current = isOpen;
    if (closing && listRef.current?.contains(document.activeElement)) triggerRef.current?.focus();
  }, [isOpen]);

  const arcPosition = (() => {
    if (type === 'linear' || !nodes.length) return () => undefined;
    const { start, span } = arcSpan(type, direction);
    const step = type === 'circle' ? span / nodes.length : span / Math.max(nodes.length - 1, 1);
    return (index: number) => {
      const angle = ((start + step * index) * Math.PI) / 180;
      // Le bruit flottant, `sin(π)` valant 1,2e-16, s'écrit en notation
      // exponentielle, qu'un `calc()` CSS ne sait pas lire.
      const x = round(Math.sin(angle));
      const y = round(-Math.cos(angle));
      return `translate(-50%, -50%) translate(calc(${x} * var(--_radius)), calc(${y} * var(--_radius)))`;
    };
  })();

  /**
   * Préréglage d'entrée d'une action.
   *
   * Sur un arc, chaque action porte déjà sa propre `transform`, sa place
   * angulaire : `zoom` et les glissements animent `transform` eux aussi, et une
   * animation CSS gagne sur un style en ligne pour la même propriété, ce qui
   * effacerait la position le temps de l'animation. `fade`, qui ne touche que
   * l'opacité, est le seul préréglage qui ne peut pas entrer en conflit.
   */
  const itemPreset: UiMotionPreset =
    type !== 'linear'
      ? 'fade'
      : direction === 'up' || direction === 'down' || direction === 'left' || direction === 'right'
        ? (`slide-${direction}` as UiMotionPreset)
        : 'slide-up';

  /** La bulle se pose à l'opposé du déploiement, pour ne jamais couvrir une action. */
  const tooltipPosition: TooltipPosition =
    type === 'linear' && (direction === 'up' || direction === 'down') ? 'right' : 'top';

  const triggerIcon = hideIcon ?? showIcon;
  const triggerRotates = isOpen && !hideIcon && rotateAnimation;

  const activate = (event: MouseEvent<HTMLElement>, node: SpeedDialNode) => {
    const item = node.item;
    if (item.disabled) {
      event.preventDefault();
      return;
    }
    if (!item.url && !item.render) event.preventDefault();
    setFocusedKey(node.key);
    item.command?.({ originalEvent: event, item });
    onItemClick?.({ originalEvent: event, item });
    close();
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!focusableKeys.length) return;
    // La clé courante se lit sur l'ÉVÉNEMENT avant l'état : une touche qui suit
    // immédiatement un `focus()` arrive avant que React ait traité le rendu que
    // ce focus déclenche, et l'état pointerait encore l'action d'avant.
    const from = (event.target as HTMLElement).closest?.('[data-key]');
    const current = from?.getAttribute('data-key') ?? focusedKey;
    const index = current ? focusableKeys.indexOf(current) : -1;

    switch (event.key) {
      // Les deux paires de flèches avancent pareil quelle que soit la
      // disposition : mieux vaut une correspondance simple et prévisible que
      // huit règles dérivées de la direction.
      case 'ArrowUp':
      case 'ArrowRight':
        event.preventDefault();
        focusKey(focusableKeys[(index + 1) % focusableKeys.length]);
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        event.preventDefault();
        focusKey(focusableKeys[(index - 1 + focusableKeys.length) % focusableKeys.length]);
        break;
      case 'Home':
        event.preventDefault();
        focusKey(focusableKeys[0]);
        break;
      case 'End':
        event.preventDefault();
        focusKey(focusableKeys[focusableKeys.length - 1]);
        break;
      case 'Escape':
        event.preventDefault();
        close();
        break;
    }
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (disabled || isOpen) return;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    openedByKeyboard.current = true;
    setOpen(true);
  };

  const hostStyle: CSSProperties = { ...style };
  if (radius != null) (hostStyle as Record<string, string>)['--_radius'] = `${radius}px`;

  return (
    <div
      {...rest}
      ref={attachHost}
      className={cx(
        'ui-speed-dial',
        `_${type}`,
        type === 'linear' && `_${direction}`,
        size !== 'default' && `_${size}`,
        isOpen && '_open',
        className,
      )}
      style={hostStyle}
    >
      {mask && present && (
        // Le masque partage la durée de vie de la liste : il n'a donc pas
        // besoin de sa propre rétention, seulement de la classe qui va avec.
        <div
          className={cx('ui-speed-dial-mask', motion && isOpen && motionEnterClass('fade'))}
          style={motionStyle}
          aria-hidden="true"
          onClick={close}
        />
      )}

      <UiButton
        ref={triggerRef}
        className={cx('ui-speed-dial-trigger', triggerRotates && '_rotate')}
        rounded
        iconOnly
        level={level}
        variant={variant}
        size={size}
        icon={triggerIcon}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={isOpen ? uid : undefined}
        disabled={disabled}
        tabIndex={tabIndex}
        onClick={(event) => {
          if (disabled) return;
          onTriggerClick?.(event);
          setOpen(!isOpen);
          if (isOpen) setFocusedKey(null);
        }}
        onKeyDown={onTriggerKeyDown}
      />

      {present && (
        <div
          ref={(node) => {
            listRef.current = node;
            attachMotion(node);
          }}
          id={uid}
          className={cx('ui-speed-dial-list', motionClassName)}
          style={motionStyle}
          role="menu"
          aria-label={ariaLabel || undefined}
        >
          {nodes.map((node) => {
            const label = node.item.ariaLabel || node.item.label;
            const button = (
              <UiButton
                key={node.key}
                className={cx('ui-speed-dial-item', motion && motionEnterClass(itemPreset))}
                style={
                  {
                    '--_stagger-index': node.index,
                    transform: type !== 'linear' ? arcPosition(node.index) : undefined,
                  } as CSSProperties
                }
                rounded
                iconOnly
                level={itemLevel}
                variant={variant}
                size="small"
                icon={node.item.icon}
                aria-label={label}
                role="menuitem"
                data-key={node.key}
                disabled={node.item.disabled}
                href={node.item.url}
                target={node.item.target}
                render={node.item.render}
                tabIndex={node.key === tabStop ? 0 : -1}
                onClick={(event) => activate(event, node)}
                onFocus={() => setFocusedKey(node.key)}
                onKeyDown={onListKeyDown}
              />
            );

            if (!showTooltips || !label) return button;
            return (
              <UiTooltip
                key={node.key}
                content={label}
                position={tooltipPosition}
                trigger={(props) => <span {...props}>{button}</span>}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
