'use client';

import {
  useCallback,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type ReactNode,
  type Ref,
} from 'react';

import {
  joinIds,
  useControllableState,
  useUiField,
  type UiFieldSharedProps,
} from '../../core/forms';
import { cx } from '../../core/utils';
import { UiField } from '../ui-field';

import './ui-textarea.scss';

/** Axes que l'utilisateur peut redimensionner à la main (ignoré si `autoResize`). */
export type TextareaResize = 'none' | 'vertical' | 'horizontal' | 'both';

type NativeTextareaProps = Omit<
  ComponentPropsWithRef<'textarea'>,
  'value' | 'defaultValue' | 'onChange' | 'children' | 'required' | 'disabled' | 'readOnly' | 'ref'
>;

export interface UiTextareaProps extends UiFieldSharedProps, NativeTextareaProps {
  /** Valeur imposée. Renseignée, le champ est **contrôlé**. */
  value?: string;
  /** Valeur de départ quand le champ est non contrôlé. */
  defaultValue?: string;
  /** Notifié à chaque frappe, dans les deux modes. */
  onValueChange?: (value: string) => void;
  /** Nombre de lignes visibles au départ. */
  rows?: number;
  /** Fait grandir la boîte avec le contenu, et désactive la poignée manuelle. */
  autoResize?: boolean;
  /** Axe de redimensionnement manuel. Ignoré quand `autoResize` est actif. */
  resize?: TextareaResize;
  /** Affiche un compteur de caractères sous le champ. */
  showCount?: boolean;
  /** Contenu supplémentaire dans le pied, à côté du compteur. */
  footer?: ReactNode;
  ref?: Ref<HTMLTextAreaElement>;
}

/**
 * ui-textarea : champ multiligne, bâti sur la coquille `ui-field` en mode
 * `multiline` et un `<textarea>` natif.
 *
 * `autoResize` et la poignée native ne coexistent pas : une hauteur pilotée par
 * le contenu et une hauteur pilotée par l'utilisateur se contrediraient.
 */
export function UiTextarea({
  value,
  defaultValue = '',
  onValueChange,
  rows = 3,
  autoResize = false,
  resize = 'vertical',
  showCount = false,
  footer,
  maxLength,
  // --- Props partagées de la coquille ---
  label,
  helperText,
  errorText,
  showMessageIcon = false,
  messageIcon,
  size = 'default',
  level = 'default',
  floatLabel,
  required = false,
  disabled = false,
  readOnly = false,
  invalid = false,
  id,
  className,
  ref,
  ...rest
}: UiTextareaProps) {
  const innerRef = useRef<HTMLTextAreaElement>(null);

  const [text, setText] = useControllableState<string>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  const field = useUiField({
    label,
    helperText,
    errorText,
    level,
    invalid,
    'aria-label': rest['aria-label'],
    'aria-describedby': rest['aria-describedby'],
    id,
  });

  // Le compteur se chaîne aux descriptions du hook, il ne les remplace pas.
  const countId = `${field.inputId}-count`;
  const describedBy = joinIds(field.describedBy, showCount && countId);

  const resizeToContent = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    // `auto` d'abord : sinon `scrollHeight` ne redescend pas et la boîte ne rétrécit jamais.
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // Avant peinture : un `useEffect` montrerait une image à la mauvaise hauteur.
  useLayoutEffect(() => {
    if (autoResize) resizeToContent();
  }, [autoResize, text, resizeToContent]);

  const count = text.length;
  const overLimit = maxLength != null && count > maxLength;

  return (
    <UiField
      className={className}
      label={label}
      htmlFor={field.inputId}
      required={required}
      size={size}
      level={field.level}
      floatLabel={floatLabel}
      filled={count > 0}
      disabled={disabled}
      readOnly={readOnly}
      multiline
      message={field.message}
      messageId={field.messageId}
      showMessageIcon={showMessageIcon}
      messageIcon={messageIcon}
      footer={
        showCount || footer ? (
          <>
            {showCount && (
              <span
                id={countId}
                className={cx(
                  'ui-textarea-count',
                  size === 'small' && '_small',
                  disabled && '_disabled',
                  overLimit && '_over',
                )}
              >
                {count}
                {maxLength != null && ` / ${maxLength}`}
              </span>
            )}
            {footer}
          </>
        ) : undefined
      }
    >
      <textarea
        {...rest}
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={cx(
          'ui-textarea-native',
          size === 'small' && '_small',
          autoResize && '_auto-resize',
        )}
        style={{ resize: autoResize ? 'none' : resize, ...rest.style }}
        id={field.inputId}
        value={text}
        rows={rows}
        maxLength={maxLength}
        placeholder={floatLabel && label ? '' : rest.placeholder}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        aria-label={field.ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={field.ariaInvalid}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setText(event.target.value)}
      />
    </UiField>
  );
}
