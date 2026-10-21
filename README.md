# ReDraw website

Public website source and release distribution for [ReDraw](https://www.sinofolks.com/redraw/), a native Mac drawing app.

The website runs on the existing Cloudflare Worker route. Installers are distributed through [GitHub Releases](https://github.com/sinofolks/website/releases). No R2 subscription or bucket is required. This repository contains website code and public media; the native application's source is maintained separately.

## Local development

Use Node.js 22 or newer.

```sh
npm ci
npm run check
npm run dev
```

Open the local URL printed by Wrangler at `/redraw/`. Generated output goes to `dist/`; dependencies, local credentials, and generated output are ignored by Git.

## Download and update flow

- The website and support pages stay at `https://www.sinofolks.com/redraw/`.
- Sparkle reads `https://www.sinofolks.com/redraw/updates/appcast.xml`.
- Approved `/redraw/downloads/FILENAME` requests redirect to the corresponding published asset in `sinofolks/website`.
- `src/release-manifest.mjs` is an explicit allowlist of verified production installers. Unknown paths, unverified assets, and test builds are not advertised.

The manifest lists verified, notarized production installers. Free downloads and Sparkle update metadata are enabled; public license purchases remain closed until merchant verification and live purchase acceptance are complete. Publishing website source alone does not deploy it. See [RELEASING.md](RELEASING.md) for the release process.

## Deployment

```sh
npm run deploy:dry-run
```

After reviewing the release and authorizing deployment, an authenticated maintainer can run `npm run deploy`. Preserve the existing `/redraw/*` route and avoid changing unrelated paths or DNS. The optional `REDRAW_API` binding is independent of downloads and Sparkle; verify it exists before deployment or deliberately remove that unused binding.

Public assets and bundled font notices are documented in [ASSETS.txt](ASSETS.txt). This repository does not grant a license to redistribute ReDraw artwork or branding beyond applicable asset licenses.
