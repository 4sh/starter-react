'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
} from 'react';

import { UiIcon } from '../../base/ui-icon';
import {
  joinIds,
  useControllableState,
  useUiField,
  type UiFieldSharedProps,
} from '../../core/forms';
import { cx } from '../../core/utils';
import { UiField } from '../ui-field';
import { SignPad, type FieldSignFormat, type FieldSignValue } from './ui-field-sign-pad';

import './ui-field-sign.scss';

export type { FieldSignFormat, FieldSignValue };

type NativeCanvasProps = Omit<
  ComponentPropsWithRef<'canvas'>,
  'children' | 'width' | 'height' | 'role' | 'ref' | 'defaultValue'
>;

export interface UiFieldSignProps
  extends Omit<UiFieldSharedProps, 'floatLabel'>, NativeCanvasProps {
  /** Valeur imposée : une data URL d'image, ou `null`. Renseignée, le champ est **contrôlé**. */
  value?: FieldSignValue;
  /** Valeur de départ quand le champ est non contrôlé. */
  defaultValue?: FieldSignValue;
  /** Notifié à la fin de chaque trait, à l'effacement et à l'annulation. Jamais en cours de trait. */
  onValueChange?: (value: FieldSignValue) => void;
  /** Format de la data URL émise. */
  format?: FieldSignFormat;
  /**
   * Encre de l'**export** : toute couleur CSS, `var(--jeton)` compris, résolue en `rgb()` là
   * où se tient le champ. `black` si elle ne résout pas. L'encre à l'écran suit les jetons.
   */
  exportColor?: string;
  /** Invite affichée dans la zone vide. */
  placeholder?: string;
  /** Rend le bouton qui efface la signature. */
  clearable?: boolean;
  /** Nom accessible du bouton d'effacement. */
  clearAriaLabel?: string;
  /** État annoncé une fois la zone signée (l'invite est annoncée tant qu'elle est vide). */
  signedLabel?: string;
  /** Annoncé après l'état quand le champ est `required` (l'astérisque visuel est masqué). */
  requiredLabel?: string;
  /** Affiché et annoncé à la place d'une signature reçue qui ne peut pas être chargée. */
  unreadableLabel?: string;
  /** La signature reçue ne peut pas être chargée. Elle reste la valeur jusqu'à remplacement. */
  onImageError?: (event: Event) => void;
  /** Nom d'un `<input type="hidden">` qui porte la valeur dans un formulaire natif. */
  name?: string;
  /** Donne accès à la zone de dessin (`<canvas>`). */
  ref?: Ref<HTMLCanvasElement>;
}

/**
 * ui-field-sign : signature manuscrite sur la coquille `ui-field`. La boîte est la zone de
 * dessin (doigt, stylet ou souris, sur un `<canvas>`). La valeur est une data URL d'image,
 * émise à la fin de chaque trait, `null` tant que rien n'est signé.
 * `Retour arrière` ou `Ctrl`+`Z` annulent le dernier trait, `Suppr` efface.
 */
export function UiFieldSign({
  value,
  defaultValue = null,
  onValueChange,
  format = 'png',
  exportColor = 'black',
  placeholder = 'Signez ici',
  clearable = true,
  clearAriaLabel = 'Effacer la signature',
  signedLabel = 'Signature saisie',
  requiredLabel = 'obligatoire',
  unreadableLabel = 'Signature illisible',
  onImageError,
  name,
  // --- Props partagées de la coquille ---
  label,
  helperText,
  errorText,
  showMessageIcon = false,
  messageIcon,
  size = 'default',
  level = 'default',
  required = false,
  disabled = false,
  readOnly = false,
  invalid = false,
  id,
  className,
  tabIndex,
  ref,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  onKeyDown,
  ...rest
}: UiFieldSignProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [current, setCurrent] = useControllableState<FieldSignValue>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  const [pad] = useState(
    () =>
      new SignPad({
        format,
        exportColor,
        disabled,
        readOnly,
        onCommit: setCurrent,
        onImageError: (event) => onImageError?.(event),
      }),
  );
  const { isEmpty, showUnreadable, canClear } = useSyncExternalStore(
    pad.subscribe,
    pad.getSnapshot,
    pad.getSnapshot,
  );

  // Every render: the engine reads the latest props and callbacks.
  useLayoutEffect(() => {
    pad.configure({
      format,
      exportColor,
      disabled,
      readOnly,
      onCommit: setCurrent,
      onImageError: (event) => onImageError?.(event),
    });
  });

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    return canvas ? pad.attach(canvas) : undefined;
  }, [pad]);

  useLayoutEffect(() => {
    pad.writeValue(current);
  }, [pad, current]);

  const ariaLabel = rest['aria-label'];
  const ariaLabelledBy = rest['aria-labelledby'];
  const warned = useRef(false);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || warned.current) return;
    if (!label && !ariaLabel && !ariaLabelledBy) {
      warned.current = true;
      console.warn(
        '[ui-field-sign] Zone de signature sans nom accessible : renseignez `label`, `aria-label` ou `aria-labelledby`.',
      );
    }
  }, [label, ariaLabel, ariaLabelledBy]);

  const field = useUiField({
    label,
    helperText,
    errorText,
    level,
    invalid,
    'aria-label': ariaLabel,
    'aria-describedby': rest['aria-describedby'],
    id,
  });

  const interactive = !disabled && !readOnly;
  const statusId = `${field.inputId}-status`;
  const state = showUnreadable ? unreadableLabel : isEmpty ? placeholder : signedLabel;
  // `role="img"` takes no `aria-required`: the state carries it.
  const statusText = required && requiredLabel ? `${state}, ${requiredLabel}` : state;
  const hint = showUnreadable ? unreadableLabel : isEmpty ? placeholder : '';

  return (
    <UiField
      className={className}
      label={label}
      required={required}
      size={size}
      level={showUnreadable ? 'error' : field.level}
      disabled={disabled}
      readOnly={readOnly}
      multiline
      message={field.message}
      messageId={field.messageId}
      showMessageIcon={showMessageIcon}
      messageIcon={messageIcon}
    >
      {/* No `htmlFor` on the label: a <canvas> is not labelable, `aria-label` names it. */}
      <div className={cx('ui-field-sign-pad', size === 'small' && '_small')}>
        <canvas
          {...rest}
          ref={(node) => {
            canvasRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          className={cx(
            'ui-field-sign-canvas',
            disabled && '_disabled',
            interactive && '_interactive',
          )}
          role="img"
          id={field.inputId}
          tabIndex={disabled ? undefined : (tabIndex ?? 0)}
          aria-label={label || ariaLabel || undefined}
          aria-describedby={joinIds(statusId, field.describedBy)}
          onPointerDown={(event: PointerEvent<HTMLCanvasElement>) => {
            onPointerDown?.(event);
            pad.pointerDown(event.nativeEvent);
          }}
          onPointerMove={(event: PointerEvent<HTMLCanvasElement>) => {
            onPointerMove?.(event);
            pad.pointerMove(event.nativeEvent);
          }}
          onPointerUp={(event: PointerEvent<HTMLCanvasElement>) => {
            onPointerUp?.(event);
            pad.pointerEnd(event.nativeEvent);
          }}
          onPointerCancel={(event: PointerEvent<HTMLCanvasElement>) => {
            onPointerCancel?.(event);
            pad.pointerEnd(event.nativeEvent);
          }}
          onLostPointerCapture={(event: PointerEvent<HTMLCanvasElement>) => {
            onLostPointerCapture?.(event);
            pad.pointerEnd(event.nativeEvent);
          }}
          onKeyDown={(event: KeyboardEvent<HTMLCanvasElement>) => {
            onKeyDown?.(event);
            pad.keyDown(event.nativeEvent);
          }}
        />

        {hint && (
          <span
            className={cx('ui-field-sign-placeholder', disabled && '_disabled')}
            aria-hidden="true"
          >
            {hint}
          </span>
        )}

        {/* Laid over the drawing area, not beside it: the area keeps the full width of the
            box, so the hint and the signature centre on the box itself. */}
        {clearable && !readOnly && (
          <button
            type="button"
            className={cx('ui-field-sign-clear', size === 'small' && '_small')}
            aria-label={clearAriaLabel}
            disabled={disabled || !canClear}
            onClick={() => {
              pad.clear();
              pad.focus();
            }}
          >
            <UiIcon name="eraser" size={size === 'small' ? 'sm' : 'md'} />
          </button>
        )}

        {/* The state, for assistive tech: `aria-describedby` reads hidden nodes. */}
        <span hidden id={statusId}>
          {statusText}
        </span>

        {name && <input type="hidden" name={name} value={current ?? ''} />}
      </div>
    </UiField>
  );
}
