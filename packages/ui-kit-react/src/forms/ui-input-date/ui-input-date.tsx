'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentPropsWithRef, FocusEvent as ReactFocusEvent, ReactNode, Ref } from 'react';

import { UiIcon, type UiIconSize } from '../../base/ui-icon';
import {
  parseIsoDate,
  parseIsoDateTime,
  parseIsoTime,
  startOfDay,
  toIsoDate,
  toIsoDateTime,
  toIsoTime,
  useControllableState,
  useUiField,
  type UiFieldSharedProps,
} from '../../core/forms';
import { cx } from '../../core/utils';
import { UiField } from '../ui-field';

import './ui-input-date.scss';

/** Granularité du champ : elle choisit le contrôle natif rendu par le navigateur. */
export type InputDateMode = 'date' | 'time' | 'datetime';

/**
 * Forme de la valeur émise. **Identique à celle d'`ui-datepicker`**, pour qu'un
 * composant métier bascule de l'un à l'autre selon le viewport sans rien convertir.
 */
export type InputDateValueType = 'date' | 'iso';

/** Valeur portée par le champ, quelle que soit la forme engagée par `valueType`. */
export type InputDateValue = Date | string | null;

/** `mode` -> le `type` natif qui accroche le sélecteur de l'OS. */
const NATIVE_TYPE: Record<InputDateMode, string> = {
  date: 'date',
  time: 'time',
  datetime: 'datetime-local',
};

type NativeInputProps = Omit<
  ComponentPropsWithRef<'input'>,
  | 'type'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'min'
  | 'max'
  | 'step'
  | 'size'
  | 'prefix'
  | 'children'
  | 'required'
  | 'disabled'
  | 'readOnly'
  | 'placeholder'
>;

export interface UiInputDateProps extends UiFieldSharedProps, NativeInputProps {
  /** Granularité : un jour, une heure, ou les deux. */
  mode?: InputDateMode;
  /**
   * Forme de la valeur émise : `'date'` (une `Date`) ou `'iso'` (`yyyy-MM-dd`, ou
   * `yyyy-MM-ddTHH:mm` dès qu'une heure en fait partie). En **entrée**, les deux
   * formes sont acceptées quoi qu'il dise : seule la sortie s'engage.
   */
  valueType?: InputDateValueType;
  /** Valeur imposée. Renseignée, le champ est **contrôlé**. */
  value?: InputDateValue;
  /** Valeur de départ quand le champ est non contrôlé. */
  defaultValue?: InputDateValue;
  /** Notifié quand le navigateur valide une valeur, jamais pendant la frappe. */
  onValueChange?: (value: InputDateValue) => void;
  /** Borne basse, en `Date` ou dans la forme ISO du `mode` en cours. */
  min?: Date | string;
  /** Borne haute, mêmes deux formes que `min`. */
  max?: Date | string;
  /**
   * `step` natif : en jours sur `date`, en **secondes** sur `time` / `datetime`
   * (`900` = par quart d'heure ; le défaut du navigateur est `60`).
   */
  step?: number;
  /** Glyphe du bouton d'ouverture. Un **nom** est rendu par `ui-icon`, un **nœud** tel quel. */
  icon?: string | ReactNode;
  /** Rendre le bouton d'ouverture. */
  showIcon?: boolean;
  /** Nom accessible du bouton d'ouverture. Déduit du `mode` par défaut. */
  iconAriaLabel?: string;
  ref?: Ref<HTMLInputElement>;
}

/**
 * ui-input-date : champ date/heure **natif** posé sur la coquille `ui-field`.
 *
 * Le sélecteur appartient au système : la roue de l'OS sur mobile, qu'aucun overlay
 * n'égale au pouce. C'est toute la raison d'être de ce composant à côté
 * d'`ui-datepicker`, qui tient l'arbitrage inverse : un calendrier porté par les
 * jetons, avec plages, multi-mois et inline.
 *
 * Frère d'`ui-input` et non variante de lui : il émet une date et non une chaîne,
 * il n'émet que sur `change`, et son libellé reste levé. Voir la page MDX.
 */
export function UiInputDate({
  mode = 'date',
  valueType = 'date',
  value,
  defaultValue = null,
  onValueChange,
  min,
  max,
  step,
  icon,
  showIcon = true,
  iconAriaLabel,
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
}: UiInputDateProps) {
  const shared = {
    label,
    helperText,
    errorText,
    level,
    invalid,
    'aria-label': rest['aria-label'],
    'aria-describedby': rest['aria-describedby'],
  };
  const field = useUiField({ ...shared, id });

  const [model, setModel] = useControllableState<InputDateValue>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  const hasTime = mode !== 'date';

  /** `Date` -> la chaîne exacte que le contrôle natif de ce `mode` accepte. */
  const toNative = useCallback(
    (date: Date) => {
      if (mode === 'time') return toIsoTime(date);
      return hasTime ? toIsoDateTime(date) : toIsoDate(date);
    },
    [mode, hasTime],
  );

  /** L'inverse. `null` sur tout ce qui est malformé : le navigateur l'a produit, on dégrade. */
  const fromNative = useCallback(
    (raw: string) => {
      if (mode === 'time') return parseIsoTime(raw);
      return hasTime ? parseIsoDateTime(raw) : parseIsoDate(raw);
    },
    [mode, hasTime],
  );

  /** Valeur reçue, `Date` ou chaîne ISO, détectée d'elle-même. Clonée quand c'est déjà une `Date`. */
  const parseValue = useCallback(
    (raw: InputDateValue): Date | null => {
      if (raw === null || raw === '') return null;
      return raw instanceof Date ? new Date(raw) : fromNative(raw);
    },
    [fromNative],
  );

  const nativeValue = useMemo(() => {
    const date = parseValue(model);
    return date ? toNative(date) : '';
  }, [model, parseValue, toNative]);

  /**
   * Écho local de ce que le navigateur affiche, tant que la saisie n'est pas
   * validée. Sans lui, un rendu du parent pendant la frappe réécrirait la valeur
   * du modèle dans un contrôle qui vient de vider la sienne, et effacerait les
   * segments déjà tapés. `null` = le champ suit le modèle.
   */
  const [draft, setDraft] = useState<string | null>(null);

  /** Incrémenté à chaque validation : c'est ce qui redéclenche la resynchro ci-dessous. */
  const [syncToken, setSyncToken] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Le `change` NATIF, et non le `onChange` de React, qui est le `input` du DOM.
   * Un contrôle temporel vide sa propre valeur tant que la saisie est incomplète :
   * un champ branché sur `input` émettrait une rafale de valeurs nulles,
   * indistinguables d'un effacement.
   */
  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    const commit = () => {
      const date = node.value ? fromNative(node.value) : null;
      const next: InputDateValue = date
        ? valueType === 'iso'
          ? toNative(date)
          : hasTime
            ? new Date(date)
            : startOfDay(date)
        : null;
      setDraft(null);
      setSyncToken((n) => n + 1);
      setModel(next);
    };
    node.addEventListener('change', commit);
    return () => node.removeEventListener('change', commit);
  }, [fromNative, toNative, valueType, hasTime, setModel]);

  /**
   * Le contrôle natif suit le modèle, explicitement.
   *
   * La réconciliation de React ne suffit pas ici : un parent qui **refuse** la
   * valeur validée ne change rien, donc React n'a rien à réécrire, et le champ
   * garderait à l'écran une valeur que le modèle n'a pas. `syncToken` fait que
   * cette synchro repasse après chaque validation, refus compris.
   */
  useEffect(() => {
    const node = inputRef.current;
    if (!node || draft !== null) return;
    if (node.value !== nativeValue) node.value = nativeValue;
  }, [nativeValue, draft, syncToken]);

  /** Une borne est facultative, et une borne en chaîne est déjà native. */
  const toNativeBound = (bound: Date | string | undefined) => {
    if (!bound) return undefined;
    return bound instanceof Date ? toNative(bound) : bound;
  };

  const iconSize: UiIconSize = size === 'small' ? 'sm' : 'md';
  const resolvedIcon = icon ?? (mode === 'time' ? 'clock' : 'calendar');
  const resolvedIconAriaLabel =
    iconAriaLabel ?? (mode === 'time' ? "Ouvrir le sélecteur d'heure" : 'Ouvrir le calendrier');

  const openPicker = () => {
    if (disabled || readOnly) return;
    const node = inputRef.current;
    if (!node) return;
    node.focus();
    try {
      node.showPicker();
    } catch {
      /* aucun sélecteur à montrer */
    }
  };

  return (
    <UiField
      className={className}
      label={label}
      htmlFor={field.inputId}
      required={required}
      size={size}
      level={field.level}
      floatLabel={floatLabel}
      // Codé en dur, et ce n'est pas un raccourci : le navigateur dessine son
      // propre gabarit (« jj/mm/aaaa ») dans la boîte, donc le champ n'est
      // jamais visuellement vide. Un libellé flottant au repos viendrait dessus.
      filled
      disabled={disabled}
      readOnly={readOnly}
      message={field.message}
      messageId={field.messageId}
      showMessageIcon={showMessageIcon}
      messageIcon={messageIcon}
      suffix={
        showIcon ? (
          <button
            type="button"
            // Pas un arrêt de tabulation : le contrôle natif ouvre déjà son
            // sélecteur au clavier, un second arrêt ne ferait que le répéter.
            tabIndex={-1}
            className="ui-input-date-action"
            aria-label={resolvedIconAriaLabel}
            disabled={disabled}
            onClick={openPicker}
          >
            {typeof resolvedIcon === 'string' ? (
              <UiIcon name={resolvedIcon} size={iconSize} />
            ) : (
              resolvedIcon
            )}
          </button>
        ) : undefined
      }
    >
      <input
        {...rest}
        ref={(node) => {
          inputRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as { current: HTMLInputElement | null }).current = node;
        }}
        className={cx('ui-input-date-native', size === 'small' && '_small')}
        type={NATIVE_TYPE[mode]}
        id={field.inputId}
        value={draft ?? nativeValue}
        min={toNativeBound(min)}
        max={toNativeBound(max)}
        step={step}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        aria-label={field.ariaLabel}
        aria-describedby={field.describedBy}
        aria-invalid={field.ariaInvalid}
        // `onChange` de React est appelé sur le `input` du DOM, et remonte aussi
        // le `change` : sur celui-ci l'écho doit se taire, sinon il réécrirait
        // par-dessus la valeur que la validation vient de rendre au modèle.
        onChange={(event) => {
          if (event.nativeEvent.type === 'change') return;
          setDraft(event.target.value);
        }}
        onBlur={(event: ReactFocusEvent<HTMLInputElement>) => {
          setDraft(null);
          rest.onBlur?.(event);
        }}
      />
    </UiField>
  );
}
