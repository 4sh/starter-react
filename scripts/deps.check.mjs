#!/usr/bin/env node
/**
 * deps.check.mjs : fait respecter la décision D6. une librairie tierce est un
 * détail d'implémentation, jamais le contrat du Design System.
 *
 * La règle, en une phrase : **aucun composant n'importe une librairie tierce.**
 * Il importe une brique de `core/`, et c'est cette brique, un seul fichier,
 * qui connaît la librairie. Le jour où la librairie change, un fichier change.
 *
 * Sans ce contrôle, la règle serait une consigne : elle tiendrait le temps que
 * personne n'ait un délai à tenir. Avec lui, elle tient toute seule.
 *
 * Ce qui est refusé :
 *   1. un import tiers dans un fichier qui n'est pas la brique propriétaire ;
 *   2. un import tiers qui n'a jamais été arbitré (absent de l'allocation) ;
 *   3. une dépendance déclarée dans `package.json` sans brique qui l'utilise ;
 *   4. une brique implémentée dont la dépendance n'est pas déclarée ;
 *   5. une dépendance présente dans `package.json` mais hors allocation.
 *
 * Usage : node scripts/deps.check.mjs
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

import { KIT_ROOT, KIT_SRC, ROOT } from './lib/entries.mjs';

/**
 * L'allocation : chaque dépendance de comportement, et **le seul** fichier
 * autorisé à l'importer.
 *
 * Une entrée ici est une décision d'architecture, pas une commodité : elle se
 * prend comme D6 s'est prise, en pesant ce que la librairie impose à l'API
 * publique et ce qu'elle coûte au consommateur en mode copie. Ajouter une ligne
 * sans cet arbitrage, c'est contourner la décision par le fichier qui la fait
 * respecter.
 *
 * `owner` est relatif à `packages/ui-kit-react/`. Un fichier qui n'existe pas
 * encore signifie « arbitré, pas encore implémenté » : la dépendance ne doit
 * alors PAS être installée.
 */
const ALLOCATION = [
  {
    dependency: '@floating-ui/react-dom',
    owner: 'src/core/overlay/use-ui-position.ts',
    why: 'Positionnement ancré : collision, retournement, décalage, conteneurs défilants.',
  },
  {
    dependency: '@tanstack/react-virtual',
    owner: 'src/core/virtual/use-ui-virtual-list.ts',
    why: 'Défilement virtuel : fenêtre, mesure dynamique, ancrage du défilement.',
  },
];

/**
 * Les dépendances **refusées**, et pourquoi.
 *
 * Une entrée ici n'est pas un oubli : c'est un arbitrage déjà rendu, mesuré sur
 * la plateforme du jour. Sans cette liste, chaque session rouvrirait le débat et
 * finirait par installer la librairie « parce qu'elle existe ».
 *
 * Rouvrir un de ces choix est légitime, mais demande la même chose que la
 * première fois : une mesure, pas une intuition.
 */
const REFUSED = [
  {
    dependency: 'tabbable',
    instead: 'core/focus/focusable.ts',
    why:
      'le piège de focus modal est natif (`<dialog>.showModal()`), mesuré : le focus entre ' +
      'dans le dialogue et ne peut plus en sortir. Il ne reste que « poser le focus dans un ' +
      "panneau », qu'un sélecteur documenté couvre.",
  },
  {
    dependency: 'aria-hidden',
    instead: "l'attribut natif `inert` et le calque supérieur",
    why:
      'mesuré : un sous-arbre `inert` refuse le focus, et le calque supérieur de `<dialog>` ' +
      "comme de `popover` rend déjà l'arrière-plan inerte sans qu'on pose quoi que ce soit.",
  },
  {
    dependency: 'react-remove-scroll',
    instead: 'core/overlay/use-ui-scroll-lock.ts',
    why:
      "mesuré : `showModal()` rend l'arrière-plan inerte mais ne fige PAS son défilement " +
      '(`overflow` reste `visible`). Le manque est réel, mais délimité : quelques lignes, ' +
      'compensation de la barre de défilement comprise.',
  },
];

/**
 * Toujours autorisé, partout : le framework lui-même, qui est une
 * `peerDependency` fournie par le projet consommateur. Les sous-chemins
 * (`react/jsx-runtime`, `react-dom/client`) sont couverts.
 */
const FRAMEWORK = ['react', 'react-dom'];

const SKIP = /\.(stories|test|spec)\.tsx?$|\.d\.ts$/;

function sourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(entry.name) && !SKIP.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Spécificateurs de module non relatifs d'un fichier.
 *
 * Couvre `import … from '…'`, `export … from '…'`, `import '…'` (les feuilles
 * de style) et `import('…')`. Les chemins relatifs et les sous-chemins du
 * paquet lui-même ne nous intéressent pas.
 */
function bareImports(text) {
  const found = new Set();
  const patterns = [
    /(?:^|\n)\s*import\s[^;]*?from\s+['"]([^'"]+)['"]/g,
    /(?:^|\n)\s*export\s[^;]*?from\s+['"]([^'"]+)['"]/g,
    /(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const re of patterns) {
    for (const match of text.matchAll(re)) {
      const specifier = match[1];
      if (specifier.startsWith('.') || specifier.startsWith('/')) continue;
      if (specifier.startsWith('@4sh/')) continue;
      found.add(specifier);
    }
  }
  return [...found];
}

/** Nom du paquet d'un spécificateur (`@scope/pkg/sub` → `@scope/pkg`). */
function packageOf(specifier) {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function main() {
  const errors = [];
  const byDependency = new Map(ALLOCATION.map((a) => [a.dependency, a]));

  // --- 1 & 2. Les imports du code source -------------------------------
  for (const file of sourceFiles(KIT_SRC)) {
    const rel = relative(KIT_ROOT, file).split('\\').join('/');
    const label = relative(ROOT, file).split('\\').join('/');

    for (const specifier of bareImports(readFileSync(file, 'utf8'))) {
      const pkg = packageOf(specifier);
      if (FRAMEWORK.includes(pkg)) continue;

      const refused = REFUSED.find((r) => r.dependency === pkg);
      if (refused) {
        errors.push(
          `${label} importe « ${specifier} », dont l'usage a été REFUSÉ.\n` +
            `    Motif : ${refused.why}\n` +
            `    À utiliser à la place : ${refused.instead}.`,
        );
        continue;
      }

      const allocated = byDependency.get(pkg);
      if (!allocated) {
        errors.push(
          `${label} importe « ${specifier} », qui n'a pas été arbitré.\n` +
            `    Décision D6 : une librairie tierce est un détail d'implémentation. Soit le ` +
            `comportement s'écrit dans core/, soit la dépendance passe par l'arbitrage et ` +
            `entre dans ALLOCATION avec sa brique propriétaire.`,
        );
        continue;
      }

      if (rel !== allocated.owner) {
        errors.push(
          `${label} importe « ${specifier} » hors de sa brique.\n` +
            `    Seul ${allocated.owner} a le droit de l'importer. Un composant passe par la ` +
            `brique, jamais par la librairie : c'est ce qui garde le remplacement à un fichier.`,
        );
      }
    }
  }

  // --- 3, 4 & 5. Cohérence avec les dépendances déclarées ---------------
  const pkg = JSON.parse(readFileSync(join(KIT_ROOT, 'package.json'), 'utf8'));
  const declared = Object.keys(pkg.dependencies ?? {});

  for (const { dependency, owner } of ALLOCATION) {
    const implemented = existsSync(join(KIT_ROOT, owner));
    const isDeclared = declared.includes(dependency);

    if (implemented && !isDeclared) {
      errors.push(
        `${owner} existe mais « ${dependency} » n'est pas dans les dependencies du paquet.\n` +
          `    Une brique implémentée doit déclarer sa dépendance, sinon le paquet publié ` +
          `casse à l'installation chez le consommateur.`,
      );
    }
    if (!implemented && isDeclared) {
      errors.push(
        `« ${dependency} » est déclaré, mais ${owner} n'existe pas encore.\n` +
          `    Une dépendance installée que rien n'utilise voyage jusqu'au consommateur pour ` +
          `rien. La retirer, ou implémenter la brique.`,
      );
    }
  }

  for (const dependency of declared) {
    const refused = REFUSED.find((r) => r.dependency === dependency);
    if (refused) {
      errors.push(
        `« ${dependency} » est installé alors que son usage a été REFUSÉ.\n` +
          `    Motif : ${refused.why}\n` +
          `    À utiliser à la place : ${refused.instead}.`,
      );
      continue;
    }
    if (!byDependency.has(dependency)) {
      errors.push(
        `« ${dependency} » est dans les dependencies du paquet mais hors allocation.\n` +
          `    Toute dépendance du kit a une brique propriétaire déclarée dans ce fichier.`,
      );
    }
  }

  // --- Rapport ----------------------------------------------------------
  if (errors.length) {
    console.error(`✗ ${errors.length} manquement(s) à la décision D6 :\n`);
    for (const error of errors) console.error(`  - ${error}\n`);
    console.error('  Détail de la décision : docs/DECISIONS.md → D6.');
    process.exit(1);
  }

  const implemented = ALLOCATION.filter((a) => existsSync(join(KIT_ROOT, a.owner)));
  const pending = ALLOCATION.length - implemented.length;
  console.log(
    `✓ dépendances : ${implemented.length} brique(s) implémentée(s)` +
      `${pending ? `, ${pending} arbitrée(s) non implémentée(s)` : ''}` +
      ` : aucun composant n'importe de librairie tierce.`,
  );
}

main();
