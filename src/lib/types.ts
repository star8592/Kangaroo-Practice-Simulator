export type Choice = { key: string; label: string };

export type Question = {
  id: string;
  year: number;
  level: string;
  grades: string;
  language: string;
  questionNo: number;
  points: 3 | 4 | 5;
  concept: string;
  stem: string;
  stemEn?: string;
  choices: Choice[];
  choicesEn?: Choice[];
  answer: string;
  solution: string;
  sourceFile: string;
  assetUrl?: string;
  verified?: boolean;
};

export type PublicQuestion = Omit<Question, "answer" | "solution" | "sourceFile">;

export type ExamResultItem = {
  questionId: string;
  questionNo: number;
  selected: string | null;
  correctAnswer: string;
  correct: boolean | null;
  scoreDelta: number;
  points: number;
  concept: string;
  solution: string;
};

export type GradeResult = {
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  blank: number;
  items: ExamResultItem[];
  byPoints: Record<string, { correct: number; total: number }>;
  byConcept: Record<string, { correct: number; total: number }>;
};
