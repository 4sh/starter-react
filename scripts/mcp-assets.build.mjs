#!/usr/bin/env node
/**
 * Writes the doc snapshot shipped with the MCP server into
 * `packages/ui-kit-react-mcp/data/` (git-ignored, rebuilt by `pnpm mcp:build`):
 *
 *   manifest.json          per component: import subpath, API from the types,
 *                          `--ui-*` hooks, doc page; plus shared config and kit version.
 *   text-search-docs.json  Storybook's search index, minus the demo app's pages.
 *
 * Hooks follow the rule of `<ConfigTable>` (`storybook/blocks/config-table.js`),
 * so the server says exactly what a page's Theming section says.
 *
 * Fails when a component has no doc page, rather than ship a server that skips it.
 *
 * Usage: node scripts/mcp-assets.build.mjs (after docs:config and docs:search)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';

import { extractComponentApi, firstParagraph } from './lib/component-api.mjs';
import { collectComponents, KIT_ROOT, ROOT } from './lib/entries.mjs';

const UI_CONFIG = join(ROOT, 'storybook/generated/ui-config.json');
const SEARCH_INDEX = join(ROOT, 'storybook/public/text-search-docs.json');
const DEST = join(ROOT, 'packages/ui-kit-react-mcp/data');

const EXCLUDED_DOC_ROOTS = ['apps/'];

function readJson(path, hint) {
  if (!existsSync(path)) {
    throw new Error(`[mcp-assets] ${posix.relative(ROOT, path)} manquant : lance \`${hint}\`.`);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** `ui-button : bouton d'action. Trois axes…` → `Bouton d'action.` */
function summarize(description) {
  const paragraph = firstParagraph(description).replace(/^ui-[\w-]+\s*:\s*/, '');
  const sentence = /^.+?[.!?](?=\s|$)/.exec(paragraph)?.[0] ?? paragraph;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/** `--ui-button-radius-rounded → --radius-full` */
function fallbackChain(resolved) {
  const steps = [];
  for (let node = resolved; node; node = node.fallback) {
    steps.push(node.cssVar ?? node.literal ?? node.raw);
  }
  return steps.length ? steps.join(' → ') : null;
}

function exposedHook(row) {
  const hook = row.default?.cssVar;
  if (!hook?.startsWith('--ui-')) return null;
  return { name: hook, role: row.role ?? '', fallback: fallbackChain(row.default.fallback) };
}

/**
 * Every stylesheet of the folder: a sub-component exported by the same entry
 * point (`ui-file-upload-list.scss`) has its own entry in the doc manifest.
 */
function cssHooks(uiConfig, dir) {
  const hooks = new Map();
  for (const config of Object.values(uiConfig.components)) {
    if (posix.dirname(config.file) !== dir) continue;
    for (const row of [...(config.vars ?? []), ...(config.hooks ?? [])]) {
      const hook = exposedHook(row);
      if (hook && !hooks.has(hook.name)) hooks.set(hook.name, hook);
    }
  }
  return [...hooks.values()];
}

function sharedConfig({ groups, shared }) {
  return {
    groups,
    settings: Object.entries(shared).map(([name, row]) => ({
      name,
      group: row.group,
      role: row.role ?? '',
      hook: exposedHook(row)?.name ?? null,
      default: fallbackChain(row.default),
    })),
  };
}

function build() {
  const uiConfig = readJson(UI_CONFIG, 'pnpm docs:config');
  const searchIndex = readJson(SEARCH_INDEX, 'pnpm docs:search');
  const kit = JSON.parse(readFileSync(join(KIT_ROOT, 'package.json'), 'utf8'));

  // `homepage` points at a doc page: keep the Storybook root.
  const homepage = new URL(kit.homepage);
  const storybookUrl = `${homepage.origin}${homepage.pathname}`;
  const docUrl = (docId) => `${storybookUrl}?path=/docs/${docId}`;

  const docs = searchIndex.docs.filter(
    (doc) => !EXCLUDED_DOC_ROOTS.some((root) => doc.source.startsWith(root)),
  );

  const entries = collectComponents();
  const api = extractComponentApi(entries);

  const components = entries.map((entry) => {
    const dir = posix.join('packages/ui-kit-react', posix.dirname(entry.entryFile));
    const page = docs.find((doc) => doc.source === `${dir}/${entry.name}.mdx`);
    if (!page) {
      throw new Error(
        `[mcp-assets] ${entry.name} n'a pas de page de doc (${dir}/${entry.name}.mdx).`,
      );
    }

    const { components: exported, hooks, values, types } = api[entry.name];
    const main = exported.find((c) => kebab(c.name) === entry.name) ?? exported[0];

    return {
      name: entry.name,
      category: entry.category,
      import: `@4sh/ui-kit-react/${entry.name}`,
      summary: summarize(main.description),
      docId: page.docId,
      docUrl: docUrl(page.docId),
      source: dir,
      exports: { components: exported, hooks, values, types },
      cssHooks: cssHooks(uiConfig, dir),
    };
  });

  return {
    manifest: {
      $generatedBy: 'scripts/mcp-assets.build.mjs',
      kitVersion: kit.version,
      storybookUrl,
      components,
      sharedConfig: sharedConfig(uiConfig),
    },
    searchIndex: { ...searchIndex, docs },
  };
}

const { manifest, searchIndex } = build();
mkdirSync(DEST, { recursive: true });
writeFileSync(join(DEST, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(join(DEST, 'text-search-docs.json'), `${JSON.stringify(searchIndex, null, 2)}\n`);

const props = manifest.components.flatMap((c) => c.exports.components.flatMap((e) => e.props));
const hooks = manifest.components.flatMap((c) => c.cssHooks);
console.log(
  `✓ manifeste MCP : ${manifest.components.length} composants, ${props.length} props, ` +
    `${hooks.length} hooks --ui-*, ${searchIndex.docs.length} sections de doc ` +
    `(kit ${manifest.kitVersion}).`,
);
