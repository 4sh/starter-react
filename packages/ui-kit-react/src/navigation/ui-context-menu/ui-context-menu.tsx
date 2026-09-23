'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';

import { useCloseOnNavigation, useUiDismiss, useUiPosition } from '../../core/overlay';
import type { UiSubLevel } from '../../core/types';
import { cx } from '../../core/utils';
import {
  UiMenu,
  type MenuSize,
  type MenuSubmenuMode,
  type UiMenuItem,
  type UiMenuItemCommandEvent,
} from '../ui-menu';

import './ui-context-menu.scss';

/** Props à reverser sur la zone qui ouvre le menu. */
export interface UiContextMenuZoneProps {
  /** Ref de rappel : une fonction, non un `Ref<HTMLElement>`, pour se reverser
   * sur n'importe quel élément sans cast chez l'appelant. */
  ref: (node: HTMLElement | null) => void;
}

type NativeProps = Omit<HTMLAttributes<HTMLElement>, 'children'>;

export interface UiContextMenuProps extends NativeProps {
  /** Entrées du menu. */
  items?: UiMenuItem[];
  /**
   * Rend la zone à laquelle le menu est attaché. Reçoit la `ref` qui sert de
   * cible : c'est elle qui reçoit l'écouteur, et qui reprend le focus à la
   * fermeture.
   */
  trigger?: (props: UiContextMenuZoneProps) => ReactNode;
  /** Attacher l'écouteur au document entier plutôt qu'à la zone. */
  global?: boolean;
  /** Événement DOM qui ouvre le menu. Le clic droit par défaut. */
  triggerEvent?: string;

  /** Famille de couleur : `high` ou `low`. */
  level?: UiSubLevel;
  /** Densité. Compacte par défaut, comme tout menu d'actions contextuel. */
  size?: MenuSize;
  /** Rendu des groupes. En cascade par défaut, comme un menu contextuel natif. */
  submenus?: MenuSubmenuMode;
  /** Couper l'animation d'apparition. */
  motionDisabled?: boolean;
  /** Onde de pression sur les entrées, transmise au menu embarqué. */
  ripple?: boolean;

  /** Contenu d'une entrée, transmis au menu. */
  renderItem?: (item: UiMenuItem) => ReactNode;
  /** Contenu d'un en-tête de groupe, transmis au menu. */
  renderHeader?: (item: UiMenuItem) => ReactNode;

  onItemClick?: (event: UiMenuItemCommandEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;

  /** Nom accessible de la liste. Recommandé. */
  'aria-label'?: string;

  ref?: Ref<HTMLElement>;
}

/**
 * ui-context-menu : menu ouvert au clic droit, posé sur le pointeur.
 *
 * Le panneau est un {@link UiMenu} dans le **calque supérieur**, ancré non pas
 * sur un élément mais sur un **point** : une ancre invisible de taille nulle,
 * posée aux coordonnées du clic. Elle est gardée en coordonnées de PAGE et
 * reprojetée à chaque défilement, ce qui fait suivre le menu comme s'il
 * appartenait au contenu.
 *
 * Là où la version Angular s'appelle par des méthodes (`show`, `hide`,
 * `toggle`), celle-ci se gouverne seule : un menu contextuel n'a pas d'état
 * utile sans les coordonnées qui vont avec. Pour un panneau ouvert par
 * programme, c'est `ui-menu` en mode `popup` qu'il faut.
 */
export function UiContextMenu({
  items = [],
  trigger,
  global: attachToDocument = false,
  triggerEvent = 'contextmenu',
  level = 'high',
  size = 'small',
  submenus = 'flyout',
  motionDisabled = false,
  ripple = true,
  renderItem,
  renderHeader,
  onItemClick,
  onOpen,
  onClose,
  className,
  style,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: UiContextMenuProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  /**
   * La zone est gardée en ÉTAT et non dans une ref : c'est son nœud qui décide
   * où brancher l'écouteur, donc l'effet doit se rejouer quand il change. Une
   * ref ne réveille aucun effet, et dépendre de la prop `trigger` rebrancherait
   * à chaque rendu, celle-ci étant presque toujours une lambda.
   */
  const [zone, setZone] = useState<HTMLElement | null>(null);
  /** Coordonnées de PAGE de l'ancre : le menu appartient au contenu, pas à l'écran. */
  const pageRef = useRef({ x: 0, y: 0 });
  const panelId = useId();

  const [open, setOpen] = useState(false);
  /** Coordonnées de l'ancre dans le VIEWPORT, reprojetées depuis la page. */
  const [point, setPoint] = useState({ x: 0, y: 0 });

  // Ancré sur un POINT et non sur un élément : c'est ce qui distingue un menu
  // contextuel d'un panneau ancré. Sous et à droite du pointeur, retourné sur
  // les bords du viewport, et sans écart, l'ancre étant le point cliqué.
  const { setPanel, panelStyle, isPositioned } = useUiPosition<HTMLElement, HTMLDivElement>({
    placement: 'bottom-start',
    offset: 0,
    open,
    anchorPoint: point,
  });

  const attachPanel = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node;
      setPanel(node);
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as { current: HTMLElement | null }).current = node;
    },
    [setPanel, ref],
  );

  const close = useCallback(() => {
    setOpen((wasOpen) => {
      if (wasOpen) onClose?.();
      return false;
    });
  }, [onClose]);

  // --- Ouverture sur l'événement de la zone (ou du document) ---------------
  useEffect(() => {
    const host: EventTarget | null = attachToDocument ? document : zone;
    if (!host) return;

    const onTrigger = (event: Event) => {
      const pointer = event as MouseEvent;
      // Le menu du navigateur laisse la place au nôtre.
      event.preventDefault();
      event.stopPropagation();
      pageRef.current = {
        x: pointer.clientX + window.scrollX,
        y: pointer.clientY + window.scrollY,
      };
      setPoint({ x: pointer.clientX, y: pointer.clientY });
      setOpen((wasOpen) => {
        if (!wasOpen) onOpen?.();
        return true;
      });
    };

    host.addEventListener(triggerEvent, onTrigger);
    return () => host.removeEventListener(triggerEvent, onTrigger);
    // `onOpen` hors dépendances : recréé à chaque rendu, il rebrancherait
    // l'écouteur en boucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachToDocument, triggerEvent, zone]);

  // Le point est gardé en coordonnées de page : on le reprojette à chaque
  // défilement, capture comprise, pour couvrir les zones défilantes.
  useEffect(() => {
    if (!open) return;
    const reproject = () =>
      setPoint({ x: pageRef.current.x - window.scrollX, y: pageRef.current.y - window.scrollY });
    document.addEventListener('scroll', reproject, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', reproject, true);
  }, [open]);

  // --- Calque supérieur ----------------------------------------------------
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const shown = panel.matches(':popover-open');

    if (open && !shown) {
      panel.showPopover();
      // Le focus entre dans le menu, sur sa première entrée atteignable. Une
      // macrotâche, et non `requestAnimationFrame`, qui ne tire pas dans un
      // onglet en arrière-plan.
      window.setTimeout(() =>
        panel.querySelector<HTMLElement>('[data-key]:not([disabled])')?.focus(),
      );
      return;
    }
    if (open || !shown) return;

    // Un `popover="manual"` ne mémorise pas l'élément focalisé avant son
    // ouverture : la restitution est à notre charge. La zone n'est pas toujours
    // focalisable, et c'est très bien : l'appel ne fait alors rien.
    const hadFocus = panel.contains(document.activeElement);
    panel.hidePopover();
    if (hadFocus) zone?.focus?.();
  }, [open, zone]);

  useUiDismiss({
    open,
    onDismiss: close,
    panelRef,
    // Pas d'exception sur la zone : un second clic droit dedans doit refermer
    // puis rouvrir au nouveau point, ce qui est le comportement natif.
  });

  useCloseOnNavigation(open, close);

  const zoneProps: UiContextMenuZoneProps = { ref: setZone };

  return (
    <>
      {trigger?.(zoneProps)}

      <div
        {...rest}
        ref={attachPanel}
        id={panelId}
        popover="manual"
        // Tant que la position n'est pas calculée, le panneau reste invisible :
        // sinon la première image le pose là où était le clic précédent, et le
        // menu paraît sauter en place.
        data-unpositioned={isPositioned ? undefined : ''}
        className={cx('ui-context-menu', className)}
        style={
          motionDisabled
            ? { ...panelStyle, ['--ui-motion-duration' as string]: '0ms', ...style }
            : { ...panelStyle, ...style }
        }
      >
        <UiMenu
          items={items}
          level={level}
          size={size}
          submenus={submenus}
          motionDisabled={motionDisabled}
          ripple={ripple}
          renderItem={renderItem}
          renderHeader={renderHeader}
          className="_floating"
          aria-label={ariaLabel}
          onItemClick={(payload) => {
            onItemClick?.(payload);
            close();
          }}
        />
      </div>
    </>
  );
}
