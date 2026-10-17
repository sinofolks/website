// One public distribution repository; incoming URLs never select a repository.
export const releaseRepository = 'sinofolks/website';
const recordObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const stableVersion = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?![\s\S])/;

// Shared checks for the page builder, download Worker and Sparkle feed. The
// publisher emits verified/published only after anonymous remote byte validation.
// A signed local candidate alone cannot become a public download.
export function releaseErrors(releases) {
  if (!Array.isArray(releases)) return ['Release manifest must be an array'];
  const errors = [], names = new Set(), versions = new Set();
  for (const release of releases) {
    if (!recordObject(release)) { errors.push('Invalid release record'); continue; }
    const validVersion = typeof release.version === 'string' && stableVersion.test(release.version);
    if (!validVersion) errors.push('Invalid production release version');
    const filenamePattern = validVersion ? new RegExp(`^ReDraw-${release.version.replaceAll('.', '\\.')}(-[1-9]\\d*)?(-universal)?\\.dmg(?![\\s\\S])`) : null;
    if (typeof release.filename !== 'string' || !filenamePattern?.test(release.filename)) errors.push('DMG filename must match its production version');
    if (typeof release.sha256 !== 'string' || !/^[a-f0-9]{64}(?![\s\S])/.test(release.sha256)) errors.push('Invalid SHA-256');
    if (!Number.isSafeInteger(release.size) || release.size < 1 || release.size >= 2 ** 31) errors.push('Invalid GitHub release asset size');
    const github = release.github;
    if (!recordObject(github) || github.repository !== releaseRepository || github.tag !== `v${release.version}` ||
        !Number.isSafeInteger(github.assetID) || github.assetID < 1 || github.verified !== true || github.published !== true) {
      errors.push('Release needs a published, remotely verified asset in the public GitHub repository');
    }
    if (release.testDistribution !== false) errors.push('Public downloads require a production release');
    if (release.notarized !== true || release.stapled !== true) errors.push('Release is not confirmed notarized and stapled');
    if (names.has(release.filename) || versions.has(release.version)) errors.push('Duplicate release filename or version');
    names.add(release.filename); versions.add(release.version);
  }
  return errors;
}

export function githubReleaseURL(release) {
  if (releaseErrors([release]).length) return null;
  return `https://github.com/${releaseRepository}/releases/download/${release.github.tag}/${release.filename}`;
}

export function activeRelease(site, releases) {
  if (site?.distribution?.status !== 'ready' || releaseErrors(releases).length) return null;
  return releases.find(release => release.version === site.distribution.releaseVersion) ?? null;
}

export function verifiedCheckout(site) {
  const checkout = site?.checkout;
  if (!recordObject(checkout)) return null;
  if (checkout.environment !== 'live' || checkout.verified !== true || !checkout.productId) return null;
  try {
    const url = new URL(checkout.url);
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.dodopayments.com' || url.port || url.username || url.password) return null;
    if (url.pathname !== `/buy/${checkout.productId}` || url.hash) return null;
    // Do not publish links with an embedded customer, coupon, or unverified override.
    if ([...url.searchParams].some(([key, value]) => key !== 'quantity' || value !== '1')) return null;
    return url.href;
  } catch { return null; }
}

export function distributionErrors(site, releases) {
  const errors = releaseErrors(releases);
  if (!['test', 'ready'].includes(site.distribution.status)) errors.push('Distribution status must be test or ready');
  if (!['test', 'live'].includes(site.checkout.environment)) errors.push('Checkout environment must be test or live');
  if (site.distribution.status === 'ready' && !activeRelease(site, releases)) errors.push('Ready distribution needs a verified release');
  if (site.checkout.environment === 'live' && !verifiedCheckout(site)) errors.push('Live checkout needs a verified Dodo product and hosted link');
  if (site.checkout.environment === 'live' && !activeRelease(site, releases)) errors.push('Live checkout needs a downloadable release');
  return errors;
}
