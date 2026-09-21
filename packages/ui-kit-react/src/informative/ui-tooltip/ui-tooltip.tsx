'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEventHandler,
  type PointerEventHandler,
  type ReactNode,
} from 'react';

import { useUiPosition, type UiPlacement } from '../../core/overlay';
import { cx } from '../../core/utils';

import './ui-tooltip.scss';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
export type TooltipEvent = 'hover' | 'focus' | 'both';

/** Écart entre le déclencheur et la bulle, qui laisse la place à la flèche. */
const ARROW_GAP = 8;

/**
 * Props à reverser sur le déclencheur.
 *
 * Là où Angular pose une **directive** sur l'élément hôte, React n'en a pas :
 * le composant enveloppe le déclencheur et lui rend ses props.
 */
export interface UiTooltipTriggerProps {
  /** Ref de rappel : voir la note de `UiPopoverTriggerProps`. */
  ref: (node: HTMLElement | null) => void;
  'aria-describedby': string | undefined;
  onPointerEnter: PointerEventHandler<HTMLElement>;
  onPointerLeave: PointerEventHandler<HTMLElement>;
  onFocus: FocusEventHandler<HTMLElement>;
  onBlur: FocusEventHandler<HTMLElement>;
  onClick: () => void;
}

export interface UiTooltipProps {
  /** Contenu de la bulle. Vide, rien ne s'affiche. */
  content?: ReactNode;
  /** Rend le déclencheur. Reçoit les props à lui reverser. */
  trigger: (props: UiTooltipTriggerProps) => ReactNode;
  /** Côté préféré. Retourné automatiquement quand la place manque. */
  position?: TooltipPosition;
  /** Autoriser le retournement. `false` verrouille le côté. */
  flip?: boolean;
  /** Interaction qui révèle la bulle. `both` couvre aussi le clavier. */
  event?: TooltipEvent;
  disabled?: boolean;
  /** Délai avant apparition, en ms. */
  showDelay?: number;
  /** Délai avant disparition, en ms. */
  hideDelay?: number;
  /** Masquer quand le pointeur quitte le déclencheur. `false` garde la bulle survolable. */
  autoHide?: boolean;
  /** Masquer sur Échap. Exigé par WCAG 1.4.13. */
  hideOnEscape?: boolean;
  /** Masquer après N ms même si le déclencheur reste actif. `0` désactive. */
  life?: number;
  /** N'afficher que si le texte du déclencheur est tronqué. */
  showOnEllipsis?: boolean;
  /** Décalage vertical supplémentaire, en px. */
  offsetY?: number;
  /** Décalage horizontal supplémentaire, en px. */
  offsetX?: number;
  /** Classes posées sur la bulle. */
  className?: string;
  onShow?: () => void;
  onHide?: () => void;
}

/**
 * ui-tooltip : bulle d'aide attachée à un déclencheur.
 *
 * La bulle vit dans le **calque supérieur** (`popover="manual"`) : pas de
 * z-index, et aucun rognage par un ancêtre en `overflow: hidden`. Le mode
 * `manual` est délibéré : une bulle ne doit pas se fermer au clic à côté, elle
 * suit le survol et le focus.
 *
 * Conforme à WCAG 1.4.13 : elle se **rejette** par Échap, elle est
 * **survolable** avec `autoHide={false}`, et elle **persiste** tant que le
 * déclencheur garde le survol ou le focus.
 */
export function UiTooltip({
  content,
  trigger,
  position = 'top',
  flip = true,
  event = 'both',
  disabled = false,
  showDelay = 150,
  hideDelay = 0,
  autoHide = true,
  hideOnEscape = true,
  life = 0,
  showOnEllipsis = false,
  offsetY = 0,
  offsetX = 0,
  className,
  onShow,
  onHide,
}: UiTooltipProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const timers = useRef<{ show?: number; hide?: number; life?: number }>({});
  const tooltipId = useId();

  // Un seul état. L'apparition en fondu est jouée par le navigateur
  // (`@starting-style`), ce qui évite le second état « monté puis rendu
  // opaque » qu'il faudrait sinon pour donner une frame de départ.
  const [mounted, setMounted] = useState(false);

  // Dérivé, et non synchronisé : désactiver la bulle ou lui retirer son contenu
  // la referme sans qu'un effet ait à courir après l'état.
  const shown = mounted && !disabled && Boolean(content);

  const {
    setAnchor,
    setPanel,
    panelStyle,
    isPositioned,
    placement: resolved,
  } = useUiPosition<HTMLElement, HTMLDivElement>({
    placement: position as UiPlacement,
    offset: ARROW_GAP,
    flip,
    open: shown,
  });

  const side = (resolved.split('-')[0] ?? position) as TooltipPosition;

  const clearTimers = useCallback(() => {
    for (const key of ['show', 'hide', 'life'] as const) {
      if (timers.current[key]) window.clearTimeout(timers.current[key]);
      timers.current[key] = undefined;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimers();
    setMounted(false);
    onHide?.();
  }, [clearTimers, onHide]);

  const show = useCallback(() => {
    if (disabled || !content) return;

    // Le texte n'est tronqué qu'une fois rendu : la question se pose donc au
    // moment d'afficher, pas à la construction.
    if (showOnEllipsis) {
      const element = triggerRef.current;
      if (!element || element.scrollWidth <= element.clientWidth) return;
    }

    clearTimers();
    timers.current.show = window.setTimeout(() => {
      setMounted(true);
      onShow?.();
      if (life > 0) timers.current.life = window.setTimeout(() => hide(), life);
    }, showDelay);
  }, [disabled, content, showOnEllipsis, clearTimers, showDelay, life, hide, onShow]);

  const scheduleHide = useCallback(() => {
    clearTimers();
    timers.current.hide = window.setTimeout(() => hide(), hideDelay);
  }, [clearTimers, hideDelay, hide]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const isOpen = panel.matches(':popover-open');
    if (shown && !isOpen) panel.showPopover();
    else if (!shown && isOpen) panel.hidePopover();
  }, [shown]);

  // WCAG 1.4.13 : une bulle déclenchée au survol ou au focus doit pouvoir être
  // rejetée sans déplacer le pointeur ni le focus.
  useEffect(() => {
    if (!shown || !hideOnEscape) return;

    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key !== 'Escape') return;
      // Consommée seulement parce qu'elle ferme : sinon elle fermerait aussi le
      // dialogue qui contient le déclencheur.
      keyEvent.stopPropagation();
      hide();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [shown, hideOnEscape, hide]);

  useEffect(() => clearTimers, [clearTimers]);

  const onHover = event === 'hover' || event === 'both';
  const onFocusEvent = event === 'focus' || event === 'both';

  // Extrait de l'objet de props et mémorisé : le linter des hooks refuse qu'un
  // objet contenant une ref soit construit et lu au fil du rendu.
  const attachTrigger = useCallback(
    (node: HTMLElement | null) => {
      triggerRef.current = node;
      setAnchor(node);
    },
    [setAnchor],
  );

  const triggerProps: UiTooltipTriggerProps = {
    ref: attachTrigger,
    'aria-describedby': shown ? tooltipId : undefined,
    onPointerEnter: () => onHover && show(),
    onPointerLeave: () => onHover && scheduleHide(),
    onFocus: () => onFocusEvent && show(),
    onBlur: () => onFocusEvent && scheduleHide(),
    // Un clic est une action : la bulle a fait son travail et s'efface.
    onClick: () => hide(),
  };

  return (
    <>
      {/*
        Faux positif de `react-hooks/refs` : la règle voit un objet contenant
        une clé `ref` lu au rendu et suppose une lecture de `.current`. Ici on
        TRANSMET une ref de rappel à une prop de rendu, ce qui est le motif
        normal d'un déclencheur. Aucune ref n'est lue.
      */}
      {/* eslint-disable-next-line react-hooks/refs */}
      {trigger(triggerProps)}
      <div
        ref={(node) => {
          panelRef.current = node;
          setPanel(node);
        }}
        id={tooltipId}
        role="tooltip"
        // `manual` et non `auto` : une bulle ne se ferme pas au clic à côté,
        // elle suit le survol et le focus.
        // Tant que la position n'est pas calculée, la bulle reste dans son état
        // fermé : `computePosition` est asynchrone, et peindre l'image d'avant
        // la ferait apparaître au mauvais endroit avant qu'elle se replace.
        // Reconnu par `utils.overlay-motion`.
        data-unpositioned={isPositioned ? undefined : ''}
        popover="manual"
        className={cx('ui-tooltip', `_${side}`, !autoHide && '_interactive', className)}
        style={{
          ...panelStyle,
          // Les décalages fins s'ajoutent au placement calculé, sans le refaire.
          ...(offsetX || offsetY
            ? { marginLeft: `${offsetX}px`, marginTop: `${offsetY}px` }
            : null),
        }}
        onPointerEnter={() => !autoHide && clearTimers()}
        onPointerLeave={() => !autoHide && scheduleHide()}
      >
        <span className="ui-tooltip-arrow" aria-hidden="true" />
        <div className="ui-tooltip-text">{content}</div>
      </div>
    </>
  );
}
