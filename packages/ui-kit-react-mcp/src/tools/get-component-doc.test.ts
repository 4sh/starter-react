import { describe, expect, test, vi } from 'vitest';

import { payloadOf } from '../test-fixtures';

vi.mock('node:fs', async () => ({ readFileSync: (await import('../test-fixtures')).readFixture }));

const { getComponentDoc } = await import('./get-component-doc');

describe('getComponentDoc', () => {
  test("rend l'import, l'API, les hooks et la doc d'un composant", () => {
    const result = getComponentDoc('ui-button');
    const payload = payloadOf(result);

    expect(result.isError).toBeUndefined();
    expect(payload.import).toBe('@4sh/ui-kit-react/ui-button');
    expect(payload.docUrl).toMatch(/\?path=\/docs\/components-ui-actions-ui-button--docs$/);
    expect(payload.api.components[0].props[1]).toEqual({
      name: 'level',
      type: 'UiLevel',
      values: ['high', 'low'],
      required: false,
      default: "'high'",
    });
    expect(payload.api.types).toContainEqual({
      name: 'ButtonVariant',
      definition: "'filled' | 'outlined' | 'ghost'",
    });
    expect(payload.theming.cssHooks).toEqual([
      { name: '--ui-button-radius', role: 'Rayon des coins.', fallback: '--radius-sm' },
    ]);
    expect(payload.doc.sections.map((s: { section: string }) => s.section)).toEqual([
      'Présentation',
      'API',
      'Theming',
    ]);
  });

  test('dit où poser un hook --ui-*', () => {
    const payload = payloadOf(getComponentDoc('ui-button'));
    expect(payload.theming.note).toMatch(/:root/);
  });

  test('include ne rend que les parties demandées', () => {
    const payload = payloadOf(getComponentDoc('ui-button', ['api']));

    expect(payload).toHaveProperty('api');
    expect(payload).not.toHaveProperty('theming');
    expect(payload).not.toHaveProperty('doc');
    expect(payload.import).toBe('@4sh/ui-kit-react/ui-button');
  });

  test("accepte le nom React d'un export", () => {
    expect(payloadOf(getComponentDoc('UiTabPanel')).name).toBe('ui-tabs');
  });

  test('un composant inconnu est une erreur, avec des pistes', () => {
    const result = getComponentDoc('ui-butto');
    const payload = payloadOf(result);

    expect(result.isError).toBe(true);
    expect(payload.error).toMatch(/ui-butto/);
    expect(payload.suggestions).toEqual(['ui-button', 'ui-button-split']);
    expect(payload.available).toEqual(['ui-button', 'ui-tabs', 'ui-button-split']);
  });
});
