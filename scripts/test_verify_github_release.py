#!/usr/bin/env python3
"""Offline tests for the public GitHub release verifier; never contact GitHub."""

import base64
from copy import deepcopy
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError
from urllib.request import Request

import verify_github_release as github

BODY = b"fixture: stapled signed production DMG"


def prepared():
    return {"schemaVersion": 2, "deploymentStatus": "awaiting-github-publication",
            "feedURL": github.FEED_URL, "publicKey": base64.b64encode(bytes(range(32))).decode(),
            "releaseReceiptSHA256": "c" * 64,
            "appcastPreview": {"filename": "appcast.xml", "sha256": "d" * 64},
            "release": {"version": "0.4.4", "filename": "ReDraw-0.4.4-6-universal.dmg",
                        "size": len(BODY), "sha256": hashlib.sha256(BODY).hexdigest(),
                        "notarized": True, "stapled": True, "testDistribution": False,
                        "github": {"repository": github.REPOSITORY, "tag": "v0.4.4", "verified": False, "published": False},
                        "sparkle": {"build": "6", "minimumSystemVersion": "14.0.0",
                                    "edSignature": base64.b64encode(bytes(range(64))).decode(),
                                    "publishedAt": "2026-10-17T00:00:00Z", "releaseNotes": "Improved saving."}}}


def release():
    return {"id": 41, "tag_name": "v0.4.4", "draft": False, "prerelease": False, "published_at": "2026-10-17T00:00:00Z"}


def asset():
    record = prepared()["release"]
    return {"id": 73, "name": record["filename"], "state": "uploaded", "size": len(BODY),
            "url": f"{github.API_BASE}/releases/assets/73", "browser_download_url": github.download_url(record),
            "digest": f"sha256:{record['sha256']}", "updated_at": "2026-10-17T00:00:00Z"}


def repository():
    return {"full_name": github.REPOSITORY, "private": False, "visibility": "public"}


class Response(io.BytesIO):
    def __init__(self, data=BODY, headers=None, url=None, status=200):
        super().__init__(data)
        self.headers = headers or {}
        self.url = url or github.download_url(prepared()["release"])
        self.status = status
        self.read_sizes = []

    def read(self, size=-1):
        self.read_sizes.append(size)
        return super().read(size)

    def geturl(self):
        return self.url


class GitHubReleaseVerificationTests(unittest.TestCase):
    def test_prepared_record_requires_pending_production_attestation(self):
        metadata = prepared()
        self.assertEqual(github.validate_prepared(metadata), metadata["release"])
        mutations = [
            ("schemaVersion", 1), ("deploymentStatus", "not-uploaded"), ("feedURL", "https://evil.test/feed"),
            ("releaseReceiptSHA256", ""), ("publicKey", "invalid"), ("appcastPreview", {}),
        ]
        for key, value in mutations:
            with self.subTest(key=key), self.assertRaises(github.VerificationError):
                github.validate_prepared({**metadata, key: value})
        for key, value in [("testDistribution", True), ("testDistribution", None), ("notarized", False),
                           ("stapled", False), ("size", 0), ("size", True), ("size", 2 ** 31),
                           ("sha256", "Z" * 64), ("version", "01.2.3"), ("version", "0.4.4-beta"),
                           ("filename", "ReDraw-0.4.4-test-universal.dmg"), ("filename", "ReDraw-0.4.5.dmg"),
                           ("objectKey", "old/r2/key"), ("url", "https://evil.test/a.dmg")]:
            changed = deepcopy(metadata)
            changed["release"][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(github.VerificationError):
                github.validate_prepared(changed)

    def test_prepared_record_never_accepts_claimed_verified_metadata(self):
        for change in [{"repository": "someone/website"}, {"tag": "v0.4.5"}, {"verified": True},
                       {"published": True}, {"verified": 0}, {"published": 0}, {"assetID": 73}, {"url": "https://evil.test/file"}]:
            metadata = prepared()
            metadata["release"]["github"].update(change)
            with self.subTest(change=change), self.assertRaises(github.VerificationError):
                github.validate_prepared(metadata)

    def test_prepared_sparkle_fields_are_validated(self):
        for key, value in [("edSignature", "invalid"), ("build", "06"), ("publishedAt", "tomorrow"),
                           ("minimumSystemVersion", "latest"), ("minimumSystemVersion", "014.0.0"),
                           ("releaseNotes", ""), ("releaseNotes", "bad\x00notes"), ("releaseNotes", "a" + " " * 10000)]:
            metadata = prepared()
            metadata["release"]["sparkle"][key] = value
            with self.subTest(key=key), self.assertRaises(github.VerificationError):
                github.validate_prepared(metadata)

    def test_repository_requires_exact_public_repository(self):
        github.validate_repository(repository())
        for change in [{"private": True}, {"private": None}, {"visibility": "private"}, {"full_name": "sinofolks/ReDraw"}]:
            with self.subTest(change=change), self.assertRaises(github.VerificationError):
                github.validate_repository({**repository(), **change})

    def test_release_requires_exact_published_stable_tag(self):
        self.assertEqual(github.validate_release(release(), prepared()["release"]), 41)
        for change in [{"draft": True}, {"prerelease": True}, {"draft": None}, {"published_at": None},
                       {"tag_name": "latest"}, {"id": True}, {"id": 0}, {"id": 2 ** 53}]:
            with self.subTest(change=change), self.assertRaises(github.VerificationError):
                github.validate_release({**release(), **change}, prepared()["release"])

    def test_asset_checks_identity_upload_size_urls_and_optional_digest(self):
        record = prepared()["release"]
        self.assertEqual(github.validate_asset(asset(), record), 73)
        old_asset = asset()
        del old_asset["digest"]
        self.assertEqual(github.validate_asset(old_asset, record), 73)
        for change in [{"state": "starter"}, {"size": len(BODY) + 1}, {"size": True}, {"id": True},
                       {"id": 2 ** 53}, {"name": "different.dmg"}, {"url": "https://evil.test/asset"},
                       {"browser_download_url": github.download_url(record) + "?token=secret"}, {"digest": "sha256:" + "f" * 64}]:
            with self.subTest(change=change), self.assertRaises(github.VerificationError):
                github.validate_asset({**asset(), **change}, record)

    def test_asset_search_checks_all_pages_and_rejects_duplicates(self):
        first_page = [{"name": f"unrelated-{index}"} for index in range(100)]
        with patch.object(github, "fetch_json", side_effect=[first_page, [asset()]]) as fetch:
            self.assertEqual(github.matching_asset(41, prepared()["release"]), asset())
        self.assertTrue(fetch.call_args_list[1].args[0].endswith("page=2"))
        for response in [[], [asset(), asset()], {}, [None]]:
            with self.subTest(response=response), patch.object(github, "fetch_json", return_value=response), self.assertRaises(github.VerificationError):
                github.matching_asset(41, prepared()["release"])

    def test_asset_download_streams_and_checks_real_bytes(self):
        response = Response(headers={"Content-Length": str(len(BODY))})
        with patch.object(github, "anonymous_open", return_value=response) as opened:
            github.verify_asset_bytes(prepared()["release"])
        opened.assert_called_once_with(github.download_url(prepared()["release"]), asset=True)
        self.assertTrue(all(0 < size <= 1024 * 1024 for size in response.read_sizes))
        self.assertTrue(response.closed)

    def test_truncated_corrupt_oversized_or_encoded_asset_fails(self):
        for data, headers in [(BODY[:-1], {}), (b"x" * len(BODY), {}), (BODY + b"extra", {}),
                              (BODY, {"Content-Length": "12"}), (BODY, {"Content-Encoding": "gzip"})]:
            response = Response(data=data, headers=headers)
            with self.subTest(data=data, headers=headers), patch.object(github, "anonymous_open", return_value=response), self.assertRaises(github.VerificationError):
                github.verify_asset_bytes(prepared()["release"])
            self.assertTrue(response.closed)

    def test_safe_redirects_allow_only_exact_download_and_github_asset_cdn(self):
        original = github.download_url(prepared()["release"])
        for url in [original, "https://release-assets.githubusercontent.com/file?signature=secret", "https://objects.githubusercontent.com/file"]:
            self.assertTrue(github.safe_asset_url(url, original), url)
        for url in ["http://release-assets.githubusercontent.com/file", "https://evil.test/file",
                    "https://release-assets.githubusercontent.com.evil.test/file", "https://github.com/login",
                    "https://127.0.0.1/file", "https://user:secret@objects.githubusercontent.com/file",
                    "https://objects.githubusercontent.com:443/file", "https://objects.githubusercontent.com/file#fragment",
                    "https://objects.githubusercontent.com/", original + "\n", "https://objects.githubusercontent.com/\\evil"]:
            self.assertFalse(github.safe_asset_url(url, original), url)
            handler = github.SafeRedirects(original, True)
            with self.assertRaises(github.VerificationError):
                handler.redirect_request(Request(original), None, 302, "Redirect", {}, url)
        with self.assertRaises(github.VerificationError):
            github.SafeRedirects(github.API_BASE, False).redirect_request(Request(github.API_BASE), None, 301, "Redirect", {}, github.API_BASE)

    def test_anonymous_request_uses_no_credentials_and_checks_status(self):
        response = Response(url=github.API_BASE)
        with patch.object(github, "build_opener") as build:
            build.return_value.open.return_value = response
            self.assertIs(github.anonymous_open(github.API_BASE), response)
            request = build.return_value.open.call_args.args[0]
        headers = {key.lower(): value for key, value in request.header_items()}
        self.assertNotIn("authorization", headers)
        self.assertNotIn("cookie", headers)
        self.assertEqual(request.get_method(), "GET")
        self.assertEqual(headers["accept-encoding"], "identity")
        for status in [204, 206, 302, 404]:
            with self.subTest(status=status), patch.object(github, "build_opener") as build:
                build.return_value.open.return_value = Response(url=github.API_BASE, status=status)
                with self.assertRaises(github.VerificationError):
                    github.anonymous_open(github.API_BASE)

    def test_network_errors_hide_signed_urls_and_response_bodies(self):
        for error in [HTTPError("https://asset.test/?secret=secret-token", 403, "secret-token", {}, None),
                      URLError("secret-token")]:
            with patch.object(github, "build_opener") as build:
                build.return_value.open.side_effect = error
                with self.assertRaises(github.VerificationError) as caught:
                    github.anonymous_open(github.API_BASE)
            self.assertNotIn("secret-token", str(caught.exception))

    def fixture_fetch(self, url):
        if url == github.API_BASE:
            return repository()
        if "/releases/tags/" in url:
            return release()
        if "/releases/41/assets?" in url:
            return [asset()]
        if "/releases/assets/73" in url:
            return asset()
        self.fail(f"Unexpected request: {url}")

    def test_verified_record_is_emitted_only_after_download_and_rechecks(self):
        metadata = prepared()
        with patch.object(github, "fetch_json", side_effect=self.fixture_fetch) as fetch, patch.object(github, "verify_asset_bytes") as download:
            result = github.verified_record(metadata)
        self.assertEqual(result["github"], {"repository": github.REPOSITORY, "tag": "v0.4.4", "assetID": 73, "verified": True, "published": True})
        self.assertFalse(metadata["release"]["github"]["verified"])
        self.assertEqual(fetch.call_count, 8)
        download.assert_called_once()

    def test_private_draft_missing_or_wrong_asset_fails_before_download(self):
        for override_url, value in [(github.API_BASE, {**repository(), "private": True}),
                                    (f"{github.API_BASE}/releases/tags/v0.4.4", {**release(), "draft": True}),
                                    (f"{github.API_BASE}/releases/41/assets?per_page=100&page=1", [])]:
            def fetch(url):
                return value if url == override_url else self.fixture_fetch(url)
            with self.subTest(url=override_url), patch.object(github, "fetch_json", side_effect=fetch), patch.object(github, "verify_asset_bytes") as download:
                with self.assertRaises(github.VerificationError):
                    github.verified_record(prepared())
                download.assert_not_called()

    def test_release_or_asset_changes_during_download_never_produce_candidate(self):
        for change in ["release", "membership", "updated", "private"]:
            counts = {}
            def fetch(url):
                counts[url] = counts.get(url, 0) + 1
                value = self.fixture_fetch(url)
                if counts[url] == 2:
                    if change == "release" and "/tags/" in url:
                        value["draft"] = True
                    if change == "membership" and "/41/assets?" in url:
                        value = []
                    if change == "updated" and "/assets/73" in url:
                        value["updated_at"] = "2026-10-17T00:01:00Z"
                    if change == "private" and url == github.API_BASE:
                        value["private"] = True
                return value
            with self.subTest(change=change), patch.object(github, "fetch_json", side_effect=fetch), patch.object(github, "verify_asset_bytes"), self.assertRaises(github.VerificationError):
                github.verified_record(prepared())

    def test_invalid_prepared_metadata_never_requests_network(self):
        metadata = prepared()
        metadata["release"]["testDistribution"] = True
        with patch.object(github, "fetch_json") as fetch, self.assertRaises(github.VerificationError):
            github.verified_record(metadata)
        fetch.assert_not_called()

    def test_atomic_candidate_preserves_existing_and_has_no_partial_files(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / "candidate.json"
            github.atomic_write_candidate(output, {"verified": True})
            github.atomic_write_candidate(output, {"verified": True})
            self.assertEqual(json.loads(output.read_text()), {"verified": True})
            with self.assertRaises(github.VerificationError):
                github.atomic_write_candidate(output, {"different": True})
            self.assertEqual(list(Path(folder).iterdir()), [output])
            link = Path(folder) / "symlink.json"
            link.symlink_to(output)
            with self.assertRaises(github.VerificationError):
                github.atomic_write_candidate(link, {"verified": True})
            self.assertEqual(json.loads(output.read_text()), {"verified": True})

    def test_cli_failure_leaves_no_output(self):
        with tempfile.TemporaryDirectory() as folder:
            source, output = Path(folder) / "prepared.json", Path(folder) / "candidate.json"
            source.write_text(json.dumps(prepared()))
            with patch("sys.argv", ["verify", "--prepared", str(source), "--output", str(output)]), patch.object(github, "verified_record", side_effect=github.VerificationError("not published")), patch("sys.stderr", new_callable=io.StringIO):
                self.assertEqual(github.main(), 1)
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
