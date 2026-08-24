#!/usr/bin/env python3
"""Uploads the working tree over FTP, honouring scripts/deploy/exclude.txt.

Stands in for SamKirkland/FTP-Deploy-Action during a local rehearsal. The
action itself is not under test here; what is under test is the exclude list
(shared with the workflows) and the server directory that resolve-paths.sh
computed.

Environment:
  FTP_HOST, FTP_PORT, FTP_USER, FTP_PASSWORD, FTP_DIR
"""
import fnmatch
import os
import subprocess
import sys
from ftplib import FTP
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXCLUDE_FILE = ROOT / "scripts/deploy/exclude.txt"


def load_patterns():
    return [
        line.strip()
        for line in EXCLUDE_FILE.read_text().splitlines()
        if line.strip() and not line.startswith("#")
    ]


def is_excluded(rel_path, patterns):
    """Mirrors the subset of glob semantics the workflow exclude list uses.

    Handles the three shapes that appear in exclude.txt:
      **/node_modules/**   directory name, anywhere in the path
      **/public/uploads/** multi-segment directory path, anywhere
      **/.git*/**          directory name glob, anywhere
      **/.env*             basename glob
    """
    parts = rel_path.parts
    name = rel_path.name
    for pattern in patterns:
        if pattern.startswith("**/") and pattern.endswith("/**"):
            middle = pattern[3:-3].split("/")
            span = len(middle)
            for i in range(len(parts) - span + 1):
                if all(
                    fnmatch.fnmatch(parts[i + j], middle[j]) for j in range(span)
                ):
                    return True
        elif pattern.startswith("**/"):
            if fnmatch.fnmatch(name, pattern[3:]):
                return True
        elif fnmatch.fnmatch(str(rel_path), pattern):
            return True
    return False


def candidate_files():
    """Models what a GitHub runner actually has on disk at upload time.

    The runner does a clean checkout, so gitignored working-tree clutter
    (.backup, .serena, local dumps) does not exist there. Uploading the raw
    working tree instead would rehearse a 265MB transfer that never happens
    in production. Tracked files plus build output is the honest set.
    """
    tracked = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=ROOT, capture_output=True, check=True,
    ).stdout.decode().split("\0")
    paths = {Path(p) for p in tracked if p}

    # Built by `npm run build:css` on the runner before upload.
    for built in (ROOT / "dist").rglob("*"):
        if built.is_file():
            paths.add(built.relative_to(ROOT))

    return sorted(paths)


def ensure_dir(ftp, path):
    for part in path.strip("/").split("/"):
        if not part:
            continue
        try:
            ftp.cwd(part)
        except Exception:
            ftp.mkd(part)
            ftp.cwd(part)


def main():
    patterns = load_patterns()
    host = os.environ["FTP_HOST"]
    port = int(os.environ.get("FTP_PORT", "21"))
    user = os.environ["FTP_USER"]
    password = os.environ["FTP_PASSWORD"]
    remote_dir = os.environ["FTP_DIR"]

    files = []
    for rel in candidate_files():
        if is_excluded(rel, patterns):
            continue
        if (ROOT / rel).is_file():
            files.append(rel)

    ftp = FTP()
    ftp.connect(host, port, timeout=30)
    ftp.login(user, password)
    ftp.set_pasv(True)

    root_cwd = ftp.pwd()
    ensure_dir(ftp, remote_dir)
    base = ftp.pwd()

    made = set()
    for rel in sorted(files):
        parent = str(rel.parent)
        if parent != "." and parent not in made:
            ftp.cwd(base)
            ensure_dir(ftp, parent)
            made.add(parent)
        ftp.cwd(base)
        if parent != ".":
            ftp.cwd(parent)
        with open(ROOT / rel, "rb") as handle:
            ftp.storbinary(f"STOR {rel.name}", handle)

    ftp.cwd(root_cwd)
    ftp.quit()
    print(f"uploaded {len(files)} files to {remote_dir}")


if __name__ == "__main__":
    sys.exit(main())
