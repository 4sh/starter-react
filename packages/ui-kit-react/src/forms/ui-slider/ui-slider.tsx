import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
} from 'react';

import { useControllableState } from '../../core/forms';
import { cx } from '../../core/utils';

import './ui-slider.scss';

export type SliderOrientation = 'horizontal' | 'vertical';
/** Valeur du modèle : un nombre, ou un couple `[début, fin]` en mode `range`. */
export type SliderValue = number | number[];

interface SliderHandle {
  index: number;
  value: number;
  percent: number;
}

interface SliderMark {
  value: number;
  percent: number;
  active: boolean;
}

/** Instances déjà averties, pour n'avertir qu'une fois chacune. */
const prevenus = new Set<string>();

export interface UiSliderProps {
  /** Valeur imposée. Renseignée, le curseur est **contrôlé**. */
  value?: SliderValue;
  /** Valeur de départ quand le curseur est non contrôlé. */
  defaultValue?: SliderValue;
  /** Notifié en continu pendant que la valeur change. */
  onValueChange?: (value: SliderValue) => void;
  /** Notifié une fois le glissement terminé, ou après un clic sur la piste. */
  onSlideEnd?: (value: SliderValue) => void;

  /** Borne minimale. */
  min?: number;
  /** Borne maximale. */
  max?: number;
  /** Granularité : aimantation du glissement, et pas du clavier. */
  step?: number;
  /** Deux poignées sélectionnant un `[début, fin]`. Le modèle devient un tableau. */
  range?: boolean;
  /** Nombre de pas gardés entre les deux poignées, en mode `range`. */
  minStepsBetweenHandles?: number;
  /** Rend un repère à chaque pas le long de la piste. */
  marks?: boolean;
  orientation?: SliderOrientation;

  disabled?: boolean;
  readOnly?: boolean;
  /** Force le rendu en erreur. */
  invalid?: boolean;
  tabIndex?: number;
  id?: string;
  className?: string;

  /** Nom accessible. Sans lui, un curseur ne dit pas ce qu'il règle. */
  'aria-label'?: string;
  /** id d'un élément externe qui étiquette le curseur. */
  'aria-labelledby'?: string;
  /** Nom accessible de la poignée de début, en `range`. Retombe sur `aria-label`. */
  ariaLabelStart?: string;
  /** Nom accessible de la poignée de fin, en `range`. Retombe sur `aria-label`. */
  ariaLabelEnd?: string;

  onFocus?: (event: FocusEvent<HTMLDivElement>) => void;
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void;

  ref?: Ref<HTMLDivElement>;
}

/**
 * ui-slider : choisir une valeur numérique, ou une plage, en glissant une
 * poignée le long d'une piste.
 *
 * Motif slider de WAI-ARIA : chaque poignée est un `role="slider"` pilotable au
 * clavier. Les événements de pointeur couvrent souris, tactile et stylet.
 */
export function UiSlider({
  value,
  defaultValue,
  onValueChange,
  onSlideEnd,
  min = 0,
  max = 100,
  step = 1,
  range = false,
  minStepsBetweenHandles = 0,
  marks = false,
  orientation = 'horizontal',
  disabled = false,
  readOnly = false,
  invalid = false,
  tabIndex,
  id,
  className,
  ariaLabelStart,
  ariaLabelEnd,
  onFocus,
  onBlur,
  ref,
  ...rest
}: UiSliderProps) {
  const generatedId = useId();
  const rootId = id ?? generatedId;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const handleRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Poignée en cours de glissement (`null` au repos). Une ref, pas un état : lue
  // synchroniquement par `pointermove` et `pointerup`, avant tout nouveau rendu.
  const activeHandle = useRef<number | null>(null);

  const [model, setModel] = useControllableState<SliderValue>({
    value,
    defaultValue: defaultValue ?? (range ? [min, max] : min),
    onChange: onValueChange,
  });

  /** Pas effectif : jamais zéro, sinon l'aimantation diviserait par zéro. */
  const stepSize = step > 0 ? step : 1;

  const rangeValues = useMemo<[number, number]>(() => {
    if (Array.isArray(model)) return [model[0] ?? min, model[1] ?? max];
    return [min, max];
  }, [model, min, max]);

  const singleValue = useMemo<number>(() => {
    if (typeof model === 'number') return model;
    return Array.isArray(model) ? (model[0] ?? min) : min;
  }, [model, min]);

  const toPercent = useCallback(
    (v: number) => {
      const span = max - min;
      if (span <= 0) return 0;
      return Math.min(100, Math.max(0, ((v - min) / span) * 100));
    },
    [min, max],
  );

  const handles = useMemo<SliderHandle[]>(() => {
    if (range) {
      const [a, b] = rangeValues;
      return [
        { index: 0, value: a, percent: toPercent(a) },
        { index: 1, value: b, percent: toPercent(b) },
      ];
    }
    return [{ index: 0, value: singleValue, percent: toPercent(singleValue) }];
  }, [range, rangeValues, singleValue, toPercent]);

  const fill = useMemo(() => {
    if (range) {
      const a = handles[0]?.percent ?? 0;
      const b = handles[1]?.percent ?? 0;
      return { start: Math.min(a, b), size: Math.abs(b - a) };
    }
    return { start: 0, size: handles[0]?.percent ?? 0 };
  }, [range, handles]);

  /** Arrondi à la précision décimale du pas, pour éviter la dérive flottante. */
  const round = useCallback(
    (v: number) => {
      const decimals = Number.isInteger(stepSize)
        ? 0
        : (stepSize.toString().split('.')[1]?.length ?? 0);
      return decimals > 0 ? +v.toFixed(decimals) : Math.round(v);
    },
    [stepSize],
  );

  const markList = useMemo<SliderMark[]>(() => {
    if (!marks) return [];
    const count = Math.floor((max - min) / stepSize);
    // Plafonné : un pas très fin produirait des milliers de nœuds.
    if (count < 1 || count > 100) return [];
    const [lo, hi] = range ? rangeValues : [min, singleValue];
    return Array.from({ length: count + 1 }, (_, i) => {
      const v = round(min + i * stepSize);
      return { value: v, percent: toPercent(v), active: v >= lo && v <= hi };
    });
  }, [marks, max, min, stepSize, range, rangeValues, singleValue, round, toPercent]);

  const snap = useCallback(
    (v: number) => round(min + Math.round((v - min) / stepSize) * stepSize),
    [round, min, stepSize],
  );

  const clamp = useCallback((v: number) => Math.min(max, Math.max(min, v)), [min, max]);

  const updateValue = useCallback(
    (index: number, raw: number) => {
      if (disabled || readOnly) return;
      let next = clamp(snap(raw));

      if (range) {
        const values = [...rangeValues] as [number, number];
        const gap = minStepsBetweenHandles * stepSize;
        if (index === 0) next = Math.min(next, values[1] - gap);
        else next = Math.max(next, values[0] + gap);
        next = clamp(next);
        if (values[index] === next) return;
        values[index] = next;
        setModel(values);
      } else {
        if (singleValue === next) return;
        setModel(next);
      }
    },
    [
      disabled,
      readOnly,
      clamp,
      snap,
      range,
      rangeValues,
      minStepsBetweenHandles,
      stepSize,
      singleValue,
      setModel,
    ],
  );

  const valueFromPointer = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const el = rootRef.current;
      if (!el) return min;
      const rect = el.getBoundingClientRect();
      const ratio =
        orientation === 'horizontal'
          ? (event.clientX - rect.left) / rect.width
          : (rect.bottom - event.clientY) / rect.height;
      const clamped = Math.min(1, Math.max(0, ratio));
      return min + clamped * (max - min);
    },
    [orientation, min, max],
  );

  const nearestHandle = useCallback(
    (v: number) => {
      const [a, b] = rangeValues;
      return Math.abs(v - a) <= Math.abs(v - b) ? 0 : 1;
    },
    [rangeValues],
  );

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (disabled || readOnly) return;
      const v = valueFromPointer(event);
      const index = range ? nearestHandle(v) : 0;
      activeHandle.current = index;
      // Capture sur la racine : le glissement continue hors de la piste.
      rootRef.current?.setPointerCapture(event.pointerId);
      updateValue(index, v);
      // `preventScroll` : défiler décalerait le rectangle de la piste, et
      // `valueFromPointer` lirait alors une tout autre valeur.
      handleRefs.current[index]?.focus({ preventScroll: true });
      event.preventDefault();
    },
    [disabled, readOnly, valueFromPointer, range, nearestHandle, updateValue],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const index = activeHandle.current;
      if (index === null) return;
      updateValue(index, valueFromPointer(event));
    },
    [updateValue, valueFromPointer],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (activeHandle.current === null) return;
      activeHandle.current = null;
      rootRef.current?.releasePointerCapture?.(event.pointerId);
      onSlideEnd?.(model);
    },
    [onSlideEnd, model],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, index: number) => {
      if (disabled || readOnly) return;
      const current = range ? rangeValues[index]! : singleValue;
      let next: number;
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          next = current - stepSize;
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          next = current + stepSize;
          break;
        case 'PageDown':
          next = current - stepSize * 10;
          break;
        case 'PageUp':
          next = current + stepSize * 10;
          break;
        case 'Home':
          next = min;
          break;
        case 'End':
          next = max;
          break;
        default:
          return;
      }
      event.preventDefault();
      updateValue(index, next);
    },
    [disabled, readOnly, range, rangeValues, singleValue, stepSize, min, max, updateValue],
  );

  const handleAriaLabel = (index: number) => {
    if (!range) return rest['aria-label'];
    return (index === 0 ? ariaLabelStart : ariaLabelEnd) ?? rest['aria-label'];
  };

  // Garde-fou d'accessibilité : un nom par curseur, un nom distinct par poignée.
  const ariaLabel = rest['aria-label'];
  const ariaLabelledBy = rest['aria-labelledby'];
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (prevenus.has(rootId)) return;
    if (!ariaLabel && !ariaLabelledBy) {
      prevenus.add(rootId);
      console.warn(
        '[ui-slider] Curseur sans nom accessible : renseignez `aria-label` ou `aria-labelledby`.',
      );
    } else if (range && !ariaLabelStart && !ariaLabelEnd && !ariaLabelledBy) {
      prevenus.add(rootId);
      console.warn(
        '[ui-slider] Mode `range` : renseignez `ariaLabelStart` et `ariaLabelEnd`, pour que chaque poignée ait un nom distinct.',
      );
    }
  }, [rootId, ariaLabel, ariaLabelledBy, range, ariaLabelStart, ariaLabelEnd]);

  const attacherRacine = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
    },
    [ref],
  );

  const horizontal = orientation === 'horizontal';

  return (
    // Relais de pointeur : une pression n'importe où saisit la poignée la plus
    // proche. Le `role="slider"`, le focus et le clavier vivent sur les poignées.
    <div
      ref={attacherRacine}
      className={cx(
        'ui-slider',
        !horizontal && '_vertical',
        range && '_range',
        disabled && '_disabled',
        readOnly && '_readonly',
        invalid && '_invalid',
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="ui-slider-track">
        <div
          className="ui-slider-range"
          style={
            horizontal
              ? { insetInlineStart: `${fill.start}%`, width: `${fill.size}%` }
              : { bottom: `${fill.start}%`, height: `${fill.size}%` }
          }
        />
      </div>

      {markList.length > 0 && (
        <div className="ui-slider-marks" aria-hidden="true">
          {markList.map((mark) => (
            <span
              key={mark.value}
              className={cx('ui-slider-mark', mark.active && '_active')}
              style={
                horizontal
                  ? ({ insetInlineStart: `${mark.percent}%` } as CSSProperties)
                  : ({ bottom: `${mark.percent}%` } as CSSProperties)
              }
            />
          ))}
        </div>
      )}

      {handles.map((handle) => (
        <div
          key={handle.index}
          ref={(node) => {
            handleRefs.current[handle.index] = node;
          }}
          className="ui-slider-handle"
          role="slider"
          id={handle.index === 0 ? rootId : undefined}
          tabIndex={disabled ? -1 : (tabIndex ?? 0)}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={handle.value}
          aria-orientation={orientation}
          aria-label={handleAriaLabel(handle.index)}
          aria-labelledby={ariaLabelledBy}
          aria-disabled={disabled || undefined}
          aria-readonly={readOnly || undefined}
          aria-invalid={invalid || undefined}
          style={
            horizontal
              ? ({ insetInlineStart: `${handle.percent}%` } as CSSProperties)
              : ({ bottom: `${handle.percent}%` } as CSSProperties)
          }
          onKeyDown={(event) => onKeyDown(event, handle.index)}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      ))}
    </div>
  );
}
