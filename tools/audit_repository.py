"""Cuios credential-pattern audit. Report locations and categories, never matched values."""
from pathlib import Path
import argparse
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PATTERNS = {
    "github_token": re.compile(rb"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b"),
    "private_key": re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "aws_access_key": re.compile(rb"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "credential_url": re.compile(rb"https?://[^\s/:]+:[^\s/@]+@"),
}
EXTENSIONS = {".js", ".cjs", ".mjs", ".py", ".md", ".json", ".sgmodule", ".yml", ".yaml", ".txt", ".conf", ".env", ".pem", ".key"}
OFFICIAL_OWNERS = {"firebase", "revenuecat", "actions"}


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def text_path(name):
    path = Path(name)
    return path.suffix.lower() in EXTENSIONS or path.name in {"LICENSE", ".gitignore"} or path.name.startswith(".env")


def inspect(data, path, findings, scope):
    for kind, regex in PATTERNS.items():
        for match in regex.finditer(data):
            findings.append({"scope": scope, "path": path, "line": data[:match.start()].count(b"\n") + 1, "kind": kind})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--history", action="store_true", help="Also inspect all locally reachable Git text blobs")
    args = parser.parse_args()
    findings, references = [], []
    files = [name for name in git("ls-files", "-z").decode().split("\0") if name and text_path(name)]
    for name in files:
        file = ROOT / name
        if not file.is_file():
            continue
        data = file.read_bytes()
        inspect(data, name, findings, "working_tree")
        for owner in sorted(set(re.findall(rb"https://(?:raw\.githubusercontent\.com|github\.com)/([A-Za-z0-9_.-]+)/", data))):
            value = owner.decode()
            if value.lower() not in OFFICIAL_OWNERS | {"cuongqtx11", "cuios-shop"}:
                references.append({"path": name, "github_owner": value})
    history_blobs = 0
    if args.history:
        for entry in git("rev-list", "--objects", "--all").decode().splitlines():
            oid, _, name = entry.partition(" ")
            if not name or not text_path(name) or git("cat-file", "-t", oid).strip() != b"blob":
                continue
            history_blobs += 1
            inspect(git("cat-file", "blob", oid), name, findings, "local_history:" + oid)
    print(json.dumps({
        "tracked_text_files": len(files), "history_text_blobs": history_blobs,
        "credential_pattern_findings": findings, "external_github_references": references,
        "limits": "Pattern matching is not a guarantee that all secrets are absent. Historical branding is not rewritten."
    }, ensure_ascii=False, indent=2))
    return 1 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
