import { describe, expect, test, vi } from 'vitest';

import { fixtureFiles } from './test-fixtures';

vi.mock('node:fs', async () => ({ readFileSync: (await import('./test-fixtures')).readFixture }));

const { findComponent, getDocSections, suggestComponents } = await import('./data');

describe('findComponent', () => {
  test.each([
    ['ui-button', 'le nom exact'],
    ['UI-Button', 'la casse ignorée'],
    ['button', 'le nom sans préfixe'],
    ['@4sh/ui-kit-react/ui-button', "le sous-chemin d'import"],
    ['UiButton', "le nom React de l'export"],
  ])('retrouve ui-button par %s (%s)', (query) => {
    expect(findComponent(query)?.name).toBe('ui-button');
  });

  test("un sous-composant mène au point d'entrée qui l'exporte", () => {
    expect(findComponent('UiTabPanel')?.name).toBe('ui-tabs');
  });

  test('un nom React composé se lit en kebab-case', () => {
    expect(findComponent('UiButtonSplit')?.name).toBe('ui-button-split');
  });

  test('ne devine pas un composant inexistant', () => {
    expect(findComponent('ui-does-not-exist')).toBeUndefined();
  });
});

describe('suggestComponents', () => {
  test('propose les noms qui contiennent la requête', () => {
    expect(suggestComponents('butto')).toEqual(['ui-button', 'ui-button-split']);
  });

  test('ne propose rien pour une requête vide', () => {
    expect(suggestComponents('ui-')).toEqual([]);
  });
});

describe('getDocSections', () => {
  test("rend les sections d'une page dans l'ordre", () => {
    const sections = getDocSections('components-ui-actions-ui-button--docs');
    expect(sections.map((s) => s.section)).toEqual([null, 'API', 'Theming']);
  });
});

describe('manifeste absent', () => {
  test('échoue en disant quoi lancer, plutôt que sur un ENOENT nu', async () => {
    const manifest = fixtureFiles.get('manifest.json') as string;
    fixtureFiles.delete('manifest.json');
    vi.resetModules();
    try {
      const fresh = await import('./data');
      expect(() => fresh.loadManifest()).toThrow(/manifest\.json.*pnpm mcp:build/s);
    } finally {
      fixtureFiles.set('manifest.json', manifest);
    }
  });
});
