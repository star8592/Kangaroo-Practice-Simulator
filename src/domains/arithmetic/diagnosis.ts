import type { ArithmeticAttempt } from "./types";

export interface ArithmeticDiagnosis {
  accuracy: number;
  averageTimeMs: number;
  status: "stable" | "developing" | "needs_attention";
  reason: string;
}

export function diagnoseArithmetic(attempts: ArithmeticAttempt[]): ArithmeticDiagnosis {
  if (attempts.length === 0) {
    return {
      accuracy: 0,
      averageTimeMs: 0,
      status: "needs_attention",
      reason: "no_data",
    };
  }

  const correct = attempts.filter((item) => item.correct).length;
  const accuracy = correct / attempts.length;
  const averageTimeMs = attempts.reduce((sum, item) => sum + item.responseTimeMs, 0) / attempts.length;

  if (accuracy < 0.6) {
    return { accuracy, averageTimeMs, status: "needs_attention", reason: "accuracy_low" };
  }

  if (averageTimeMs > 5000) {
    return { accuracy, averageTimeMs, status: "developing", reason: "speed_low" };
  }

  return { accuracy, averageTimeMs, status: "stable", reason: "skill_stable" };
}
