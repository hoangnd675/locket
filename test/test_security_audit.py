"""Ensure credential auditing detects patterns without disclosing matched values."""
from pathlib import Path
import json
import runpy
import unittest

AUDIT = runpy.run_path(str(Path(__file__).resolve().parents[1] / "tools/audit_repository.py"))


class AuditRedactionTests(unittest.TestCase):
    def test_detects_github_token_and_reports_only_location(self):
        token = b"ghp_" + b"Z" * 36
        findings = []
        AUDIT["inspect"](b"header\n" + token, "sample.js", findings, "working_tree")
        self.assertEqual(findings, [{"scope": "working_tree", "path": "sample.js", "line": 2, "kind": "github_token"}])
        self.assertNotIn(token.decode(), json.dumps(findings))

    def test_detects_private_key_and_url_credentials_without_raw_data(self):
        marker = b"-----BEGIN " + b"PRIVATE KEY-----"
        credential_url = b"https://" + b"account:fake-password@example.invalid/file"
        findings = []
        AUDIT["inspect"](marker + b"\n" + credential_url, "sample.txt", findings, "fixture")
        self.assertEqual({item["kind"] for item in findings}, {"private_key", "credential_url"})
        self.assertNotIn("fake-password", json.dumps(findings))

    def test_public_urls_and_placeholder_authorization_do_not_trigger(self):
        findings = []
        AUDIT["inspect"](b"https://raw.githubusercontent.com/Cuongqtx11/repository/main/file.js\nAuthorization: Bearer fixture", "sample.js", findings, "fixture")
        self.assertEqual(findings, [])


if __name__ == "__main__":
    unittest.main()
