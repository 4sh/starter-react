/**
 * Résolution d'options, partagée par les champs à liste (`ui-select`,
 * `ui-autocomplete`, `ui-input-tags`).
 *
 * Une option est une primitive ou un objet. `optionValue`, `optionLabel` et
 * `optionDisabled` sont des chemins de champ (notation pointée) lus sur un
 * objet, et `dataKey` décide de l'égalité entre objets.
 */

import { getFieldPath } from '../utils';

/** Option normalisée : valeur, libellé, état, plus l'option d'origine. */
export interface OptionEntry {
  value: unknown;
  label: string;
  disabled: boolean;
  original: unknown;
}

export interface OptionResolverFields {
  optionValue?: string;
  optionLabel?: string;
  optionDisabled?: string;
  dataKey?: string;
}

export interface OptionResolver {
  /** Normalise une option en {@link OptionEntry}. */
  toEntry(option: unknown): OptionEntry;
  /** Lit un champ (chemin pointé) sur un objet. */
  getField(target: unknown, path: string | undefined): unknown;
  /** Valeur de modèle d'une option. */
  resolveValue(option: unknown): unknown;
  /** Libellé d'affichage d'une option. */
  resolveLabel(option: unknown): string | null;
  /** État désactivé d'une option. */
  resolveDisabled(option: unknown): boolean;
  /** `String(value)`, ou `null` pour null et undefined. */
  asText(value: unknown): string | null;
  /** Égalité de valeurs : par `dataKey` entre objets, stricte sinon. */
  equals(a: unknown, b: unknown): boolean;
}

const isObject = (option: unknown): option is Record<string, unknown> =>
  typeof option === 'object' && option !== null;

export function createOptionResolver(fields: OptionResolverFields): OptionResolver {
  const getField = getFieldPath;

  const asText = (value: unknown): string | null =>
    value === null || value === undefined ? null : String(value);

  const resolveValue = (option: unknown): unknown => {
    if (fields.optionValue && isObject(option)) return getField(option, fields.optionValue);
    return option;
  };

  const resolveLabel = (option: unknown): string | null => {
    if (fields.optionLabel && isObject(option)) return asText(getField(option, fields.optionLabel));
    if (isObject(option) && 'label' in option) return asText(option['label']);
    return asText(option);
  };

  const resolveDisabled = (option: unknown): boolean => {
    if (fields.optionDisabled && isObject(option)) return !!getField(option, fields.optionDisabled);
    if (isObject(option) && 'disabled' in option) return !!option['disabled'];
    return false;
  };

  const equals = (a: unknown, b: unknown): boolean => {
    if (fields.dataKey && isObject(a) && isObject(b))
      return a[fields.dataKey] === b[fields.dataKey];
    return a === b;
  };

  const toEntry = (option: unknown): OptionEntry => ({
    value: resolveValue(option),
    label: resolveLabel(option) ?? '',
    disabled: resolveDisabled(option),
    original: option,
  });

  return { toEntry, getField, resolveValue, resolveLabel, resolveDisabled, asText, equals };
}

/**
 * Variante pour les composants qui documentent une forme riche
 * `{ value, label, icon, disabled, ariaLabel }` (`ui-segment-control`, `ui-toggle-button`).
 *
 * Deux écarts avec le résolveur de liste : sans `optionValue`, la clé `value` gagne sur
 * l'option entière ; sans `optionLabel`, un objet sans clé `label` n'a aucun libellé (bouton
 * en icône seule) au lieu de `"[object Object]"`. Le reste est celui du résolveur de liste.
 */
export function createRichOptionResolver(fields: OptionResolverFields): OptionResolver {
  const base = createOptionResolver(fields);

  const resolveValue = (option: unknown): unknown => {
    if (!fields.optionValue && isObject(option) && 'value' in option) return option['value'];
    return base.resolveValue(option);
  };

  const resolveLabel = (option: unknown): string | null => {
    if (!fields.optionLabel && isObject(option) && !('label' in option)) return null;
    return base.resolveLabel(option);
  };

  return {
    ...base,
    resolveValue,
    resolveLabel,
    toEntry: (option) => ({
      value: resolveValue(option),
      label: resolveLabel(option) ?? '',
      disabled: base.resolveDisabled(option),
      original: option,
    }),
  };
}

/** Texte de comparaison, insensible à la casse et aux diacritiques. */
export function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
