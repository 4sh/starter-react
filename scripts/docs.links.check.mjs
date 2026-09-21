#!/usr/bin/env node
/**
 * docs.links.check.mjs : vérifie que les chemins cités par la doc existent.
 *
 * Pourquoi : ce dépôt s'appuie beaucoup sur des renvois entre fichiers
 * (`voir docs/DECISIONS.md`, `scripts/deps.check.mjs` porte l'allocation…).
 * C'est ce qui permet à quelqu'un : ou à un agent qui reprend le travail dans
 * un contexte neuf : de retrouver le fil sans tout relire. Un renvoi mort ne
 * casse rien : il envoie juste le lecteur dans le vide, et il ne se voit qu'en
 * cliquant. Ils s'accumulent donc en silence.
 *
 * Ce contrôle a été écrit après en avoir trouvé un : deux `package.json`
 * renvoyaient à `docs/ROADMAP.md`, qui n'existait pas.
 *
 * Deux formes vérifiées, choisies pour ne produire aucun faux positif :
 *
 *   1. les liens markdown relatifs : `[texte](chemin)` ;
 *   2. les chemins entre accents graves qui commencent par un dossier de
 *      premier niveau connu ET portent une extension de fichier.
 *
 * Tout le reste est ignoré : URL, ancres, motifs génériques (`*`, `<nom>`,
 * `{…}`), et les noms de paquets npm.
 *
 * Un second passage vérifie les renvois d'une page `.mdx` vers les stories
 * qu'elle affiche : `<Canvas of={ModalStories.Motions} />`. Une story citée
 * mais inexistante ne casse pas le build : Storybook rend un bloc vide, et
 * Vite se contente d'un avertissement noyé dans sa sortie. Ce contrôle a été
 * écrit après en avoir trouvé deux dans `ui-modal.mdx`, où la doc du motion
 * décrivait des exemples que je n'avais jamais créés.
 *
 * Usage : node scripts/docs.links.check.mjs
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import { ROOT } from './lib/entries.mjs';

/** Dossiers de premier niveau : un chemin cité doit commencer par l'un d'eux. */
const TOP_LEVEL = [
  'apps',
  'design-tokens',
  'docs',
  'figma',
  'packages',
  'scripts',
  'storybook',
  '.github',
  '.claude',
];

/**
 * Chemins cités À DESSEIN avant d'exister : la doc décrit une cible, pas
 * seulement un état. Chaque entrée porte sa raison, et le contrôle échoue quand
 * le fichier finit par exister : pour que la dispense disparaisse avec le
 * besoin, au lieu de survivre en dispense permanente.
 */
const PLANNED = [
  {
    path: 'scripts/parity.check.mjs',
    why: 'Contrôle de parité Dual-Engine, phase 6. Son cahier des charges EST docs/DUAL-ENGINE.md.',
  },
  {
    path: '.github/workflows/publish.yml',
    why: 'Workflow de publication, phase 5. Sa spécification est docs/PUBLISHING.md.',
  },
];

/** Fichiers scannés. Le `.mdx` en fait partie : la doc Storybook cite aussi des chemins. */
const SCANNED = /\.(md|mdx|json)$/;

const SKIPPED_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  'storybook-static',
  'coverage',
  'generated',
  '.vitest',
]);

/** Un chemin est-il un motif plutôt qu'un fichier réel ? */
function isPattern(path) {
  return /[*<>{}|]/.test(path) || path.includes('…');
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIPPED_DIRS.has(entry.name)) continue;
      walk(join(dir, entry.name), out);
    } else if (SCANNED.test(entry.name)) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

/** Références citées par un fichier, avec la ligne où elles apparaissent. */
function references(text) {
  const found = [];
  const lines = text.split('\n');

  const topLevel = TOP_LEVEL.map((d) => d.replace('.', '\\.')).join('|');
  // Chemin entre accents graves : dossier connu, puis au moins un segment, puis
  // une extension. `packages/ui-kit-react/src/index.ts`, pas `--ui-button-radius`.
  const backticked = new RegExp(`\`((?:${topLevel})/[A-Za-z0-9._/-]+\\.[a-z]{2,5})\``, 'g');
  // Lien markdown relatif : ni URL, ni ancre, ni protocole.
  const mdLink = /\[[^\]]*\]\((?!https?:|mailto:|#|\?)([^)\s]+)\)/g;

  lines.forEach((line, index) => {
    for (const re of [backticked, mdLink]) {
      re.lastIndex = 0;
      for (const match of line.matchAll(re)) {
        const path = match[1].split('#')[0];
        if (path && !isPattern(path)) found.push({ path, line: index + 1 });
      }
    }
  });

  return found;
}

/**
 * Renvois `of={Alias.Story}` d'une page `.mdx` vers son fichier de stories.
 *
 * La forme d'import est uniforme dans le dépôt (`import * as XStories from
 * './x.stories'`), ce qui rend la résolution exacte plutôt qu'heuristique. Un
 * `of={Alias}` nu (celui de `<Meta>`) ne désigne pas de story : ignoré.
 */
function storyReferences(text, file) {
  const aliases = new Map();
  for (const [, alias, spec] of text.matchAll(
    /import\s+\*\s+as\s+(\w+)\s+from\s+'([^']+\.stories)'/g,
  )) {
    aliases.set(alias, resolve(dirname(file), `${spec}.tsx`));
  }
  if (!aliases.size) return [];

  const found = [];
  text.split('\n').forEach((line, index) => {
    for (const [, alias, story] of line.matchAll(/of=\{(\w+)\.(\w+)\}/g)) {
      const source = aliases.get(alias);
      if (source) found.push({ alias, story, source, line: index + 1 });
    }
  });
  return found;
}

/** Stories exportées par un fichier de stories. */
const exportsOf = new Map();
function storyExports(file) {
  if (!exportsOf.has(file)) {
    const names = new Set();
    if (existsSync(file)) {
      for (const [, name] of readFileSync(file, 'utf8').matchAll(/^export const (\w+)/gm)) {
        names.add(name);
      }
    }
    exportsOf.set(file, names);
  }
  return exportsOf.get(file);
}

function main() {
  const errors = [];
  const planned = new Map(PLANNED.map((p) => [p.path, p]));
  let checked = 0;
  let plannedSeen = 0;

  let stories = 0;
  for (const file of walk(ROOT)) {
    const label = relative(ROOT, file).split('\\').join('/');
    const text = readFileSync(file, 'utf8');

    for (const ref of storyReferences(text, file)) {
      stories++;
      if (!storyExports(ref.source).has(ref.story)) {
        errors.push(
          `${label}:${ref.line} → la story « ${ref.alias}.${ref.story} » n'est pas exportée ` +
            `par ${relative(ROOT, ref.source).split('\\').join('/')}.`,
        );
      }
    }

    for (const { path, line } of references(text)) {
      checked++;
      // Un lien markdown est relatif au fichier ; un chemin entre accents
      // graves est relatif à la racine du dépôt.
      const candidates = TOP_LEVEL.some((d) => path.startsWith(`${d}/`))
        ? [resolve(ROOT, path)]
        : [resolve(dirname(file), path), resolve(ROOT, path)];

      const exists = candidates.some(existsSync);
      const isPlanned = planned.has(path);

      if (!exists && !isPlanned) {
        errors.push(`${label}:${line} → « ${path} » n'existe pas.`);
      }
      if (isPlanned) {
        plannedSeen++;
        if (exists) {
          errors.push(
            `${label}:${line} → « ${path} » existe maintenant : retirez-le de PLANNED ` +
              `dans scripts/docs.links.check.mjs.`,
          );
        }
      }
    }
  }

  if (errors.length) {
    console.error(`✗ ${errors.length} renvoi(s) mort(s) dans la doc :\n`);
    for (const error of errors) console.error(`  - ${error}`);
    console.error(
      `\n  Pour un chemin : créez le fichier, corrigez-le, ou reformulez sans le citer` +
        `\n  comme un fichier. Pour une story : créez-la, ou retirez le bloc qui l'affiche.`,
    );
    process.exit(1);
  }

  console.log(
    `✓ renvois de doc : ${checked} chemin(s) cité(s) et ${stories} story(s) citée(s), ` +
      `tous existants` +
      `${plannedSeen ? ` (dont ${plannedSeen} vers ${planned.size} fichier(s) à construire)` : ''}.`,
  );
}

main();
