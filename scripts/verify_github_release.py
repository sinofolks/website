#!/usr/bin/env python3
"""Anonymously verify a published production DMG and write a local release candidate.

Requires metadata from prepare_sparkle_release.py. Never uploads, modifies GitHub,
updates the website manifest, reads GitHub credentials, or publishes the appcast.
This file uses only Python's standard library so it can also live in the public
website repository without the private application release tooling.
"""

import argparse
import base64
from copy import deepcopy
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

REPOSITORY = "sinofolks/website"
API_BASE = f"https://api.github.com/repos/{REPOSITORY}"
FEED_URL = "https://www.sinofolks.com/redraw/updates/appcast.xml"
SAFE_INTEGER = 2 ** 53 - 1
ASSET_LIMIT = 2 ** 31  # GitHub requires each asset to be smaller than 2 GiB.
JSON_LIMIT = 8 * 1024 * 1024
REDIRECT_HOSTS = {"release-assets.githubusercontent.com", "objects.githubusercontent.com"}


class VerificationError(Exception):
    pass


def positive_integer(value, maximum=SAFE_INTEGER):
    return type(value) is int and 0 < value <= maximum


def canonical_base64(value, size):
    if not isinstance(value, str):
        return False
    try:
        decoded = base64.b64decode(value, validate=True)
    except ValueError:
        return False
    return len(decoded) == size and base64.b64encode(decoded).decode() == value


def sha256_string(value):
    return isinstance(value, str) and re.fullmatch(r"[a-f0-9]{64}", value) is not None


def utc_date(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z", value):
        return False
    try:
        datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError:
        return False
    return True


def download_url(record):
    return f"https://github.com/{REPOSITORY}/releases/download/{record['github']['tag']}/{record['filename']}"


def validate_prepared(metadata):
    """Accept only pending production metadata; never upgrade an old R2 record."""
    if (not isinstance(metadata, dict) or metadata.get("schemaVersion") != 2
            or metadata.get("deploymentStatus") != "awaiting-github-publication"
            or metadata.get("feedURL") != FEED_URL
            or not canonical_base64(metadata.get("publicKey"), 32)
            or not sha256_string(metadata.get("releaseReceiptSHA256"))):
        raise VerificationError("Use pending production metadata from prepare_sparkle_release.py.")
    preview = metadata.get("appcastPreview")
    if (not isinstance(preview, dict) or preview.get("filename") != "appcast.xml"
            or not sha256_string(preview.get("sha256"))):
        raise VerificationError("The prepared appcast preview receipt is missing or invalid.")
    record = metadata.get("release")
    if not isinstance(record, dict):
        raise VerificationError("The prepared release record is missing.")
    version = record.get("version")
    if not isinstance(version, str) or not re.fullmatch(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)", version):
        raise VerificationError("Only a stable three-part release version can be verified.")
    filename = record.get("filename")
    if (not isinstance(filename, str)
            or not re.fullmatch(rf"ReDraw-{re.escape(version)}(?:-[1-9][0-9]*)?(?:-universal)?\.dmg", filename)
            or not sha256_string(record.get("sha256"))
            or not positive_integer(record.get("size"), ASSET_LIMIT - 1)
            or record.get("notarized") is not True or record.get("stapled") is not True
            or record.get("testDistribution") is not False):
        raise VerificationError("The release must be a verified production DMG with a valid hash and size.")
    if set(record) != {"version", "filename", "sha256", "size", "notarized", "stapled", "testDistribution", "github", "sparkle"}:
        raise VerificationError("Unexpected release fields; regenerate the pending metadata.")
    target = record.get("github")
    if (not isinstance(target, dict) or set(target) != {"repository", "tag", "verified", "published"}
            or target.get("repository") != REPOSITORY or target.get("tag") != f"v{version}"
            or target.get("verified") is not False or target.get("published") is not False):
        raise VerificationError("Pending GitHub metadata must target sinofolks/website without an asset ID or verified status.")
    sparkle = record.get("sparkle")
    if (not isinstance(sparkle, dict) or not isinstance(sparkle.get("build"), str)
            or not re.fullmatch(r"[1-9][0-9]{0,17}", sparkle["build"])
            or not isinstance(sparkle.get("minimumSystemVersion"), str)
            or not re.fullmatch(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)", sparkle["minimumSystemVersion"])
            or not canonical_base64(sparkle.get("edSignature"), 64)
            or not utc_date(sparkle.get("publishedAt"))
            or not isinstance(sparkle.get("releaseNotes"), str)
            or not sparkle["releaseNotes"].strip() or len(sparkle["releaseNotes"]) > 10000
            or any(ord(c) < 32 and c not in "\t\n\r" or 0xD800 <= ord(c) <= 0xDFFF or ord(c) in (0xFFFE, 0xFFFF)
                   for c in sparkle["releaseNotes"])):
        raise VerificationError("The prepared Sparkle signature, build, date or release notes are invalid.")
    return deepcopy(record)


def safe_asset_url(url, original):
    if not isinstance(url, str) or any(ord(c) < 33 or ord(c) == 127 or c == "\\" for c in url):
        return False
    try:
        parsed = urlsplit(url)
        if (parsed.scheme != "https" or parsed.username is not None or parsed.password is not None
                or parsed.port is not None or parsed.fragment):
            return False
        return url == original or (parsed.hostname in REDIRECT_HOSTS and parsed.path.startswith("/") and parsed.path != "/")
    except ValueError:
        return False


class SafeRedirects(HTTPRedirectHandler):
    def __init__(self, original, allow_asset_redirects):
        self.original = original
        self.allow_asset_redirects = allow_asset_redirects

    def redirect_request(self, request, response, code, message, headers, new_url):
        if not self.allow_asset_redirects or not safe_asset_url(new_url, self.original):
            # Do not echo signed URLs or server-provided Location values into logs.
            raise VerificationError("GitHub redirected outside the permitted release asset hosts.")
        return super().redirect_request(request, response, code, message, headers, new_url)


def anonymous_open(url, asset=False):
    headers = {"User-Agent": "ReDraw-release-verifier/1", "Accept-Encoding": "identity"}
    headers["Accept"] = "application/octet-stream" if asset else "application/vnd.github+json"
    if not asset:
        if urlsplit(url).scheme != "https" or not url.startswith(API_BASE + "/") and url != API_BASE:
            raise VerificationError("Only the fixed public release repository can be queried.")
        headers["X-GitHub-Api-Version"] = "2022-11-28"
    elif not safe_asset_url(url, url) or not url.startswith(f"https://github.com/{REPOSITORY}/releases/download/"):
        raise VerificationError("Only the fixed GitHub release download URL can be requested.")
    # No Authorization, credentials lookup, cookies, or authenticated GitHub CLI.
    opener = build_opener(SafeRedirects(url, asset))
    try:
        response = opener.open(Request(url, headers=headers, method="GET"), timeout=30)
        if response.status != 200 or (asset and not safe_asset_url(response.geturl(), url)) or (not asset and response.geturl() != url):
            response.close()
            raise VerificationError("GitHub returned an unexpected response or redirect.")
        return response
    except HTTPError as error:
        error.close()
        raise VerificationError(f"Anonymous GitHub request failed (HTTP {error.code}); no candidate was written.") from None
    except URLError:
        raise VerificationError("Anonymous GitHub request failed; check connectivity and retry.") from None


def fetch_json(url):
    with anonymous_open(url) as response:
        payload = response.read(JSON_LIMIT + 1)
    if len(payload) > JSON_LIMIT:
        raise VerificationError("GitHub metadata exceeded the verification limit.")
    try:
        return json.loads(payload)
    except (ValueError, UnicodeError):
        raise VerificationError("GitHub returned invalid JSON metadata.") from None


def validate_repository(repository):
    if (not isinstance(repository, dict) or repository.get("full_name") != REPOSITORY
            or repository.get("private") is not False or repository.get("visibility") != "public"):
        raise VerificationError("The release repository must be the public sinofolks/website repository.")


def validate_release(release, record):
    if (not isinstance(release, dict) or not positive_integer(release.get("id"))
            or release.get("tag_name") != record["github"]["tag"]
            or release.get("draft") is not False or release.get("prerelease") is not False
            or not utc_date(release.get("published_at"))):
        raise VerificationError("GitHub must contain a published, stable release with the exact prepared tag.")
    return release["id"]


def validate_asset(asset, record):
    if (not isinstance(asset, dict) or not positive_integer(asset.get("id"))
            or asset.get("name") != record["filename"] or asset.get("state") != "uploaded"
            or type(asset.get("size")) is not int or asset["size"] != record["size"]
            or asset.get("url") != f"{API_BASE}/releases/assets/{asset['id']}"
            or asset.get("browser_download_url") != download_url(record)):
        raise VerificationError("The GitHub asset ID, name, upload state, size or URL does not match the prepared DMG.")
    if asset.get("digest") is not None and asset["digest"] != f"sha256:{record['sha256']}":
        raise VerificationError("GitHub reports a different SHA-256 for the release asset.")
    return asset["id"]


def matching_asset(release_id, record):
    matches = []
    for page in range(1, 101):
        assets = fetch_json(f"{API_BASE}/releases/{release_id}/assets?per_page=100&page={page}")
        if not isinstance(assets, list) or len(assets) > 100 or any(not isinstance(item, dict) for item in assets):
            raise VerificationError("GitHub returned an invalid release asset list.")
        matches.extend(item for item in assets if item.get("name") == record["filename"])
        if len(assets) < 100:
            break
    else:
        raise VerificationError("The release has too many asset pages to verify safely.")
    if len(matches) != 1:
        raise VerificationError("The release needs exactly one asset with the prepared DMG filename.")
    validate_asset(matches[0], record)
    return matches[0]


def verify_asset_bytes(record):
    digest, size, started = hashlib.sha256(), 0, time.monotonic()
    with anonymous_open(download_url(record), asset=True) as response:
        encoding = response.headers.get("Content-Encoding", "identity")
        length = response.headers.get("Content-Length")
        if encoding != "identity" or length is not None and length != str(record["size"]):
            raise VerificationError("The downloaded asset encoding or declared size does not match the DMG.")
        while True:
            chunk = response.read(min(1024 * 1024, record["size"] - size + 1))
            if not chunk:
                break
            size += len(chunk)
            if size > record["size"] or time.monotonic() - started > 900:
                raise VerificationError("The release download exceeded the expected size or verification time limit.")
            digest.update(chunk)
    if size != record["size"] or digest.hexdigest() != record["sha256"]:
        raise VerificationError("The anonymously downloaded DMG differs from the signed production artifact.")


def verified_record(metadata):
    record = validate_prepared(metadata)
    validate_repository(fetch_json(API_BASE))
    release_url = f"{API_BASE}/releases/tags/{record['github']['tag']}"
    release_id = validate_release(fetch_json(release_url), record)
    asset = matching_asset(release_id, record)
    asset_id = validate_asset(asset, record)
    detail_url = f"{API_BASE}/releases/assets/{asset_id}"
    detail = fetch_json(detail_url)
    if validate_asset(detail, record) != asset_id:
        raise VerificationError("The release asset changed before download.")
    verify_asset_bytes(record)
    # The release or asset may be edited while downloading. Recheck publication,
    # release membership and asset identity before issuing a verified candidate.
    validate_repository(fetch_json(API_BASE))
    if validate_release(fetch_json(release_url), record) != release_id:
        raise VerificationError("The release changed during verification.")
    after = matching_asset(release_id, record)
    if validate_asset(after, record) != asset_id:
        raise VerificationError("The release asset was replaced during verification.")
    final_detail = fetch_json(detail_url)
    if validate_asset(final_detail, record) != asset_id or final_detail.get("updated_at") != detail.get("updated_at"):
        raise VerificationError("The release asset changed during verification.")
    record["github"] = {"repository": REPOSITORY, "tag": record["github"]["tag"],
                        "assetID": asset_id, "verified": True, "published": True}
    return record


def atomic_write_candidate(output, record):
    """Publish complete bytes atomically, never overwrite an existing candidate."""
    payload = (json.dumps(record, indent=2, ensure_ascii=False) + "\n").encode()
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    descriptor, name = tempfile.mkstemp(prefix=".github-release-", dir=output.parent)
    temporary = Path(name)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        try:
            os.link(temporary, output)
        except FileExistsError:
            if output.is_symlink() or not output.is_file() or output.read_bytes() != payload:
                raise VerificationError("Output already exists with different content; choose a new candidate path.") from None
    finally:
        temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prepared", type=Path, required=True, help="Pending sparkle-release.json from the production preparation step")
    parser.add_argument("--output", type=Path, required=True, help="New local verified release JSON; never edits the website manifest")
    args = parser.parse_args()
    os.umask(0o077)
    try:
        if args.prepared.is_symlink() or args.prepared.stat().st_size > JSON_LIMIT:
            raise VerificationError("Prepared metadata must be a regular JSON file smaller than 8 MiB.")
        metadata = json.loads(args.prepared.read_text(encoding="utf-8"))
        record = verified_record(metadata)
        atomic_write_candidate(args.output, record)
    except (VerificationError, OSError, ValueError, TimeoutError) as error:
        # Network exceptions are sanitized by anonymous_open; no signed redirect
        # URLs, authentication headers, or full GitHub responses are printed.
        print(f"GitHub release verification stopped: {error}", file=sys.stderr)
        return 1
    print(f"Verified public GitHub asset {record['github']['assetID']} for {REPOSITORY}. Candidate: {args.output}")
    print("No upload, website publication or deployment occurred.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
