// Public downloads are an explicit allowlist of sinofolks/website release assets.
// Add only a signed, notarized, stapled production DMG after verifying anonymous
// GitHub downloads against the local receipt's complete SHA-256 and byte count.
// github: { repository: 'sinofolks/website', tag: 'vX.Y.Z', assetID: 123,
//           published: true, verified: true }. Prepared/draft assets fail closed.
// See RELEASING.md for verification and publication steps.
export const releases = [
  {
    "version": "0.4.6",
    "filename": "ReDraw-0.4.6-8-universal.dmg",
    "github": {
      "repository": "sinofolks/website",
      "tag": "v0.4.6",
      "assetID": 655035973,
      "verified": true,
      "published": true
    },
    "sha256": "04ba0f53a1187af325e50d4ab043eeccaea23fbe39d4d2f871cdca6680b925d4",
    "size": 40314666,
    "notarized": true,
    "stapled": true,
    "testDistribution": false,
    "sparkle": {
      "build": "8",
      "minimumSystemVersion": "14.0.0",
      "edSignature": "5oqAypsHPqG1FrsciKZUqifDQNlZhgxX0/f0yXJXk78dnyYGKdZcDvfIgjg1aVT0SJ7yI1oFa2X1TAY7pF8BAw==",
      "publishedAt": "2026-10-19T02:06:34Z",
      "releaseNotes": "ReDraw 0.4.6\n\nPanels, popovers, and collapsible sections now open and close with consistent, responsive animations. Motion follows the macOS Reduce Motion preference.\n\nRefined dropdown controls share a consistent design across the app while preserving native macOS menus, keyboard navigation, and accessibility. Compact property controls keep their circular shape.\n\nImproved light and dark appearance across glass panels, and refined the Export layout for smaller windows. Rapid panel switching preserves focus and editing state.\n\nRequires macOS 14 or later. Includes Apple Silicon and Intel binaries."
    }
  },
  {
    "version": "0.4.5",
    "filename": "ReDraw-0.4.5-7-universal.dmg",
    "github": {
      "repository": "sinofolks/website",
      "tag": "v0.4.5",
      "assetID": 652244446,
      "verified": true,
      "published": true
    },
    "sha256": "98e97a636fca7d910559b1e74416153d7d3c352760865308ca0ff8bbc5a14b9f",
    "size": 39979920,
    "notarized": true,
    "stapled": true,
    "testDistribution": false,
    "sparkle": {
      "build": "7",
      "minimumSystemVersion": "14.0.0",
      "edSignature": "0JtBYXSIXcidbpIoXoOaCyW6WqCxBETxKaguftlJeFV5goPAPln5+2QYIVhpogr2k9YlQ1To8cmpYdF4SCbSAA==",
      "publishedAt": "2026-10-18T02:28:33Z",
      "releaseNotes": "Redeem a code in the License window to unlock MCP and Library permanently on up to three Macs.\n\nYour license key is delivered by email, and interrupted redemptions can be resumed safely without issuing a duplicate license. Existing license activation and purchases continue to work as before."
    }
  },
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
