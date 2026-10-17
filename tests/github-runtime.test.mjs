import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const bytes = new TextEncoder().encode('ReDraw GitHub download integration fixture');
const record = {
  version: '0.0.1', filename: 'ReDraw-0.0.1-1-universal.dmg',
  sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length,
  github: { repository: 'sinofolks/website', tag: 'v0.0.1', assetID: 123, published: true, verified: true },
  notarized: true, stapled: true, testDistribution: false,
  sparkle: { build: '1', minimumSystemVersion: '14.0.0', edSignature: Buffer.alloc(64, 1).toString('base64'), publishedAt: '2026-10-12T12:00:00Z', releaseNotes: 'A local runtime test.' },
};
const config = { origin: 'https://www.sinofolks.com', basePath: '/redraw', distribution: { status: 'ready', releaseVersion: record.version } };
const url = `${config.origin}/redraw/downloads/${record.filename}`;
const destination = `https://github.com/sinofolks/website/releases/download/v0.0.1/${record.filename}`;
async function runtime(manifest = [record]) {
  const sources = await Promise.all(['worker.mjs', 'distribution.mjs', 'appcast.mjs'].map(async path => ({
    type: 'ESModule', path, contents: await readFile(new URL(`../src/${path}`, import.meta.url), 'utf8'),
  })));
  return new Miniflare(convertV4MiniflareOptions({
    compatibilityDate: '2026-10-07',
    modules: [
      ...sources,
      { type: 'ESModule', path: 'site-config.mjs', contents: `export const site=${JSON.stringify(config)}` },
      { type: 'ESModule', path: 'release-manifest.mjs', contents: `export const releases=${JSON.stringify(manifest)}` },
    ],
    // No R2 bucket, authenticated GitHub token, or outbound network fixture.
  }));
}

// Actual workerd Fetch/Response routing, without following external redirects.
// This never connects to GitHub/Cloudflare or creates a public release.
test('workerd serves canonical GitHub redirects and Sparkle metadata without R2', async () => {
  const mf = await runtime();
  try {
    for (const method of ['GET', 'HEAD']) {
      const response = await mf.dispatchFetch(url, { method, redirect: 'manual', headers: { Range: 'bytes=7-14' } });
      assert.equal(response.status, 307);
      assert.equal(response.headers.get('Location'), destination);
      assert.equal(response.headers.get('X-Checksum-SHA256'), record.sha256);
      assert.equal(response.headers.get('Cache-Control'), 'public, max-age=300, must-revalidate, no-transform');
      assert.equal(response.headers.get('Content-Range'), null);
      assert.equal(response.headers.get('ETag'), null);
      assert.equal(await response.text(), '');
    }
    const latest = await mf.dispatchFetch(`${config.origin}/redraw/downloads/latest`, { redirect: 'manual' });
    assert.equal(latest.status, 302);
    assert.equal(latest.headers.get('Location'), `/redraw/downloads/${record.filename}`);
    assert.equal(latest.headers.get('Cache-Control'), 'no-store');
    const feed = await mf.dispatchFetch(`${config.origin}/redraw/updates/appcast.xml`);
    assert.equal(feed.status, 200);
    assert.equal(feed.headers.get('Content-Type'), 'application/rss+xml; charset=utf-8');
    const xml = await feed.text();
    assert.match(xml, /<sparkle:version>1<\/sparkle:version>/);
    assert.ok(xml.includes(`url="${url}"`));
    assert.ok(xml.includes(`sparkle:edSignature="${record.sparkle.edSignature}"`));
    const feedHead = await mf.dispatchFetch(`${config.origin}/redraw/updates/appcast.xml`, { method: 'HEAD' });
    assert.equal(feedHead.status, 200);
    assert.equal(await feedHead.text(), '');
    for (const suffix of [
      '?url=https://attacker.example', '/extra',
    ]) {
      const response = await mf.dispatchFetch(`${url}${suffix}`, { redirect: 'manual' });
      assert.equal(response.status, 404);
      assert.equal(response.headers.get('Location'), null);
    }
    for (const path of ['/redraw/downloads/..%2fprivate', '/redraw/downloads/%52eDraw-0.0.1-1-universal.dmg']) {
      assert.equal((await mf.dispatchFetch(`${config.origin}${path}`, { redirect: 'manual' })).status, 404);
    }
    const post = await mf.dispatchFetch(url, { method: 'POST', redirect: 'manual' });
    assert.equal(post.status, 405);
    assert.equal(post.headers.get('Allow'), 'GET, HEAD');
  } finally { await mf.dispose(); }
});

test('workerd fails closed for foreign, draft, unverified, test and malformed manifests', async () => {
  const manifests = [
    [{ ...record, github: { ...record.github, repository: 'attacker/website' } }],
    [{ ...record, github: { ...record.github, published: false } }],
    [{ ...record, github: { ...record.github, verified: false } }],
    [{ ...record, filename: 'ReDraw-0.0.1-1-test-universal.dmg', testDistribution: true }],
    [{ ...record, github: { ...record.github, tag: '../v0.0.1' } }],
    [null],
  ];
  for (const manifest of manifests) {
    const mf = await runtime(manifest);
    try {
      const response = await mf.dispatchFetch(url, { redirect: 'manual' });
      assert.equal(response.status, 404, JSON.stringify(manifest));
      assert.equal(response.headers.get('Location'), null);
      assert.equal(response.headers.get('X-Checksum-SHA256'), null);
      const appcast = await mf.dispatchFetch(`${config.origin}/redraw/updates/appcast.xml`);
      assert.equal(appcast.status, 503);
      assert.equal(appcast.headers.get('Cache-Control'), 'no-store');
    } finally { await mf.dispose(); }
  }
});

test('deploy configuration does not require or provision an R2 bucket', async () => {
  const wrangler = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assert.equal(wrangler.r2_buckets, undefined);
  assert.ok(wrangler.assets.run_worker_first.includes('/redraw/downloads'));
  assert.ok(wrangler.assets.run_worker_first.includes('/redraw/downloads/*'));
});
