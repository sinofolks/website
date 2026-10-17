import { activeRelease } from './distribution.mjs';

const xmlEntities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
const xmlText = value => String(value).replace(/[&<>"']/g, character => xmlEntities[character]);
const xmlSafe = value => typeof value === 'string' && !/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/u.test(value);

function validSignature(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]{86}==$/.test(value)) return false;
  try { return atob(value).length === 64 && btoa(atob(value)) === value; } catch { return false; }
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === (value.includes('.') ? value : value.replace('Z', '.000Z'));
}

// Existing download validation owns the artifact hash, verified GitHub asset, size, and
// notarization/stapling checks. These are the additional updater-only fields.
export function sparkleErrors(release) {
  if (!release || typeof release !== 'object' || Array.isArray(release)) return ['Invalid release record'];
  const errors = [], sparkle = release.sparkle;
  if (!sparkle || typeof sparkle !== 'object') return ['Missing Sparkle metadata'];
  if (release.testDistribution !== false || /(?:^|[-_.])test(?:[-_.]|$)/i.test(release.filename ?? '')) errors.push('Sparkle requires a production release');
  if (typeof sparkle.build !== 'string' || !/^[1-9]\d{0,17}$/.test(sparkle.build)) errors.push('Invalid Sparkle build number');
  if (typeof sparkle.minimumSystemVersion !== 'string' || !/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(sparkle.minimumSystemVersion)) errors.push('Invalid minimum macOS version');
  if (!validSignature(sparkle.edSignature)) errors.push('Invalid EdDSA signature');
  if (!validDate(sparkle.publishedAt)) errors.push('Invalid publication date');
  if (sparkle.releaseNotes !== undefined && (!xmlSafe(sparkle.releaseNotes) || sparkle.releaseNotes.length > 20000)) errors.push('Invalid release notes');
  return errors;
}

export function appcastErrors(manifest) {
  if (!Array.isArray(manifest)) return ['Release manifest must be an array'];
  const errors = [], builds = new Set();
  for (const release of manifest) {
    if (!release || typeof release !== 'object' || Array.isArray(release)) { errors.push('Invalid release record'); continue; }
    if (release.sparkle === undefined) continue;
    errors.push(...sparkleErrors(release));
    if (builds.has(release.sparkle?.build)) errors.push('Duplicate Sparkle build number');
    builds.add(release.sparkle?.build);
  }
  return errors;
}

function publicOrigin(config) {
  try {
    const url = new URL(config.origin);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}

export function createAppcast(config, manifest) {
  const origin = publicOrigin(config);
  if (!origin || !/^\/[A-Za-z0-9_-]+$/.test(config.basePath ?? '')) return null;
  const current = activeRelease(config, manifest);
  if (config.distribution.status === 'ready' && (!current || appcastErrors(manifest).length)) return null;
  // The manifest may contain an uploaded future build. Only the active release
  // and compatible older builds are published; no upload alone opens a rollout.
  const eligible = current && !sparkleErrors(current).length
    ? manifest.filter(release => !sparkleErrors(release).length && BigInt(release.sparkle.build) <= BigInt(current.sparkle.build))
      .sort((a, b) => BigInt(a.sparkle.build) > BigInt(b.sparkle.build) ? -1 : 1)
    : [];
  const items = eligible.map(release => {
    const sparkle = release.sparkle;
    return `    <item>
      <title>ReDraw ${xmlText(release.version)}</title>
      <sparkle:version>${sparkle.build}</sparkle:version>
      <sparkle:shortVersionString>${xmlText(release.version)}</sparkle:shortVersionString>
      <sparkle:minimumSystemVersion>${sparkle.minimumSystemVersion}</sparkle:minimumSystemVersion>
      <pubDate>${new Date(sparkle.publishedAt).toUTCString()}</pubDate>${sparkle.releaseNotes ? `\n      <description sparkle:format="plain-text">${xmlText(sparkle.releaseNotes)}</description>` : ''}
      <enclosure url="${xmlText(`${origin}${config.basePath}/downloads/${release.filename}`)}" sparkle:edSignature="${sparkle.edSignature}" length="${release.size}" type="application/octet-stream" />
    </item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle">
  <channel>
    <title>ReDraw Updates</title>
    <link>${xmlText(`${origin}${config.basePath}/`)}</link>
    <description>Updates for the direct-download edition of ReDraw.</description>
    <language>en</language>${items.length ? `\n${items.join('\n')}` : ''}
  </channel>
</rss>
`;
}
