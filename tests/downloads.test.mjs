import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createDownloadWorker } from '../src/worker.mjs';
import { activeRelease, githubReleaseURL, releaseErrors, verifiedCheckout, distributionErrors } from '../src/distribution.mjs';

const bytes = new TextEncoder().encode('0123456789');
const release = {
  version: '0.4.3', filename: 'ReDraw-0.4.3.dmg', size: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  github: { repository: 'sinofolks/website', tag: 'v0.4.3', assetID: 123, published: true, verified: true },
  notarized: true, stapled: true, testDistribution: false,
};
const config = { basePath: '/redraw', distribution: { status: 'ready', releaseVersion: release.version }, checkout: { environment: 'test', url: '', verified: false } };
const path = `/redraw/downloads/${release.filename}`;
const destination = `https://github.com/sinofolks/website/releases/download/v0.4.3/${release.filename}`;
function fixture({ site = config, manifest = [release] } = {}) {
  // There is intentionally no object store, token or fetch dependency. Installers
  // are public GitHub assets; the Worker only emits validated redirects.
  const env = { ASSETS: { fetch: () => new Response('static page') } };
  return {
    async request(url = path, init = {}) { return createDownloadWorker(site, manifest).fetch(new Request(`https://www.sinofolks.com${url}`, init), env); },
  };
}

test('GET redirects to the fixed public release with the verified digest', async () => {
  const response = await fixture().request();
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('Location'), destination);
  assert.equal(response.headers.get('X-Checksum-SHA256'), release.sha256);
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=300, must-revalidate, no-transform');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  assert.equal(await response.text(), '');
  for (const header of ['Content-Length', 'Content-Range', 'Content-Disposition', 'ETag', 'Accept-Ranges']) {
    assert.equal(response.headers.get(header), null, `redirect must not claim file ${header}`);
  }
});

test('HEAD preserves its method through a bodyless redirect without fetching bytes', async () => {
  const response = await fixture().request(path, { method: 'HEAD', headers: { Range: 'bytes=2-4' } });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('Location'), destination);
  assert.equal(await response.text(), '');
  assert.equal(response.headers.get('Content-Length'), null);
});

test('ranges and conditional headers are handled by the destination, not synthetic file responses', async () => {
  for (const headers of [
    { Range: 'bytes=2-4' }, { Range: 'bytes=-3' }, { Range: 'bytes=0-1,4-5' },
    { 'If-None-Match': `"sha256-${release.sha256}"` },
    { Range: 'bytes=2-4', 'If-Range': '"previous-github-etag"' },
  ]) {
    const response = await fixture().request(path, { headers });
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('Location'), destination);
    assert.equal(response.headers.get('Content-Range'), null);
  }
});

test('no active release means no download, including guessed names and latest', async () => {
  const f = fixture({ site: { ...config, distribution: { status: 'test', releaseVersion: '' } } });
  assert.equal((await f.request()).status, 404);
  assert.equal((await f.request('/redraw/downloads/latest')).status, 404);
  assert.equal((await fixture({ manifest: [] }).request()).status, 404);
  assert.equal((await fixture({ site: { ...config, distribution: { status: 'ready', releaseVersion: '9.9.9' } } }).request()).status, 404);
});

test('latest retains the public canonical path and never caches the alias', async () => {
  for (const method of ['GET', 'HEAD']) {
    const response = await fixture().request('/redraw/downloads/latest', { method });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), path);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(await response.text(), '');
  }
});

test('request input cannot choose arbitrary URLs, encoded names or nested release paths', async () => {
  for (const url of [
    '/redraw/downloads/private.txt', '/redraw/downloads', '/redraw/downloads/',
    '/redraw/downloads/%2fsecret', '/redraw/downloads/..%2fsecret',
    '/redraw/downloads/%2e%2e%2fsecret', '/redraw/downloads/https://attacker.example/payload',
    '/redraw/downloads/releases/0.4.3/ReDraw-0.4.3.dmg',
    `${path}?url=https://attacker.example/payload`, `${path}?repository=attacker/repo`,
    '/redraw/downloads/%52eDraw-0.4.3.dmg', '/redraw/downloads/latest?tag=v99.0.0',
  ]) assert.equal((await fixture().request(url)).status, 404, url);
});

test('only GET and HEAD can redirect', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
    const response = await fixture().request(path, { method });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('Allow'), 'GET, HEAD');
    assert.equal(response.headers.get('Location'), null);
  }
});

test('all public download fields fail closed for malformed or unverified records', async () => {
  const overrides = [
    { notarized: false }, { stapled: false }, { testDistribution: true }, { testDistribution: undefined },
    { sha256: '' }, { sha256: 'A'.repeat(64) }, { sha256: `${release.sha256}\n` }, { size: -1 }, { size: 0 }, { size: '10' },
    { size: 2 ** 31 }, { size: Number.MAX_SAFE_INTEGER + 1 }, { version: '0.4.3-beta' },
    { version: '00.4.3' }, { version: '0.4.3\n' }, { version: null }, { filename: 'ReDraw-0.4.3-test.dmg' },
    { filename: '../ReDraw-0.4.3.dmg' }, { filename: 'ReDraw-0.4.3%2f.dmg' },
    { filename: 'ReDraw-9.9.9.dmg' }, { filename: 'ReDraw-0.4.3.dmg\n' }, { filename: 'ReDraw-0.4.3\r\nX-Header: bad.dmg' },
    { github: null }, { github: [] }, { github: {} },
    ...[
      { repository: 'other/website' }, { repository: 'sinofolks/website.evil' },
      { repository: 'sinofolks/website/../../other/repo' }, { repository: 'SINOFOLKS/website' },
      { tag: 'v0.4.4' }, { tag: '../v0.4.3' }, { tag: 'v0.4.3?url=other' },
      { assetID: 0 }, { assetID: -1 }, { assetID: '123' }, { assetID: 1.5 },
      { assetID: Number.MAX_SAFE_INTEGER + 1 }, { verified: false }, { verified: 'true' },
      { published: false }, { published: undefined },
    ].map(github => ({ github: { ...release.github, ...github } })),
  ];
  for (const override of overrides) {
    const record = { ...release, ...override };
    assert.ok(releaseErrors([record]).length, JSON.stringify(override));
    assert.equal(githubReleaseURL(record), null);
    const response = await fixture({ manifest: [record] }).request();
    assert.equal(response.status, 404, JSON.stringify(override));
    assert.equal(response.headers.get('Location'), null);
    assert.equal(response.headers.get('X-Checksum-SHA256'), null);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
  for (const manifest of [null, {}, [null], [[]], [42], [release, release]]) {
    assert.ok(releaseErrors(manifest).length);
    assert.equal((await fixture({ manifest }).request()).status, 404);
  }
});

test('derived target is independent of request host and arbitrary URL fields', async () => {
  const record = { ...release, url: 'https://attacker.example', github: { ...release.github, url: 'https://attacker.example', browser_download_url: 'https://attacker.example' } };
  assert.equal(githubReleaseURL(record), destination);
  const response = await createDownloadWorker(config, [record]).fetch(new Request(`https://attacker.example${path}`), {});
  assert.equal(response.headers.get('Location'), destination);
  const universal = { ...release, filename: 'ReDraw-0.4.3-6-universal.dmg' };
  assert.deepEqual(releaseErrors([universal]), []);
  assert.equal(githubReleaseURL(universal), 'https://github.com/sinofolks/website/releases/download/v0.4.3/ReDraw-0.4.3-6-universal.dmg');
});

test('regular site routes delegate to static assets; paths outside redraw never do', async () => {
  assert.equal(await (await fixture().request('/redraw/zh/support/')).text(), 'static page');
  assert.equal((await fixture().request('/')).status, 404);
});

test('public checkout requires a verified live product and a real release', () => {
  const checkout = { environment: 'live', productId: 'pdt_verified', url: 'https://checkout.dodopayments.com/buy/pdt_verified', verified: true };
  const ready = { ...config, checkout };
  assert.equal(verifiedCheckout(ready), checkout.url);
  assert.deepEqual(distributionErrors(ready, [release]), []);
  for (const override of [{ environment: 'test' }, { verified: false }, { url: 'https://test.checkout.dodopayments.com/buy/pdt_verified' }, { url: `${checkout.url}?email=user@private.com` }, { productId: 'pdt_other' }]) {
    assert.equal(verifiedCheckout({ ...ready, checkout: { ...checkout, ...override } }), null);
  }
  assert.ok(distributionErrors(ready, []).length);
  assert.equal(activeRelease({ ...ready, distribution: { status: 'test' } }, [release]), null);
});
