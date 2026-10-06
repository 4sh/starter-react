import { describe, expect, test, vi } from 'vitest';

import { payloadOf } from '../test-fixtures';

vi.mock('node:fs', async () => ({ readFileSync: (await import('../test-fixtures')).readFixture }));

const { searchDocs } = await import('./search-docs');

type Result = { name: string; section: string | null; excerpt: string; docUrl: string };

describe('searchDocs', () => {
  test("trouve une section par un terme qui n'est que dans son texte", () => {
    const { results } = payloadOf(searchDocs('anneau de focus'));
    expect(results.some((r: Result) => r.name === 'ui-button' && r.section === 'Theming')).toBe(
      true,
    );
  });

  test("classe un nom de composant au-dessus d'une mention dans le texte", () => {
    const { results } = payloadOf(searchDocs('tabs'));
    expect(results[0].name).toBe('ui-tabs');
  });

  test('cherche aussi dans les pages transverses', () => {
    const { results } = payloadOf(searchDocs('sombre'));
    expect(results[0].name).toBe('Colors');
  });

  test('chaque résultat porte le lien de sa page Storybook', () => {
    const { results } = payloadOf(searchDocs('anneau'));
    expect(results[0].docUrl).toBe(
      'https://4sh.github.io/starter-react/?path=/docs/components-ui-actions-ui-button--docs',
    );
  });

  test('respecte la limite', () => {
    expect(payloadOf(searchDocs('ui', 1)).results).toHaveLength(1);
  });

  test('ne rend rien pour une requête sans correspondance', () => {
    expect(payloadOf(searchDocs('zzz-terme-inexistant-zzz'))).toMatchObject({
      count: 0,
      results: [],
    });
  });

  test('tronque les extraits à 400 caractères', () => {
    for (const r of payloadOf(searchDocs('anneau')).results as Result[]) {
      expect(r.excerpt.length).toBeLessThanOrEqual(400);
    }
  });
});
