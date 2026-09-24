'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';

import { UiIcon } from '../../base/ui-icon';
import { useControllableState } from '../../core/forms';
import { useUiScrollLock } from '../../core/overlay';
import { cx } from '../../core/utils';

import './ui-bottom-sheet.scss';

/** Paliers d'ouverture nommés. */
export type BottomSheetHeightPreset = 'auto' | 'half' | 'full';

/**
 * Hauteur d'ouverture : un palier nommé, ou n'importe quelle longueur CSS
 * (`'70vh'`, `'400px'`). `Record<never, never>` garde les paliers suggérés par
 * l'éditeur tout en acceptant une chaîne libre.
 */
export type BottomSheetHeight = BottomSheetHeightPreset | (string & Record<never, never>);

const HEIGHT_PRESETS: readonly string[] = ['auto', 'half', 'full'];

/** Descendants interactifs qui gardent leur propre geste plutôt que d'ouvrir un glissement. */
const INTERACTIVE = 'button, a[href], input, select, textarea, [role="button"], [contenteditable]';
/** La poignée est elle-même un bouton en mode palier, et pourtant c'est ELLE qu'on saisit. */
const HANDLE_CLASS = 'ui-bottom-sheet-handle';

/** Avertissements déjà émis, pour rester idempotent sous `<StrictMode>`. */
const warned = new Set<string>();

type NativeProps = Omit<
  ComponentPropsWithRef<'dialog'>,
  'open' | 'title' | 'onClose' | 'children' | 'role'
>;

export interface UiBottomSheetProps extends NativeProps {
  /** Ouverture imposée. Renseignée, le panneau est **contrôlé**. */
  visible?: boolean;
  defaultVisible?: boolean;
  onVisibleChange?: (visible: boolean) => void;

  /**
   * Hauteur d'ouverture : `auto` épouse le contenu sous un plafond, `half` la
   * moitié de l'écran, `full` l'écran entier, ou n'importe quelle longueur CSS.
   */
  height?: BottomSheetHeight;

  /** Arrière-plan assombri, inerte, et défilement bloqué. */
  modal?: boolean;
  /** Fermer au clic sur l'arrière-plan. Modal seulement. */
  dismissableMask?: boolean;
  /** Fermer sur Échap. */
  closeOnEscape?: boolean;
  /** Bloquer le défilement de fond même pour un panneau non modal. */
  blockScroll?: boolean;

  /** Fermer en tirant le panneau vers le bas, au doigt, à la souris ou au stylet. */
  enableDragToClose?: boolean;
  /** Distance à parcourir avant que le relâchement ne referme, en px. */
  dragThreshold?: number;
  /** Autoriser le passage d'un panneau `half` à `full` en le tirant vers le haut. */
  enableSnapping?: boolean;
  /** Afficher la barre de préhension en haut du panneau. */
  showHandle?: boolean;

  /** Sélecteur CSS de l'élément à focaliser à l'ouverture, par exemple `'#recherche'`. */
  autoFocusElement?: string;

  /** Titre. Une chaîne suffit, mais tout nœud est accepté. */
  header?: ReactNode;
  /** Zone de pied, typiquement les actions. */
  footer?: ReactNode;
  /** Afficher le bouton de fermeture. Absent du dessin de référence, donc éteint. */
  closable?: boolean;
  closeIcon?: string;
  closeAriaLabel?: string;
  /** Nom accessible de la poignée quand elle est manipulable (`enableSnapping`). */
  handleAriaLabel?: string;

  'aria-label'?: string;
  'aria-labelledby'?: string;

  /** Réserver l'incrustation système sous le panneau : barre d'accueil iOS, gestes Android. */
  safeArea?: boolean;
  /**
   * Cantonner le panneau au premier ancêtre positionné plutôt qu'à l'écran, et
   * ne pas bloquer le défilement. Les paliers deviennent des fractions de ce
   * conteneur.
   */
  contained?: boolean;
  /** Couper l'animation d'ouverture et de fermeture pour ce panneau. */
  motionDisabled?: boolean;
  /** Classes permettant de styler l'arrière-plan (`.ma-classe::backdrop`). */
  backdropClassName?: string;

  onShow?: () => void;
  onHide?: () => void;

  /** Contenu principal, qui défile quand il déborde. */
  children?: ReactNode;
}

/**
 * ui-bottom-sheet : panneau qui glisse depuis le bord bas de l'écran.
 *
 * Même socle que `ui-modal` et `ui-drawer`, le `<dialog>` natif : le piège de
 * focus, la restitution du focus, l'inertie de l'arrière-plan et l'empilement
 * viennent du navigateur. Ce que ce composant ajoute lui est propre : les
 * paliers de hauteur, le glissement vers le bas qui referme, et le passage de
 * `half` à `full` en tirant vers le haut.
 *
 * Le glissement coule dans l'animation de fermeture parce que les deux touchent
 * la même propriété, `translate`.
 */
export function UiBottomSheet({
  visible,
  defaultVisible = false,
  onVisibleChange,
  height = 'auto',
  modal = true,
  dismissableMask = true,
  closeOnEscape = true,
  blockScroll = true,
  enableDragToClose = true,
  dragThreshold = 96,
  enableSnapping = false,
  showHandle = true,
  autoFocusElement,
  header,
  footer,
  closable = false,
  closeIcon = 'xmark',
  closeAriaLabel = 'Fermer',
  handleAriaLabel = 'Redimensionner le panneau',
  safeArea = true,
  contained = false,
  motionDisabled = false,
  backdropClassName,
  onShow,
  onHide,
  className,
  style,
  children,
  ref,
  ...rest
}: UiBottomSheetProps) {
  const innerRef = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const titleId = `${uid}-title`;

  const [open, setOpen] = useControllableState<boolean>({
    value: visible,
    defaultValue: defaultVisible,
    onChange: onVisibleChange,
  });

  /** Le panneau `half` est momentanément monté au palier `full`. */
  const [snapped, setSnapped] = useState(false);
  /** Distance de glissement vers le bas, en px. */
  const [dragOffset, setDragOffset] = useState(0);
  /** Hauteur vive pendant qu'on tire un panneau à palier vers le haut, en px. */
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  /**
   * L'état vif du geste.
   *
   * Une valeur lue par deux gestionnaires d'un même geste est une **ref**,
   * jamais un état : `pointermove` et `pointerup` peuvent arriver dans la même
   * tâche, et le second lirait alors l'état d'avant le premier. Les états
   * `dragOffset` et `dragHeight` ne servent qu'au RENDU.
   */
  const gesture = useRef<{
    pointerId: number;
    startY: number;
    startHeight: number;
    offset: number;
    height: number | null;
  } | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const [contentNeedsFocus, setContentNeedsFocus] = useState(false);

  const isModalLayer = modal && !contained;
  useUiScrollLock(open && !contained && (modal || blockScroll));

  const ariaLabel = rest['aria-label'];
  const ariaLabelledBy = rest['aria-labelledby'];
  const labelledBy = ariaLabelledBy ?? (header ? titleId : undefined);

  /** Le palier `half` peut grandir jusqu'à `full` d'un glissement. */
  const canSnap = enableSnapping && height === 'half';
  const dragEnabled = enableDragToClose || canSnap;
  const effectiveHeight = canSnap && snapped ? 'full' : height;
  const preset = HEIGHT_PRESETS.includes(effectiveHeight)
    ? (effectiveHeight as BottomSheetHeightPreset)
    : null;

  const close = useCallback(() => setOpen(false), [setOpen]);

  // L'ÉTAT est la source de vérité, le DOM suit. Un `<dialog>` s'ouvre par une
  // méthode et non par un attribut : `open` posé en JSX rendrait le panneau sans
  // calque supérieur, sans arrière-plan et sans piège de focus.
  //
  // Sauf un panneau CANTONNÉ ouvert dès le montage : il fait partie de la page,
  // et `show()` y poserait le focus, donc un défilement jusqu'à lui. Il n'a de
  // toute façon ni calque, ni arrière-plan, ni piège (voir ui-modal).
  const mountingRef = useRef(true);
  useEffect(() => {
    const dialog = innerRef.current;
    const mounting = mountingRef.current;
    mountingRef.current = false;
    if (!dialog) return;

    if (open && !dialog.open) {
      setSnapped(false);
      setDragOffset(0);
      setDragHeight(null);
      if (isModalLayer) dialog.showModal();
      else if (contained && mounting) dialog.setAttribute('open', '');
      else dialog.show();
      onShow?.();
    } else if (!open && dialog.open) {
      dialog.close();
      onHide?.();
    }
    // `onShow` et `onHide` hors dépendances : recréés à chaque rendu, ils
    // rejoueraient l'effet en boucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isModalLayer]);

  useEffect(() => {
    const dialog = innerRef.current;
    if (!dialog) return;

    const onClose = () => setOpen(false);

    const onCancel = (event: Event) => {
      // Échap arrive par `cancel`, annulable. On l'annule toujours et on passe
      // par l'état : une seule voie de fermeture.
      event.preventDefault();
      if (closeOnEscape) setOpen(false);
    };

    const onClick = (event: Event) => {
      if (!isModalLayer || !dismissableMask) return;
      // Le panneau EST le dialogue : un clic dont la cible est le dialogue
      // lui-même vient donc de l'arrière-plan, jamais du contenu.
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

  /**
   * Focus dirigé à l'ouverture.
   *
   * Une seule tentative suffit : les enfants sont rendus avant que l'effet ne
   * tire, là où la version Angular doit réessayer parce que son contenu projeté
   * arrive un tour plus tard.
   */
  useEffect(() => {
    if (!open || !autoFocusElement) return;
    const target = innerRef.current?.querySelector<HTMLElement>(autoFocusElement);
    if (target) {
      target.focus({ preventScroll: true });
      return;
    }
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[ui-bottom-sheet] autoFocusElement "${autoFocusElement}" ne matche rien.`);
    }
  }, [open, autoFocusElement]);

  // Le corps n'est un arrêt de tabulation que s'il défile ET n'offre rien
  // d'autre à atteindre : mesuré, jamais supposé.
  useEffect(() => {
    const element = contentRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const measure = () => {
      const overflows = element.scrollHeight > element.clientHeight + 1;
      const focusable = element.querySelector(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      setContentNeedsFocus(overflows && !focusable);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (open && !labelledBy && !ariaLabel && !warned.has(uid)) {
      warned.add(uid);
      console.warn(
        '[ui-bottom-sheet] Panneau sans nom accessible : renseignez `header`, `aria-label` ou `aria-labelledby`.',
      );
    }
  }, [open, labelledBy, ariaLabel, uid]);

  // --- Le glissement -------------------------------------------------------

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragEnabled || gesture.current) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    // Un contrôle posé dans la zone de préhension garde son propre geste, bouton
    // de fermeture ou lien. Sauf la poignée, qui est un bouton en mode palier.
    const control = (event.target as Element | null)?.closest(INTERACTIVE);
    if (control && !control.classList.contains(HANDLE_CLASS)) return;

    gesture.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: innerRef.current?.offsetHeight ?? 0,
      offset: 0,
      height: null,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || event.pointerId !== current.pointerId) return;
    const delta = event.clientY - current.startY;

    if (delta >= 0) {
      // Vers le bas : on translate le panneau, la propriété qui ne coûte rien.
      current.height = null;
      current.offset = enableDragToClose ? delta : 0;
      setDragHeight(null);
      setDragOffset(current.offset);
      return;
    }

    // Vers le haut : seul un panneau à palier réagit, en grandissant vers `full`.
    current.offset = 0;
    setDragOffset(0);
    if (!canSnap || snapped) return;
    const ceiling = contained
      ? (innerRef.current?.parentElement?.clientHeight ?? current.startHeight)
      : window.innerHeight;
    current.height = Math.min(ceiling, current.startHeight - delta);
    setDragHeight(current.height);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || event.pointerId !== current.pointerId) return;

    const grown = (current.height ?? current.startHeight) - current.startHeight;
    const offset = current.offset;
    const threshold = Math.max(1, dragThreshold);
    gesture.current = null;
    setDragging(false);
    setDragOffset(0);
    setDragHeight(null);

    if (grown >= threshold) {
      setSnapped(true);
      return;
    }
    if (offset < threshold) return;
    // Depuis `full`, un panneau à palier redescend d'abord à `half`.
    if (canSnap && snapped) setSnapped(false);
    else if (enableDragToClose) close();
  };

  const onHandleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!canSnap) return;
    switch (event.key) {
      case 'ArrowUp':
        setSnapped(true);
        break;
      case 'ArrowDown':
        setSnapped(false);
        break;
      case 'Enter':
      case ' ':
        setSnapped((value) => !value);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  // --- Rendu ---------------------------------------------------------------

  const sheetStyle: CSSProperties = { ...style };
  const set = (name: string, value: string) => {
    (sheetStyle as Record<string, string>)[name] = value;
  };
  if (motionDisabled) set('--ui-motion-duration', '0ms');
  // Un palier passe par sa classe, pour que le crochet SCSS reste maître.
  if (dragHeight !== null) sheetStyle.height = `${dragHeight}px`;
  else if (!preset) sheetStyle.height = effectiveHeight;
  if (dragOffset > 0) set('translate', `0 ${dragOffset}px`);

  const hasGrab = showHandle || Boolean(header) || closable;

  return (
    <dialog
      {...rest}
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className={cx(
        'ui-bottom-sheet',
        preset && `_${preset}`,
        contained && '_contained',
        safeArea && !contained && '_safe-area',
        dragging && '_dragging',
        backdropClassName,
        className,
      )}
      style={sheetStyle}
      aria-label={labelledBy ? undefined : ariaLabel}
      aria-labelledby={labelledBy}
    >
      {hasGrab && (
        // Zone de préhension : la poignée et l'en-tête. Le corps en est exclu,
        // pour qu'il garde son défilement natif.
        <div
          className={cx('ui-bottom-sheet-grab', dragEnabled && '_draggable')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {showHandle &&
            (canSnap ? (
              <button
                type="button"
                className="ui-bottom-sheet-handle _operable"
                aria-label={handleAriaLabel || undefined}
                aria-expanded={snapped}
                onKeyDown={onHandleKeyDown}
              />
            ) : (
              <div className="ui-bottom-sheet-handle" aria-hidden="true" />
            ))}

          {(header || closable) && (
            <div className="ui-bottom-sheet-header">
              {header && (
                <div id={titleId} className="ui-bottom-sheet-title">
                  {header}
                </div>
              )}

              {closable && (
                <button
                  type="button"
                  className="ui-bottom-sheet-action"
                  aria-label={closeAriaLabel || undefined}
                  onClick={close}
                >
                  <UiIcon name={closeIcon} size="sm" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/*
        Le corps défile nativement, et garde son défilement chez lui.

        `jsx-a11y` refuse un `tabIndex` sur un élément non interactif, et axe
        EXIGE qu'une région défilante soit atteignable au clavier
        (`scrollable-region-focusable`). Les deux règles se contredisent, et
        c'est axe qui tranche : lui mesure le rendu réel. Même contrat que
        `ui-modal` : le `tabIndex` n'est posé que quand la région déborde ET ne
        contient rien de focalisable, donc jamais « au cas où ».
      */}
      {/* eslint-disable jsx-a11y/no-noninteractive-tabindex */}
      <div
        ref={contentRef}
        className="ui-bottom-sheet-content"
        tabIndex={contentNeedsFocus ? 0 : undefined}
      >
        {children}
      </div>
      {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}

      {footer && <div className="ui-bottom-sheet-footer">{footer}</div>}
    </dialog>
  );
}
