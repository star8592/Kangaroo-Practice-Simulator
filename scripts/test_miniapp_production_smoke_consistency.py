#!/usr/bin/env python3
"""Exercise the *actual* miniapp production smoke shell runner with fake IO.

No network, Git mutations, orders, or test users are touched. This verifies
classification and retry decisions using real Bash execution, not a stub
implementation of the algorithm.
"""
import json
import os
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
RUNNER = ROOT / "scripts/run_miniapp_production_smoke.sh"
A = "a" * 40
B = "b" * 40
C = "c" * 40
D = "d" * 40

CURL = r'''#!/usr/bin/env python3
import json,os,pathlib
p=pathlib.Path(os.environ["TEST_SHA_SEQUENCE"])
seq=json.loads(p.read_text())
counter=pathlib.Path(os.environ["TEST_SHA_COUNTER"])
i=int(counter.read_text()) if counter.exists() else 0
counter.write_text(str(i+1))
item=seq[min(i,len(seq)-1)]
if item=="invalid":
    print('{"ok":false,"deployedSha":"bad","gitSha":"bad"}')
else:
    print(json.dumps({"ok":True,"deployedSha":item,"gitSha":item}))
'''
GIT = r'''#!/usr/bin/env python3
import os,sys
with open(os.environ["TEST_GIT_LOG"],"a") as out:out.write(" ".join(sys.argv[1:])+"\n")
'''
NPM = r'''#!/usr/bin/env python3
import os,pathlib,sys
args=sys.argv[1:]
with open(os.environ["TEST_NPM_LOG"],"a") as out:out.write(" ".join(args)+"\n")
if args==["run","test:exam-access-live"] and os.environ.get("TEST_FAIL_EXAM")=="always":
    sys.exit(3)
if args==["run","test:exam-access-live"] and os.environ.get("TEST_FAIL_EXAM")=="once":
    p=pathlib.Path(os.environ["TEST_FAIL_COUNTER"])
    count=int(p.read_text()) if p.exists() else 0
    p.write_text(str(count+1))
    if count==0:sys.exit(3)
'''

def scenario(label, sha_sequence, expected_exit, required, fail_exam=""):
    with tempfile.TemporaryDirectory(prefix="miniapp-sha-coherence-") as tmp:
        root = pathlib.Path(tmp)
        for name, source in (("curl", CURL), ("git", GIT), ("npm", NPM)):
            exe = root / name
            exe.write_text(source)
            exe.chmod(0o755)
        sequence = root / "sequence.json"
        sequence.write_text(json.dumps(sha_sequence))
        env = {
            **os.environ,
            "PATH": str(root) + os.pathsep + os.environ.get("PATH", ""),
            "TEST_SHA_SEQUENCE": str(sequence),
            "TEST_SHA_COUNTER": str(root / "count"),
            "TEST_GIT_LOG": str(root / "git.log"),
            "TEST_NPM_LOG": str(root / "npm.log"),
            "TEST_FAIL_EXAM": fail_exam,
            "TEST_FAIL_COUNTER": str(root / "fail-count"),
        }
        result = subprocess.run(
            ["bash", str(RUNNER)], cwd=ROOT, env=env,
            text=True, capture_output=True, timeout=25,
        )
        output = result.stdout + "\n" + result.stderr
        assert result.returncode == expected_exit, (
            label, "exit", result.returncode, "expected", expected_exit, output
        )
        for marker in required:
            assert marker in output, (label, "missing", marker, output)
        assert "MINIAPP_PROD_SMOKE=PASS" not in output or expected_exit == 0, (
            label, "false success", output
        )
        print("MINIAPP_SHA_COHERENCE_TEST=PASS", label)

scenario("stable", [A, A], 0, ["stable_sha=" + A, "attempts=1"])
scenario("transition_then_stable", [A, B, B, B], 0,
         ["RELEASE_TRANSITION", "stable_sha=" + B, "attempts=2"])
scenario("transition_with_spurious_exam_failure", [A, B, B, B], 0,
         ["RELEASE_TRANSITION", "stable_sha=" + B], fail_exam="once")
scenario("stable_exam_failure_remains_red", [A, A], 1,
         ["stable_release_test_failed", "exam_rc=3"], fail_exam="always")
scenario("continuous_deploy_changes_inconclusive", [A, B, B, C, C, D], 1,
         ["INCONCLUSIVE", "production_changed_during_all_3_attempts"])
scenario("bad_release_receipt_fails", ["invalid"], 1,
         ["cannot_identify_deployed_sha"])

print("MINIAPP_PRODUCTION_SHA_STABILITY=PASS cases=6")
