'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import { useControllableState } from '../../core/forms';
import { cx } from '../../core/utils';

import './ui-knob.scss';

export type UiKnobSize = 'small' | 'default' | 'large';

// --- Géométrie du cadran (viewBox 0 0 100 100) ------------------------
// Arc de 300° ouvert en bas : minimum à 240°, maximum à -60°.
const CENTER = 50;
const MIN_RADIANS = (4 * Math.PI) / 3;
const MAX_RADIANS = -Math.PI / 3;
/** L'ouverture du bas, où un angle de pointeur ne correspond à aucune valeur. */
const GAP_START = -(2 * Math.PI) / 3;
/** Marge gardée entre l'arc et l'anneau de focus, dessiné au bord de la boîte. */
const RING_GAP = 3;

/** Instances déjà averties, pour n'avertir qu'une fois chacune. */
const prevenus = new Set<string>();

const round = (n: number): number => Number(n.toFixed(3));

/** Rayon de la ligne médiane : l'arc, bouts compris, ne déborde jamais sur l'anneau de focus. */
function dialRadius(strokeWidth: number): number {
  return Math.max(2, CENTER - strokeWidth / 2 - RING_GAP);
}

/** Point du cadran pour un angle, en coordonnées de viewBox (y vers le bas). */
function polar(radians: number, radius: number): { x: number; y: number } {
  return {
    x: round(CENTER + Math.cos(radians) * radius),
    y: round(CENTER - Math.sin(radians) * radius),
  };
}

function mapRange(x: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMax === inMin) return outMin;
  return ((x - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

export interface UiKnobProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'defaultValue' | 'onChange' | 'children'
> {
  /** Valeur imposée. Renseignée, le cadran est **contrôlé**. */
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  /** Granularité du pas, au clavier comme au glissement. */
  step?: number;
  /** Préréglage de diamètre. N'importe quel diamètre se règle par `--ui-knob-size`. */
  size?: UiKnobSize;
  /** Épaisseur de l'arc, en unités de viewBox (100 = le diamètre), donc à l'échelle. */
  strokeWidth?: number;
  /** Affiche la valeur au centre du cadran. */
  showValue?: boolean;
  /** Gabarit du libellé central, `{value}` étant le substitut. */
  valueTemplate?: string;
  /** Couleur de l'arc rempli. Pose `--ui-knob-value-color`. */
  valueColor?: string;
  /** Couleur de la piste derrière. Pose `--ui-knob-range-color`. */
  rangeColor?: string;
  /** Couleur du libellé central. Pose `--ui-knob-text-color`. */
  textColor?: string;
  disabled?: boolean;
  readOnly?: boolean;
  /** Force le rendu en erreur. */
  invalid?: boolean;
}

/**
 * ui-knob : cadran circulaire pour choisir une valeur numérique.
 *
 * Motif curseur de l'APG : un seul arrêt `role="slider"` qui expose
 * `aria-valuemin`, `-max` et `-now`, piloté au clavier et au pointeur par le
 * même chemin de code. Le dessin est un arc SVG dans un viewBox de 100 sur 100,
 * donc il suit le diamètre rendu.
 */
export function UiKnob({
  value,
  defaultValue = 0,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  size = 'default',
  strokeWidth = 14,
  showValue = true,
  valueTemplate = '{value}',
  valueColor,
  rangeColor,
  textColor,
  disabled = false,
  readOnly = false,
  invalid = false,
  className,
  style,
  tabIndex,
  ref,
  ...rest
}: UiKnobProps) {
  const uid = useId();
  const [model, setModel] = useControllableState<number>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  const clamp = (raw: number) => Math.min(max, Math.max(min, raw));
  const current = clamp(typeof model === 'number' && !Number.isNaN(model) ? model : min);
  const stepSize = step > 0 ? step : 1;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  const dragging = useRef(false);

  // Garde-fou d'accessibilité : un curseur sans nom n'annonce que sa valeur.
  const ariaLabel = rest['aria-label'];
  const ariaLabelledBy = rest['aria-labelledby'];
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (prevenus.has(uid) || ariaLabel || ariaLabelledBy) return;
    prevenus.add(uid);
    console.warn(
      '[ui-knob] Cadran sans nom accessible : renseignez `aria-label` ou `aria-labelledby`.',
    );
  }, [uid, ariaLabel, ariaLabelledBy]);

  /** Arrondit à la précision décimale du pas, ce qui évite la dérive flottante. */
  const roundToStep = (raw: number) => {
    const decimals = Number.isInteger(stepSize)
      ? 0
      : (stepSize.toString().split('.')[1]?.length ?? 0);
    return decimals > 0 ? +raw.toFixed(decimals) : Math.round(raw);
  };

  const commit = (raw: number) => {
    const next = clamp(roundToStep(min + Math.round((raw - min) / stepSize) * stepSize));
    if (next === current) return;
    setModel(next);
  };

  const valueRadians = mapRange(current, min, max, MIN_RADIANS, MAX_RADIANS);
  // L'arc rempli part de zéro quand zéro est dans les bornes, du bord sinon.
  const originRadians = mapRange(
    Math.min(Math.max(0, min), max),
    min,
    max,
    MIN_RADIANS,
    MAX_RADIANS,
  );

  const radius = dialRadius(strokeWidth);
  const trackFrom = polar(MIN_RADIANS, radius);
  const trackTo = polar(MAX_RADIANS, radius);
  const rangePath = `M ${trackFrom.x} ${trackFrom.y} A ${radius} ${radius} 0 1 1 ${trackTo.x} ${trackTo.y}`;

  const arcFrom = polar(originRadians, radius);
  const arcTo = polar(valueRadians, radius);
  const largeArc = Math.abs(originRadians - valueRadians) < Math.PI ? 0 : 1;
  const sweep = valueRadians > originRadians ? 0 : 1;
  const valuePath = `M ${arcFrom.x} ${arcFrom.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${arcTo.x} ${arcTo.y}`;

  const displayValue = valueTemplate.replace('{value}', String(current));
  // Annoncé seulement s'il diffère de la valeur brute, sinon il la répéterait.
  const ariaValueText = displayValue === String(current) ? undefined : displayValue;

  /** Position du pointeur vers une valeur, en ignorant l'ouverture du bas. */
  const updateFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return;
    const dx = (event.clientX - rect.left) / rect.width - 0.5;
    const dy = 0.5 - (event.clientY - rect.top) / rect.height;
    const angle = Math.atan2(dy, dx);

    if (angle > MAX_RADIANS) {
      commit(mapRange(angle, MIN_RADIANS, MAX_RADIANS, min, max));
    } else if (angle <= GAP_START) {
      commit(mapRange(angle + 2 * Math.PI, MIN_RADIANS, MAX_RADIANS, min, max));
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || readOnly) return;
    dragging.current = true;
    rootRef.current?.setPointerCapture(event.pointerId);
    updateFromPointer(event);
    // `preventDefault` tue le focus implicite : on le prend donc explicitement.
    event.preventDefault();
    rootRef.current?.focus();
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    updateFromPointer(event);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    rootRef.current?.releasePointerCapture?.(event.pointerId);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || readOnly) return;
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
    commit(next);
  };

  const paint: CSSProperties = { ...style };
  const set = (name: string, colour: string | undefined) => {
    if (colour !== undefined) (paint as Record<string, string>)[name] = colour;
  };
  set('--ui-knob-value-color', valueColor);
  set('--ui-knob-range-color', rangeColor);
  set('--ui-knob-text-color', textColor);

  return (
    <div
      {...rest}
      ref={attach}
      role="slider"
      className={cx(
        'ui-knob',
        size !== 'default' && `_${size}`,
        disabled && '_disabled',
        readOnly && '_readonly',
        invalid && '_invalid',
        className,
      )}
      style={paint}
      tabIndex={disabled ? -1 : (tabIndex ?? 0)}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={current}
      aria-valuetext={ariaValueText}
      aria-disabled={disabled || undefined}
      aria-readonly={readOnly || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <svg className="ui-knob-dial" viewBox="0 0 100 100" focusable="false" aria-hidden="true">
        <path className="ui-knob-range" d={rangePath} strokeWidth={strokeWidth} />
        <path className="ui-knob-value" d={valuePath} strokeWidth={strokeWidth} />
      </svg>

      {showValue && (
        <span className="ui-knob-text" aria-hidden="true">
          {displayValue}
        </span>
      )}
    </div>
  );
}
