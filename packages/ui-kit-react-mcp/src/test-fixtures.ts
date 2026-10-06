// Tests swap `readFileSync` for `readFixture`: everything else, `data.ts`
// included, runs for real. The real manifest is generated, absent from a clean checkout.
import type { DocSection, Manifest, SearchDocsManifest } from './data';

const STORYBOOK = 'https://4sh.github.io/starter-react/';

export const FIXTURE_MANIFEST: Manifest = {
  $generatedBy: 'scripts/mcp-assets.build.mjs',
  kitVersion: '9.9.9',
  storybookUrl: STORYBOOK,
  components: [
    {
      name: 'ui-button',
      category: 'actions',
      import: '@4sh/ui-kit-react/ui-button',
      summary: "Bouton d'action.",
      docId: 'components-ui-actions-ui-button--docs',
      docUrl: `${STORYBOOK}?path=/docs/components-ui-actions-ui-button--docs`,
      source: 'packages/ui-kit-react/src/actions/ui-button',
      exports: {
        components: [
          {
            name: 'UiButton',
            description: "ui-button : bouton d'action.",
            native: 'button',
            props: [
              { name: 'label', type: 'string', required: false, description: 'Libellé.' },
              {
                name: 'level',
                type: 'UiLevel',
                values: ['high', 'low'],
                required: false,
                default: "'high'",
              },
            ],
          },
        ],
        hooks: [],
        values: [],
        types: [
          { name: 'UiButtonProps' },
          { name: 'ButtonVariant', definition: "'filled' | 'outlined' | 'ghost'" },
        ],
      },
      cssHooks: [{ name: '--ui-button-radius', role: 'Rayon des coins.', fallback: '--radius-sm' }],
    },
    {
      name: 'ui-tabs',
      category: 'navigation',
      import: '@4sh/ui-kit-react/ui-tabs',
      summary: "Conteneur qui orchestre une bande d'onglets et leurs panneaux.",
      docId: 'components-ui-navigation-ui-tabs--docs',
      docUrl: `${STORYBOOK}?path=/docs/components-ui-navigation-ui-tabs--docs`,
      source: 'packages/ui-kit-react/src/navigation/ui-tabs',
      exports: {
        components: [
          { name: 'UiTabs', description: '', native: 'div', props: [] },
          { name: 'UiTabPanel', description: '', native: 'div', props: [] },
        ],
        hooks: [],
        values: [],
        types: [{ name: 'UiTabsProps' }],
      },
      cssHooks: [],
    },
    {
      name: 'ui-button-split',
      category: 'actions',
      import: '@4sh/ui-kit-react/ui-button-split',
      summary: "Un bouton d'action accolé à un déclencheur déroulant.",
      docId: 'components-ui-actions-ui-button-split--docs',
      docUrl: `${STORYBOOK}?path=/docs/components-ui-actions-ui-button-split--docs`,
      source: 'packages/ui-kit-react/src/actions/ui-button-split',
      exports: {
        components: [{ name: 'UiButtonSplit', description: '', native: 'div', props: [] }],
        hooks: [],
        values: [],
        types: [],
      },
      cssHooks: [],
    },
  ],
  sharedConfig: {
    groups: { 'global-ui': { label: 'Global UI', docId: 'components-configuration-global-ui' } },
    settings: [
      {
        name: '$focus-ring-width',
        group: 'global-ui',
        role: "Épaisseur de l'anneau de focus, pour tout le kit.",
        hook: '--ui-focus-ring-width',
        default: '--ui-focus-ring-width → --units-2xs',
      },
    ],
  },
};

const section = (
  docId: string,
  title: string,
  name: string,
  heading: string | null,
  text: string,
  source: string,
): DocSection => {
  const anchor = heading ? heading.toLowerCase().replace(/\s+/g, '-') : null;
  return {
    id: anchor ? `${docId}#${anchor}` : docId,
    docId,
    anchor,
    title,
    name,
    section: heading,
    text,
    source,
  };
};

const BUTTON_DOC = 'components-ui-actions-ui-button--docs';
const BUTTON_TITLE = 'Components/ui/actions/ui-button';
const BUTTON_MDX = 'packages/ui-kit-react/src/actions/ui-button/ui-button.mdx';

export const FIXTURE_SEARCH_DOCS: SearchDocsManifest = {
  $generatedBy: 'scripts/docs.search.mjs',
  $source: 'storybook/docs, packages/ui-kit-react/src',
  docs: [
    section(BUTTON_DOC, BUTTON_TITLE, 'ui-button', null, "ui-button Bouton d'action.", BUTTON_MDX),
    section(BUTTON_DOC, BUTTON_TITLE, 'ui-button', 'API', 'label level variant', BUTTON_MDX),
    section(
      BUTTON_DOC,
      BUTTON_TITLE,
      'ui-button',
      'Theming',
      `--ui-button-radius Rayon des coins. ${"Épaisseur de l'anneau de focus. ".repeat(30)}`,
      BUTTON_MDX,
    ),
    section(
      'components-ui-navigation-ui-tabs--docs',
      'Components/ui/navigation/ui-tabs',
      'ui-tabs',
      null,
      'ui-tabs Onglets et panneaux.',
      'packages/ui-kit-react/src/navigation/ui-tabs/ui-tabs.mdx',
    ),
    // Cross-cutting page: searchable, but not a component.
    section(
      'foundations-colors--docs',
      'Foundations/Colors',
      'Colors',
      null,
      'Palette de couleurs et jetons sémantiques, en clair et en sombre.',
      'storybook/docs/foundations/colors.mdx',
    ),
  ],
};

/** Mutable, so a test can simulate a missing file. */
export const fixtureFiles = new Map<string, string>([
  ['manifest.json', JSON.stringify(FIXTURE_MANIFEST)],
  ['text-search-docs.json', JSON.stringify(FIXTURE_SEARCH_DOCS)],
]);

export function readFixture(path: string): string {
  const file = [...fixtureFiles.keys()].find((name) => path.endsWith(`/data/${name}`));
  if (!file) throw Object.assign(new Error(`ENOENT: ${path}`), { code: 'ENOENT' });
  return fixtureFiles.get(file) as string;
}

export function payloadOf(result: { content: { type: string; text?: string }[] }) {
  const [block] = result.content;
  if (block?.type !== 'text' || block.text === undefined) throw new Error('Réponse sans texte.');
  return JSON.parse(block.text);
}
