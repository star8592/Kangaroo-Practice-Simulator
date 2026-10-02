import Mathlib

example : (18 : ℤ)^2 - 2 * 65 = 194 := by
  norm_num

example (a b : ℝ) (h1 : a + b = 18) (h2 : a * b = 65) : a^2 + b^2 = 194 := by
  nlinarith [sq_nonneg (a + b)]
