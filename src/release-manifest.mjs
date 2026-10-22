// Public downloads are an explicit allowlist of sinofolks/website release assets.
// Add only a signed, notarized, stapled production DMG after verifying anonymous
// GitHub downloads against the local receipt's complete SHA-256 and byte count.
// github: { repository: 'sinofolks/website', tag: 'vX.Y.Z', assetID: 123,
//           published: true, verified: true }. Prepared/draft assets fail closed.
// See RELEASING.md for verification and publication steps.
export const releases = [
  {
    "version": "0.4.10",
    "filename": "ReDraw-0.4.10-12-universal.dmg",
    "github": {
      "repository": "sinofolks/website",
      "tag": "v0.4.10",
      "assetID": 665511783,
      "verified": true,
      "published": true
    },
    "sha256": "6923d688481fa20270dd123db1c172bab47e5077734aa8ef1bbe0580eab77143",
    "size": 41051409,
    "notarized": true,
    "stapled": true,
    "testDistribution": false,
    "sparkle": {
      "build": "12",
      "minimumSystemVersion": "14.0.0",
      "edSignature": "QYO6Vhc0rS0EoFPdriGXBR8nFJYOovKF2pigK3Wx2jVSLpDi8uQQI51QVXY90L0yAPozZ32gNNeWIHyuzxxQBA==",
      "publishedAt": "2026-10-22T10:30:05Z",
      "releaseNotes": "ReDraw 0.4.10\n\nAnimate brings gentle breathing highlights to active nodes and continuous, separated ink strokes to their connectors. Strokes follow the original route and color while text, shapes and arrowheads stay fixed. Short steps remain clear, and Reduce Motion uses steady node emphasis.\n\nNative preview and MP4/GIF export share the motion treatment and consistent saved camera framing. Original artwork, legacy state-change animations and authored timing are preserved. No camera-keyframe editor is added.\n\nAnimate preview, playback, timing edits and MP4/GIF export now share the MCP + Library lifetime license. Already activated licenses include all three automatically; existing license keys remain valid. The price remains US$9.99 once, plus applicable taxes, for up to 3 Macs.\n\nBasic drawing, saving, static PNG/PDF export, personal My Library, and bundled Library browsing stay free. Existing canvas artwork remains editable when paid access is unavailable.\n\nRequires macOS 14 or later. Includes Apple Silicon and Intel binaries."
    }
  },
  {
    "version": "0.4.9",
    "filename": "ReDraw-0.4.9-11-universal.dmg",
    "github": {
      "repository": "sinofolks/website",
      "tag": "v0.4.9",
      "assetID": 665305300,
      "verified": true,
      "published": true
    },
    "sha256": "10986697662a3fc43de023eba4c25405b5a0a1b0bc2886f4b66bae6c229d032b",
    "size": 41034337,
    "notarized": true,
    "stapled": true,
    "testDistribution": false,
    "sparkle": {
      "build": "11",
      "minimumSystemVersion": "14.0.0",
      "edSignature": "bODH3Gg6TCvpzNIk6qFNu65XikHCq5iMkGoMdZNNxz9DoXzcjFEbQzRwX6lvSwVVcNNJQFAGUi+pBMPhPl+3Dg==",
      "publishedAt": "2026-10-22T09:17:00Z",
      "releaseNotes": "ReDraw 0.4.9\n\nAnimate opens directly into a live preview. Show all branches together, follow connected arrows, or choose an explicit order. Adjust playback speed, loop the animation, and reveal the grouped timeline when you need precise timing.\n\nDirectional flow uses short ink-like strokes and subtle marker emphasis that preserve the drawing's handwriting, hatching, colors, and editable shapes. Timeline clips inherit authored group colors, while the canvas has more room in larger windows.\n\nDocuments with recorded camera moves now play and export those moves through the same native renderer as the live flow. Pan or zoom to take control of the preview, use Fit canvas for an overview, and Return to start to resume the recorded camera. Camera keyframe editing is not included in this release.\n\nMP4 and animated GIF export preserve playback speed and drawing style. Existing animations, timing dependencies, snapping, and undo remain available.\n\nRequires macOS 14 or later. Includes Apple Silicon and Intel binaries."
    }
  },
  {
    "version": "0.4.8",
    "filename": "ReDraw-0.4.8-10-universal.dmg",
    "github": {
      "repository": "sinofolks/website",
      "tag": "v0.4.8",
      "assetID": 661210615,
      "verified": true,
      "published": true
    },
    "sha256": "5e48fac22df6bc152109ad8c6cc60fe643d049e68c9ac4021415c4644197fd13",
    "size": 40823906,
    "notarized": true,
    "stapled": true,
    "testDistribution": false,
    "sparkle": {
      "build": "10",
      "minimumSystemVersion": "14.0.0",
      "edSignature": "ktyrFdmD09utDGYVrk6MkA/X7jFu+rZMKkVGPBtIR5NctWSglVi0dCFxIO+reh4iyTVFY8BHz/+2J2RKrkiVAA==",
      "publishedAt": "2026-10-21T03:13:04Z",
      "releaseNotes": "ReDraw 0.4.8\n\nBring workflow diagrams to life with animated node states and directional flow. Preview, scrub, and loop the animation, then export an MP4 video or animated GIF.\n\nOrganize sequential and parallel steps with collapsible groups and pinned tracks. Zoom and pan the timeline, snap clips to nearby times, and drag or resize clips with clear handles. Hold Option to temporarily turn snapping off.\n\nA simpler timing editor explains when each step starts and how long it runs. Review changes before applying them, link steps to other modules' starts or finishes, and keep animation settings with your document.\n\nThe Documents window keeps its three-column layout with clearer selection, stable filenames, and easier access to save and sync details. Disconnected cloud folders now reliably offer Reconnect.\n\nA dedicated license status screen brings help, refresh, and deactivation together. Activation forms are more compact, and deactivating this Mac asks for confirmation.\n\nRequires macOS 14 or later. Includes Apple Silicon and Intel binaries."
    }
  },
  {
    "version": "0.4.7",
    "filename": "ReDraw-0.4.7-9-universal.dmg",
    "github": {
      "repository": "sinofolks/website",
      "tag": "v0.4.7",
      "assetID": 657956609,
      "verified": true,
      "published": true
    },
    "sha256": "c2f9d612f98cbf70eeccafec289cf268a6b54dbd52dfeba1134c6569deffa245",
    "size": 40395289,
    "notarized": true,
    "stapled": true,
    "testDistribution": false,
    "sparkle": {
      "build": "9",
      "minimumSystemVersion": "14.0.0",
      "edSignature": "9CD7rSilE3w6vYAF8Xu8CAVnxjfnBIp+jXv9wS5DC2vQd5fWm/ImM5B8RHNbFKXu0663tkiQm4anUylP34aOCw==",
      "publishedAt": "2026-10-20T01:37:00Z",
      "releaseNotes": "ReDraw 0.4.7\n\nSecurity improvements for license redemption and recovery. Verify your email with a short-lived code before redeeming a license or requesting a license email. Interrupted verification can resume securely.\n\nA compact native license window guides you through email verification, code redemption, and license recovery.\n\nOlder versions must upgrade to continue redeeming codes. Existing activated licenses remain available.\n\nRequires macOS 14 or later. Includes Apple Silicon and Intel binaries."
    }
  },
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
