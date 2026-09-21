/**
 * entries.mjs : source unique de vérité des points d'entrée du kit.
 *
 * Lue par `vite.config.ts` (ce qu'il faut compiler) ET par `exports.build.mjs`
 * (ce qu'il faut déclarer dans `package.json`). Les deux doivent voir
 * exactement la même liste : un point d'entrée compilé mais non déclaré est
 * invisible au consommateur, un point d'entrée déclaré mais non compilé casse
 * son import à l'exécution. Une seule fonction, deux lecteurs.
 *
 * Convention de découverte, volontairement mécanique :
 *
 *   src/<catégorie>/ui-<nom>/index.ts   → un composant     → sous-chemin `./ui-<nom>`
 *   src/core/<nom>/index.ts             → une brique       → sous-chemin `./<nom>`
 *   src/index.ts                        → l'entrée racine  → sous-chemin `.`
 *
 * ⚠️ La catégorie n'apparaît PAS dans le sous-chemin public (décision D4). Elle
 * range les fichiers sur le disque et structure la doc, rien de plus. C'est ce
 * qui permet de déplacer `ui-chip` de `informative/` vers `forms/` sans casser
 * un seul import chez les consommateurs : l'inverse exact de la contrainte que
 * `ng-packagr` impose au starter Angular, où le dossier EST le sous-chemin.
 *
 * Corollaire à tenir : deux composants ne peuvent pas porter le même nom dans
 * deux catégories différentes. `collectEntries()` échoue si ça arrive, plutôt
 * que de laisser le second écraser le premier en silence.
 */

import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Racine du dépôt (scripts/lib → scripts → racine). */
export const ROOT = resolve(HERE, '../..');

/** Racine du paquet publié. */
export const KIT_ROOT = join(ROOT, 'packages/ui-kit-react');

/** Racine des sources du paquet. */
export const KIT_SRC = join(KIT_ROOT, 'src');

/**
 * Catégories de composants. Reprises telles quelles du starter Angular : ce
 * sont les sections de `Overview.mdx`, et elles doivent rester identiques d'un
 * stack à l'autre pour que la doc et le contrôle de parité se recoupent.
 */
export const CATEGORIES = [
  'actions',
  'base',
  'forms',
  'informative',
  'layout',
  'navigation',
  'table',
];

function subdirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/**
 * Recense les points d'entrée du kit.
 *
 * @returns {{ name: string, subpath: string, category: string | null,
 *             entryFile: string, absEntry: string }[]}
 *   `name` sert de clé de sortie Rollup (donc de nom de fichier dans `dist/`),
 *   `entryFile` est relatif à la racine du paquet.
 */
export function collectEntries() {
  const entries = [];
  const seen = new Map();

  const push = (name, subpath, category, entryFile) => {
    const previous = seen.get(name);
    if (previous) {
      throw new Error(
        `Collision de point d'entrée : « ${name} » est défini par ${previous} et par ${entryFile}. ` +
          `Le sous-chemin public ne porte pas la catégorie (D4), donc deux composants homonymes ` +
          `dans deux catégories s'écraseraient. Renommez-en un.`,
      );
    }
    seen.set(name, entryFile);
    entries.push({ name, subpath, category, entryFile, absEntry: join(KIT_ROOT, entryFile) });
  };

  // L'entrée racine, volontairement minimale (version + réexports transverses).
  if (existsSync(join(KIT_SRC, 'index.ts'))) {
    push('index', '.', null, 'src/index.ts');
  }

  // Les briques transverses : types, thème, motion, overlay, formulaires…
  for (const name of subdirs(join(KIT_SRC, 'core'))) {
    const entryFile = posix.join('src/core', name, 'index.ts');
    if (existsSync(join(KIT_ROOT, entryFile))) push(name, `./${name}`, 'core', entryFile);
  }

  // Les composants, rangés par catégorie sur le disque uniquement.
  for (const category of CATEGORIES) {
    for (const name of subdirs(join(KIT_SRC, category))) {
      if (!name.startsWith('ui-')) continue;
      const entryFile = posix.join('src', category, name, 'index.ts');
      if (existsSync(join(KIT_ROOT, entryFile))) push(name, `./${name}`, category, entryFile);
    }
  }

  return entries;
}

/** Les composants seuls (ce que la doc et le mode copie énumèrent). */
export function collectComponents() {
  return collectEntries().filter((e) => e.category && e.category !== 'core');
}
