import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
delete process.env.DATABASE_URL;
delete process.env.JWT_SECRET;
const { default: app } = await import('../src/app.js');
async function withServer(run) {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run('http://127.0.0.1:' + server.address().port); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('health reports server running, database disconnected and demo available', async () => withServer(async base => {
  const response = await fetch(base + '/api/health');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.server, 'running');
  assert.equal(body.database.status, 'not_configured');
  assert.equal(body.demoMode.available, true);
}));
test('patient data routes reject missing authentication', async () => withServer(async base => {
  const response = await fetch(base + '/api/patients/unknown/medications');
  assert.equal(response.status, 401);
}));
test('invalid login input gets a useful validation error before database access', async () => withServer(async base => {
  const response = await fetch(base + '/api/auth/login', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({email:'not-an-email',password:''}) });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /valid email/i);
}));
test('valid login gets a configuration error when database credentials are absent', async () => withServer(async base => {
  const response = await fetch(base + '/api/auth/login', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({email:'patient@example.com',password:'valid-test-password'}) });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /Explore Demo remains available/i);
}));
test('unknown public routes return a safe 404', async () => withServer(async base => {
  const response = await fetch(base + '/missing');
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, 'Route not found');
}));
