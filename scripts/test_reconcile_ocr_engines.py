#!/usr/bin/env python3
"""Pairwise OCR reconciliation tests using only self-created synthetic text."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from reconcile_ocr_engines import compare, read_run


def create_asset(root, name, source_hash, evidence_hash, text, question_count):
    p=root/name
    p.mkdir()
    t=(text+"\n").encode()
    (p/"image-0001.txt").write_bytes(t)
    a={"id":"image-0001","timeSeconds":None,"sha256":evidence_hash,
       "ocrStatus":"transcribed_needs_review","ocrTextFile":"image-0001.txt",
       "transcriptSha256":hashlib.sha256(t).hexdigest()}
    (p/"manifest.json").write_text(json.dumps({
        "inputSha256":source_hash,"ocrBackend":name,"sourcePlatform":"self_created",
        "items":[a]
    }))
    questions=[{"sourceItemId":"image-0001","questionNumber":str(i+1)}
               for i in range(question_count)]
    (p/"question-candidates.json").write_text(json.dumps({"questions":questions}))
    return p


class CompareOCRTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(prefix="ocr-compare-")
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        self.first=create_asset(self.root,"rapidocr","f"*64,"e"*64,
            "1. 6÷2×(1+2)\n2. -1.25<-1.2\n3. 5×(3+2)=25",3)
        self.second=create_asset(self.root,"ollama","f"*64,"e"*64,
            "1. 6÷2×(1+2)\n2. -1",2)

    def test_marks_missing_questions_high_priority(self):
        result=compare(self.first,self.second)
        self.assertEqual(result["comparedItemCount"],1)
        self.assertEqual(result["highPriorityCount"],1)
        self.assertEqual(result["items"][0]["questionCountByEngine"],{"rapidocr":3,"ollama":2})
        self.assertFalse(result["items"][0]["numericSequenceEqual"])
        self.assertTrue(result["items"][0]["needsManualReview"])

    def test_identical_content_is_agreement(self):
        src=self.root/"rapidocr"/"image-0001.txt"
        dst=self.root/"ollama"/"image-0001.txt"
        dst.write_bytes(src.read_bytes())
        m=self.second/"manifest.json"
        doc=json.loads(m.read_text())
        doc["items"][0]["transcriptSha256"]=hashlib.sha256(dst.read_bytes()).hexdigest()
        m.write_text(json.dumps(doc))
        q=self.second/"question-candidates.json"
        q.write_bytes((self.first/"question-candidates.json").read_bytes())
        result=compare(self.first,self.second)
        self.assertEqual(result["highPriorityCount"],0)
        self.assertEqual(result["mediumPriorityCount"],0)
        self.assertEqual(result["items"][0]["status"],"normalized_agreement")

    def test_reject_different_source(self):
        man=self.second/"manifest.json"
        d=json.loads(man.read_text())
        d["inputSha256"]="0"*64
        man.write_text(json.dumps(d))
        with self.assertRaises(ValueError):
            compare(self.first,self.second)

    def test_reject_changed_ocr_text(self):
        (self.second/"image-0001.txt").write_text("tampered",encoding="utf8")
        with self.assertRaises(ValueError):
            compare(self.first,self.second)


if __name__=="__main__":
    unittest.main(verbosity=2)
