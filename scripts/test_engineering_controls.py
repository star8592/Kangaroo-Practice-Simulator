#!/usr/bin/env python3
"""Mutation regression: guardrail must fail if release/CI safety wiring disappears."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from verify_engineering_controls import ROOT, FILES, evaluate

errors,total,automated=evaluate()
assert not errors, "\n".join(errors)
assert total>=14 and automated>=8

scenarios = [
 ("ci","pull_request:","PR trigger"),
 ("ci","billing-ledger:","payment regression"),
 ("ci","miniapp-build-and-contract:","native CI"),
 ("quality","npm run test:exam-access","guest authorization"),
 ("quality","step \"engineering operating controls\" npm run test:engineering-controls","policy inside CI"),
 ("deploy","CI_NOT_GREEN","production CI gate"),
 ("deploy","restore_runtime","rollback"),
 ("receipt","deployedSha","public release identity"),
 ("mini","verify_miniapp_qa_receipt.mjs","native SHA QA"),
 ("miniqa","physical-android","physical Android evidence"),
 ("watchunit","DynamicUser=yes","non-root source watch"),
 ("watchapi","isAdmin","admin source review"),
 ("pr","回滚方案","PR rollback contract"),
 ("backup","--passphrase-file","backup encryption key source"),
 ("backup","verify_backup_restore.sh","backup independent restore"),
 ("backup_restore","sha256sum -c","encrypted archive integrity"),
 ("backup_unit","ProtectSystem=strict","root backup unit writable scope"),
 ("backup_timer","Persistent=true","periodic backup timer"),
 ("backup_install","deployed_sha_mismatch","verified production-only backup install"),
 ("backup_health","LOCAL_ENCRYPTED_BACKUP=PASS","backup health receipt"),

]
for file,needle,reason in scenarios:
    original=(ROOT/FILES[file]).read_text(encoding="utf-8")
    assert needle in original,(reason,"original token not found")
    broken=original.replace(needle,"INVALID_REMOVED")
    failures,*_=evaluate(replacements={file:broken})
    assert failures, f"ENGINEERING_CONTROL_MUTATION_MISSED {reason}"
ci=(ROOT/FILES["ci"]).read_text(encoding="utf-8")
failures,*_=evaluate(replacements={"ci":ci+"\non: \n  pull_request_target: \n"})
assert failures,"ENGINEERING_CONTROL_MUTATION_MISSED privileged pull_request_target"
print(f"ENGINEERING_CONTROL_MUTATIONS=PASS cases={len(scenarios)+1}")
