import { findComponent, getDocSections, loadManifest, suggestComponents } from '../data';
import { jsonResult } from './result';

export const PARTS = ['api', 'theming', 'doc'] as const;
export type Part = (typeof PARTS)[number];

export const GET_COMPONENT_DOC_DESCRIPTION =
  "Retourne tout ce qu'il faut pour utiliser un composant `ui-*` : le sous-chemin d'import, " +
  "l'API lue dans ses types (chaque composant exporté, ses props, leur type, les valeurs " +
  "admises, le défaut, la description, et l'élément natif qui reçoit les attributs restants), " +
  'ses hooks CSS `--ui-*` et leur repli, puis les sections de sa page de doc Storybook. ' +
  "C'est la source de vérité : la préférer à la lecture des sources du kit. " +
  '`include` restreint la réponse (`api`, `theming`, `doc`) quand une seule partie est utile.';

const THEMING_NOTE =
  'Le composant lit ces custom properties sans jamais les déclarer : les poser sur ' +
  "l'élément, sur un ancêtre ou sur `:root` suffit à les surcharger, sans toucher au CSS du kit. " +
  'Sans valeur posée, chacune retombe sur `fallback`.';

export function getComponentDoc(name: string, include: readonly Part[] = PARTS) {
  const component = findComponent(name);
  if (!component) {
    return jsonResult(
      {
        error: `Composant « ${name} » introuvable.`,
        hint: 'Utilise list_components pour le catalogue, ou search_docs pour chercher un besoin.',
        suggestions: suggestComponents(name),
        available: loadManifest().components.map((c) => c.name),
      },
      true,
    );
  }

  const { exports, cssHooks, docId, source } = component;
  const parts = new Set(include);

  return jsonResult({
    name: component.name,
    category: component.category,
    import: component.import,
    summary: component.summary,
    docUrl: component.docUrl,
    ...(parts.has('api') ? { api: exports } : {}),
    ...(parts.has('theming') ? { theming: { note: THEMING_NOTE, cssHooks } } : {}),
    ...(parts.has('doc')
      ? {
          doc: {
            source,
            sections: getDocSections(docId).map((s) => ({
              section: s.section ?? 'Présentation',
              text: s.text,
            })),
          },
        }
      : {}),
  });
}
