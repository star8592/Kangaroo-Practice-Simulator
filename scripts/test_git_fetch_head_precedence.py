#!/usr/bin/env python3
"""Regression: explicit-branch fetch may update FETCH_HEAD but not origin/main."""
from pathlib import Path
import subprocess
import tempfile

def git(*args: str, cwd: Path) -> str:
    p=subprocess.run(["git",*args],cwd=cwd,capture_output=True,text=True,check=False)
    if p.returncode:
        raise RuntimeError("fixture git failed: " + " ".join(args))
    return p.stdout.strip()

with tempfile.TemporaryDirectory(prefix="socthink-fetchhead-") as td:
    root=Path(td)
    bare=root/"origin.git"; bare.mkdir()
    git("init","--bare","--initial-branch=main",cwd=bare)
    seed=root/"seed"; seed.mkdir()
    git("init","-b","main",cwd=seed)
    git("config","user.name","Synthetic CI",cwd=seed)
    git("config","user.email","synthetic@example.test",cwd=seed)
    (seed/"VERSION").write_text("1\n")
    git("add","VERSION",cwd=seed)
    git("commit","-m","first fixture",cwd=seed)
    git("remote","add","origin",str(bare),cwd=seed)
    git("push","-u","origin","main",cwd=seed)
    client=root/"client"
    git("clone",str(bare),str(client),cwd=root)
    earlier=git("rev-parse","origin/main",cwd=client)
    (seed/"VERSION").write_text("2\n")
    git("add","VERSION",cwd=seed)
    git("commit","-m","second fixture",cwd=seed)
    updated=git("rev-parse","HEAD",cwd=seed)
    git("push","origin","main",cwd=seed)
    # Reproduce the production git config which fetches an explicit branch
    # but does not refresh the remote-tracking ref.
    git("config","--unset-all","remote.origin.fetch",cwd=client)
    git("fetch","origin","main",cwd=client)
    cached=git("rev-parse","origin/main",cwd=client)
    fetched=git("rev-parse","FETCH_HEAD^{commit}",cwd=client)
    assert cached==earlier and cached!=updated, "Fixture must reproduce stale ref"
    assert fetched==updated, "FETCH_HEAD must be the actually fetched remote main"
print("FETCH_HEAD_RELEASE_REGRESSION=PASS (stale origin/main does not mask new main)")
