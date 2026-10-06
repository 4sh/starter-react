import { loadManifest } from '../data';
import { jsonResult } from './result';

export const LIST_COMPONENTS_DESCRIPTION =
  'Liste les composants `ui-*` de @4sh/ui-kit-react : nom, famille, sous-chemin ' +
  "d'import et résumé en une phrase. À appeler en premier pour choisir un composant : " +
  "ne jamais deviner un nom ni un chemin d'import sans l'avoir vérifié ici.";

export function listComponents(category?: string) {
  const { kitVersion, components } = loadManifest();
  // Derived from the manifest: `scripts/lib/entries.mjs` owns the list.
  const categories = [...new Set(components.map((c) => c.category))];

  if (category && !categories.includes(category)) {
    return jsonResult({ error: `Famille « ${category} » inconnue.`, categories }, true);
  }

  const listed = components
    .filter((c) => !category || c.category === category)
    .map(({ name, category: family, import: importPath, summary }) => ({
      name,
      category: family,
      import: importPath,
      summary,
    }));

  return jsonResult({ kitVersion, count: listed.length, components: listed });
}
