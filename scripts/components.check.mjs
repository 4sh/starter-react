#!/usr/bin/env node
/**
 * components.check.mjs : vérifie que les listes de composants écrites à la main
 * correspondent aux points d'entrée réellement présents dans
 * `packages/ui-kit-react/src/`.
 *
 * Pourquoi : le kit est énuméré à quatre endroits (les deux README du package,
 * l'index de composants, la page Storybook « Composants »). Rien ne les reliait,
 * et ils avaient divergé : d'où un décompte annoncé faux. Générer ces listes
 * n'est pas possible sans inventer de la métadonnée (le regroupement par famille
 * et l'ordre pédagogique sont des choix éditoriaux, pas des faits du disque) :
 * on les valide donc au lieu de les produire.
 *
 * Règles vérifiées :
 *   A. table des familles des README (EN + FR) == entry points du disque
 *   B. tout entry point porteur d'une story est présenté dans `Overview.mdx`
 *   C. tout entry point est coché ✅ dans `components-index.md`
 *   D. le DÉCOMPTE annoncé (« N composants sur 60 ») == le disque, dans les deux
 *      README et dans le tableau d'état de `ROADMAP.md`. Il a dérivé deux fois,
 *      les listes étant validées mais pas le nombre qui les résume.
 *
 * L'index peut légitimement contenir en plus : des ✅ pour des composants livrés
 * dans l'entry point d'un autre (`ui-file-upload-list`), et des ⬜ pour ceux
 * restant à construire.
 *
 * Usage : node scripts/components.check.mjs
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { collectComponents, KIT_ROOT, ROOT } from './lib/entries.mjs';

const READMES = [
  { file: join(KIT_ROOT, 'README.md'), heading: '## Families' },
  { file: join(KIT_ROOT, 'README.fr.md'), heading: '## Les familles' },
];
const OVERVIEW = join(ROOT, 'storybook/docs/Overview.mdx');
const INDEX = join(ROOT, 'docs/components-index.md');
const ROADMAP = join(ROOT, 'docs/ROADMAP.md');

/**
 * Nombre de composants du Design System, mesuré sur le starter Angular :
 *
 *   cd <starter-angular>/projects/ui-kit
 *   find . -name ng-package.json -path '*\/ui-*' | wc -l
 *
 * C'est le dénominateur de toute la feuille de route. Il ne peut pas être
 * vérifié d'ici, l'autre dépôt n'étant pas là : il est donc écrit une seule
 * fois, avec la commande qui le produit, et le contrôle de parité de la phase 6
 * le comparera pour de bon.
 */
const DESIGN_SYSTEM_TOTAL = 62;

/**
 * Points d'entrée du disque, et le dossier de chacun.
 *
 * Le recensement n'est PAS refait ici : il vient de `scripts/lib/entries.mjs`, que
 * `exports.build.mjs` et `vite.config.ts` lisent aussi. Un troisième parcours de
 * l'arborescence finirait par ne plus dire la même chose que les deux autres.
 */
const entryPointDirs = new Map();

function entryPointsOnDisk() {
  const components = collectComponents();
  for (const c of components) {
    entryPointDirs.set(c.name, join(KIT_ROOT, c.entryFile, '..'));
  }
  return components.map((c) => c.name).sort();
}

/**
 * Composants cités dans la table des familles d'un README : premier bloc de
 * lignes `|` suivant le titre de section. Les tables voisines (entry points
 * transverses, exports de `forms`) citent aussi des `ui-*` en prose : d'où le
 * découpage strict plutôt qu'un scan du fichier entier.
 */
function componentsInReadme(file, heading) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start === -1) throw new Error(`${file} : section « ${heading} » introuvable.`);

  const table = [];
  let seen = false;
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('|')) {
      seen = true;
      table.push(line);
    } else if (seen) break;
  }
  if (!table.length) throw new Error(`${file} : aucune table sous « ${heading} ».`);

  return [...new Set(table.join('\n').match(/`ui-[a-z0-9-]+`/g) ?? [])]
    .map((t) => t.replaceAll('`', ''))
    .sort();
}

/**
 * Composants importés par la page « Composants » : le nom est lu sur le
 * fichier de story lui-même (`.../ui-<name>/ui-<name>.stories`), pas sur le
 * chemin du dossier : insensible à la profondeur de catégorie (FSHSP-107).
 */
function componentsInOverview() {
  const src = readFileSync(OVERVIEW, 'utf8');
  return [
    ...new Set(
      [...src.matchAll(/\/(ui-[a-z0-9-]+)\/ui-[a-z0-9-]+\.stories["']/g)].map((m) => m[1]),
    ),
  ].sort();
}

/** Composants cochés ✅ dans l'index. */
function checkedInIndex() {
  const src = readFileSync(INDEX, 'utf8');
  return [...new Set([...src.matchAll(/^- ✅ `(ui-[a-z0-9-]+)`/gm)].map((m) => m[1]))].sort();
}

const diff = (a, b) => a.filter((x) => !b.includes(x));

const disk = entryPointsOnDisk();
const errors = [];

for (const { file, heading } of READMES) {
  const listed = componentsInReadme(file, heading);
  const label = file.replace(`${ROOT}/`, '');
  const missing = diff(disk, listed);
  const extra = diff(listed, disk);
  if (missing.length)
    errors.push(`${label} : entry points absents de la table, ${missing.join(', ')}`);
  if (extra.length)
    errors.push(`${label} : table citant des entry points inexistants, ${extra.join(', ')}`);
}

const overview = componentsInOverview();
const withStories = disk.filter((name) =>
  readdirSync(entryPointDirs.get(name)).some((f) => f.endsWith('.stories.tsx')),
);
const missingFromOverview = diff(withStories, overview);
if (missingFromOverview.length) {
  errors.push(
    `storybook/docs/Overview.mdx : composants avec story mais absents de la page, ${missingFromOverview.join(', ')}`,
  );
}
const staleOverview = diff(overview, disk);
if (staleOverview.length) {
  errors.push(
    `storybook/docs/Overview.mdx : imports pointant un entry point inexistant, ${staleOverview.join(', ')}`,
  );
}

/**
 * Décomptes annoncés en prose : « **42 composants** sur les 60 du Design
 * System », et la ligne d'état de la phase 3 de la roadmap.
 */
function checkAnnouncedCounts() {
  const sources = [
    { file: READMES[0].file, re: /\*\*(\d+) components\*\* out of the Design System's (\d+)/ },
    { file: READMES[1].file, re: /\*\*(\d+) composants\*\* sur les (\d+) du Design System/ },
    { file: ROADMAP, re: /La vague des composants\s*\|\s*🟡 (\d+) sur (\d+)/ },
  ];
  for (const { file, re } of sources) {
    const label = file.replace(`${ROOT}/`, '');
    const match = readFileSync(file, 'utf8').match(re);
    if (!match) {
      errors.push(`${label} : décompte de composants introuvable, motif attendu ${re}`);
      continue;
    }
    const [, announced, total] = match;
    if (Number(announced) !== disk.length) {
      errors.push(`${label} : annonce ${announced} composants, le disque en a ${disk.length}`);
    }
    if (Number(total) !== DESIGN_SYSTEM_TOTAL) {
      errors.push(
        `${label} : annonce un total de ${total} pour le Design System, la référence est ${DESIGN_SYSTEM_TOTAL}`,
      );
    }
  }
}

checkAnnouncedCounts();

const uncheckedInIndex = diff(disk, checkedInIndex());
if (uncheckedInIndex.length) {
  errors.push(
    `docs/components-index.md : entry points livrés mais non cochés ✅, ${uncheckedInIndex.join(', ')}`,
  );
}

if (errors.length) {
  console.error('✗ Listes de composants désynchronisées :\n');
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\nCorrigez la liste fautive, ou le disque si un entry point manque.');
  process.exit(1);
}

console.log(
  `✓ ${disk.length} entry points sur ${DESIGN_SYSTEM_TOTAL} : listes et décomptes à jour ` +
    `(README EN/FR, Overview.mdx, components-index.md, ROADMAP.md).`,
);
