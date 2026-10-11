import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthPort } from '../../fixtures/dev-auth.js';

test('demo Auth permits only listed staff and keeps writes unavailable', async () => {
  const admin = createAuthPort();
  await assert.rejects(
    admin.complete({
      operationId: 'AuthLogin',
      body: { email: 'admin@demo.test', password: 'wrong' },
    }),
  );
  await admin.complete({
    operationId: 'AuthLogin',
    body: { email: 'admin@demo.test', password: 'Demo1234!' },
  });
  const staff = await admin.demoFetch('/api/v1/auth/staff?page=1&limit=20', {
    method: 'GET',
  });
  assert.equal((await staff.json()).meta.total, 5);
  assert.equal(
    (await admin.demoFetch('/api/v1/auth/register', { method: 'POST' })).status,
    503,
  );
  const dentist = createAuthPort();
  await dentist.complete({
    operationId: 'AuthLogin',
    body: { email: 'odontologo@demo.test', password: 'Demo1234!' },
  });
  assert.equal(
    (await dentist.demoFetch('/api/v1/auth/staff', { method: 'GET' })).status,
    403,
  );
  const sessions = await dentist.demoFetch(
    '/api/v1/auth/sessions?page=1&limit=20',
    { method: 'GET' },
  );
  assert.equal((await sessions.json()).data.length, 2);
});
