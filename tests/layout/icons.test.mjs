import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { ICONS } from '../../src/layout/icons.ts';

test('every sidebar entry in the demo registry has an icon', () => {
  const registry = JSON.parse(
    readFileSync(
      new URL('../../fixtures/portal-registry.json', import.meta.url),
      'utf8',
    ),
  );
  const ids = registry.portals.flatMap((portal) =>
    portal.navigation.map((item) => item.id),
  );
  const missing = ids.filter((id) => !ICONS[id]);
  assert.deepEqual(missing, []);
});
