import type { ArithmeticQuestion, ArithmeticSkill } from './types';

type GeneratorOptions = {
  grade: number;
  skill: ArithmeticSkill;
  difficulty?: number;
  count?: number;
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildAddition(id: number, difficulty: number): ArithmeticQuestion {
  const max = difficulty >= 3 ? 100 : difficulty === 2 ? 50 : 20;
  const a = randomInt(1, max);
  const b = randomInt(1, max);

  return {
    id: `arith-${id}`,
    grade: 1,
    skill: 'addition',
    expression: `${a}+${b}`,
    answer: a + b,
    difficulty,
  };
}

function buildSubtraction(id: number, difficulty: number): ArithmeticQuestion {
  const max = difficulty >= 3 ? 100 : difficulty === 2 ? 50 : 20;
  const a = randomInt(1, max);
  const b = randomInt(1, a);

  return {
    id: `arith-${id}`,
    grade: 1,
    skill: 'subtraction',
    expression: `${a}-${b}`,
    answer: a - b,
    difficulty,
  };
}

export function generateArithmeticQuestions(options: GeneratorOptions): ArithmeticQuestion[] {
  const count = options.count ?? 10;
  const difficulty = options.difficulty ?? 1;

  return Array.from({ length: count }, (_, index) => {
    if (options.skill === 'subtraction') {
      return buildSubtraction(index + 1, difficulty);
    }

    return buildAddition(index + 1, difficulty);
  }).map((question) => ({
    ...question,
    grade: options.grade,
    skill: options.skill,
  }));
}
