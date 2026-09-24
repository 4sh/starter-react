'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type ComponentPropsWithRef,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { useControllableState } from '../../core/forms';
import { cx } from '../../core/utils';

import './ui-input-otp.scss';

export type InputOtpSize = 'small' | 'default' | 'large';

/** Instances déjà averties, pour n'avertir qu'une fois chacune. */
const prevenus = new Set<string>();

/**
 * Ce que reçoit `renderCell` pour rendre une case à sa façon.
 *
 * Tout ce qui n'est pas `index` et `value` se branche tel quel sur le contrôle :
 * c'est ce qui garde le comportement du groupe, avance automatique et collage
 * compris.
 */
export interface UiInputOtpCellContext {
  /** Rang de la case, à partir de zéro. */
  index: number;
  /** Caractère actuellement dans cette case. */
  value: string;
  /** Arrêt de tabulation glissant : `0` pour la case active, `-1` pour les autres. */
  tabIndex: number;
  disabled: boolean;
  readOnly: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onFocus: (event: FocusEvent<HTMLInputElement>) => void;
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
}

export interface UiInputOtpProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'defaultValue' | 'onChange' | 'children'
> {
  /** Code imposé. Renseigné, le champ est **contrôlé**. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Notifié quand toutes les cases sont remplies. */
  onComplete?: (value: string) => void;
  /** Nombre de cases, donc de caractères. */
  length?: number;
  /** Masque les caractères saisis. */
  mask?: boolean;
  /** N'accepte que des chiffres, et demande le pavé numérique. */
  integerOnly?: boolean;
  size?: InputOtpSize;
  /** Préfixe du nom accessible de chaque case (« <préfixe> N »). À défaut, `aria-label`. */
  charAriaLabel?: string;
  /**
   * Donne le focus à la première case au montage. Le nom s'écarte de
   * `autoFocus` à dessein : la règle `jsx-a11y/no-autofocus` refuse ce nom chez
   * l'appelant, et elle a raison pour l'attribut natif, posé en dur.
   */
  focusOnMount?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  /** Force le rendu en erreur. */
  invalid?: boolean;
  /** Nom du champ. Chaque case porte `<nom>-<rang>`. */
  name?: string;
  /** Rend une case à la place du contrôle natif. */
  renderCell?: (context: UiInputOtpCellContext) => ReactNode;
  /** Notifié quand le focus quitte le groupe entier, jamais entre deux cases. */
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
}

function toTokens(value: string, length: number): string[] {
  return value.split('').slice(0, length);
}

/**
 * ui-input-otp : saisie d'un code à usage unique, une case par caractère.
 *
 * Chaque case est un `<input maxlength="1">` natif ; le groupe porte `role="group"`
 * et un arrêt de tabulation glissant : `Tab` traverse, les flèches vont de case en
 * case. La frappe avance seule, `Retour arrière` recule, un code collé se répartit.
 */
export function UiInputOtp({
  value,
  defaultValue = '',
  onValueChange,
  onComplete,
  length = 4,
  mask = false,
  integerOnly = false,
  size = 'default',
  charAriaLabel = 'Caractère',
  focusOnMount = false,
  disabled = false,
  readOnly = false,
  invalid = false,
  name,
  renderCell,
  onBlur,
  className,
  ref,
  ...rest
}: UiInputOtpProps) {
  const uid = useId();
  const [code, setCode] = useControllableState<string>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  // Les cases, pas la valeur jointe, sont la source du rendu : elles gardent les
  // trous. Réalignées seulement quand la valeur change sans venir d'elles.
  const [tokens, setTokens] = useState<string[]>(() => toTokens(code, length));
  const [lastCode, setLastCode] = useState(code);
  if (lastCode !== code) {
    setLastCode(code);
    setTokens(toTokens(code, length));
  }

  const [focusedIndex, setFocusedIndex] = useState(0);

  // Ref de rappel plutôt que l'attribut `autoFocus`, refusé par `jsx-a11y/no-autofocus`.
  const firstCell = useCallback(
    (node: HTMLInputElement | null) => {
      if (node && focusOnMount && !disabled) node.focus();
    },
    [focusOnMount, disabled],
  );

  // Garde-fou d'accessibilité : un groupe de cases anonymes n'annonce rien.
  const ariaLabel = rest['aria-label'];
  const ariaLabelledBy = rest['aria-labelledby'];
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (prevenus.has(uid) || ariaLabel || ariaLabelledBy) return;
    prevenus.add(uid);
    console.warn(
      '[ui-input-otp] Groupe sans nom accessible : renseignez `aria-label` ou `aria-labelledby`.',
    );
  }, [uid, ariaLabel, ariaLabelledBy]);

  const sanitize = (raw: string) => (integerOnly ? raw.replace(/\D/g, '') : raw);

  // Groupe retrouvé depuis la case source, pas par une ref : React interdit de la lire au rendu.
  const focusCell = (from: HTMLElement, index: number) => {
    if (index < 0 || index >= length) return;
    setFocusedIndex(index);
    const group = from.closest('.ui-input-otp');
    const cell = group?.querySelectorAll<HTMLInputElement>('input')[index];
    cell?.focus();
    cell?.select();
  };

  const commit = (next: string[]) => {
    const trimmed = next.slice(0, length);
    setTokens(trimmed);
    const joined = trimmed.join('');
    // Repère avancé AVANT de publier : la valeur vient des cases, ne pas les réaligner.
    setLastCode(joined);
    setCode(joined);
    if (joined.length === length && trimmed.every((char) => char !== '')) onComplete?.(joined);
  };

  const fillFrom = (source: HTMLElement, from: number, chars: string) => {
    const next = [...tokens];
    let cursor = from;
    for (const char of chars) {
      if (cursor >= length) break;
      next[cursor++] = char;
    }
    commit(next);
    focusCell(source, Math.min(cursor, length - 1));
  };

  const onCellChange = (event: ChangeEvent<HTMLInputElement>, index: number) => {
    if (readOnly) return;
    const target = event.currentTarget;
    const raw = sanitize(target.value);

    // Plusieurs caractères (autofill, collage) : ils se répartissent sur les cases suivantes.
    if (raw.length > 1) {
      fillFrom(target, index, raw);
      return;
    }

    const next = [...tokens];
    next[index] = raw;
    target.value = raw; // reflète la valeur assainie
    commit(next);

    const inputType = (event.nativeEvent as InputEvent).inputType;
    if (raw) focusCell(target, index + 1);
    else if (inputType === 'deleteContentBackward') focusCell(target, index - 1);
  };

  const onCellKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.currentTarget;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        focusCell(target, index - 1);
        return;
      case 'ArrowRight':
        event.preventDefault();
        focusCell(target, index + 1);
        return;
      case 'Home':
        event.preventDefault();
        focusCell(target, 0);
        return;
      case 'End':
        event.preventDefault();
        focusCell(target, length - 1);
        return;
      case 'ArrowUp':
      case 'ArrowDown':
        // Un champ de code n'a pas d'axe vertical : sans ça la page défile.
        event.preventDefault();
        return;
      case 'Backspace':
        // Case pleine : saisie native. Case vide : efface la précédente et recule.
        if (!target.value && !readOnly) {
          event.preventDefault();
          const next = [...tokens];
          if (next[index - 1] !== undefined) next[index - 1] = '';
          commit(next);
          focusCell(target, index - 1);
        }
        return;
      default:
        if (event.key.length !== 1) return; // laisse passer les touches de commande
        if (integerOnly && !/^\d$/.test(event.key)) event.preventDefault();
    }
  };

  const onCellFocus = (event: FocusEvent<HTMLInputElement>, index: number) => {
    setFocusedIndex(index);
    event.currentTarget.select();
  };

  const onCellPaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
    if (disabled || readOnly) return;
    event.preventDefault();
    const pasted = sanitize(event.clipboardData.getData('text'));
    if (pasted) fillFrom(event.currentTarget, index, pasted);
  };

  const active = Math.max(0, Math.min(focusedIndex, length - 1));

  return (
    <div
      {...rest}
      ref={ref}
      role="group"
      className={cx(
        'ui-input-otp',
        size !== 'default' && `_${size}`,
        disabled && '_disabled',
        readOnly && '_readonly',
        invalid && '_invalid',
        className,
      )}
      aria-disabled={disabled || undefined}
      onBlur={(event) => {
        if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget)) {
          onBlur?.(event);
        }
      }}
    >
      {Array.from({ length: Math.max(0, length) }, (_, index) => {
        const cellValue = tokens[index] ?? '';
        const context: UiInputOtpCellContext = {
          index,
          value: cellValue,
          tabIndex: index === active ? 0 : -1,
          disabled,
          readOnly,
          onChange: (event) => onCellChange(event, index),
          onKeyDown: (event) => onCellKeyDown(event, index),
          onFocus: (event) => onCellFocus(event, index),
          onPaste: (event) => onCellPaste(event, index),
        };

        if (renderCell) return <Fragment key={index}>{renderCell(context)}</Fragment>;

        return (
          <input
            key={index}
            id={`${uid}-${index}`}
            className="ui-input-otp-cell"
            type={mask ? 'password' : 'text'}
            value={cellValue}
            maxLength={1}
            autoComplete="one-time-code"
            inputMode={integerOnly ? 'numeric' : 'text'}
            name={name ? `${name}-${index}` : undefined}
            tabIndex={context.tabIndex}
            ref={index === 0 ? firstCell : undefined}
            disabled={disabled}
            readOnly={readOnly}
            aria-label={`${ariaLabel || charAriaLabel} ${index + 1}`}
            aria-invalid={invalid || undefined}
            onChange={context.onChange}
            onKeyDown={context.onKeyDown}
            onFocus={context.onFocus}
            onPaste={context.onPaste}
          />
        );
      })}
    </div>
  );
}
