"""Backup the wedding SQLite database using SQLite's online backup API."""
import datetime
import os
from pathlib import Path
import sqlite3
import sys
import tarfile

root = Path(__file__).resolve().parent.parent
args = sys.argv[1:]
# --db-only skips the photo/MP3 archive, e.g. right before a migration
# (scripts/deploy-prod.sh): the uploads do not change and may not fit on disk.
db_only = "--db-only" in args
if db_only:
    args.remove("--db-only")
if len(args) != 1:
    raise SystemExit("Usage: python3 scripts/backup.py [--db-only] <backup-directory>")
url = os.environ.get("DATABASE_URL")
if not url:
    for line in (root / ".env").read_text().splitlines():
        if line.startswith("DATABASE_URL="):
            url = line.split("=", 1)[1].strip().strip('"').strip("'")
if not url or not url.startswith("file:"):
    raise SystemExit("Only SQLite file: URLs are supported")
source = Path(url[5:].split("?", 1)[0])
if not source.is_absolute():
    source = root / "prisma" / source
if not source.exists():
    raise SystemExit("Database does not exist")
folder = Path(args[0]).resolve()
if folder.is_relative_to(root / "public"):
    raise SystemExit("Backup directory must not be publicly served")
folder.mkdir(parents=True, exist_ok=True, mode=0o700)
stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
target = folder / f"wedding-{stamp}.db"
with sqlite3.connect(f"file:{source}?mode=ro", uri=True) as src:
    with sqlite3.connect(target) as dest:
        src.backup(dest)
target.chmod(0o600)
uploads = root / "public/uploads/weddings"
if uploads.exists() and not db_only:
    archive = folder / f"wedding-uploads-{stamp}.tar.gz"
    with tarfile.open(archive, "w:gz") as tar:
        tar.add(uploads, arcname="weddings")
    archive.chmod(0o600)
print(f"Backup saved: {target}")
