'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
} from 'react';

import { UiIcon } from '../../base/ui-icon';
import { useControllableState } from '../../core/forms';
import { useUiScrollLock } from '../../core/overlay';
import { cx } from '../../core/utils';

import { useModalGestures } from './use-modal-gestures';

import './ui-modal.scss';

/**
 * Préréglage d'entrée et de sortie du dialogue.
 *
 * L'arrière-plan, lui, fait toujours un fondu : c'est ce qui rattache le
 * dialogue à la page, quel que soit le mouvement choisi.
 */
export type ModalMotion =
  'zoom' | 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right';

export type ModalPosition =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'topleft'
  | 'topright'
  | 'bottomleft'
  | 'bottomright';

/** Avertissements déjà émis, pour rester idempotent sous `<StrictMode>`. */
const warned = new Set<string>();

type NativeProps = Omit<ComponentPropsWithRef<'dialog'>, 'open' | 'title' | 'onClose' | 'children'>;

export interface UiModalProps extends NativeProps {
  /** Ouverture imposée. Renseignée, le dialogue est contrôlé. */
  visible?: boolean;
  defaultVisible?: boolean;
  onVisibleChange?: (visible: boolean) => void;

  /** Titre. Une chaîne suffit, mais tout nœud est accepté. */
  header?: ReactNode;
  /** Zone de pied, typiquement les actions. */
  footer?: ReactNode;
  /** Rendre la zone d'en-tête. */
  showHeader?: boolean;
  /** Nom accessible, quand aucun en-tête visible ne peut le porter. */
  'aria-label'?: string;
  'aria-labelledby'?: string;

  /**
   * Dialogue modal : arrière-plan assombri, inerte, et défilement bloqué. C'est
   * `showModal()` qui s'en charge. `false` ouvre par `show()`, un dialogue
   * qu'on peut laisser ouvert en continuant à travailler derrière.
   */
  modal?: boolean;
  /** Fermer au clic sur l'arrière-plan. Modal seulement. */
  dismissableMask?: boolean;
  /** Afficher le bouton de fermeture et autoriser Échap. */
  closable?: boolean;
  /** Fermer sur Échap. */
  closeOnEscape?: boolean;
  /** Bloquer le défilement de fond même pour un dialogue non modal. */
  blockScroll?: boolean;

  /** Autoriser le glissement par l'en-tête. */
  draggable?: boolean;
  /** Garder le dialogue entièrement visible pendant le glissement. */
  keepInViewport?: boolean;
  minX?: number;
  minY?: number;

  /** Afficher la bascule agrandir / restaurer. */
  maximizable?: boolean;
  /** Autoriser le redimensionnement par le coin inférieur droit. */
  resizable?: boolean;
  minWidth?: number;
  minHeight?: number;

  /** Ancrage du dialogue dans l'écran. */
  position?: ModalPosition;
  /**
   * Cantonner le dialogue au premier ancêtre positionné plutôt qu'à l'écran, et
   * ne pas bloquer le défilement. Pour l'embarquer dans un conteneur borné,
   * typiquement une démonstration de documentation.
   */
  contained?: boolean;

  closeIcon?: string;
  maximizeIcon?: string;
  minimizeIcon?: string;
  closeAriaLabel?: string;
  maximizeAriaLabel?: string;

  /**
   * Classes permettant de styler l'arrière-plan. Elles sont posées sur le
   * **dialogue** : `::backdrop` est son pseudo-élément, et se cible donc en
   * écrivant `.ma-classe::backdrop`.
   */
  backdropClassName?: string;
  /** Largeurs par point de rupture, indexées par une `max-width`. */
  breakpoints?: Record<string, string>;

  /** Préréglage d'entrée et de sortie. */
  motion?: ModalMotion;
  /** Couper l'animation pour ce dialogue, sans toucher au réglage global. */
  motionDisabled?: boolean;

  onShow?: () => void;
  onHide?: () => void;
  onMaximizedChange?: (maximized: boolean) => void;
  onDragEnd?: () => void;
  onResizeEnd?: (size: { width: number; height: number }) => void;

  children?: ReactNode;
}

/**
 * ui-modal : fenêtre de dialogue, bâtie sur le `<dialog>` natif.
 *
 * Le piège de focus, la restitution du focus, l'inertie de l'arrière-plan,
 * l'empilement et Échap sont **pris en charge par le navigateur**. Ce composant
 * ajoute ce qui manque : le blocage du défilement, le clic sur l'arrière-plan,
 * les positions, le glissement, le redimensionnement et l'agrandissement.
 */
export function UiModal({
  visible,
  defaultVisible = false,
  onVisibleChange,
  header,
  footer,
  showHeader = true,
  modal = true,
  dismissableMask = false,
  closable = true,
  closeOnEscape = true,
  blockScroll = false,
  draggable = false,
  keepInViewport = true,
  minX = 0,
  minY = 0,
  maximizable = false,
  resizable = false,
  minWidth = 150,
  minHeight = 100,
  position = 'center',
  contained = false,
  closeIcon = 'xmark',
  maximizeIcon = 'expand',
  minimizeIcon = 'compress',
  closeAriaLabel = 'Fermer',
  maximizeAriaLabel = 'Agrandir',
  backdropClassName,
  breakpoints,
  motion = 'zoom',
  motionDisabled = false,
  onShow,
  onHide,
  onMaximizedChange,
  onDragEnd,
  onResizeEnd,
  className,
  style,
  children,
  ref,
  ...rest
}: UiModalProps) {
  const innerRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const uid = useId();
  const titleId = `${uid}-title`;

  const [open, setOpen] = useControllableState<boolean>({
    value: visible,
    defaultValue: defaultVisible,
    onChange: onVisibleChange,
  });

  const [maximized, setMaximized] = useState(false);
  const gestures = useModalGestures({
    dialogRef: innerRef,
    draggable: draggable && !maximized,
    resizable: resizable && !maximized,
    keepInViewport,
    minX,
    minY,
    minWidth,
    minHeight,
    onDragEnd,
    onResizeEnd,
  });

  // Un dialogue cantonné est embarqué, pas une vraie couche : il ne bloque rien.
  useUiScrollLock(open && !contained && (modal || blockScroll || maximized));

  const ariaLabel = rest['aria-label'];
  const ariaLabelledBy = rest['aria-labelledby'];
  const labelledBy = ariaLabelledBy ?? (showHeader && header ? titleId : undefined);

  // --- Ouverture et fermeture du dialogue natif ------------------------
  // Un `<dialog>` s'ouvre par une méthode, pas par un attribut : `open` en JSX
  // n'a ni calque, ni arrière-plan, ni piège de focus.
  const isModalLayer = modal && !contained;

  // L'état pilote le dialogue natif, dans les deux sens : l'événement `close`
  // est mis en file et peut ne jamais arriver. Cantonné et ouvert dès le
  // montage, il s'ouvre par l'attribut : `show()` volerait le focus.
  const mountingRef = useRef(true);
  useEffect(() => {
    const dialog = innerRef.current;
    const mounting = mountingRef.current;
    mountingRef.current = false;
    if (!dialog) return;

    if (open && !dialog.open) {
      if (isModalLayer) dialog.showModal();
      else if (contained && mounting) dialog.setAttribute('open', '');
      else dialog.show();
      onShow?.();
    } else if (!open && dialog.open) {
      dialog.close();
      setMaximized(false);
      gestures.reset();
      onHide?.();
    }
    // `onShow` et `onHide` hors dépendances : recréés à chaque rendu, ils rejoueraient l'effet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isModalLayer]);

  useEffect(() => {
    const dialog = innerRef.current;
    if (!dialog) return;

    // Si autre chose ferme le dialogue (un `<form method="dialog">`), l'état se réaligne.
    const onClose = () => setOpen(false);

    const onCancel = (event: Event) => {
      // Échap arrive par `cancel`, annulable. On l'annule toujours et on passe par
      // l'état : une seule voie de fermeture, qui peut retenir un dialogue non fermable.
      event.preventDefault();
      if (closeOnEscape && closable) setOpen(false);
    };

    // Un clic sur `::backdrop` a pour cible le `<dialog>` lui-même, jamais un descendant.
    const onClick = (event: Event) => {
      if (!isModalLayer || !dismissableMask || !closable) return;
      if (event.target === dialog) setOpen(false);
    };

    dialog.addEventListener('close', onClose);
    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('click', onClick);
    return () => {
      dialog.removeEventListener('close', onClose);
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('click', onClick);
    };
  });

  const close = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const toggleMaximize = () => {
    const next = !maximized;
    setMaximized(next);
    if (next) gestures.reset();
    onMaximizedChange?.(next);
  };

  // --- Corps défilant : un arrêt de tabulation, seulement s'il le faut ---
  const [contentNeedsFocus, setContentNeedsFocus] = useState(false);

  useEffect(() => {
    const element = contentRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const measure = () => {
      const overflows = element.scrollHeight > element.clientHeight + 1;
      const hasFocusable = element.querySelector(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      setContentNeedsFocus(overflows && !hasFocusable);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
    // Pas de `children` : l'observateur se réveille seul quand le contenu change de taille.
  }, [open]);

  // --- Largeurs par point de rupture -----------------------------------
  useEffect(() => {
    if (!breakpoints || Object.keys(breakpoints).length === 0) return;

    const element = document.createElement('style');
    element.textContent = Object.entries(breakpoints)
      .map(
        ([query, width]) =>
          `@media screen and (max-width: ${query}) {` +
          ` [data-modal-uid="${uid}"]:not(._maximized) { width: ${width} !important; } }`,
      )
      .join('\n');
    document.head.appendChild(element);
    return () => element.remove();
  }, [breakpoints, uid]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (open && !labelledBy && !ariaLabel && !warned.has(uid)) {
      warned.add(uid);
      console.warn(
        `[ui-modal] Dialogue sans nom accessible : renseignez \`header\`, \`aria-label\` ou \`aria-labelledby\`.`,
      );
    }
  }, [open, labelledBy, ariaLabel, uid]);

  const resolvedStyle: CSSProperties = motionDisabled
    ? { ['--ui-motion-duration' as string]: '0ms', ...style }
    : { ...style };
  if (!maximized) {
    if (gestures.size) {
      resolvedStyle.width = gestures.size.width;
      resolvedStyle.height = gestures.size.height;
    }
    if (gestures.dragOffset) {
      resolvedStyle.translate = `${gestures.dragOffset.x}px ${gestures.dragOffset.y}px`;
    }
  }

  return (
    <dialog
      {...rest}
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      data-modal-uid={uid}
      className={cx(
        'ui-modal',
        `_motion-${motion}`,
        position !== 'center' && `_pos-${position}`,
        maximized && '_maximized',
        contained && '_contained',
        backdropClassName,
        className,
      )}
      style={resolvedStyle}
      aria-label={labelledBy ? undefined : ariaLabel}
      aria-labelledby={labelledBy}
    >
      {showHeader && (
        <div
          className={cx('ui-modal-header', draggable && !maximized && '_draggable')}
          onPointerDown={gestures.onHeaderPointerDown}
        >
          <div id={titleId} className="ui-modal-title">
            {header}
          </div>

          <div className="ui-modal-header-actions">
            {maximizable && (
              <button
                type="button"
                className="ui-modal-action"
                aria-label={maximizeAriaLabel}
                aria-pressed={maximized}
                onClick={toggleMaximize}
              >
                <UiIcon name={maximized ? minimizeIcon : maximizeIcon} size="sm" />
              </button>
            )}
            {closable && (
              <button
                type="button"
                className="ui-modal-action"
                aria-label={closeAriaLabel}
                onClick={close}
              >
                <UiIcon name={closeIcon} size="sm" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* axe exige une région défilante atteignable au clavier, quoi qu'en dise `jsx-a11y`. */}
      {/* eslint-disable jsx-a11y/no-noninteractive-tabindex */}
      <div
        ref={contentRef}
        className="ui-modal-content"
        tabIndex={contentNeedsFocus ? 0 : undefined}
      >
        {children}
      </div>
      {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}

      {footer && <div className="ui-modal-footer">{footer}</div>}

      {resizable && !maximized && (
        <span
          className="ui-modal-resize-handle"
          aria-hidden="true"
          onPointerDown={gestures.onResizePointerDown}
        />
      )}
    </dialog>
  );
}
