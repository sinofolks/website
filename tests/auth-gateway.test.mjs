import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDownloadWorker, isDynamicRoute } from '../src/worker.mjs';

const dynamic = ['/redraw/sign-in', '/redraw/sign-in/', '/redraw/account', '/redraw/auth', '/redraw/auth/oauth2/token', '/redraw/api/v1/me', '/redraw/api/unknown', '/redraw/webhooks/dodo', '/.well-known/oauth-authorization-server/redraw/auth'];
for (const path of dynamic) test(`dynamic route never falls back to HTML: ${path}`, async () => {
  let assets = 0;
  const response = await createDownloadWorker().fetch(new Request(`https://www.sinofolks.com${path}`), { ASSETS: { fetch() { assets++; } } });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(assets, 0);
});
test('gateway preserves exact webhook bytes, public URL, method and backend response', async () => {
  const bytes = new Uint8Array([0, 13, 10, 255, 123, 125]);
  const request = new Request('https://www.sinofolks.com/redraw/webhooks/dodo?x=%2f', { method: 'POST', headers: { 'webhook-signature': 'sig' }, body: bytes });
  const response = new Response('upstream error', { status: 404, headers: { 'Set-Cookie': 'session=one; Secure; HttpOnly' } });
  const result = await createDownloadWorker().fetch(request, { REDRAW_API: { async fetch(forwarded) {
    assert.strictEqual(forwarded, request);
    assert.deepEqual(new Uint8Array(await forwarded.arrayBuffer()), bytes);
    assert.equal(forwarded.url, 'https://www.sinofolks.com/redraw/webhooks/dodo?x=%2f');
    return response;
  } } });
  assert.strictEqual(result, response);
});
test('gateway failure is a noncacheable 503 without internal details', async () => {
  const response = await createDownloadWorker().fetch(new Request('https://www.sinofolks.com/redraw/account'), { REDRAW_API: { fetch() { throw Error('private secret'); } } });
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /private/);
});
test('prefix boundaries and discovery routing do not capture unrelated site pages', () => {
  for (const path of ['/redraw/authors', '/redraw/accounting', '/redraw/downloads/a.dmg', '/.well-known/other', '/.well-known/oauth-authorization-server/other']) assert.equal(isDynamicRoute(path), false);
});
test('Wrangler preserves scoped dynamic routing without an undeployed private API binding', async () => {
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  for (const root of ['/redraw/sign-in', '/redraw/account', '/redraw/auth', '/redraw/api', '/redraw/webhooks']) {
    assert.ok(config.assets.run_worker_first.includes(root));
    assert.ok(config.assets.run_worker_first.includes(`${root}/*`));
  }
  assert.equal(config.services, undefined);
  assert.deepEqual(config.routes, [
    { pattern: 'www.sinofolks.com/redraw/*', zone_name: 'sinofolks.com' },
    { pattern: 'www.sinofolks.com/.well-known/oauth-authorization-server/redraw/auth', zone_name: 'sinofolks.com' },
  ]);
});
