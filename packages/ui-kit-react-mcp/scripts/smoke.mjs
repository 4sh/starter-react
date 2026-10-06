#!/usr/bin/env node
/**
 * Starts the BUILT binary over stdio with the SDK client, as an MCP client
 * would, and walks an agent's path. Covers what the Vitest suite cannot: the
 * bundle, the `data/` path relative to `dist/`, and the real manifest.
 *
 * Requires `pnpm mcp:build`. Usage: pnpm mcp:smoke
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(PKG, 'data/manifest.json'), 'utf8'));

const failures = [];
function check(label, condition) {
  console.log(`${condition ? '✓' : '✗'} ${label}`);
  if (!condition) failures.push(label);
}

const client = new Client({ name: 'ui-kit-react-mcp-smoke', version: '0.0.0' });
await client.connect(
  new StdioClientTransport({ command: process.execPath, args: [join(PKG, 'dist/index.js')] }),
);

async function call(name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  return { isError: result.isError === true, payload: JSON.parse(result.content[0].text) };
}

try {
  check(
    `le serveur annonce la version du kit (${manifest.kitVersion})`,
    client.getServerVersion()?.version === manifest.kitVersion,
  );
  check('le serveur transmet ses instructions', /list_components/.test(client.getInstructions()));

  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  check(
    `quatre tools exposés (${names.join(', ')})`,
    names.join() === 'get_component_doc,get_shared_config,list_components,search_docs',
  );

  const catalog = await call('list_components');
  check(
    `list_components : ${catalog.payload.count} composants`,
    catalog.payload.count === manifest.components.length && catalog.payload.count > 0,
  );

  const forms = await call('list_components', { category: 'forms' });
  check(
    'list_components filtre par famille',
    forms.payload.count > 0 && forms.payload.components.every((c) => c.category === 'forms'),
  );

  const button = await call('get_component_doc', { name: 'ui-button' });
  const uiButton = button.payload.api?.components.find((c) => c.name === 'UiButton');
  const level = uiButton?.props.find((p) => p.name === 'level');
  check(
    "get_component_doc : sous-chemin d'import de ui-button",
    button.payload.import === '@4sh/ui-kit-react/ui-button',
  );
  check(
    'get_component_doc : la prop level, ses valeurs et son défaut',
    level?.values?.includes('high') && level?.default === "'high'",
  );
  check('get_component_doc : élément natif <button>', uiButton?.native === 'button');
  check(
    'get_component_doc : hooks --ui-* et sections de doc',
    button.payload.theming?.cssHooks.length > 0 && button.payload.doc?.sections.length > 0,
  );

  const tabs = await call('get_component_doc', { name: 'UiTabPanel', include: ['api'] });
  check(
    'get_component_doc : UiTabPanel mène à ui-tabs, réduit à son API',
    tabs.payload.name === 'ui-tabs' && tabs.payload.api && !tabs.payload.doc,
  );
  check(
    'get_component_doc : la définition des types exportés (UiTabValue)',
    tabs.payload.api.types.some((t) => t.name === 'UiTabValue' && t.definition),
  );

  const unknown = await call('get_component_doc', { name: 'ui-does-not-exist' });
  check('get_component_doc : un nom inconnu est une erreur', unknown.isError);

  const search = await call('search_docs', { query: 'anneau de focus', limit: 5 });
  check(`search_docs : ${search.payload.count} résultats`, search.payload.count > 0);

  const shared = await call('get_shared_config');
  check(
    `get_shared_config : ${shared.payload.settings.length} réglages`,
    shared.payload.settings.length > 0,
  );
} finally {
  await client.close();
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} contrôle(s) en échec.`);
  process.exit(1);
}
console.log('\n✓ Le serveur MCP construit répond comme attendu.');
