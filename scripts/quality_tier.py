#!/usr/bin/env python3
"""Release-risk classification for localized competition questions."""
HARD={'numeric_mismatch','option_letter_mismatch','choice_labels_unrecovered','visual_asset_missing','source_ocr_noise','source_math_gap'}
REVIEW={'visual_review_required'}
def classify(warnings, *, translation_status='machine_draft', visual_verified=False, answer_verified=False):
    w=set(warnings or [])
    if w & HARD: return {'qualityTier':'D','releaseEligible':False,'reviewRoute':'repair'}
    if 'visual_review_required' in w and not visual_verified: return {'qualityTier':'C','releaseEligible':False,'reviewRoute':'visual_review'}
    if translation_status!='reviewed': return {'qualityTier':'B','releaseEligible':False,'reviewRoute':'translation_review'}
    if not answer_verified: return {'qualityTier':'B','releaseEligible':False,'reviewRoute':'answer_review'}
    return {'qualityTier':'A','releaseEligible':True,'reviewRoute':'none'}
