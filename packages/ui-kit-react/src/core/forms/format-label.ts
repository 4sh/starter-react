/**
 * Remplace le jeton `{0}` d'un libellé par une valeur.
 *
 * Un `split`/`join` et non `String.replace` : ce dernier interprète les
 * séquences `$&`, `$1`… d'une valeur, ce qui produirait une substitution
 * surprise dès qu'un libellé contient un `$`.
 *
 * Porté tel quel du kit Angular.
 */
export function formatLabel(template: string, value: string | number): string {
  return template.split('{0}').join(String(value));
}
