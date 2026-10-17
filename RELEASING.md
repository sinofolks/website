# Publishing ReDraw installers

GitHub Releases in **sinofolks/website** stores the DMGs. Cloudflare serves the website and the small Sparkle feed, then redirects approved downloads to GitHub. No R2 configuration is needed.

## Prepare the application

Build the production Direct distribution in the application checkout. Sign with Developer ID, complete Apple notarization, staple the final DMG, and verify it. Then run the application's `script/prepare_sparkle_release.py` to sign those exact final bytes with Sparkle and produce `sparkle-release.json`.

Test-distribution builds and unnotarized DMGs cannot become public update records. Do not commit DMGs, signing keys, license data, or local build receipts to this website repository.

## Publish and verify the asset

1. Create a GitHub release in this repository with tag `vVERSION` matching the application version. Use a draft while uploading and reviewing.
2. Upload the final signed, notarized, stapled DMG as a Release attachment. Keep its original versioned filename. Release attachments are separate from Git source files.
3. Publish the release when the installer is approved. Production verification rejects drafts and prereleases. Do not replace an already published installer; issue a new version instead. Enable GitHub release immutability when available.
4. Verify the published download without GitHub authentication:

   ```sh
   python3 scripts/verify_github_release.py \
     --prepared /absolute/path/sparkle-release.json \
     --output /absolute/path/verified-release.json
   ```

   The verifier reads the public repository and release metadata, checks the asset identity, downloads the actual bytes, and compares size and SHA-256 with the prepared record. It writes a candidate release record only after verification succeeds. It does not upload, publish, or deploy anything.

5. Review the resulting record and add it to the `releases` array in `src/release-manifest.mjs`. Keep `github.verified` and `github.published` unset/false until the verifier has proved them. Never fill in an asset ID by guessing.
6. In `src/site-config.mjs`, set `distribution.status` to `ready` and `distribution.releaseVersion` to the verified version. Keep checkout in `test` until the separate live-purchase checks are complete.
7. Run `npm run check` and `npm run deploy:dry-run`. Commit and push the reviewed website changes. Deploy the existing Worker only when production publication is authorized.

## Acceptance after deployment

Verify the live feed, its Sparkle signature/size metadata, and the download redirect. Follow the redirect anonymously and compare the complete downloaded file with the final local DMG. Check HEAD and byte-range downloads at the GitHub destination; the website redirect itself does not stream bytes or promise a `206` response. Finally, test an actual Sparkle installation and relaunch from an older production build.

The update feed URL and application public signing key remain unchanged. A website-source push or a passing local test does not prove that a production update has been published or installed.

## Limits

GitHub currently permits release attachments smaller than 2 GiB and documents no release-wide total size or bandwidth quota. Check the [current GitHub rules](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) before publishing. Test download accessibility on the networks your customers use.
