#!/usr/bin/env python3
from quality_tier import classify
assert classify(['numeric_mismatch'])['qualityTier']=='D'
assert classify(['visual_review_required'])['qualityTier']=='C'
assert classify([],translation_status='machine_draft')['qualityTier']=='B'
assert classify([],translation_status='reviewed',answer_verified=False)['qualityTier']=='B'
r=classify([],translation_status='reviewed',answer_verified=True)
assert r=={'qualityTier':'A','releaseEligible':True,'reviewRoute':'none'}
r=classify(['visual_review_required'],translation_status='reviewed',visual_verified=True,answer_verified=True)
assert r['qualityTier']=='A' and r['releaseEligible']
print('QUALITY_TIER=PASS')
