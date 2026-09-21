#!/usr/bin/env node
/**
 * prose.check.mjs : les deux règles d'écriture que le dépôt fait respecter.
 *
 * 1. Pas de tiret cadratin dans la prose.
 * 2. Pas de tableau markdown dans un `.mdx`.
 *
 * Le tiret cadratin est proscrit dans les commentaires, la doc et le
 * CHANGELOG. La règle vaut aussi côté Angular. Elle est ici parce qu'elle se
 * perd sans contrôle : une session la respecte, la suivante ne la connaît pas,
 * et le dépôt se retrouve à deux styles.
 *
 * Seules les lignes de COMMENTAIRE et les fichiers markdown sont contrôlés. Le
 * même caractère utilisé comme glyphe affiché reste légitime, par exemple la
 * cellule vide de `<ConfigTable>` : l'interdire produirait des faux positifs,
 * et un contrôle qui crie pour rien finit désactivé.
 *
 * Remplacer par « : » pour une explication, « , » pour une incise, ou des
 * parenthèses pour une apposition.
 *
 * La seconde règle est là parce que l'erreur a été commise QUATRE fois :
 * Storybook n'a pas `remark-gfm` dans sa chaîne, donc un tableau écrit en `|`
 * rend des tuyaux en texte brut, sans le moindre avertissement. La convention
 * du dépôt est `<table className="doc-table">`, qui hérite des styles de
 * `preview-head.html`. Le contrôle ne vise que les `.mdx` : un tableau markdown
 * dans un `.md` (README, CHANGELOG, docs/) est rendu par GitHub, donc légitime.
 *
 * Usage : node scripts/prose.check.mjs
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { ROOT } from './lib/entries.mjs';

const ROOTS = ['packages', 'scripts', 'docs', 'storybook', 'apps'];
const FILES = ['AGENTS.md', 'CLAUDE.md', 'README.md', 'CHANGELOG.md', 'SECURITY.md'];

const CODE = /\.(ts|tsx|mts|mjs|js|cjs|scss)$/;
const DOC = /\.(md|mdx)$/;

const SKIP = new Set([
  'node_modules',
  'dist',
  'generated',
  'storybook-static',
  'coverage',
  '.vitest',
  '.git',
]);

/** Une ligne de commentaire, pas une chaîne de caractères. */
const COMMENT = /^\s*(\/\/|\*|\/\*|<!--|#)/;

/** Une ligne de tableau markdown : le `|` en tête de ligne est ce qui compte. */
const MD_TABLE_ROW = /^\s*\|.*\|\s*$/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (CODE.test(entry.name) || DOC.test(entry.name)) out.push(full);
  }
  return out;
}

function main() {
  const dashes = [];
  const tables = [];
  const files = [...ROOTS.flatMap((r) => walk(join(ROOT, r))), ...FILES.map((f) => join(ROOT, f))];

  for (const file of files) {
    const isDoc = DOC.test(file);
    const isMdx = file.endsWith('.mdx');
    const where = relative(ROOT, file).split('\\').join('/');
    let fenced = false;

    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        if (isDoc && line.trimStart().startsWith('```')) fenced = !fenced;

        if (isMdx && !fenced && MD_TABLE_ROW.test(line)) {
          tables.push(`${where}:${index + 1} : ${line.trim().slice(0, 90)}`);
        }

        if (!line.includes('—')) return;
        // Dans un fichier de code, seule la prose des commentaires compte ;
        // dans un markdown, tout sauf les blocs de code.
        if (isDoc ? fenced : !COMMENT.test(line)) return;

        dashes.push(`${where}:${index + 1} : ${line.trim().slice(0, 90)}`);
      });
  }

  if (dashes.length) {
    console.error(`✗ ${dashes.length} tiret(s) cadratin dans la prose :\n`);
    for (const error of dashes) console.error(`  - ${error}`);
    console.error(
      `\n  Remplacer par « : » (explication), « , » (incise) ou des parenthèses (apposition).`,
    );
  }

  if (tables.length) {
    console.error(
      `${dashes.length ? '\n' : ''}✗ ${tables.length} ligne(s) de tableau markdown dans un .mdx :\n`,
    );
    for (const error of tables) console.error(`  - ${error}`);
    console.error(
      `\n  Storybook n'active pas les tableaux markdown : ces lignes rendent des tuyaux en\n` +
        `  texte brut. Écrire \`<table className="doc-table">\`, comme le reste des pages.`,
    );
  }

  if (dashes.length || tables.length) process.exit(1);

  console.log(
    `✓ prose : aucun tiret cadratin ni tableau markdown dans ${files.length} fichier(s).`,
  );
}

main();
