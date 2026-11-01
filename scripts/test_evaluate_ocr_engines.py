#!/usr/bin/env python3
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parent))
from evaluate_ocr_engines import analyze,edit_distance,score_one

class OCRBenchTests(unittest.TestCase):
 def test_levenshtein(self):
  self.assertEqual(edit_distance("一二三","一二三"),0)
  self.assertEqual(edit_distance("12-3","12+3"),1)
  self.assertEqual(edit_distance("","甲乙"),2)
 def test_error_types(self):
  r=score_one({"id":"a","category":"math_formula","text":"1. 计算18×7=126",
               "critical_symbols":["×","="],"formulas":[r"\frac{3}{4}"]},
              {"id":"a","engine":"x","text":"1. 计算18x7=126",
               "formulas":[r"\frac{3}{4}"],"latency_ms":12})
  self.assertGreater(r["cer_edits"],0)
  self.assertFalse(r["critical_missing"]==0)
  self.assertTrue(r["numeric_exact"])
  self.assertEqual(r["formula_exact"],1)
 def test_numbers_loss(self):
  r=score_one({"id":"a","category":"math_formula","text":"20÷4=5"},
              {"id":"a","engine":"x","text":"20÷4=6"})
  self.assertFalse(r["numeric_exact"])
 def test_math_notation_equivalence(self):
  from evaluate_ocr_engines import math_canonical_text
  a=r"2. 将 \(\frac{3}{4}\) 化成小数，计算 \sqrt{49} \times 3^2 \neq 4"
  b="2. 将 3/4 化成小数，计算 √49 × 3² ≠ 4"
  self.assertEqual(math_canonical_text(a),math_canonical_text(b))
  self.assertNotEqual(math_canonical_text("1 - 2"),math_canonical_text("1 + 2"))
  self.assertNotEqual(math_canonical_text("0.3"),math_canonical_text("0.8"))

 def test_aggregation(self):
  g=[{"id":"a","category":"print","text":"武汉2026"},
     {"id":"b","category":"math","text":"1+2=3","critical_symbols":["+"]}]
  rows=[{"id":"a","engine":"E1","text":"武汉2026","latency_ms":100},
        {"id":"b","engine":"E1","text":"1+2=3","latency_ms":100},
        {"id":"a","engine":"E2","text":"武昌2026","latency_ms":10},
        {"id":"b","engine":"E2","text":"1-2=3","latency_ms":10}]
  x=analyze(g,rows)
  self.assertEqual(x["engines"]["E1"]["overall_cer"],0)
  self.assertEqual(x["engines"]["E2"]["samples"],2)
  self.assertGreater(x["engines"]["E2"]["overall_cer"],0)
  self.assertEqual(x["engines"]["E1"]["coverage"],1)
 def test_duplicate_prediction_rejected(self):
  g=[{"id":"a","category":"x","text":"正确"}]
  p=[{"id":"a","engine":"E1","text":"正确"},{"id":"a","engine":"E1","text":"错误"}]
  with self.assertRaises(ValueError):analyze(g,p)
 def test_invalid_gold_rejected(self):
  with self.assertRaises(ValueError):analyze([{"id":"a","category":"x","text":""}],
                                            [{"id":"a","engine":"E1","text":""}])

if __name__=="__main__":
 unittest.main(verbosity=2)
