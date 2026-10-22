// Local-only artifact. It is deliberately outside public/ and dist/.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const url = new URL(process.env.REDRAW_TEST_CHECKOUT_URL ?? 'https://invalid.local');
if (url.protocol !== 'https:' || url.hostname !== 'test.checkout.dodopayments.com' ||
    !/^\/buy\/pdt_[A-Za-z0-9]+$/.test(url.pathname) || url.search || url.hash || url.username || url.password || url.port) {
  throw new Error('Set REDRAW_TEST_CHECKOUT_URL to the exact Dodo test product URL; no personal data or query parameters.');
}
const output = new URL('../.review/checkout-test.html', import.meta.url);
await mkdir(new URL('../.review/', import.meta.url), { recursive: true });
await writeFile(output, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>ReDraw — Local checkout review</title><body><main><h1>ReDraw checkout — TEST MODE</h1><p>Local review only. This is not a production purchase and does not issue a production license.</p><p>MCP + Library + Animate Lifetime · planned US$9.99, plus applicable taxes. Existing valid keys cover Animate without another purchase.</p><p><a href="${url.href}" rel="noreferrer">Open Dodo test checkout</a></p><p>Test the receipt, license activation, restart, refresh, and deactivation in the matching test-mode application. A browser success page is not proof of app entitlement.</p></main></body></html>`);
console.log(`Local review only: ${fileURLToPath(output)}`);
