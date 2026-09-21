/**
 * Concatène des classes CSS conditionnelles.
 *
 * Remplace `clsx` pour que les composants n'aient aucune dépendance commune
 * (décision D6). Pas de forme objet : un conditionnel s'écrit avec `&&`.
 *
 * @example
 * ```ts
 * cx('ui-button', `_${level}`, loading && '_loading', className)
 * ```
 */
export type UiClassValue = string | number | false | null | undefined | UiClassValue[];

export function cx(...values: UiClassValue[]): string {
  let out = '';

  for (const value of values) {
    if (!value && value !== 0) continue;

    const part = Array.isArray(value) ? cx(...value) : String(value);
    if (!part) continue;

    out = out ? `${out} ${part}` : part;
  }

  return out;
}
