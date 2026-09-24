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
 *
 * C'est la différence la plus visible avec la version Angular, qui reconstruit
 * tout cela à la main faute de pouvoir compter sur `<dialog>` à l'époque. Le
 * relevé qui a mené là est dans « Spécifications / Couches et focus ».
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
  // Un `<dialog>` s'ouvre par une méthode, pas par un attribut : `open` posé en
  // JSX rendrait bien le dialogue, mais SANS calque supérieur, sans arrière-plan
  // et sans piège de focus. C'est le piège central de ce composant.
  const isModalLayer = modal && !contained;

  //
  // L'ÉTAT est la source de vérité, et le DOM suit. C'est cet effet, et lui
  // seul, qui ouvre et ferme, dans les deux sens.
  //
  // La première version faisait l'inverse : le bouton appelait `dialog.close()`
  // et l'état se mettait à jour depuis l'événement `close`. Or `close` est
  // **mis en file**, donc il n'arrive pas toujours (mesuré : jamais, dans un
  // onglet en arrière-plan). L'état restait alors à `true` avec un dialogue
  // fermé à l'écran, et le déclencheur ne rouvrait plus rien, `setOpen(true)`
  // ne changeant rien. Symptôme vu par l'utilisateur : « je ne peux pas la
  // fermer ».
  //
  // Exception : un dialogue CANTONNÉ ouvert dès le montage s'ouvre par
  // l'attribut. Il fait partie de la page comme n'importe quelle section, et
  // `show()` y poserait le focus, que le navigateur fait suivre d'un
  // défilement. Mesuré sur l'Overview : la page arrivait déroulée jusqu'au
  // dernier dialogue ouvert. L'attribut ne lui retire rien, un dialogue
  // cantonné n'ayant ni calque supérieur, ni arrière-plan, ni piège de focus.
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
    // `onShow` et `onHide` volontairement hors dépendances : des fonctions
    // recréées à chaque rendu rejoueraient l'effet en boucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isModalLayer]);

  useEffect(() => {
    const dialog = innerRef.current;
    if (!dialog) return;

    // Filet de sécurité : si quelque chose d'autre ferme le dialogue (un
    // `<form method="dialog">`), l'état se réaligne. Idempotent.
    const onClose = () => setOpen(false);

    const onCancel = (event: Event) => {
      // Échap arrive par `cancel`, qui est annulable. On l'annule TOUJOURS et
      // on passe par l'état : une seule voie de fermeture, donc un seul
      // endroit où `onHide` part et où l'état se met à jour. C'est aussi ce
      // qui permet de retenir un dialogue non fermable.
      event.preventDefault();
      if (closeOnEscape && closable) setOpen(false);
    };

    // Un clic sur `::backdrop` a pour cible le `<dialog>` lui-même : c'est ce
    // qui le distingue d'un clic sur le contenu, qui cible un descendant.
    // Posé ici et non en JSX : le câblage du dialogue natif tient en un seul
    // endroit, et `jsx-a11y` n'a pas à trancher sur un `onClick` porté par un
    // élément qu'il considère non interactif.
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
  // Mesuré et non déduit : le contenu est projeté, donc ni sa hauteur ni ce
  // qu'il contient ne se lisent dans les props. Sans ça, axe signale une région
  // défilante inatteignable au clavier ; avec un `tabindex` inconditionnel, on
  // ajouterait un arrêt inutile à tous les dialogues.
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
    // `children` volontairement hors dépendances : un tableau d'enfants est
    // recréé à chaque rendu, et l'observateur serait reconstruit pour rien. Un
    // changement de contenu qui change la hauteur le réveille de lui-même.
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

  // Couper le mouvement passe par la DURÉE, pas par une classe : la même
  // variable sert au dialogue, à son arrière-plan et à tout ce qui s'y branche,
  // et le réglage reste lisible depuis les outils du navigateur.
  const resolvedStyle: CSSProperties = motionDisabled
    ? { ['--ui-motion-duration' as string]: '0ms', ...style }
    : { ...style };
  if (!maximized) {
    if (gestures.size) {
      resolvedStyle.width = gestures.size.width;
      resolvedStyle.height = gestures.size.height;
    }
    if (gestures.dragOffset) {
      // `translate` et non `transform` : la propriété indépendante n'entre pas
      // en conflit avec une animation d'ouverture, qui pilote `transform`.
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

      {/*
        `jsx-a11y` refuse un `tabIndex` sur un élément non interactif, et axe
        EXIGE qu'une région défilante soit atteignable au clavier
        (`scrollable-region-focusable`). Les deux règles se contredisent, et
        c'est axe qui tranche : lui mesure le rendu réel. Le `tabIndex` n'est
        d'ailleurs posé que quand la région déborde ET ne contient rien de
        focalisable, donc jamais « au cas où ».
      */}
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
