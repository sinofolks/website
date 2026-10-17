// Public downloads are an explicit allowlist of sinofolks/website release assets.
// Add only a signed, notarized, stapled production DMG after verifying anonymous
// GitHub downloads against the local receipt's complete SHA-256 and byte count.
// github: { repository: 'sinofolks/website', tag: 'vX.Y.Z', assetID: 123,
//           published: true, verified: true }. Prepared/draft assets fail closed.
// See RELEASING.md for verification and publication steps.
export const releases = [
  {
    "version": "0.4.4",
    "filename": "ReDraw-0.4.4-6-universal.dmg",
    "github": {
      "repository": "sinofolks/website",
      "tag": "v0.4.4",
      "assetID": 650493887,
      "verified": true,
      "published": true
    },
    "sha256": "a52e60e3264fe945136149d642ead6083e23bdb175e6f4635fddf1cbde1b6c7e",
    "size": 39910747,
    "notarized": true,
    "stapled": true,
    "testDistribution": false,
    "sparkle": {
      "build": "6",
      "minimumSystemVersion": "14.0.0",
      "edSignature": "EYIRVz7mm42OHsP7urkEVIF+Xfy7HAhRlShDBtXKGQCknpljlstk0B4yBLftBPS7/jDAyDo/WGE7VddCpUmHBA==",
      "publishedAt": "2026-10-17T12:59:16Z",
      "releaseNotes": "ReDraw 0.4.4\n\nOrganize canvases in Document Home with previews, search, favorites and pins.\nAutomatic saving and local File History help preserve your work. Browse earlier\nversions, restore one, or create a separate document from a saved version.\n\nInsert LaTeX formulas and Mermaid diagrams directly from the drawing toolbar.\nPreview changes before applying them, follow inline source errors, and revisit\nthe source of existing artwork. Supported flowcharts can become editable shapes.\n\nSave reusable artwork to My Library, find it with tags and favorites, and transfer\nself-contained library packs. Personal library features are free.\n\nThe optional MCP & Library Lifetime license unlocks the local MCP server and\nbundled Library insertion on up to 3 Macs. Drawing, saving and PNG/PDF export\nremain free. AI subscriptions, model usage and credits are not included.\n\nRequires macOS 14 or later. Includes Apple Silicon and Intel binaries."
    }
  }
];
