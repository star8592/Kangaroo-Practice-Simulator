#!/usr/bin/env python3
"""Isolated, no-production-data backup/restore and fail-closed mutation tests."""
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CREATE=ROOT/"ops/backup/backup_verified.sh"
RESTORE=ROOT/"ops/backup/verify_backup_restore.sh"
HEALTH=ROOT/"ops/backup/check_backup_health.py"

def run(args,env,expected=0):
    result=subprocess.run(args,env=env,capture_output=True,text=True,timeout=90)
    if (result.returncode==0)!=(expected==0):
        raise AssertionError(f"Unexpected exit {result.returncode}: {(result.stdout+result.stderr)[-1200:]}")
    return result

with tempfile.TemporaryDirectory(prefix="socthink-backup-qa-") as t:
    base=Path(t)
    app=base/"app"
    out=base/"backups"
    key=base/"passphrase"
    key.write_text("ci-only-fixture-32-characters-long-not-production",encoding="utf-8")
    key.chmod(0o600)
    for p in ("private/users","private/arithmetic","private/exams","public/local-assets",
              "public/generated-solutions",".release"):
        (app/p).mkdir(parents=True)
    (app/"private/users/users.json").write_text('[{"id":"demo","role":"student"}]')
    (app/"private/users/exam-sessions.json").write_text("[]")
    (app/"private/users/exam-attempts.jsonl").write_text('{"examId":"demo","score":3}\n')
    (app/"private/arithmetic/sessions.jsonl").write_text('{"completed":true}\n')
    (app/"private/exams/demo.json").write_text('{"questions":[1,2]}')
    (app/"public/local-assets/demo.svg").write_text("<svg></svg>")
    (app/"public/generated-solutions/demo.txt").write_text("sample")
    (app/".release/deployed_sha").write_text("a"*40)
    env=os.environ.copy()
    env.update(SOCTHINK_BACKUP_APP_ROOT=str(app),SOCTHINK_BACKUP_DIR=str(out),
               SOCTHINK_BACKUP_PASSPHRASE_FILE=str(key))
    first=run(["bash",str(CREATE)],env)
    assert "BACKUP=PASS" in first.stdout,first.stdout+first.stderr
    archives=list(out.glob("socthink-*.tar.zst.gpg"))
    assert len(archives)==1
    archive=archives[0]
    receipt=json.loads(Path(str(archive)+".receipt.json").read_text())
    assert receipt["isolatedRestore"]=="PASS"
    assert receipt["offHostReplica"]=="NOT_CONFIGURED"
    assert receipt["archiveSha256"] and len(receipt["archiveSha256"])==64
    run(["python3",str(HEALTH),str(out)],env)
    assert (app/"private/users/users.json").read_text()=='[{"id":"demo","role":"student"}]'
    again=run(["bash",str(RESTORE),str(archive)],env)
    assert "BACKUP_ISOLATED_RESTORE=PASS" in again.stdout
    assert not list(out.glob(".restore-drill.*")), "restore plaintext must be cleaned up"

    # Invalid passphrase is rejected; original encrypted archive remains intact.
    wrong=base/"wrong-secret";wrong.write_text("not-the-key");wrong.chmod(0o600)
    invalid_env={**env,"SOCTHINK_BACKUP_PASSPHRASE_FILE":str(wrong)}
    run(["bash",str(RESTORE),str(archive)],invalid_env,expected=1)
    assert not list(out.glob(".restore-drill.*"))
    # Modified ciphertext is rejected by checksum *before* extraction.
    ciphertext=archive.read_bytes()
    archive.write_bytes(ciphertext[:-3]+b"BAD")
    run(["python3",str(HEALTH),str(out)],env,expected=1)
    run(["bash",str(RESTORE),str(archive)],env,expected=1)
    archive.write_bytes(ciphertext)
    run(["bash",str(RESTORE),str(archive)],env)
    # Changed key permission must fail closed.
    key.chmod(0o644)
    run(["bash",str(CREATE)],env,expected=1)
    run(["bash",str(RESTORE),str(archive)],env,expected=1)
    key.chmod(0o600)
    # No critical student file: no new archive is produced.
    (app/"private/users/users.json").unlink()
    run(["bash",str(CREATE)],env,expected=1)
    assert len(list(out.glob("socthink-*.tar.zst.gpg")))==1
    print("BACKUP_RECOVERY_TEST=PASS encrypted=YES independent_restore=YES mutation=BLOCKED wrong_key=BLOCKED source_safe=YES")
