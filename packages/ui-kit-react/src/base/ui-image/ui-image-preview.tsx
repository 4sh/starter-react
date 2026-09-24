'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from 'react';

import { UiIcon } from '../ui-icon';
import { useUiScrollLock } from '../../core/overlay';
import { cx } from '../../core/utils';

import './ui-image.scss';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** La vue au repos : ni zoom, ni rotation, ni déplacement. */
const NEUTRAL = { scale: 1, rotation: 0, x: 0, y: 0 };

/** Pas de déplacement d'une flèche du clavier, en px. */
const PAN_STEP = 24;

export interface UiImagePreviewProps extends Omit<
  ComponentPropsWithRef<'dialog'>,
  'open' | 'onClose' | 'children'
> {
  /** Ouverture imposée. Renseignée, l'aperçu est **contrôlé**. */
  visible?: boolean;
  defaultVisible?: boolean;
  onVisibleChange?: (visible: boolean) => void;

  /** URL de l'image à agrandir, déjà résolue : `http(s)`, `blob:` ou `data:`. */
  src: string;
  /** Texte alternatif. Vide, l'image est décorative. */
  alt?: string;
  /** Nom accessible du dialogue. */
  'aria-label'?: string;

  /** Pas de zoom d'un clic, d'un cran de molette ou d'une frappe sur `+` et `-`. */
  zoomStep?: number;
  minZoom?: number;
  maxZoom?: number;

  /** Proposer une action de téléchargement dans la barre. */
  downloadable?: boolean;
  /** Nom de fichier proposé par cette action. */
  downloadName?: string;
  /** Fermer au clic sur le fond, autour de l'image. */
  dismissableMask?: boolean;

  zoomInAriaLabel?: string;
  zoomOutAriaLabel?: string;
  rotateLeftAriaLabel?: string;
  rotateRightAriaLabel?: string;
  resetAriaLabel?: string;
  downloadAriaLabel?: string;
  closeAriaLabel?: string;
}

/**
 * ui-image-preview : la vue agrandie qu'ouvre le mode `preview` de `ui-image`.
 *
 * Déplacement, échelle et rotation passent par une seule `transform`, au pointeur
 * comme au clavier (`+`, `-`, `0`, `r`, flèches). Bâti sur le `<dialog>` natif :
 * piège de focus, restitution du focus et `Échap` viennent du navigateur.
 */
export function UiImagePreview({
  visible,
  defaultVisible = false,
  onVisibleChange,
  src,
  alt = '',
  zoomStep = 0.25,
  minZoom = 0.5,
  maxZoom = 4,
  downloadable = false,
  downloadName,
  dismissableMask = true,
  zoomInAriaLabel = 'Zoom avant',
  zoomOutAriaLabel = 'Zoom arrière',
  rotateLeftAriaLabel = 'Pivoter vers la gauche',
  rotateRightAriaLabel = 'Pivoter vers la droite',
  resetAriaLabel = "Réinitialiser l'affichage",
  downloadAriaLabel = "Télécharger l'image",
  closeAriaLabel = "Fermer l'aperçu",
  className,
  ref,
  ...rest
}: UiImagePreviewProps) {
  const innerRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ariaLabel = rest['aria-label'] ?? "Aperçu de l'image";
  delete rest['aria-label'];

  const [open, setOpen] = useState(visible ?? defaultVisible);
  const isControlled = visible !== undefined;
  const isOpen = isControlled ? visible : open;
  const setVisible = useCallback(
    (next: boolean) => {
      if (!isControlled) setOpen(next);
      onVisibleChange?.(next);
    },
    [isControlled, onVisibleChange],
  );

  // Un seul état pour les trois transformations : elles se remettent à neuf ensemble.
  const [view, setView] = useState(NEUTRAL);
  const scale = view.scale;
  const rotation = view.rotation;
  const pan = view;

  // Une nouvelle image, ou une réouverture, repart de la vue neutre. Ajusté au
  // rendu : un effet peindrait d'abord l'ancienne vue.
  const viewKey = `${src}|${isOpen}`;
  const [lastViewKey, setLastViewKey] = useState(viewKey);
  if (lastViewKey !== viewKey) {
    setLastViewKey(viewKey);
    setView(NEUTRAL);
  }

  useUiScrollLock(isOpen);

  // L'état pilote le calque, jamais l'inverse : un `<dialog>` s'ouvre par une
  // méthode, et l'attribut `open` posé en JSX le rendrait sans calque supérieur.
  useEffect(() => {
    const dialog = innerRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    else if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  useEffect(() => {
    const dialog = innerRef.current;
    if (!dialog) return;
    const onClose = () => setVisible(false);
    const onCancel = (event: Event) => {
      event.preventDefault();
      setVisible(false);
    };
    dialog.addEventListener('close', onClose);
    dialog.addEventListener('cancel', onCancel);
    return () => {
      dialog.removeEventListener('close', onClose);
      dialog.removeEventListener('cancel', onCancel);
    };
  });

  const applyScale = useCallback(
    (value: number) => {
      const next = clamp(Number(value.toFixed(4)), minZoom, maxZoom);
      // Retour au cadrage : le déplacement laisserait sinon l'image de côté.
      setView((current) =>
        next <= 1 ? { ...current, scale: next, x: 0, y: 0 } : { ...current, scale: next },
      );
    },
    [minZoom, maxZoom],
  );

  const reset = useCallback(() => setView(NEUTRAL), []);

  const canZoomIn = scale < maxZoom;
  const canZoomOut = scale > minZoom;
  const canPan = scale > 1;
  const pristine = scale === 1 && rotation === 0 && pan.x === 0 && pan.y === 0;
  /** Un quart de tour : ce qui est dessiné ne suit plus les axes de la boîte. */
  const quarterTurned = rotation % 180 !== 0;

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    switch (event.key) {
      case '+':
      case '=':
        applyScale(scale + zoomStep);
        break;
      case '-':
        applyScale(scale - zoomStep);
        break;
      case '0':
        reset();
        break;
      case 'r':
      case 'R':
        setView((v) => ({ ...v, rotation: v.rotation + 90 }));
        break;
      case 'ArrowLeft':
        setView((v) => ({ ...v, x: v.x - PAN_STEP }));
        break;
      case 'ArrowRight':
        setView((v) => ({ ...v, x: v.x + PAN_STEP }));
        break;
      case 'ArrowUp':
        setView((v) => ({ ...v, y: v.y - PAN_STEP }));
        break;
      case 'ArrowDown':
        setView((v) => ({ ...v, y: v.y + PAN_STEP }));
        break;
      default:
        // Échap est laissé au dialogue, et `Tab` au piège de focus natif.
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    applyScale(scale + (event.deltaY < 0 ? zoomStep : -zoomStep));
  };

  // --- Déplacement au glissement -------------------------------------------
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLImageElement>) => {
    if (!canPan || event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const onPointerMove = (event: PointerEvent<HTMLImageElement>) => {
    const origin = drag.current;
    if (!origin) return;
    setView((v) => ({
      ...v,
      x: origin.panX + (event.clientX - origin.x),
      y: origin.panY + (event.clientY - origin.y),
    }));
  };

  const onPointerUp = (event: PointerEvent<HTMLImageElement>) => {
    if (!drag.current) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  /** Un appui qui atterrit sur la scène, et non sur l'image, est un appui dehors. */
  const onStagePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (dismissableMask && event.target === stageRef.current) setVisible(false);
  };

  return (
    <dialog
      {...rest}
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className={cx('ui-image-preview', className)}
      aria-label={ariaLabel || undefined}
      onKeyDown={onKeyDown}
    >
      {/* `aria-disabled`, jamais `disabled` : un bouton désactivé sous le focus le
          lâche sur le corps, et `Échap` n'atteint plus le dialogue. */}
      <div className="ui-image-preview-toolbar">
        <button
          type="button"
          className="ui-image-preview-action"
          aria-label={zoomOutAriaLabel || undefined}
          aria-disabled={!canZoomOut || undefined}
          onClick={() => applyScale(scale - zoomStep)}
        >
          <UiIcon name="magnifying-glass-minus" size="sm" />
        </button>

        <button
          type="button"
          className="ui-image-preview-action"
          aria-label={zoomInAriaLabel || undefined}
          aria-disabled={!canZoomIn || undefined}
          onClick={() => applyScale(scale + zoomStep)}
        >
          <UiIcon name="magnifying-glass-plus" size="sm" />
        </button>

        <button
          type="button"
          className="ui-image-preview-action"
          aria-label={rotateLeftAriaLabel || undefined}
          onClick={() => setView((v) => ({ ...v, rotation: v.rotation - 90 }))}
        >
          <UiIcon name="rotate-left" size="sm" />
        </button>

        <button
          type="button"
          className="ui-image-preview-action"
          aria-label={rotateRightAriaLabel || undefined}
          onClick={() => setView((v) => ({ ...v, rotation: v.rotation + 90 }))}
        >
          <UiIcon name="rotate-right" size="sm" />
        </button>

        <button
          type="button"
          className="ui-image-preview-action"
          aria-label={resetAriaLabel || undefined}
          aria-disabled={pristine || undefined}
          onClick={reset}
        >
          <UiIcon name="arrows-rotate" size="sm" />
        </button>

        {downloadable && (
          <a
            className="ui-image-preview-action"
            href={src}
            download={downloadName || ''}
            aria-label={downloadAriaLabel || undefined}
            target="_blank"
            rel="noopener"
          >
            <UiIcon name="download" size="sm" />
          </a>
        )}

        <button
          type="button"
          className="ui-image-preview-action"
          aria-label={closeAriaLabel || undefined}
          onClick={() => setVisible(false)}
        >
          <UiIcon name="xmark" size="sm" />
        </button>
      </div>

      <div
        ref={stageRef}
        className="ui-image-preview-stage"
        onPointerDown={onStagePointerDown}
        onWheel={onWheel}
      >
        <img
          className={cx(
            'ui-image-preview-media',
            canPan && '_pannable',
            quarterTurned && '_rotated',
          )}
          src={src}
          alt={alt}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale}) rotate(${rotation}deg)`,
          }}
          draggable={false}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
    </dialog>
  );
}
