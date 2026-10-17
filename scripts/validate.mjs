import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../src/site-config.mjs';
import { releases } from '../src/release-manifest.mjs';
import { activeRelease, distributionErrors } from '../src/distribution.mjs';
import { appcastErrors } from '../src/appcast.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const origin = site.origin;
const basePath = site.basePath;
const siteFolder = basePath.slice(1);
const failures = [...distributionErrors(site, releases), ...appcastErrors(releases)];
const requiredPages = [
  'index.html', 'privacy/index.html', 'support/index.html',
  'zh/index.html', 'zh/privacy/index.html', 'zh/support/index.html'
].map(page => `${siteFolder}/${page}`).concat('404.html');

async function exists(path) {
  try { return (await stat(path)).isFile(); } catch { return false; }
}

async function allFiles(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => entry.isDirectory()
    ? allFiles(join(folder, entry.name)) : [join(folder, entry.name)]));
  return files.flat();
}

function attrs(tag) {
  const result = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)) {
    result[match[1].toLowerCase()] = match[3];
  }
  return result;
}

function fileURL(file) {
  const path = `/${relative(dist, file).split(sep).join('/')}`;
  return new URL(path.replace(/index\.html$/, ''), origin);
}

async function findTarget(url) {
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return null; }
  const target = resolve(dist, `.${pathname}`);
  if (target !== dist && !target.startsWith(`${dist}${sep}`)) return null;
  const candidates = pathname.endsWith('/')
    ? [join(target, 'index.html')]
    : [target, `${target}.html`, join(target, 'index.html')];
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  return null;
}

async function checkReference(value, file, label) {
  if (!value || /^(mailto:|tel:|data:|blob:)/i.test(value)) return;
  if (/^javascript:/i.test(value)) {
    failures.push(`${label}: javascript: URL is not allowed`);
    return;
  }
  let url;
  try { url = new URL(value.replaceAll('&amp;', '&'), fileURL(file)); }
  catch { failures.push(`${label}: invalid URL ${value}`); return; }
  if (url.origin !== origin) return;
  if (!value.startsWith('#') && !url.pathname.startsWith(`${basePath}/`)) {
    failures.push(`${label}: local URL escapes ${basePath}/: ${url.pathname}`);
    return;
  }
  if (activeRelease(site, releases) && releases.some(release => url.pathname === `${basePath}/downloads/${release.filename}`) && !url.search) return;
  const target = await findTarget(url);
  if (!target) { failures.push(`${label}: missing local target ${url.pathname}`); return; }
  if (url.hash.length > 1 && extname(target) === '.html') {
    const targetHTML = await readFile(target, 'utf8');
    let anchor;
    try { anchor = decodeURIComponent(url.hash.slice(1)); } catch { anchor = url.hash.slice(1); }
    const ids = new Set([...targetHTML.matchAll(/\bid\s*=\s*(["'])(.*?)\1/gs)].map(match => match[2]));
    if (!ids.has(anchor)) failures.push(`${label}: missing fragment ${url.pathname}${url.hash}`);
  }
}

for (const page of requiredPages) {
  if (!await exists(join(dist, page))) failures.push(`Missing page: ${page}`);
}
for (const name of [`${siteFolder}/robots.txt`, `${siteFolder}/sitemap.xml`, '_headers']) {
  if (!await exists(join(dist, name))) failures.push(`Missing publishing file: ${name}`);
}

let files = [];
try { files = await allFiles(dist); }
catch { failures.push('No build output: run npm run build first.'); }
for (const file of files) {
  const name = relative(dist, file).split(sep).join('/');
  if (!name.startsWith(`${siteFolder}/`) && !['404.html', '_headers'].includes(name)) {
    failures.push(`Unexpected file outside ${basePath}/: ${name}`);
  }
}

for (const file of files.filter(file => extname(file) === '.css')) {
  const css = await readFile(file, 'utf8');
  for (const match of css.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)) {
    await checkReference(match[1], file, `${relative(dist, file)} url`);
  }
}

for (const file of files.filter(file => extname(file) === '.html')) {
  const html = await readFile(file, 'utf8');
  const label = relative(dist, file);
  if (!/<title>\s*[^<]+<\/title>/i.test(html)) failures.push(`${label}: missing page title`);
  if (!/<html\b[^>]*\blang\s*=/i.test(html)) failures.push(`${label}: missing document language`);
  const metadata = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => attrs(match[0]));
  if (!metadata.some(meta => meta.name === 'description' && meta.content?.trim())) {
    failures.push(`${label}: missing meta description`);
  }
  if (!metadata.some(meta => meta.name === 'viewport')) failures.push(`${label}: missing viewport`);
  if (!label.endsWith('404.html')) {
    const canonical = [...html.matchAll(/<link\b[^>]*>/gi)]
      .map(match => attrs(match[0])).find(link => link.rel === 'canonical');
    if (canonical?.href !== fileURL(file).href) failures.push(`${label}: canonical URL must be ${fileURL(file).href}`);
  }
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!Object.hasOwn(attrs(match[0]), 'alt')) failures.push(`${label}: image is missing alt text`);
  }
  for (const match of html.matchAll(/<(?:a|link|img|script|source|video|use)\b[^>]*>/gi)) {
    const attributes = attrs(match[0]);
    for (const key of ['href', 'src', 'poster', 'xlink:href']) {
      if (Object.hasOwn(attributes, key)) await checkReference(attributes[key], file, `${label} ${key}`);
    }
  }
  if (/test\.checkout\.dodopayments\.com/.test(html)) failures.push(`${label}: test checkout must not appear in public build output`);
  if (/example\.com|YOUR[_-](?:DOMAIN|EMAIL)|\bPLACEHOLDER\b/.test(html)) {
    failures.push(`${label}: contains a publishing placeholder`);
  }
}

if (await exists(join(dist, '_headers'))) {
  const headers = await readFile(join(dist, '_headers'), 'utf8');
  for (const header of ['Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy']) {
    if (!new RegExp(`^\\s+${header}:`, 'im').test(headers)) failures.push(`_headers: missing ${header}`);
  }
  if (/\bunsafe-eval\b/.test(headers)) failures.push('_headers: unsafe-eval is unnecessary for this static website');
}

if (failures.length) {
  console.error(`Website validation failed (${failures.length}):\n${failures.map(item => `- ${item}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Website validation passed: ${files.filter(file => extname(file) === '.html').length} HTML pages, local links, metadata, assets, and security headers.`);
}
