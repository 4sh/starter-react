import { describe, expect, test, vi } from 'vitest';

import { FIXTURE_MANIFEST, payloadOf } from '../test-fixtures';

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
    expect(payload.theming.cssHooks).toEqual(
      FIXTURE_MANIFEST.components.find((c) => c.name === 'ui-button')?.cssHooks,
    );
    expect(payload.doc.sections.map((s: { section: string }) => s.section)).toEqual([
      'Présentation',
      'API',
      'Theming',
    ]);
  });

  test('dit quels hooks vont sur :root, et pourquoi pas les autres', () => {
    const payload = payloadOf(getComponentDoc('ui-button'));
    expect(payload.theming.note).toMatch(/Seul un hook `themable` va sur\s+`:root`/);
    expect(payload.theming.note).toMatch(/perVariant/);
    const radius = payload.theming.cssHooks.find(
      (h: { name: string }) => h.name === '--ui-button-radius',
    );
    expect(radius).toMatchObject({ themable: false, exclusion: 'perVariant', defaults: 2 });
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
