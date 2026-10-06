/**
 * Reads the doc snapshot shipped in `data/`, written at build time by
 * `scripts/mcp-assets.build.mjs`: the server runs without the kit's sources.
 * `readFileSync` rather than `import`, so the snapshot rebuilds without rebundling.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Both `dist/index.js` and `src/data.ts` sit one level below the package root.
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');

export interface PropDoc {
  name: string;
  type: string;
  /** Only when the type is a union of literals. */
  values?: (string | number)[];
  required: boolean;
  /** Source text of the destructuring default, e.g. `'high'`. */
  default?: string;
  description?: string;
  deprecated?: boolean;
}

export interface ComponentExport {
  name: string;
  description: string;
  /**
   * Element receiving the remaining native attributes: its tag name, `true`
   * when undetermined, `null` when the component forwards none.
   */
  native: string | true | null;
  props: PropDoc[];
}

export interface NamedExport {
  name: string;
  description: string;
}

export interface TypeExport {
  name: string;
  description?: string;
  /** Only when short. */
  definition?: string;
}

export interface CssHook {
  name: string;
  role: string;
  /** Fallback chain when the hook is unset: `--ui-x → --token`. */
  fallback: string | null;
}

export interface ComponentEntry {
  name: string;
  category: string;
  import: string;
  summary: string;
  docId: string;
  docUrl: string;
  source: string;
  exports: {
    components: ComponentExport[];
    hooks: NamedExport[];
    values: NamedExport[];
    types: TypeExport[];
  };
  cssHooks: CssHook[];
}

export interface SharedSetting {
  name: string;
  group: string;
  role: string;
  hook: string | null;
  default: string | null;
}

export interface Manifest {
  $generatedBy: string;
  kitVersion: string;
  storybookUrl: string;
  components: ComponentEntry[];
  sharedConfig: {
    groups: Record<string, { label: string; docId: string }>;
    settings: SharedSetting[];
  };
}

export interface DocSection {
  id: string;
  docId: string;
  anchor: string | null;
  title: string;
  name: string;
  section: string | null;
  text: string;
  source: string;
}

export interface SearchDocsManifest {
  $generatedBy: string;
  $source: string;
  docs: DocSection[];
}

function readJson<T>(fileName: string): T {
  const path = join(DATA_DIR, fileName);
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch (error) {
    throw new Error(
      `[@4sh/ui-kit-react-mcp] Impossible de lire ${fileName} (${path}). ` +
        `Le manifeste est-il bien livré avec le paquet ? Dans le dépôt du kit : \`pnpm mcp:build\`.`,
      { cause: error },
    );
  }
}

let manifestCache: Manifest | undefined;
let searchDocsCache: SearchDocsManifest | undefined;

export function loadManifest(): Manifest {
  return (manifestCache ??= readJson<Manifest>('manifest.json'));
}

export function loadSearchDocs(): SearchDocsManifest {
  return (searchDocsCache ??= readJson<SearchDocsManifest>('text-search-docs.json'));
}

const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * Accepts `ui-button`, `button`, `@4sh/ui-kit-react/ui-button`, or the React
 * name of any export (`UiTabPanel` → `ui-tabs`).
 */
export function findComponent(query: string): ComponentEntry | undefined {
  const { components } = loadManifest();
  const raw = query.trim().replace(/^@4sh\/ui-kit-react\//, '');
  const lower = raw.toLowerCase();
  const byName = (name: string) => components.find((c) => c.name === name);

  return (
    byName(lower) ??
    byName(`ui-${lower}`) ??
    components.find((c) => c.exports.components.some((e) => e.name === raw)) ??
    byName(kebab(raw))
  );
}

export function suggestComponents(query: string): string[] {
  const needle = query.trim().toLowerCase().replace(/^ui-?/, '');
  if (!needle) return [];
  return loadManifest()
    .components.map((c) => c.name)
    .filter((name) => name.includes(needle));
}

export function getDocSections(docId: string): DocSection[] {
  return loadSearchDocs().docs.filter((doc) => doc.docId === docId);
}
