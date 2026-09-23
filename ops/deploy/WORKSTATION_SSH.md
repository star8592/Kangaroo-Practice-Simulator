# Production deployment access

The production server is reached directly from the developer workstation with the user's existing passwordless SSH session:

`ssh root@8.166.137.232`

Operational rules:

- Use the workstation's normal SSH environment and existing login state.
- Do not add `-F /dev/null`; that bypasses the user's SSH setup.
- Do not treat missing GitHub Actions SSH secrets as evidence that production SSH is unavailable.
- Prefer workstation -> production deployment for emergency/hotfix releases.
- Before changing production data, create a timestamped backup and verify the public `/api/release` receipt afterward.
