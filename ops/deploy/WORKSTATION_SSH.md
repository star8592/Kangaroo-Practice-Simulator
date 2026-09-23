# Production deployment access

The production server is reached directly from the developer workstation with the user's existing passwordless SSH session:

`ssh root@8.166.137.232`

Operational rules:

- Use the workstation's normal SSH environment and existing login state.
- Do not add `-F /dev/null`; that bypasses the user's SSH setup.
- Do not treat missing GitHub Actions SSH secrets as evidence that production SSH is unavailable.
- Prefer workstation -> production deployment for emergency/hotfix releases.
- Before changing production data, create a timestamped backup and verify the public `/api/release` receipt afterward.
For the grade-one solution-player release (continuous playback, teacher companion, and regenerated narration), use the single workstation entry point:

```bash
cd /mnt/disk1/Code/Kangaroo-Practice-Simulator
bash ops/release/publish_grade1_solution_hotfix.sh
```

That script uses a clean committed checkout for code, copies only the validated build-time data subset, backs up the existing production grade-one solution data, deploys the exact GitHub SHA, promotes the 50-question/150-audio payload, and verifies both the public release receipt and narration file hash.
