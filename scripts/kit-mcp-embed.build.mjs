#!/usr/bin/env node
/**
 * Embeds the built MCP server into `@4sh/ui-kit-react`, under `mcp/`
 * (git-ignored, rebuilt by `pnpm kit:mcp`):
 *
 *   mcp/dist/index.js   the self-contained bundle (SDK, Zod, MiniSearch inlined)
 *   mcp/data/           the doc snapshot, read at runtime
 *   mcp/LICENSE         Apache-2.0 §4a: a redistributed work carries its licence
 *
 * Shipped inside the kit rather than as its own package, as in the Angular
 * starter: whoever installs the kit already has the server on disk, linked as
 * `ui-kit-react-mcp` in `node_modules/.bin/`, with no second package to keep in
 * step. `@4sh/ui-kit-react-mcp` stays private: it is only where the server is
 * written and tested.
 *
 * The layout mirrors the MCP package root on purpose: `src/data.ts` finds
 * `data/` one level above the bundle, and the smoke test walks the same tree.
 * No `package.json` is copied: the kit's own one already says `type: module`,
 * and the version the server announces comes from the manifest, not from it.
 *
 * Fails when the bundle or the snapshot is missing, rather than pack a kit
 * whose `bin` points at nothing.
 *
 * Usage: node scripts/kit-mcp-embed.build.mjs (after pnpm mcp:build)
 */

import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, posix } from 'node:path';

import { KIT_ROOT, ROOT } from './lib/entries.mjs';

const MCP_ROOT = join(ROOT, 'packages/ui-kit-react-mcp');
const DEST = join(KIT_ROOT, 'mcp');
const rel = (path) => posix.relative(ROOT, path);

for (const path of [join(MCP_ROOT, 'dist/index.js'), join(MCP_ROOT, 'data/manifest.json')]) {
  if (!existsSync(path)) {
    throw new Error(`[kit-mcp-embed] ${rel(path)} manquant : lance \`pnpm mcp:build\`.`);
  }
}

// The manifest names the kit it documents. A snapshot left over from before a
// version bump would make the server announce the previous version.
const kitVersion = JSON.parse(readFileSync(join(KIT_ROOT, 'package.json'), 'utf8')).version;
const manifest = JSON.parse(readFileSync(join(MCP_ROOT, 'data/manifest.json'), 'utf8'));
if (manifest.kitVersion !== kitVersion) {
  throw new Error(
    `[kit-mcp-embed] le manifeste MCP documente le kit ${manifest.kitVersion}, ` +
      `le kit est en ${kitVersion} : relance \`pnpm mcp:build\`.`,
  );
}

// Cleared first, so a file dropped from the server cannot survive in the tarball.
rmSync(DEST, { recursive: true, force: true });
mkdirSync(join(DEST, 'dist'), { recursive: true });
copyFileSync(join(MCP_ROOT, 'dist/index.js'), join(DEST, 'dist/index.js'));
cpSync(join(MCP_ROOT, 'data'), join(DEST, 'data'), { recursive: true });
copyFileSync(join(MCP_ROOT, 'LICENSE'), join(DEST, 'LICENSE'));

console.log(`[kit-mcp-embed] serveur MCP ${kitVersion} embarqué → ${rel(DEST)}`);
