export type Choice = { key: string; label: string };
export type LocalizedText = { stem: string; choices: Choice[]; solution?: string };

export type ExamProfile = {
  id: string;
  name: string;
  grades: string;
  durationSeconds: number;
  questionCount: number;
  initialScore: number;
  maxScore: number;
  wrongPenaltyMode: "fixed" | "quarter-points";
  wrongPenaltyValue: number;
  country?: string;
  year?: number;
  language?: string;
  sourceLabel?: string;
  nameZh?: string;
  nameEn?: string;
  gradesZh?: string;
  gradesEn?: string;
  sourceLabelZh?: string;
  sourceLabelEn?: string;
  studentReady?: boolean;
};

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
  assetUrlZh?: string;
  assetUrlEn?: string;
  studentAssetUrl?: string;
  studentAssetUrlZh?: string;
  studentAssetUrlEn?: string;
  verified?: boolean;
  sourceMeta?: unknown;
  localized?: { zh?: LocalizedText; en?: LocalizedText };
  review?: {
    translationStatus?: string;
    visualStatus?: string;
    verified?: boolean;
    visualVerified?: boolean;
    needsReview?: boolean;
    notes?: string;
  };
  examReady?: boolean;
};

export type PublicQuestion = Omit<Question,
  "answer" | "solution" | "sourceFile" | "sourceMeta" | "localized" | "review" | "examReady" | "studentAssetUrl" | "studentAssetUrlZh" | "studentAssetUrlEn"
>;
export type ExamBundle = { profile: ExamProfile; questions: Question[] };

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
