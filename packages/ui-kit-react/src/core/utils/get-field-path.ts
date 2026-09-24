/**
 * Lit un champ sur un objet, en notation pointée.
 *
 * Rend `undefined` dès qu'un segment manque, plutôt que de lever : un chemin
 * qui ne mène nulle part est un cas normal quand il vient d'une prop.
 */
export function getFieldPath(target: unknown, path: string | undefined): unknown {
  if (!path || !isObject(target)) return undefined;
  return path
    .split('.')
    .reduce<unknown>((step, key) => (isObject(step) ? step[key] : undefined), target);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
