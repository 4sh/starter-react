import MiniSearch from 'minisearch';

import { loadManifest, loadSearchDocs, type DocSection } from '../data';
import { jsonResult } from './result';

export const SEARCH_DOCS_DESCRIPTION =
  'Recherche plein texte dans toute la doc du Design System : composants, jetons, ' +
  'fondations, spécifications. Utile quand le nom du composant est encore inconnu, ou pour ' +
  'un concept (« champ avec suggestions », « jeton de bordure de focus », « mode sombre »). ' +
  'Chaque résultat est une section de page, avec son extrait et son lien Storybook.';

const EXCERPT_LENGTH = 400;

let index: MiniSearch<DocSection> | undefined;

function getIndex(): MiniSearch<DocSection> {
  if (index) return index;
  index = new MiniSearch<DocSection>({
    idField: 'id',
    fields: ['name', 'title', 'section', 'text'],
    storeFields: ['name', 'title', 'section', 'docId', 'anchor', 'source', 'text'],
    searchOptions: { boost: { name: 3, title: 2, section: 1.5 } },
  });
  index.addAll(loadSearchDocs().docs);
  return index;
}

export function searchDocs(query: string, limit = 10) {
  const { storybookUrl } = loadManifest();
  const results = getIndex()
    .search(query, { prefix: true, fuzzy: 0.2 })
    .slice(0, limit)
    .map((r) => ({
      name: r.name,
      title: r.title,
      section: r.section,
      docUrl: `${storybookUrl}?path=/docs/${r.docId}`,
      anchor: r.anchor,
      source: r.source,
      excerpt: String(r.text).slice(0, EXCERPT_LENGTH),
      score: Math.round(r.score * 100) / 100,
    }));

  return jsonResult({ query, count: results.length, results });
}
