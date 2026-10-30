# SOCTHINK · project agent instructions

## Mandatory cross-project access/auth preflight

Before SSH, DevControl/Zoria tool execution, deployment, Google/WeChat OAuth, browser control, device enrollment, payments or secrets, read the **[canonical EngineeringOS access and authentication lessons](https://github.com/star8592/EngineeringOS/blob/main/docs/operations/CROSS_PROJECT_ACCESS_AND_AUTH_LESSONS.md)** and then this project's current deployment instructions at `ops/release/SOCTHINK_DEPLOYMENT.md` and incident response at `docs/engineering/INCIDENT_RESPONSE_RUNBOOK.md`.

**Incident to avoid:** The legacy ThinkAI deployed payment service and the newer SOCTHINK math platform are not assumed to be the same runtime. Find the last successfully authorized SSH **Host alias and project-specific target** before connecting, not a guessed IP or a sibling project's host. Check `check_ssh` first; SSH_CONNECTED does not imply that remote command execution or app access was authorized. Never bypass an execution security denial.

SOCTHINK historic WeChat Native payments were actually verified in June 2026, but that alone does not prove this repository's current checkout is live. Preserve server-side verification and the single financial ledger; do not leak payment key material or treat a mock checkout as cash received. See issues #52 and #153.

Preserve this repository's existing environment isolation, checkout gates, identity/child data, CI and release/rollback requirements. This new instruction is an entrypoint, not a replacement for project-specific rules.
