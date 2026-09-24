import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from 'react';

import { UiIcon, type UiIconSize } from '../../base/ui-icon';
import { createRichOptionResolver, useControllableState } from '../../core/forms';
import { useRovingTabIndex } from '../../core/focus';
import { cx } from '../../core/utils';

import './ui-segment-control.scss';

export type SegmentControlSize = 'default' | 'small';
export type SegmentControlOrientation = 'horizontal' | 'vertical';

/** Valeur choisie : une valeur en mode simple, un tableau en `multiple`. */
export type SegmentControlValue<T = unknown> = T | T[] | null;

/**
 * Forme riche d'une option. Une option peut aussi être une primitive ou
 * n'importe quel objet, auquel cas `optionLabel`, `optionValue`,
 * `optionDisabled` et `optionIcon` disent au contrôle comment la lire.
 */
export interface SegmentControlOption<T = unknown> {
  /** Texte affiché dans le segment. */
  label?: string;
  /** Valeur portée dans le modèle quand le segment est choisi. */
  value: T;
  /** Icône de tête. */
  icon?: string;
  /** Désactive ce seul segment. */
  disabled?: boolean;
  /** Nom accessible. **Obligatoire** pour un segment en icône seule. */
  ariaLabel?: string;
}

/** Charge émise au clic sur un segment. */
export interface SegmentControlOptionClickEvent<T = unknown> {
  /** L'option d'origine, telle qu'elle a été passée. */
  option: T;
  /** Sa valeur résolue. */
  value: T;
  /** Son index dans la liste. */
  index: number;
  /** L'événement DOM d'origine. */
  originalEvent: ReactMouseEvent | ReactKeyboardEvent;
}

/** Contexte passé à `renderItem`. */
export interface SegmentControlItemContext<T = unknown> {
  /** L'option d'origine. */
  option: T;
  /** Ce segment est choisi. */
  selected: boolean;
  /** Son index dans la liste. */
  index: number;
}

interface NormalizedSegment {
  key: string;
  index: number;
  value: unknown;
  label: string | null;
  icon: string | null;
  ariaLabel: string | null;
  disabled: boolean;
  selected: boolean;
  original: unknown;
}

interface ThumbMetrics {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Instances déjà averties, pour n'avertir qu'une fois chacune. */
const prevenus = new Set<string>();

export interface UiSegmentControlProps<T = unknown> {
  /**
   * Onde de pression sur les segments, quand elle est activée. `false` la coupe,
   * activation globale comprise.
   */
  ripple?: boolean;
  /** Options à afficher, un bouton chacune. Primitives, objets, ou forme riche. */
  options?: readonly (T | SegmentControlOption<T>)[];
  /** Chemin de champ d'où lire le libellé, quand les options sont des objets. */
  optionLabel?: string;
  /** Chemin de champ d'où lire la valeur. */
  optionValue?: string;
  /** Chemin de champ d'où lire l'état désactivé. */
  optionDisabled?: string;
  /** Chemin de champ d'où lire le nom d'icône. */
  optionIcon?: string;
  /** Propriété qui sert à comparer deux valeurs objet. */
  dataKey?: string;

  /** Valeur imposée. Renseignée, le contrôle est **contrôlé**. */
  value?: SegmentControlValue<T>;
  /** Valeur de départ quand le contrôle est non contrôlé. */
  defaultValue?: SegmentControlValue<T>;
  /** Notifié à chaque sélection, avec la nouvelle valeur du modèle. */
  onValueChange?: (value: SegmentControlValue<T>) => void;
  /** Notifié au clic sur un segment, même quand la valeur ne change pas. */
  onOptionClick?: (event: SegmentControlOptionClickEvent<T>) => void;

  /** Choisir plusieurs valeurs à la fois. Le modèle devient un tableau. */
  multiple?: boolean;
  /** La sélection peut être entièrement vidée. */
  allowEmpty?: boolean;
  size?: SegmentControlSize;
  /** Axe de disposition. Il décide aussi des flèches qui naviguent. */
  orientation?: SegmentControlOrientation;
  /** Occupe toute la largeur du parent, les segments se la partageant. */
  fluid?: boolean;
  /** Animer l'indicateur glissant. La préférence de mouvement réduit gagne toujours. */
  motion?: boolean;

  /** Rendu personnalisé du contenu d'un segment. */
  renderItem?: (context: SegmentControlItemContext<T>) => ReactNode;

  disabled?: boolean;
  readOnly?: boolean;
  /** Force le rendu en erreur. */
  invalid?: boolean;
  id?: string;
  className?: string;
  /** Nom accessible du groupe. Sans lui, il ne dit pas ce qu'il règle. */
  'aria-label'?: string;
  /** id d'un élément externe qui étiquette le groupe. */
  'aria-labelledby'?: string;

  ref?: Ref<HTMLDivElement>;
}

/**
 * ui-segment-control : contrôle segmenté pour choisir une valeur, ou plusieurs
 * avec `multiple`, dans une courte liste de boutons en ligne.
 *
 * Chaque segment est un `<button>` natif ; le **groupe** porte la sémantique :
 * `radiogroup` et `radio` (les flèches sélectionnent) en mode simple, `group` et
 * `aria-pressed` en `multiple`. En mode simple, un indicateur glisse sous le choix.
 */
export function UiSegmentControl<T = unknown>({
  ripple = true,
  options = [],
  optionLabel,
  optionValue,
  optionDisabled,
  optionIcon,
  dataKey,
  value,
  defaultValue = null,
  onValueChange,
  onOptionClick,
  multiple = false,
  allowEmpty = true,
  size = 'default',
  orientation = 'horizontal',
  fluid = false,
  motion = true,
  renderItem,
  disabled = false,
  readOnly = false,
  invalid = false,
  id,
  className,
  ref,
  ...rest
}: UiSegmentControlProps<T>) {
  const generatedId = useId();
  const uid = id ?? generatedId;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [model, setModel] = useControllableState<SegmentControlValue<T>>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  // Forme riche : la clé `value` gagne, un objet sans `label` reste en icône seule.
  const resolver = useMemo(
    () => createRichOptionResolver({ optionValue, optionLabel, optionDisabled, dataKey }),
    [optionValue, optionLabel, optionDisabled, dataKey],
  );

  const isValueSelected = useCallback(
    (v: unknown): boolean => {
      if (multiple) return Array.isArray(model) && model.some((m) => resolver.equals(m, v));
      return resolver.equals(model, v);
    },
    [multiple, model, resolver],
  );

  const segments = useMemo<NormalizedSegment[]>(
    () =>
      (options ?? []).map((option, index) => {
        const v = resolver.resolveValue(option);
        return {
          key: `${uid}-${index}`,
          index,
          value: v,
          label: resolver.resolveLabel(option),
          icon: optionIcon
            ? resolver.asText(resolver.getField(option, optionIcon))
            : resolver.asText(resolver.getField(option, 'icon')),
          ariaLabel: resolver.asText(resolver.getField(option, 'ariaLabel')),
          disabled: disabled || resolver.resolveDisabled(option),
          selected: isValueSelected(v),
          original: option,
        };
      }),
    [options, resolver, uid, optionIcon, disabled, isValueSelected],
  );

  const selectedIndex = multiple ? -1 : segments.findIndex((o) => o.selected);

  // --- Sélection -----------------------------------------------------------
  const select = useCallback(
    (segment: NormalizedSegment, event: ReactMouseEvent | ReactKeyboardEvent) => {
      if (segment.disabled || readOnly) return;
      const v = segment.value as T;

      let next: SegmentControlValue<T>;
      if (multiple) {
        const current = Array.isArray(model) ? [...(model as T[])] : [];
        const at = current.findIndex((m) => resolver.equals(m, v));
        if (at !== -1) {
          if (!allowEmpty && current.length === 1) return;
          current.splice(at, 1);
        } else {
          current.push(v);
        }
        next = current;
      } else if (segment.selected) {
        if (!allowEmpty) return;
        next = null;
      } else {
        next = v;
      }

      setModel(next);
      onOptionClick?.({
        option: segment.original as T,
        value: v,
        index: segment.index,
        originalEvent: event,
      });
    },
    [readOnly, multiple, model, resolver, allowEmpty, setModel, onOptionClick],
  );

  // --- Focus glissant ------------------------------------------------------
  const [focusedIndex, setFocusedIndex] = useState(0);
  /** L'événement clavier en cours, pour le transmettre à `onOptionClick`. */
  const keyEvent = useRef<ReactKeyboardEvent | null>(null);

  const roving = useRovingTabIndex({
    count: segments.length,
    orientation,
    activeIndex: focusedIndex,
    onActiveIndexChange: (index) => {
      setFocusedIndex(index);
      optionRefs.current[index]?.focus();
      // Mode simple, motif radio : les flèches déplacent ET sélectionnent.
      const target = segments[index];
      if (!multiple && target && keyEvent.current) select(target, keyEvent.current);
    },
    isDisabled: (index) => !!segments[index]?.disabled,
  });

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    keyEvent.current = event;
    roving.onKeyDown(event);
    keyEvent.current = null;
  };

  // Seul arrêt de tabulation du groupe : en mode simple, un Tab entrant vise le choisi.
  const rovingIndex = useMemo(() => {
    if (!segments.length) return -1;
    if (!multiple) {
      const chosen = segments.findIndex((o) => o.selected && !o.disabled);
      if (chosen !== -1) return chosen;
    }
    if (segments[focusedIndex] && !segments[focusedIndex]!.disabled) return focusedIndex;
    return segments.findIndex((o) => !o.disabled);
  }, [segments, multiple, focusedIndex]);

  // --- Indicateur glissant -------------------------------------------------
  const [thumb, setThumb] = useState<ThumbMetrics | null>(null);
  const [resizeTick, setResizeTick] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => setResizeTick((v) => v + 1));
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  // Mesuré avant peinture, sinon une image montre l'indicateur à son ancienne place.
  // `clientLeft` retiré au cas où un thème pose un vrai `border` sur la piste.
  useLayoutEffect(() => {
    if (multiple || selectedIndex === -1) return;
    const el = optionRefs.current[selectedIndex];
    const track = rootRef.current;
    if (!el || !track) return;

    const next: ThumbMetrics = {
      x: el.offsetLeft - track.clientLeft,
      y: el.offsetTop - track.clientTop,
      w: el.offsetWidth,
      h: el.offsetHeight,
    };
    setThumb((cur) =>
      cur && cur.x === next.x && cur.y === next.y && cur.w === next.w && cur.h === next.h
        ? cur
        : next,
    );
  }, [multiple, selectedIndex, resizeTick, size, orientation, fluid, segments]);

  const showThumb = !multiple && selectedIndex !== -1 && thumb !== null;

  // --- Garde-fous d'accessibilité -----------------------------------------
  const ariaLabel = rest['aria-label'];
  const ariaLabelledBy = rest['aria-labelledby'];
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (prevenus.has(uid)) return;
    if (!ariaLabel && !ariaLabelledBy) {
      prevenus.add(uid);
      console.warn(
        '[ui-segment-control] Groupe sans nom accessible : renseignez `aria-label` ou `aria-labelledby`.',
      );
      return;
    }
    if (segments.some((o) => o.icon && !o.label && !o.ariaLabel)) {
      prevenus.add(uid);
      console.warn(
        '[ui-segment-control] Segment en icône seule sans nom accessible : ajoutez `ariaLabel` sur l’option.',
      );
    }
  }, [uid, ariaLabel, ariaLabelledBy, segments]);

  const attacherRacine = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
    },
    [ref],
  );

  const iconSize: UiIconSize = size === 'small' ? 'sm' : 'default';

  return (
    <div
      ref={attacherRacine}
      id={uid}
      className={cx(
        'ui-segment-control',
        size !== 'default' && `_${size}`,
        orientation === 'vertical' && '_vertical',
        fluid && '_fluid',
        multiple && '_multiple',
        disabled && '_disabled',
        invalid && '_invalid',
        !motion && '_no-motion',
        className,
      )}
      role={multiple ? 'group' : 'radiogroup'}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-invalid={invalid || undefined}
      aria-disabled={disabled || undefined}
      onKeyDown={onKeyDown}
    >
      {showThumb && (
        <span
          className="ui-segment-control-thumb"
          aria-hidden="true"
          style={{
            transform: `translate(${thumb.x}px, ${thumb.y}px)`,
            width: thumb.w,
            height: thumb.h,
          }}
        />
      )}

      {segments.map((segment) => (
        <button
          key={segment.key}
          ref={(node) => {
            optionRefs.current[segment.index] = node;
          }}
          type="button"
          className={cx('ui-segment-control-option', segment.selected && '_selected')}
          data-ripple={ripple ? 'on' : 'off'}
          disabled={segment.disabled}
          role={multiple ? undefined : 'radio'}
          aria-checked={multiple ? undefined : segment.selected}
          aria-pressed={multiple ? segment.selected : undefined}
          aria-label={segment.ariaLabel ?? undefined}
          tabIndex={segment.index === rovingIndex ? 0 : -1}
          onClick={(event) => select(segment, event)}
          onFocus={() => setFocusedIndex(segment.index)}
        >
          {renderItem ? (
            renderItem({
              option: segment.original as T,
              selected: segment.selected,
              index: segment.index,
            })
          ) : (
            <>
              {segment.icon && (
                <UiIcon className="ui-segment-control-icon" name={segment.icon} size={iconSize} />
              )}
              {segment.label && (
                // `data-label` alimente le fantôme en gras qui réserve la largeur.
                <span className="ui-segment-control-label" data-label={segment.label}>
                  {segment.label}
                </span>
              )}
            </>
          )}
        </button>
      ))}
    </div>
  );
}
