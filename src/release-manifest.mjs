// Public downloads are an explicit allowlist of sinofolks/website release assets.
// Add only a signed, notarized, stapled production DMG after verifying anonymous
// GitHub downloads against the local receipt's complete SHA-256 and byte count.
// github: { repository: 'sinofolks/website', tag: 'vX.Y.Z', assetID: 123,
//           published: true, verified: true }. Prepared/draft assets fail closed.
// See RELEASING.md for verification and publication steps.
export const releases = [];
