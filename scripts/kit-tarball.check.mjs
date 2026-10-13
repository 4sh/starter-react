#!/usr/bin/env node
/**
 * Checks what `npm publish` would actually send for `@4sh/ui-kit-react`,
 * from the file list `npm pack --dry-run` computes (the same `files`, the same
 * ignore rules as the real publish):
 *
 *   - the files a consumer relies on are there: bundles, types, `styles.css`,
 *     the embedded MCP server and its doc snapshot, LICENSE, NOTICE, READMEs;
 *   - every `exports` target and the `bin` target resolve to a packed file;
 *   - no story, test or MDX page leaks in;
 *   - the three places that carry the version agree: `package.json`,
 *     `UI_KIT_VERSION` in the built root entry, the MCP manifest's `kitVersion`.
 *
 * Exists because "read the tarball before publishing" was a checklist item:
 * the Angular kit once shipped a release without its MCP server, and nothing
 * failed. Here a missing piece fails the job, during the dry run.
 *
 * Usage: node scripts/kit-tarball.check.mjs (after pnpm kit:build && pnpm kit:mcp)
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { KIT_ROOT } from './lib/entries.mjs';

const pkg = JSON.parse(readFileSync(join(KIT_ROOT, 'package.json'), 'utf8'));
const [report] = JSON.parse(
  execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: KIT_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }),
);
const packed = new Set(report.files.map((f) => f.path));
const errors = [];

const REQUIRED = [
  'package.json',
  'LICENSE',
  'NOTICE',
  'README.md',
  'README.fr.md',
  'dist/index.js',
  'dist/index.d.ts',
  'dist/styles.css',
  'mcp/dist/index.js',
  'mcp/data/manifest.json',
  'mcp/data/text-search-docs.json',
  'mcp/LICENSE',
];
for (const file of REQUIRED) {
  if (!packed.has(file)) errors.push(`fichier attendu absent : ${file}`);
}

// `exports` values are either a path or a { types, import } condition map.
const strip = (target) => target.replace(/^\.\//, '');
for (const [subpath, value] of Object.entries(pkg.exports ?? {})) {
  const targets = typeof value === 'string' ? [value] : Object.values(value);
  for (const target of targets.map(strip)) {
    const ok = target.includes('*')
      ? [...packed].some((f) => f.startsWith(target.slice(0, target.indexOf('*'))))
      : packed.has(target);
    if (!ok) errors.push(`exports["${subpath}"] → ${target} absent du tarball`);
  }
}
for (const [name, target] of Object.entries(pkg.bin ?? {})) {
  if (!packed.has(strip(target))) errors.push(`bin["${name}"] → ${target} absent du tarball`);
}

const LEAKS = /\.(stories|test|spec)\.[jt]sx?$|\.mdx$/;
for (const file of packed) {
  if (LEAKS.test(file)) errors.push(`fichier de dev dans le tarball : ${file}`);
}

if (pkg.private) errors.push('package.json porte encore `private: true` : npm refusera.');

const built = readFileSync(join(KIT_ROOT, 'dist/index.js'), 'utf8');
const builtVersion = /UI_KIT_VERSION\s*=\s*["']([^"']+)["']/.exec(built)?.[1];
if (builtVersion !== pkg.version) {
  errors.push(
    `UI_KIT_VERSION vaut ${builtVersion} dans dist/index.js, le paquet est en ${pkg.version} ` +
      `(src/index.ts à aligner).`,
  );
}
const manifest = JSON.parse(readFileSync(join(KIT_ROOT, 'mcp/data/manifest.json'), 'utf8'));
if (manifest.kitVersion !== pkg.version) {
  errors.push(`le serveur MCP embarqué documente ${manifest.kitVersion}, pas ${pkg.version}.`);
}

if (errors.length) {
  console.error(`✗ tarball ${pkg.name}@${pkg.version} :\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log(
  `✓ tarball ${pkg.name}@${pkg.version} : ${packed.size} fichiers, ` +
    `${Object.keys(pkg.exports).length} exports résolus, serveur MCP embarqué.`,
);
