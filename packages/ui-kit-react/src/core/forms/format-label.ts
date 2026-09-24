/**
 * Remplace le jeton `{0}` d'un libellé par une valeur.
 *
 * `split`/`join` et non `String.replace`, qui interpréterait les séquences `$&`,
 * `$1`… d'une valeur contenant un `$`.
 */
export function formatLabel(template: string, value: string | number): string {
  return template.split('{0}').join(String(value));
}
