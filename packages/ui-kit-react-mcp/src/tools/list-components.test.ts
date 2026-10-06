import { describe, expect, test, vi } from 'vitest';

import { payloadOf } from '../test-fixtures';

vi.mock('node:fs', async () => ({ readFileSync: (await import('../test-fixtures')).readFixture }));

const { listComponents } = await import('./list-components');

describe('listComponents', () => {
  test('donne pour chaque composant sa famille, son import et son résumé', () => {
    const payload = payloadOf(listComponents());

    expect(payload.kitVersion).toBe('9.9.9');
    expect(payload.count).toBe(3);
    expect(payload.components[0]).toEqual({
      name: 'ui-button',
      category: 'actions',
      import: '@4sh/ui-kit-react/ui-button',
      summary: "Bouton d'action.",
    });
  });

  test("n'expose pas l'API dans le catalogue", () => {
    const payload = payloadOf(listComponents());
    expect(payload.components[0]).not.toHaveProperty('exports');
  });

  test('filtre par famille', () => {
    const payload = payloadOf(listComponents('actions'));
    expect(payload.components.map((c: { name: string }) => c.name)).toEqual([
      'ui-button',
      'ui-button-split',
    ]);
  });

  test('une famille inconnue est une erreur qui liste les familles', () => {
    const result = listComponents('widgets');
    expect(result.isError).toBe(true);
    expect(payloadOf(result).categories).toEqual(['actions', 'navigation']);
  });
});
