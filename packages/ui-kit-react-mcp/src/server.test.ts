// Through the protocol, with a real MCP client: covers tool registration and
// argument validation, which direct tool calls bypass.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import { payloadOf } from './test-fixtures';

vi.mock('node:fs', async () => ({ readFileSync: (await import('./test-fixtures')).readFixture }));

const { createServer } = await import('./server');

const client = new Client({ name: 'test-agent', version: '0.0.0' });

beforeAll(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([createServer().connect(serverTransport), client.connect(clientTransport)]);
});

afterAll(() => client.close());

const call = async (name: string, args: Record<string, unknown> = {}) =>
  client.callTool({ name, arguments: args }) as Promise<{
    isError?: boolean;
    content: { type: string; text?: string }[];
  }>;

describe('le serveur', () => {
  test('annonce la version du kit documenté', () => {
    expect(client.getServerVersion()).toEqual({ name: '@4sh/ui-kit-react-mcp', version: '9.9.9' });
  });

  test("transmet à l'agent la démarche et la règle du chemin d'import", () => {
    const instructions = client.getInstructions() ?? '';
    expect(instructions).toMatch(/list_components/);
    expect(instructions).toMatch(/@4sh\/ui-kit-react\/ui-<nom>/);
    expect(instructions).toMatch(/UiThemeProvider/);
  });

  test('expose les quatre tools du starter Angular', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'get_component_doc',
      'get_shared_config',
      'list_components',
      'search_docs',
    ]);
  });
});

describe("le parcours d'un agent", () => {
  test("découvre un composant, puis lit de quoi l'utiliser", async () => {
    const catalog = payloadOf(await call('list_components'));
    const button = catalog.components.find((c: { summary: string }) =>
      c.summary.startsWith('Bouton'),
    );

    const doc = payloadOf(await call('get_component_doc', { name: button.name }));

    expect(doc.import).toBe('@4sh/ui-kit-react/ui-button');
    expect(doc.api.components[0].name).toBe('UiButton');
    expect(doc.api.components[0].props.map((p: { name: string }) => p.name)).toContain('level');
  });

  test('passe de la recherche au composant', async () => {
    const search = payloadOf(await call('search_docs', { query: 'onglets', limit: 3 }));
    const doc = payloadOf(
      await call('get_component_doc', { name: search.results[0].name, include: ['api'] }),
    );
    expect(doc.import).toBe('@4sh/ui-kit-react/ui-tabs');
  });
});

describe('les arguments', () => {
  test('une partie inconnue de include est refusée par le schéma', async () => {
    const result = await call('get_component_doc', { name: 'ui-button', include: ['props'] });
    expect(result.isError).toBe(true);
  });

  test('une limite hors bornes est refusée par le schéma', async () => {
    const result = await call('search_docs', { query: 'bouton', limit: 500 });
    expect(result.isError).toBe(true);
  });
});
