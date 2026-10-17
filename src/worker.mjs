import { site } from './site-config.mjs';
import { releases } from './release-manifest.mjs';
import { activeRelease, githubReleaseURL } from './distribution.mjs';
import { createAppcast } from './appcast.mjs';

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};

function message(request, text, status, extra = {}) {
  return new Response(request.method === 'HEAD' ? null : `${text}\n`, {
    status, headers: { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  });
}

// These paths are owned by the private API Worker. Unknown descendants remain
// dynamic 404s; a failed authentication or webhook must never become static HTML.
export function isDynamicRoute(path, base = '/redraw') {
  return [`${base}/sign-in`, `${base}/account`, `${base}/auth`, `${base}/api`, `${base}/webhooks`]
    .some(root => path === root || path.startsWith(`${root}/`)) ||
    path === `/.well-known/oauth-authorization-server${base}/auth`;
}

// Factory keeps the same validated release allowlist in local tests and workerd.
export function createDownloadWorker(config = site, manifest = releases) {
  const prefix = `${config.basePath}/downloads/`;
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      const updatesRoot = `${config.basePath}/updates`;
      if (url.pathname === updatesRoot || url.pathname.startsWith(`${updatesRoot}/`)) {
        if (!['GET', 'HEAD'].includes(request.method)) return message(request, 'Method not allowed.', 405, { Allow: 'GET, HEAD' });
        if (url.pathname !== `${updatesRoot}/appcast.xml` || url.search) return message(request, 'Not found.', 404);
        const appcast = createAppcast(config, manifest);
        if (appcast === null) return message(request, 'Updates temporarily unavailable.', 503, { 'Retry-After': '60' });
        return new Response(request.method === 'HEAD' ? null : appcast, {
          headers: {
            ...securityHeaders,
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=300, must-revalidate, no-transform',
          },
        });
      }
      if (isDynamicRoute(url.pathname, config.basePath)) {
        if (!env.REDRAW_API) return message(request, 'ReDraw account service temporarily unavailable.', 503, { 'Retry-After': '60' });
        try {
          // Forward the original Request and Response without cloning body bytes,
          // URL rewriting, cookie flattening, buffering SSE, or static fallback.
          return await env.REDRAW_API.fetch(request);
        } catch {
          return message(request, 'ReDraw account service temporarily unavailable.', 503, { 'Retry-After': '60' });
        }
      }
      if (url.pathname !== prefix.slice(0, -1) && !url.pathname.startsWith(prefix)) {
        if (!url.pathname.startsWith(`${config.basePath}/`)) return message(request, 'Not found.', 404);
        return env.ASSETS.fetch(request);
      }
      if (!['GET', 'HEAD'].includes(request.method)) return message(request, 'Method not allowed.', 405, { Allow: 'GET, HEAD' });
      // Reject percent-encoded separators, names, dot paths and any query-string
      // parameters. The URL must match one literal allowlisted release filename.
      if (url.search || url.pathname.includes('%') || url.pathname.includes('\\')) return message(request, 'Not found.', 404);
      const current = activeRelease(config, manifest);
      if (!current) return message(request, 'The public download is not available yet.', 404);
      if (url.pathname === `${prefix}latest`) {
        return new Response(null, { status: 302, headers: { ...securityHeaders, Location: `${prefix}${current.filename}`, 'Cache-Control': 'no-store' } });
      }
      const release = manifest.find(item => url.pathname === `${prefix}${item.filename}`);
      if (!release) return message(request, 'Not found.', 404);
      const destination = githubReleaseURL(release);
      if (!destination) return message(request, 'Download temporarily unavailable.', 503, { 'Retry-After': '60' });
      // GitHub serves the installer, conditional requests and byte ranges. This
      // redirect does not claim to be the file body (no file Content-Length,
      // Content-Disposition, ETag or synthetic 304). A short cache permits
      // revocation; the mutable latest alias above remains uncached.
      return new Response(null, {
        status: 307,
        headers: {
          ...securityHeaders,
          Location: destination,
          'X-Checksum-SHA256': release.sha256,
          'Cache-Control': 'public, max-age=300, must-revalidate, no-transform',
        },
      });
    },
  };
}

export default createDownloadWorker();
