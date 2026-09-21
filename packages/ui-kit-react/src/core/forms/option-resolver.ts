/**
 * Résolution d'options, partagée par les champs à liste (`ui-select`,
 * `ui-autocomplete`, `ui-input-tags`).
 *
 * Une option est une primitive ou un objet. `optionValue`, `optionLabel` et
 * `optionDisabled` sont des chemins de champ (notation pointée) lus sur un
 * objet, et `dataKey` décide de l'égalité entre objets.
 *
 * Porté du kit Angular, à une adaptation près : là-bas les accesseurs sont des
 * fonctions, pour que le résolveur reste réactif quand il est branché sur des
 * signaux. Ici ce sont des valeurs simples, React re-rendant de lui-même.
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
  // Délégué à `core/utils` : le tableau lit les mêmes chemins pointés sur ses
  // lignes, et une seule implémentation vaut mieux que deux qui dérivent.
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
 * Variante pour les composants qui documentent une **forme riche**
 * `{ value, label, icon, disabled, ariaLabel }` : `ui-segment-control` et
 * `ui-toggle-button`.
 *
 * Deux comportements du résolveur de liste y sont faux, alors qu'ils sont justes
 * pour `ui-select` et `ui-autocomplete` (dont le spec Angular les épingle) :
 *
 * - **la valeur** : sans `optionValue`, la liste renvoie l'option ENTIÈRE, ce
 *   qui est le bon défaut pour des options quelconques. Ici la clé `value` est
 *   documentée, donc elle doit gagner, sinon le modèle reçoit l'objet complet.
 * - **le libellé** : la liste retombe sur `String(option)`, donc
 *   `"[object Object]"` pour un objet sans clé `label`. Afficher quelque chose
 *   vaut mieux qu'une option vide dans une liste ; ici un bouton en **icône
 *   seule** est un usage légitime, et il ne doit porter aucun texte.
 *
 * Le reste (désactivation, égalité par `dataKey`, chemins pointés) est
 * strictement celui du résolveur de liste.
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
