#!/usr/bin/env node
/**
 * exports.build.mjs : écrit le champ `exports` de `packages/ui-kit-react/package.json`
 * à partir des dossiers réellement présents dans `src/`.
 *
 * Pourquoi un script : côté Angular, `ng-packagr` dérive tout seul un point
 * d'entrée secondaire de chaque `ng-package.json` posé dans l'arborescence. Rien
 * d'équivalent n'existe dans la chaîne Vite : la table `exports` est un objet
 * JSON qu'il faut tenir à jour. La tenir à la main garantit qu'elle décrochera
 * : un composant ajouté sans son entrée est importable en développement (Vite
 * résout les chemins relatifs) et introuvable une fois publié.
 *
 * Le fichier généré est COMMITTÉ, comme `component-vars.scss` et
 * `figma/component-vars.json` côté Angular : c'est ce qui rend une omission
 * visible dans une revue de PR, et c'est ce que `--check` vérifie en CI.
 *
 * Usage :
 *   node scripts/exports.build.mjs            # écrit
 *   node scripts/exports.build.mjs --check    # échoue si le fichier est périmé
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { collectEntries, KIT_ROOT } from './lib/entries.mjs';

const CHECK = process.argv.includes('--check');
const PKG = join(KIT_ROOT, 'package.json');

/**
 * Construit la table. Ordre des clés de condition : `types` d'abord (TypeScript
 * s'arrête à la première correspondance, un `import` placé avant lui masquerait
 * les déclarations), puis `import`. Pas de `require` : le paquet est ESM.
 */
function buildExports(entries) {
  const map = {};

  for (const entry of entries) {
    // `vite-plugin-dts` reproduit l'arborescence de `src/` directement sous
    // `dist/` (avec `entryRoot: 'src'`), à côté des bundles à plat. Les deux
    // ne se marchent pas dessus : `dist/ui-icon.js` d'un côté,
    // `dist/base/ui-icon/index.d.ts` de l'autre.
    const dts = `./dist/${entry.entryFile.replace(/^src\//, '').replace(/\.ts$/, '.d.ts')}`;

    map[entry.subpath] = {
      types: dts,
      import: `./dist/${entry.name}.js`,
    };
  }

  // La fondation : une feuille compilée à charger UNE fois, et les sources Sass
  // pour un projet qui veut recompiler avec ses propres réglages.
  map['./styles.css'] = './dist/styles.css';
  map['./styles/*'] = './src/styles/*';
  map['./package.json'] = './package.json';

  return map;
}

function main() {
  const raw = readFileSync(PKG, 'utf8');
  const pkg = JSON.parse(raw);

  const entries = collectEntries();
  const next = buildExports(entries);

  const current = JSON.stringify(pkg.exports ?? {});
  const wanted = JSON.stringify(next);

  if (current === wanted) {
    if (!CHECK) console.log(`exports : à jour (${entries.length} point(s) d'entrée).`);
    return;
  }

  if (CHECK) {
    console.error(
      `✗ Le champ « exports » de ${PKG} est périmé.\n` +
        `  ${entries.length} point(s) d'entrée trouvé(s) dans src/, la table en déclare ` +
        `${Object.keys(pkg.exports ?? {}).length}.\n` +
        `  Lancez « pnpm exports:build » et committez le résultat.`,
    );
    process.exit(1);
  }

  pkg.exports = next;
  // Réécrit avec la même indentation que le fichier d'origine, et garde le saut
  // de ligne final : sans ça chaque build produit un diff parasite.
  writeFileSync(PKG, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`exports : ${entries.length} point(s) d'entrée écrit(s) dans package.json.`);
}

main();
