# Release Checklist

## Before release

- [ ] Git status clean
- [ ] Build succeeds
- [ ] Smoke tests pass
- [ ] Database/data migration checked
- [ ] Environment variables verified

## Deploy

- [ ] Pull latest GitHub main
- [ ] Install dependencies
- [ ] Build production bundle
- [ ] Restart service
- [ ] Run health check

## After release

- [ ] Verify login
- [ ] Verify exam flow
- [ ] Verify arithmetic flow
- [ ] Verify personalized next round
- [ ] Record release version
