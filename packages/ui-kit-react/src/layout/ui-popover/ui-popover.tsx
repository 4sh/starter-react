'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';

import { useControllableState } from '../../core/forms';
import { focusFirstWithin } from '../../core/focus';
import { useCloseOnNavigation, useUiPosition, type UiPlacement } from '../../core/overlay';
import { cx } from '../../core/utils';

import './ui-popover.scss';

export type PopoverPosition = 'top' | 'bottom' | 'left' | 'right';

/** Écart entre le déclencheur et le panneau, qui laisse la place à la flèche. */
const ARROW_GAP = 8;

/** Avertissements déjà émis, pour rester idempotent sous `<StrictMode>`. */
const warned = new Set<string>();

/** Props à reverser sur le déclencheur. */
export interface UiPopoverTriggerProps {
  /**
   * Ref de rappel et non `Ref<HTMLElement>` : une fonction au type large s'assigne
   * à la ref d'un `<button>`, là où l'union exigerait un cast.
   */
  ref: (node: HTMLElement | null) => void;
  'aria-expanded': boolean;
  'aria-controls': string | undefined;
  onClick: () => void;
}

// La racine du panneau est un `<div popover>` ou un `<dialog>` : les props
// natives sont donc typées sur l'élément générique, et la `ref` avec elles.
type NativeProps = Omit<HTMLAttributes<HTMLElement>, 'children'>;

export interface UiPopoverProps extends NativeProps {
  /** Ouverture imposée. Renseignée, le panneau est contrôlé. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  /**
   * Rend le déclencheur. Reçoit les props à lui reverser : la `ref` qui sert
   * d'ancre, l'état ARIA et le basculement au clic.
   */
  trigger?: (props: UiPopoverTriggerProps) => ReactNode;

  /** Côté préféré. Retourné automatiquement quand la place manque. */
  position?: PopoverPosition;
  /** Rendre la flèche qui pointe vers le déclencheur. */
  showArrow?: boolean;
  /** Fermer au clic à l'extérieur et sur Échap. */
  dismissable?: boolean;
  /**
   * Panneau bloquant : le fond devient inerte et le focus est enfermé. Rend un
   * `<dialog>` au lieu d'un panneau `popover`.
   */
  modal?: boolean;
  /** Poser le focus dans le panneau à l'ouverture. */
  focusOnShow?: boolean;
  /** Nom accessible du panneau. Recommandé. */
  'aria-label'?: string;
  'aria-labelledby'?: string;

  onShow?: () => void;
  onHide?: () => void;

  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

/**
 * ui-popover : panneau flottant ancré à un déclencheur, rendu par `trigger`.
 *
 * Il vit dans le **calque supérieur** (`popover` en non modal, `<dialog>` en
 * modal) : ni rognage par un ancêtre en `overflow: hidden`, ni z-index. En non
 * modal, le navigateur gère la fermeture au clic extérieur et sur Échap.
 */
export function UiPopover({
  open,
  defaultOpen = false,
  onOpenChange,
  trigger,
  position = 'bottom',
  showArrow = true,
  dismissable = true,
  modal = false,
  focusOnShow = true,
  onShow,
  onHide,
  className,
  children,
  ref,
  ...rest
}: UiPopoverProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const panelId = useId();

  const [isOpen, setOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const placement: UiPlacement = position === 'top' || position === 'bottom' ? position : position;
  const {
    setAnchor,
    setPanel,
    panelStyle,
    isPositioned,
    placement: resolved,
  } = useUiPosition<HTMLElement, HTMLElement>({ placement, offset: ARROW_GAP, open: isOpen });

  // Le côté effectif pilote la flèche : c'est la position RETENUE après
  // retournement, pas celle demandée.
  const side = (resolved.split('-')[0] ?? position) as PopoverPosition;

  useCloseOnNavigation(isOpen, () => setOpen(false));

  // --- Ouverture et fermeture dans le calque supérieur -----------------
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    if (isOpen) {
      if (modal) (panel as HTMLDialogElement).showModal();
      else if (!panel.matches(':popover-open')) panel.showPopover();
      onShow?.();
      if (focusOnShow) focusFirstWithin(panel);
    } else if (modal) {
      if ((panel as HTMLDialogElement).open) (panel as HTMLDialogElement).close();
    } else if (panel.matches(':popover-open')) {
      panel.hidePopover();
    }
    // `onShow` hors dépendances : recréé à chaque rendu, il rouvrirait en boucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, modal, focusOnShow]);

  // Le navigateur ferme aussi de son côté (clic extérieur, Échap) : l'état doit
  // suivre, sinon le panneau serait « ouvert » pour React et fermé à l'écran.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const onToggle = (event: Event) => {
      if ((event as ToggleEvent).newState === 'closed') {
        setOpen(false);
        onHide?.();
        // Le focus est rendu au déclencheur seulement s'il était dans le
        // panneau : sinon on le volerait là où l'utilisateur vient d'aller.
        if (panel.contains(document.activeElement)) triggerRef.current?.focus();
      }
    };

    const onClose = () => {
      setOpen(false);
      onHide?.();
      triggerRef.current?.focus();
    };

    panel.addEventListener('toggle', onToggle);
    panel.addEventListener('close', onClose);
    return () => {
      panel.removeEventListener('toggle', onToggle);
      panel.removeEventListener('close', onClose);
    };
  });

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (isOpen && !rest['aria-label'] && !rest['aria-labelledby'] && !warned.has(panelId)) {
      warned.add(panelId);
      console.warn(
        `[ui-popover] Panneau sans nom accessible : renseignez \`aria-label\` ou \`aria-labelledby\`.`,
      );
    }
  }, [isOpen, rest, panelId]);

  const attachPanel = useCallback(
    (node: HTMLElement | null) => {
      panelRef.current = node;
      setPanel(node);
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [setPanel, ref],
  );

  const attachTrigger = useCallback(
    (node: HTMLElement | null) => {
      triggerRef.current = node;
      setAnchor(node);
    },
    [setAnchor],
  );

  const triggerProps: UiPopoverTriggerProps = {
    ref: attachTrigger,
    'aria-expanded': isOpen,
    'aria-controls': isOpen ? panelId : undefined,
    onClick: () => setOpen(!isOpen),
  };

  const panelProps = {
    ...rest,
    id: panelId,
    className: cx('ui-popover', `_${side}`, !showArrow && '_no-arrow', className),
    style: { ...panelStyle, ...rest.style },
    tabIndex: -1,
    // Fermé tant que la position n'est pas calculée (`computePosition` est asynchrone),
    // sinon il paraît une image au mauvais endroit. Lu par `utils.overlay-motion`.
    'data-unpositioned': isPositioned ? undefined : '',
  };

  const content = (
    <>
      {showArrow && <span className="ui-popover-arrow" aria-hidden="true" />}
      <div className="ui-popover-content">{children}</div>
    </>
  );

  return (
    <>
      {/* Faux positif de `react-hooks/refs` : la ref de rappel est transmise, jamais lue. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      {trigger?.(triggerProps)}
      {modal ? (
        <dialog {...panelProps} ref={attachPanel}>
          {content}
        </dialog>
      ) : (
        <div
          {...panelProps}
          ref={attachPanel}
          // `auto` donne la fermeture au clic extérieur et sur Échap sans une
          // ligne de JavaScript ; `manual` ne ferme que sur demande explicite.
          popover={dismissable ? 'auto' : 'manual'}
          role="dialog"
        >
          {content}
        </div>
      )}
    </>
  );
}
