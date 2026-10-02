import Mathlib

/-- AMC 10A 2022 Q10: the two Pythagorean constraints force area 18. -/
theorem amc10_2022_q10 (x y : ℝ)
    (hdiag : x^2 + y^2 = 64)
    (hcut : (x - 2)^2 + (y - 2)^2 = 32) :
    x * y = 18 := by
  nlinarith [sq_nonneg (x + y)]

/-- AMC 10A 2022 Q12: the response-count system forces 7 truth-tellers. -/
theorem amc10_2022_q12 (T L Ae Ao : ℕ)
    (htotal : T + L + Ae + Ao = 31)
    (hq1 : T + L + Ae = 22)
    (hq2 : L + Ae = 15)
    (_hq3 : Ae = 9) :
    T = 7 := by
  omega

/-- Integer form equivalent to the repeating-decimal condition in AMC 10A 2022 Q17. -/
def amc10Q17Holds (a b c : Nat) : Bool := decide (7*a = 3*b + 4*c)

theorem amc10_2022_q17_equiv (a b c : Nat) :
    (((100*a + 10*b + c : Nat) : ℚ) / 999 =
      (1 : ℚ) / 3 * (((a : ℚ) / 9) + ((b : ℚ) / 9) + ((c : ℚ) / 9))) ↔
    7*a = 3*b + 4*c := by
  constructor
  · intro h
    have hq : (7 : ℚ) * a = 3 * b + 4 * c := by
      push_cast at h
      field_simp at h
      linarith
    exact_mod_cast hq
  · intro h
    have hq : (7 : ℚ) * a = 3 * b + 4 * c := by
      exact_mod_cast h
    push_cast
    field_simp
    linarith

def amc10Q17Count : Nat :=
  (Finset.Icc 1 9).sum fun a =>
    (Finset.Icc 1 9).sum fun b =>
      (Finset.Icc 1 9).sum fun c =>
        if amc10Q17Holds a b c then 1 else 0

theorem amc10_2022_q17 : amc10Q17Count = 13 := by
  native_decide

/-- Angle recurrence (degrees modulo 360) induced by T₁,T₂,... in AMC 10A 2022 Q18. -/
def amc10Q18Angle : Nat → Nat
  | 0 => 0
  | n + 1 => (900 - ((n + 1) % 360) - amc10Q18Angle n) % 360

theorem amc10_2022_q18 :
    amc10Q18Angle 359 = 0 ∧
    (∀ n ∈ Finset.Icc 1 358, amc10Q18Angle n ≠ 0) := by
  native_decide

/-- Least common multiple of 1,...,n. -/
def amc10LcmUpTo : Nat → Nat
  | 0 => 1
  | n + 1 => Nat.lcm (amc10LcmUpTo n) (n + 1)

/-- AMC 10A 2022 Q19: exact common-denominator numerator and its residue mod 17. -/
theorem amc10_2022_q19 :
    let L := amc10LcmUpTo 17
    let h := (Finset.range 17).sum (fun k => L / (k + 1))
    ((h : ℚ) / L = (Finset.range 17).sum (fun k => (1 : ℚ) / ((k + 1 : Nat) : ℚ))) ∧ h % 17 = 5 := by
  native_decide

/-- Count digits below a threshold for a 5-digit string. -/
def amc10Q24LtCount (j a b c d e : Nat) : Nat :=
  (if a < j then 1 else 0) + (if b < j then 1 else 0) +
  (if c < j then 1 else 0) + (if d < j then 1 else 0) +
  (if e < j then 1 else 0)

def amc10Q24Good (a b c d e : Nat) : Bool :=
  decide (1 ≤ amc10Q24LtCount 1 a b c d e ∧
          2 ≤ amc10Q24LtCount 2 a b c d e ∧
          3 ≤ amc10Q24LtCount 3 a b c d e ∧
          4 ≤ amc10Q24LtCount 4 a b c d e)

def amc10Q24Count : Nat :=
  (Finset.range 5).sum fun a => (Finset.range 5).sum fun b =>
  (Finset.range 5).sum fun c => (Finset.range 5).sum fun d =>
  (Finset.range 5).sum fun e => if amc10Q24Good a b c d e then 1 else 0

theorem amc10_2022_q24 : amc10Q24Count = 1296 := by
  native_decide
