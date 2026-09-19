export type ArithmeticSkill =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "mixed";

export interface ArithmeticQuestion {
  id: string;
  grade: number;
  skill: ArithmeticSkill;
  expression: string;
  answer: number;
  difficulty: number;
}

export interface ArithmeticAttempt {
  questionId: string;
  correct: boolean;
  responseTimeMs: number;
  errorType?: "wrong_answer" | "slow" | "unknown";
}

export interface ArithmeticSession {
  studentId: string;
  grade: number;
  questions: ArithmeticQuestion[];
  attempts: ArithmeticAttempt[];
}
