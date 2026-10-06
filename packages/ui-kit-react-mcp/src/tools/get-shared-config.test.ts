import { expect, test, vi } from 'vitest';

import { FIXTURE_MANIFEST, payloadOf } from '../test-fixtures';

vi.mock('node:fs', async () => ({ readFileSync: (await import('../test-fixtures')).readFixture }));

const { getSharedConfig } = await import('./get-shared-config');

test('rend les groupes et les réglages partagés, avec leur hook', () => {
  expect(payloadOf(getSharedConfig())).toEqual(FIXTURE_MANIFEST.sharedConfig);
});
