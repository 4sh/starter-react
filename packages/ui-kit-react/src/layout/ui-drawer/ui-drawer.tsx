'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';

import { UiIcon } from '../../base/ui-icon';
import { useControllableState } from '../../core/forms';
import { useUiScrollLock } from '../../core/overlay';
import { cx } from '../../core/utils';

import './ui-drawer.scss';

export type DrawerPosition = 'left' | 'right' | 'top' | 'bottom';

/** Avertissements déjà émis, pour rester idempotent sous `<StrictMode>`. */
const warned = new Set<string>();

type NativeProps = Omit<ComponentPropsWithRef<'dialog'>, 'open' | 'title' | 'onClose' | 'children'>;

export interface UiDrawerProps extends NativeProps {
  /** Ouverture imposée. Renseignée, le tiroir est contrôlé. */
  visible?: boolean;
  defaultVisible?: boolean;
  onVisibleChange?: (visible: boolean) => void;

  /** Bord auquel le tiroir est ancré. */
  position?: DrawerPosition;
  /** Occuper tout l'écran, quel que soit le bord. */
  fullScreen?: boolean;

  /** Titre. Une chaîne suffit, mais tout nœud est accepté. */
  header?: ReactNode;
  /** Zone de pied, typiquement les actions. */
  footer?: ReactNode;
  /** Rendre la zone d'en-tête. `false` laisse le corps seul. */
  showHeader?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;

  /** Arrière-plan assombri, inerte, et défilement bloqué. */
  modal?: boolean;
  /** Fermer au clic sur l'arrière-plan. Modal seulement. */
  dismissableMask?: boolean;
  /** Afficher le bouton de fermeture et autoriser Échap. */
  closable?: boolean;
  closeOnEscape?: boolean;
  /** Bloquer le défilement de fond même pour un tiroir non modal. */
  blockScroll?: boolean;

  /**
   * Cantonner le tiroir au premier ancêtre positionné plutôt qu'à l'écran, et
   * ne pas bloquer le défilement.
   */
  contained?: boolean;

  closeIcon?: string;
  closeAriaLabel?: string;
  /** Classes permettant de styler l'arrière-plan, posées sur le tiroir (`.ma-classe::backdrop`). */
  backdropClassName?: string;

  /**
   * Couper l'animation pour ce tiroir, sans toucher au réglage global.
   *
   * Il n'y a pas de prop de préréglage : un tiroir glisse depuis **son** bord,
   * et c'est le seul mouvement qui ait du sens. Le bord suffit donc à le dire.
   */
  motionDisabled?: boolean;

  onShow?: () => void;
  onHide?: () => void;

  children?: ReactNode;
}

/**
 * ui-drawer : panneau glissant ancré à un bord de l'écran.
 *
 * Même socle que `ui-modal`, le `<dialog>` natif : le piège de focus, la
 * restitution du focus, l'inertie de l'arrière-plan et l'empilement viennent du
 * navigateur. Seuls changent l'ancrage, réglé par les insets, et la dimension du
 * panneau.
 *
 * Le choix entre les deux est une question de place, pas de style : un tiroir
 * garde le contexte visible autour de lui, une fenêtre modale le remplace.
 */
export function UiDrawer({
  visible,
  defaultVisible = false,
  onVisibleChange,
  position = 'left',
  fullScreen = false,
  header,
  footer,
  showHeader = true,
  modal = true,
  dismissableMask = true,
  closable = true,
  closeOnEscape = true,
  blockScroll = false,
  contained = false,
  closeIcon = 'xmark',
  closeAriaLabel = 'Fermer',
  backdropClassName,
  motionDisabled = false,
  onShow,
  onHide,
  className,
  style,
  children,
  ref,
  ...rest
}: UiDrawerProps) {
  const innerRef = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const titleId = `${uid}-title`;

  const [open, setOpen] = useControllableState<boolean>({
    value: visible,
    defaultValue: defaultVisible,
    onChange: onVisibleChange,
  });

  const isModalLayer = modal && !contained;
  useUiScrollLock(open && !contained && (modal || blockScroll));

  const ariaLabel = rest['aria-label'];
  const ariaLabelledBy = rest['aria-labelledby'];
  const labelledBy = ariaLabelledBy ?? (showHeader && header ? titleId : undefined);

  // L'ÉTAT est la source de vérité, le DOM suit. Un `<dialog>` s'ouvre par une
  // méthode et non par un attribut : `open` posé en JSX rendrait le tiroir sans
  // calque supérieur, sans arrière-plan et sans piège de focus.
  useEffect(() => {
    const dialog = innerRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      if (isModalLayer) dialog.showModal();
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
      if (closeOnEscape && closable) setOpen(false);
    };

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

  const close = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (open && !labelledBy && !ariaLabel && !warned.has(uid)) {
      warned.add(uid);
      console.warn(
        `[ui-drawer] Tiroir sans nom accessible : renseignez \`header\`, \`aria-label\` ou \`aria-labelledby\`.`,
      );
    }
  }, [open, labelledBy, ariaLabel, uid]);

  return (
    <dialog
      {...rest}
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className={cx(
        'ui-drawer',
        `_${position}`,
        fullScreen && '_full-screen',
        contained && '_contained',
        backdropClassName,
        className,
      )}
      style={motionDisabled ? { ['--ui-motion-duration' as string]: '0ms', ...style } : style}
      aria-label={labelledBy ? undefined : ariaLabel}
      aria-labelledby={labelledBy}
    >
      {showHeader && (
        <div className="ui-drawer-header">
          <div id={titleId} className="ui-drawer-title">
            {header}
          </div>

          {closable && (
            <div className="ui-drawer-header-actions">
              <button
                type="button"
                className="ui-drawer-action"
                aria-label={closeAriaLabel}
                onClick={close}
              >
                <UiIcon name={closeIcon} size="sm" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="ui-drawer-content">{children}</div>

      {footer && <div className="ui-drawer-footer">{footer}</div>}
    </dialog>
  );
}
