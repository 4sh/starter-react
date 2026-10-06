// Tool names are a Dual-Engine invariant (see `docs/DUAL-ENGINE.md`): never
// rename one on a single stack.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { loadManifest } from './data';
import { GET_COMPONENT_DOC_DESCRIPTION, getComponentDoc, PARTS } from './tools/get-component-doc';
import { GET_SHARED_CONFIG_DESCRIPTION, getSharedConfig } from './tools/get-shared-config';
import { LIST_COMPONENTS_DESCRIPTION, listComponents } from './tools/list-components';
import { SEARCH_DOCS_DESCRIPTION, searchDocs } from './tools/search-docs';

function instructions(version: string, storybookUrl: string): string {
  return [
    `Serveur MCP de @4sh/ui-kit-react ${version} : le Design System 4SH en React, des`,
    'composants headless stylés exclusivement par des jetons de design.',
    '',
    'Démarche :',
    '1. `list_components` pour choisir un composant, ou `search_docs` pour un besoin ou un',
    "   concept. Ne jamais deviner un nom, une prop ou un chemin d'import.",
    '2. `get_component_doc` pour son API exacte : props, valeurs admises, défauts, élément',
    '   natif qui reçoit les attributs restants, hooks `--ui-*`, et sa page de doc.',
    '3. Importer depuis le sous-chemin indiqué, `@4sh/ui-kit-react/ui-<nom>` : la famille',
    "   (`actions`, `forms`…) n'est JAMAIS dans le chemin.",
    '',
    "Mise en place, une fois par application : `import '@4sh/ui-kit-react/styles.css'`, et",
    "l'application enveloppée dans `<UiThemeProvider>` (`@4sh/ui-kit-react/theming`). Le CSS",
    "d'un composant voyage avec lui : rien d'autre à importer.",
    '',
    'Personnaliser sans toucher au CSS du kit : les jetons de design pour les couleurs,',
    "espacements et rayons, puis les hooks `--ui-*` d'un composant pour un réglage local.",
    'Ne jamais surcharger les classes internes du kit.',
    '',
    `Doc humaine : ${storybookUrl}`,
  ].join('\n');
}

export function createServer(): McpServer {
  const { kitVersion, storybookUrl } = loadManifest();

  // The kit's version, not the server's: an agent can match it with the installed kit.
  const server = new McpServer(
    { name: '@4sh/ui-kit-react-mcp', version: kitVersion },
    { instructions: instructions(kitVersion, storybookUrl) },
  );

  server.registerTool(
    'list_components',
    {
      description: LIST_COMPONENTS_DESCRIPTION,
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe('Restreint à une famille : actions, base, forms, informative, layout…'),
      },
    },
    async ({ category }) => listComponents(category),
  );

  server.registerTool(
    'get_component_doc',
    {
      description: GET_COMPONENT_DOC_DESCRIPTION,
      inputSchema: {
        name: z
          .string()
          .describe("Nom du composant (`ui-button`), ou nom React d'un de ses exports (`UiTab`)."),
        include: z
          .array(z.enum(PARTS))
          .optional()
          .describe('Parties à retourner. Par défaut toutes : api, theming, doc.'),
      },
    },
    async ({ name, include }) => getComponentDoc(name, include),
  );

  server.registerTool(
    'search_docs',
    {
      description: SEARCH_DOCS_DESCRIPTION,
      inputSchema: {
        query: z.string().describe('Termes recherchés, en langage naturel ou mots-clés.'),
        limit: z
          .number()
          .int()
          .positive()
          .max(50)
          .optional()
          .describe('Nombre de résultats maximal (10 par défaut).'),
      },
    },
    async ({ query, limit }) => searchDocs(query, limit),
  );

  server.registerTool(
    'get_shared_config',
    { description: GET_SHARED_CONFIG_DESCRIPTION, inputSchema: {} },
    async () => getSharedConfig(),
  );

  return server;
}
