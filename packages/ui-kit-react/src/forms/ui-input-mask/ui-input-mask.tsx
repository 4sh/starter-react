'use client';

import {
  useLayoutEffect,
  useMemo,
  useRef,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type ReactNode,
  type Ref,
} from 'react';

import { UiIcon, type UiIconSize } from '../../base/ui-icon';
import {
  applyMaskTemplate,
  buildMaskSlots,
  caretForMask,
  extractMaskData,
  parseMaskRanges,
  useControllableState,
  useUiField,
  type UiFieldSharedProps,
} from '../../core/forms';
import { cx } from '../../core/utils';
import { UiField } from '../ui-field';

import './ui-input-mask.scss';

type NativeProps = Omit<
  ComponentPropsWithRef<'input'>,
  | 'type'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'size'
  | 'children'
  | 'required'
  | 'disabled'
  | 'readOnly'
  | 'ref'
>;

export interface UiInputMaskProps extends UiFieldSharedProps, NativeProps {
  /** Gabarit du masque : `9` chiffre, `a` lettre, `*` alphanumérique, tout autre caractère est un littéral. */
  mask: string;
  /**
   * Bornes incluses de chaque segment numérique, dans l'ordre du masque et
   * séparées par des espaces : `"0-23 0-59"` pour `99:99`. Un caractère qui ne
   * pourrait mener à aucun segment valide est refusé à la frappe.
   */
  ranges?: string;
  /** Caractère de remplissage des positions vides. */
  slotChar?: string;
  /** Émettre la valeur brute, sans les littéraux, au lieu de la valeur masquée. */
  unmask?: boolean;
  /** Valeur imposée. Renseignée, le champ est contrôlé. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Icône de gauche : un nom rendu par `ui-icon`, ou un nœud. */
  iconLeft?: string | ReactNode;
  ref?: Ref<HTMLInputElement>;
}

/**
 * ui-input-mask : champ masqué, bâti sur la coquille `ui-field`.
 *
 * Le masquage lui-même vit dans `core/forms/mask-engine`. La valeur du modèle est
 * masquée par défaut (`12/09/2024`), brute avec `unmask` (`12092024`).
 */
export function UiInputMask({
  mask,
  ranges = '',
  slotChar = '_',
  unmask = false,
  value,
  defaultValue = '',
  onValueChange,
  iconLeft,
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
}: UiInputMaskProps) {
  const innerRef = useRef<HTMLInputElement>(null);
  // Curseur à restaurer après le rendu : réécrire la valeur contrôlée le renvoie en fin de champ.
  const pendingCaret = useRef<number | null>(null);

  const [model, setModel] = useControllableState<string>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  const slots = useMemo(() => buildMaskSlots(mask, parseMaskRanges(ranges)), [mask, ranges]);

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

  // Le texte affiché se DÉDUIT du modèle : pas de second état à garder en phase.
  const built = applyMaskTemplate(slots, extractMaskData(model), slotChar);
  const display = built.data.length ? built.display : '';

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el || pendingCaret.current === null) return;
    el.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  });

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const caret = event.target.selectionStart ?? raw.length;
    // Ancre stable : les caractères de donnée avant le curseur, insensibles aux littéraux insérés.
    const dataBeforeCaret = extractMaskData(raw.slice(0, caret)).length;

    const next = applyMaskTemplate(slots, extractMaskData(raw), slotChar);
    const nextDisplay = next.data.length ? next.display : '';

    pendingCaret.current = caretForMask(next.tokenIndices, dataBeforeCaret, nextDisplay.length);
    setModel(unmask ? next.data : next.masked);
  };

  const iconSize: UiIconSize = size === 'small' ? 'sm' : 'md';
  const prefix = iconLeft ? (
    <span className={cx('ui-input-icon', disabled && '_disabled')}>
      {typeof iconLeft === 'string' ? <UiIcon name={iconLeft} size={iconSize} /> : iconLeft}
    </span>
  ) : undefined;

  return (
    <UiField
      className={className}
      label={label}
      htmlFor={field.inputId}
      required={required}
      size={size}
      level={field.level}
      floatLabel={floatLabel}
      filled={display !== ''}
      disabled={disabled}
      readOnly={readOnly}
      message={field.message}
      messageId={field.messageId}
      showMessageIcon={showMessageIcon}
      messageIcon={messageIcon}
      prefix={prefix}
    >
      <input
        {...rest}
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={cx('ui-input-mask-native', size === 'small' && '_small')}
        type="text"
        id={field.inputId}
        value={display}
        placeholder={floatLabel && label ? '' : rest.placeholder}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        aria-label={field.ariaLabel}
        aria-describedby={field.describedBy}
        aria-invalid={field.ariaInvalid}
        onChange={onChange}
      />
    </UiField>
  );
}
