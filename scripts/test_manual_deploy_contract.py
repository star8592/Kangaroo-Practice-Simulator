#!/usr/bin/env python3
"""Refuse any parallel manual release path bypassing canonical CI/candidate rollout."""
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def audit(workflow):
    errors=[]
    required=(
        "workflow_dispatch:", "expected_sha:", "required: true",
        "refs/heads/main", "TARGET_SHA", "REQUESTED_SHA", "SSH private key required",
        "actions/checkout@v4", "systemctl start socthink-auto-deploy.service",
        "scripts/smoke_production_public.py", "cancel-in-progress: false",
        "REMOTE_SHA", "github.sha",
    )
    for needle in required:
        if needle not in workflow: errors.append("missing "+needle)
    forbidden=(
        "git reset --hard", "git clean", "npm ci", "npm run build", "scp-action",
        "SERVER_PASSWORD", "SSH_PASSWORD", "DEPLOY_PASSWORD", "release-data/pre-a",
        "rm -rf", "systemctl restart socthink-math", "pull_request_target",
    )
    for needle in forbidden:
        if needle in workflow: errors.append("unsafe "+needle)
    if workflow.count("systemctl start socthink-auto-deploy.service")!=1:
        errors.append("one canonical dispatch required")
    return errors

source=(ROOT/".github/workflows/deploy.yml").read_text()
assert not audit(source),audit(source)
mutations=[
    source.replace("refs/heads/main","refs/heads/development"),
    source.replace("expected_sha:","optional_sha:"),
    source.replace("scripts/smoke_production_public.py","echo unverified"),
    source.replace("systemctl start socthink-auto-deploy.service","systemctl stop socthink-math.service"),
    source.replace("cancel-in-progress: false","cancel-in-progress: true"),
    source+"\ngit reset --hard HEAD\n",
    source+"\nSERVER_PASSWORD: insecure-fallback\n",
]
for modified in mutations:
    assert audit(modified),"MANUAL_RELEASE_MUTATION_WAS_NOT_BLOCKED"
print("MANUAL_CANONICAL_DEPLOY_CONTRACT=PASS mutations="+str(len(mutations)))
