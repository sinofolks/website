import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { appcastErrors, createAppcast, sparkleErrors } from '../src/appcast.mjs';
import { createDownloadWorker } from '../src/worker.mjs';
import { site } from '../src/site-config.mjs';
import { releases } from '../src/release-manifest.mjs';

const origin = 'https://www.sinofolks.com';
const feedPath = '/redraw/updates/appcast.xml';
const bytes = new TextEncoder().encode('A verified release fixture');
function release(version = '0.5.0', build = '6', override = {}) {
  const record = {
    version, filename: `ReDraw-${version}.dmg`, size: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    github: { repository: 'sinofolks/website', tag: `v${version}`, assetID: Number(build), published: true, verified: true },
    notarized: true, stapled: true, testDistribution: false,
    sparkle: { build, minimumSystemVersion: '14.0.0', edSignature: Buffer.alloc(64, 1).toString('base64'), publishedAt: '2026-10-12T12:30:00Z', releaseNotes: 'Save & resume <canvas> safely.\n“Hello” 👋' },
    ...override,
  };
  return record;
}
const current = release();
const config = { origin, basePath: '/redraw', distribution: { status: 'ready', releaseVersion: current.version } };
function request(path = feedPath, init = {}, manifest = [current], settings = config) {
  return createDownloadWorker(settings, manifest).fetch(new Request(`${origin}${path}`, init), {
    ASSETS: { fetch() { throw Error('An update route must never become website HTML'); } },
  });
}
// Parse XML independently of the string emitter. Python is also the release
// tool's runtime; this avoids adding a production dependency for an XML test.
function parseFeed(xml) {
  return JSON.parse(execFileSync('python3', ['-c', `
import sys, json, xml.etree.ElementTree as ET
root = ET.fromstring(sys.stdin.read())
ns = '{http://www.andymatuschak.org/xml-namespaces/sparkle}'
channel = root.find('channel')
print(json.dumps({'tag':root.tag, 'version':root.get('version'), 'items':[
  {'build':i.findtext(ns+'version'), 'version':i.findtext(ns+'shortVersionString'),
   'minimum':i.findtext(ns+'minimumSystemVersion'), 'date':i.findtext('pubDate'),
   'notes':i.findtext('description'), 'format':i.find('description').get(ns+'format') if i.find('description') is not None else None,
   'enclosure':i.find('enclosure').attrib} for i in channel.findall('item')]}))
`], { input: xml, encoding: 'utf8' }));
}

test('checked-in production configuration serves the approved release', async () => {
  const response = await request(feedPath, {}, releases, site);
  assert.equal(response.status, 200);
  const parsed = parseFeed(await response.text());
  assert.equal(parsed.tag, 'rss');
  assert.equal(parsed.version, '2.0');
  const approved = releases.find(record => record.version === site.distribution.releaseVersion);
  assert.ok(approved?.github.verified && approved.github.published);
  assert.equal(parsed.items[0].version, approved.version);
  assert.equal(parsed.items[0].build, approved.sparkle.build);
  assert.equal(parsed.items[0].enclosure.length, String(approved.size));
  assert.equal(parsed.items[0].enclosure['{http://www.andymatuschak.org/xml-namespaces/sparkle}edSignature'], approved.sparkle.edSignature);
});

test('unpublished configuration serves an honest empty XML feed', async () => {
  const response = await request(feedPath, {}, [], { ...site, distribution: { status: 'test', releaseVersion: '' } });
  assert.equal(response.status, 200);
  const parsed = parseFeed(await response.text());
  assert.deepEqual(parsed.items, []);
});

test('feed publishes signed build metadata and escapes plain-text notes without HTML', async () => {
  const response = await request();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'application/rss+xml; charset=utf-8');
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=300, must-revalidate, no-transform');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  const xml = await response.text();
  assert.match(xml, /Save &amp; resume &lt;canvas&gt;/);
  assert.doesNotMatch(xml, /<!DOCTYPE|<!\[CDATA\[/);
  const item = parseFeed(xml).items[0];
  assert.equal(item.build, '6');
  assert.equal(item.version, '0.5.0');
  assert.equal(item.minimum, '14.0.0');
  assert.equal(item.date, 'Mon, 12 Oct 2026 12:30:00 GMT');
  assert.equal(item.notes, current.sparkle.releaseNotes);
  assert.equal(item.format, 'plain-text');
  assert.equal(item.enclosure.url, `${origin}/redraw/downloads/${current.filename}`);
  assert.equal(item.enclosure.length, String(bytes.length));
  assert.equal(item.enclosure['{http://www.andymatuschak.org/xml-namespaces/sparkle}edSignature'], current.sparkle.edSignature);
});

test('HEAD returns feed metadata without returning a body', async () => {
  const get = await request();
  const head = await request(feedPath, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal(head.headers.get('Content-Type'), get.headers.get('Content-Type'));
  assert.equal(head.headers.get('Cache-Control'), get.headers.get('Cache-Control'));
});

test('feeds contain current and older releases, never a staged future build', () => {
  const manifest = [release('0.4.4', '5'), release('0.6.0', '10'), current];
  assert.deepEqual(parseFeed(createAppcast(config, manifest)).items.map(item => item.build), ['6', '5']);
  assert.deepEqual(manifest.map(item => item.version), ['0.4.4', '0.6.0', '0.5.0']);
});

test('invalid or unverified production metadata fails closed and is not cached', async () => {
  for (const record of [
    release('0.5.0', '6', { testDistribution: true }),
    release('0.5.0', '6', { testDistribution: undefined }),
    release('0.5.0', '6', { notarized: false }),
    release('0.5.0', '6', { stapled: false }),
    release('0.5.0', '6', { github: { ...current.github, verified: false } }),
    release('0.5.0', '6', { github: { ...current.github, published: false } }),
    release('0.5.0', '6', { github: { ...current.github, repository: 'other/website' } }),
    null,
    release('0.5.0', '6', { filename: 'ReDraw-0.5.0-test.dmg' }),
  ]) {
    const response = await request(feedPath, {}, [record]);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.doesNotMatch(await response.text(), /<item>|edSignature/);
  }
});

test('Sparkle validation rejects malformed fields, duplicate builds, and XML control characters', () => {
  for (const override of [
    { build: '0' }, { build: '-1' }, { build: '6.0' }, { build: 6 }, { build: '06' },
    { minimumSystemVersion: '14' }, { minimumSystemVersion: '14.0.0<bad>' },
    { edSignature: 'unsigned' }, { edSignature: `${'A'.repeat(85)}B==` },
    { publishedAt: 'not-a-date' }, { publishedAt: '2026-02-30T12:00:00Z' },
    { releaseNotes: 'bad\u0000text' }, { releaseNotes: '\ud800' },
  ]) assert.ok(sparkleErrors({ ...current, sparkle: { ...current.sparkle, ...override } }).length, JSON.stringify(override));
  assert.deepEqual(sparkleErrors({ ...current, sparkle: { ...current.sparkle, publishedAt: '2026-10-12T12:30:00.001Z' } }), []);
  assert.ok(appcastErrors([current, release('0.5.1', '6')]).includes('Duplicate Sparkle build number'));
});

test('an existing manual-only release is never silently treated as Sparkle-signed', () => {
  const manual = { ...current };
  delete manual.sparkle;
  assert.deepEqual(appcastErrors([manual]), []);
  assert.deepEqual(parseFeed(createAppcast(config, [manual])).items, []);
});

test('update routes do not expose arbitrary files, encoded names, query selectors or writable methods', async () => {
  for (const path of ['/redraw/updates', '/redraw/updates/', '/redraw/updates/private.xml', '/redraw/updates/%61ppcast.xml', '/redraw/updates/appcast.xml/extra', `${feedPath}?key=private`, '/redraw/updates/..%2fsecret']) {
    assert.equal((await request(path)).status, 404, path);
  }
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const response = await request(feedPath, { method });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('Allow'), 'GET, HEAD');
  }
});

test('configured HTTPS origin owns enclosure URLs, never incoming host or unsafe configuration', async () => {
  const response = await createDownloadWorker(config, [current]).fetch(new Request(`https://untrusted.example${feedPath}`), {});
  assert.equal(parseFeed(await response.text()).items[0].enclosure.url, `${origin}/redraw/downloads/${current.filename}`);
  for (const value of ['http://www.sinofolks.com', 'https://user@www.sinofolks.com', 'https://www.sinofolks.com/elsewhere', 'https://www.sinofolks.com?target=other']) {
    assert.equal(createAppcast({ ...config, origin: value }, [current]), null);
  }
});

test('Wrangler reserves the complete update namespace before static assets', async () => {
  const wrangler = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assert.ok(wrangler.assets.run_worker_first.includes('/redraw/updates'));
  assert.ok(wrangler.assets.run_worker_first.includes('/redraw/updates/*'));
});
