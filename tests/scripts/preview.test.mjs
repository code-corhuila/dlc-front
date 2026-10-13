import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('preview configures a same-origin proxy for Billing portal assets', async () => {
  const source = await readFile(
    new URL('../../scripts/preview.mjs', import.meta.url),
    'utf8',
  );

  assert.match(source, /BILLING_ORIGIN/);

  assert.match(source, /\/portals\/billing\//);
});
