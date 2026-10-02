import Mathlib

/-- AMC 10A 2022 Q2: 27 minutes is closest to 7 laps. -/
theorem amc10_2022_q02 :
    |((15 : ℚ) / 57) * 27 - 7| < (1 : ℚ) / 2 := by
  norm_num [abs_of_nonneg]

/-- AMC 10A 2022 Q3: the three linear conditions force a difference of 5. -/
theorem amc10_2022_q03
    (a b c : ℝ)
    (hsum : a + b + c = 96)
    (hfirst : a = 6 * c)
    (hthird : c = b - 40) :
    |a - b| = 5 := by
  have hdiff : a - b = -5 := by
    linarith
  rw [hdiff]
  norm_num

/-- AMC 10A 2022 Q8, with the mean condition cleared of division. -/
theorem amc10_2022_q08
    (x : ℕ) (hx : 0 < x)
    (hmean : 20 + x = 6 * 1 ∨ 20 + x = 6 * 7 ∨
      20 + x = 6 * 5 ∨ 20 + x = 6 * 2 ∨ 20 + x = 6 * x) :
    x = 22 ∨ x = 10 ∨ x = 4 := by
  omega
