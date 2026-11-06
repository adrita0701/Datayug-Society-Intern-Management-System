// End-to-end API test against a throwaway JSON database.
// Usage: npm test   (never touches data.json or your real database)
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ims-test-'));
process.env.JWT_SECRET = 'test-secret';
const { connectStore } = await import('./backend/store.js');
const { createApp } = await import('./server.js');

const store = await connectStore({ DATA_FILE: path.join(tmp, 'db.json'), SEED_FILE: '' });
const server = (await createApp(store)).listen(0);
const base = `http://127.0.0.1:${server.address().port}/api`;

async function call(method, url, { token, json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + url, { method, headers, body: json ? JSON.stringify(json) : form });
  const type = res.headers.get('content-type') || '';
  return { status: res.status, body: type.includes('json') ? await res.json() : await res.arrayBuffer() };
}

let step = 0;
const ok = (msg) => console.log(`${++step}. ✓ ${msg}`);

try {
  assert.equal((await call('GET', '/health')).body.status, 'ok');
  ok('health check');

  assert.equal((await call('GET', '/admin/exists')).body.exists, false);
  const reg = await call('POST', '/admin/register', { json: { email: 'Admin@Test.org', password: 'adminpass123' } });
  assert.equal(reg.status, 201);
  const admin = reg.body.token;
  assert.equal(reg.body.user.password, undefined, 'password hash must not leak');
  ok('first admin registered');

  assert.equal((await call('POST', '/admin/register', { json: { email: 'x@y.org', password: 'whatever123' } })).status, 403);
  ok('second admin rejected');

  assert.equal((await call('POST', '/admin/login', { json: { email: 'admin@test.org', password: 'wrong' } })).status, 401);
  assert.equal((await call('POST', '/admin/login', { json: { email: 'admin@test.org', password: 'adminpass123' } })).status, 200);
  ok('admin login (case-insensitive email, wrong password rejected)');

  const ireg = await call('POST', '/intern/register', {
    json: { fullName: 'John Doe', email: 'john@example.com', password: 'password123', college: 'NIT', department: 'CS', phone: '123' },
  });
  assert.equal(ireg.status, 201);
  const intern = ireg.body.token;
  const internId = ireg.body.user._id;
  assert.equal((await call('POST', '/intern/register', { json: { fullName: 'J', email: 'john@example.com', password: 'password123' } })).status, 409);
  ok('intern registered, duplicate email rejected');

  assert.equal((await call('GET', '/admin/interns', { token: intern })).status, 403);
  assert.equal((await call('GET', '/admin/interns')).status, 401);
  ok('admin routes protected');

  const form = new FormData();
  form.append('title', 'Setup schemas');
  form.append('description', 'Create models');
  form.append('deadline', '2030-01-01');
  form.append('intern', internId);
  form.append('images', new Blob([Buffer.from('fake-png')], { type: 'image/png' }), 'brief.png');
  const created = await call('POST', '/admin/tasks', { token: admin, form });
  assert.equal(created.status, 201);
  const taskId = created.body._id;
  assert.equal(created.body.images.length, 1);
  ok('task created with an attachment');

  const img = await call('GET', `/files/${created.body.images[0]._id}`);
  assert.equal(Buffer.from(img.body).toString(), 'fake-png');
  ok('attachment downloadable');

  const mine = await call('GET', '/intern/tasks', { token: intern });
  assert.equal(mine.body.length, 1);
  ok('intern sees assigned task');

  assert.equal((await call('PUT', `/intern/tasks/${taskId}/status`, { token: intern, json: { status: 'Completed' } })).status, 400);
  assert.equal((await call('PUT', `/intern/tasks/${taskId}/status`, { token: intern, json: { status: 'In Progress' } })).body.status, 'In Progress');
  ok('intern can start but not complete a task');

  const sub = new FormData();
  sub.append('submissionNote', 'Done — see file');
  sub.append('documents', new Blob(['report']), 'report.txt');
  const submitted = await call('POST', `/intern/tasks/${taskId}/submit`, { token: intern, form: sub });
  assert.equal(submitted.body.status, 'Submitted');
  assert.equal(submitted.body.documents.length, 1);
  ok('intern submitted work');

  const other = await call('POST', '/intern/register', { json: { fullName: 'Eve', email: 'eve@example.com', password: 'password123' } });
  assert.equal((await call('PUT', `/intern/tasks/${taskId}/status`, { token: other.body.token, json: { status: 'Pending' } })).status, 404);
  ok('interns cannot touch other interns’ tasks');

  assert.equal((await call('PUT', `/admin/tasks/${taskId}`, { token: admin, json: { status: 'Completed' } })).body.status, 'Completed');
  const stats = (await call('GET', '/admin/stats', { token: admin })).body;
  assert.deepEqual([stats.interns, stats.tasks, stats.byStatus.Completed], [2, 1, 1]);
  ok('admin approved task, stats correct');

  assert.equal((await call('DELETE', `/admin/interns/${internId}`, { token: admin })).status, 200);
  assert.equal((await call('GET', '/admin/tasks', { token: admin })).body.length, 0);
  assert.equal(await store.count('files'), 0);
  ok('deleting an intern removes their tasks and files');

  console.log('\nAll tests passed.');
} catch (err) {
  console.error('\nTest failed:', err);
  process.exitCode = 1;
} finally {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
