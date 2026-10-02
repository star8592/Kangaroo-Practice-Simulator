import Mathlib

theorem amc10_2022_q20
    (a b d r : ℤ)
    (ha1 : 0 < a + d)
    (ha2 : 0 < a + 2*d)
    (hb : 0 < b) (hr : 0 < r)
    (h1 : a + b = 57)
    (h2 : a + d + b*r = 60)
    (h3 : a + 2*d + b*r^2 = 91) :
    a + 3*d + b*r^3 = 206 := by
  have hlin1 : d + b*r - b = 3 := by linarith
  have hlin2 : 2*d + b*r^2 - b = 34 := by linarith
  have hpoly : b*r^2 - 2*b*r + b = 28 := by linarith
  have hfactor : b * (r - 1)^2 = 28 := by
    calc
      b * (r - 1)^2 = b*r^2 - 2*b*r + b := by ring
      _ = 28 := hpoly
  have hb1 : 1 ≤ b := by omega
  have hr1 : 1 ≤ r := by omega
  have hbr : r ≤ b*r := by
    have hnonneg : 0 ≤ (b - 1) * r := mul_nonneg (by omega) (by omega)
    nlinarith
  have hbr59 : b*r ≤ 59 := by linarith
  have hr59 : r ≤ 59 := le_trans hbr hbr59
  interval_cases r <;> norm_num at hfactor <;> norm_num <;> omega
