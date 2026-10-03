import Mathlib

/-- AMC 10A 2022 Q4: converting x miles/gallon to liters per 100 km. -/
theorem amc10_2022_q04
    (x m l : ℝ) (hx : x ≠ 0) :
    (100 * m / x) * l = 100 * l * m / x := by
  field_simp

/-- AMC 10A 2022 Q6: simplify the radical/absolute-value expression for a < 0. -/
theorem amc10_2022_q06 (a : ℝ) (ha : a < 0) :
    |a - 2 - Real.sqrt ((a - 1)^2)| = 3 - 2*a := by
  rw [Real.sqrt_sq_eq_abs]
  have h1 : a - 1 < 0 := by linarith
  rw [abs_of_neg h1]
  have h2 : a - 2 - (-(a - 1)) < 0 := by linarith
  rw [abs_of_neg h2]
  ring

/-- AMC 10A 2022 Q7: the lcm/gcd conditions force n = 60. -/
theorem amc10_2022_q07
    (n : ℕ) (hn : 0 < n)
    (hlcm : Nat.lcm n 18 = 180)
    (hgcd : Nat.gcd n 45 = 15) :
    n = 60 := by
  have hdvd : n ∣ 180 := by
    rw [← hlcm]
    exact Nat.dvd_lcm_left n 18
  have h15 : 15 ∣ n := by
    rw [← hgcd]
    exact Nat.gcd_dvd_left n 45
  rcases h15 with ⟨k, rfl⟩
  have hle : 15 * k ≤ 180 := Nat.le_of_dvd (by norm_num) hdvd
  have hk : k ≤ 12 := by omega
  interval_cases k
  all_goals norm_num at hlcm
  all_goals norm_num at hgcd
  all_goals norm_num

/-- AMC 10A 2022 Q16: Vieta gives the enlarged box volume directly. -/
theorem amc10_2022_q16
    (a b c : ℝ)
    (hsum : a + b + c = 39 / 10)
    (hpairs : a*b + a*c + b*c = 29 / 10)
    (hprod : a*b*c = 3 / 5) :
    (a + 2) * (b + 2) * (c + 2) = 30 := by
  nlinarith

/-- AMC 8 2024 Q1: ones digit of the stated integer expression. -/
theorem amc8_2024_q01 :
    (222222 - 22222 - 2222 - 222 - 22 - 2 : ℕ) % 10 = 2 := by
  norm_num

/-- AMC 8 2024 Q3: visible gray area is 7²-4² plus 10²-9² = 52. -/
theorem amc8_2024_q03 :
    (7^2 - 4^2 : ℕ) + (10^2 - 9^2 : ℕ) = 52 := by
  norm_num
