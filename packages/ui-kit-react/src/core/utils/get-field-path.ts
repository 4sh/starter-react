/**
 * Lit un champ sur un objet, en notation pointée.
 *
 * Vit ici, et non dans la brique qui l'a vue naître, parce que trois familles
 * en ont besoin sans rien partager d'autre : les champs à liste résolvent des
 * accesseurs d'option, et le tableau lit des champs de ligne pour trier et pour
 * identifier. C'est la règle du dépôt : au troisième besoin identique, la
 * fonction se partage.
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
