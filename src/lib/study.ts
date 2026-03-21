import type {
  Problem,
  ProblemProgress,
  StudyResult,
  StudyMode
} from "@/types/study";

export type CharacterState = "correct" | "wrong" | "pending";
export const SESSION_QUESTION_COUNT = 10;

function shuffleProblems(items: Problem[]): Problem[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function buildProblemSet(
  problems: Problem[],
  mode: StudyMode,
  missedIds: number[],
  levels: number[] = [1, 2, 3],
  sessionQuestionCount = SESSION_QUESTION_COUNT
): Problem[] {
  if (mode === "review") {
    const uniqueMissedIds = Array.from(new Set(missedIds));
    const reviewSet = problems.filter((problem) => uniqueMissedIds.includes(problem.id));
    return shuffleProblems(reviewSet).slice(0, sessionQuestionCount);
  }

  const filtered = levels.length > 0
    ? problems.filter((problem) => levels.includes(problem.level))
    : problems;
  return shuffleProblems(filtered).slice(0, Math.min(sessionQuestionCount, filtered.length));
}

export function getCharacterStates(target: string, input: string): CharacterState[] {
  return Array.from(target).map((character, index) => {
    const typed = input[index];

    if (typed === undefined) {
      return "pending";
    }

    return typed === character ? "correct" : "wrong";
  });
}

export function countIncrementalMistakes(
  previousInput: string,
  nextInput: string,
  target: string
): number {
  if (!nextInput.startsWith(previousInput) || nextInput.length <= previousInput.length) {
    return 0;
  }

  let nextMistakes = 0;

  for (let index = previousInput.length; index < nextInput.length; index += 1) {
    if (nextInput[index] !== target[index]) {
      nextMistakes += 1;
    }
  }

  return nextMistakes;
}

export function calculateStudyResult(
  progressList: ProblemProgress[],
  mode: StudyMode
): StudyResult {
  const totalProblems = progressList.length;
  const totalMistakes = progressList.reduce(
    (accumulator, progress) => accumulator + progress.mistakeCount,
    0
  );
  const perfectAnswers = progressList.filter((progress) => !progress.wasMistaken).length;
  const totalDurationMs = progressList.reduce(
    (accumulator, progress) => accumulator + progress.durationMs,
    0
  );

  return {
    mode,
    total_questions: totalProblems,
    correct_rate:
      totalProblems === 0
        ? 0
        : Math.round((perfectAnswers / totalProblems) * 100),
    mistakes: totalMistakes,
    average_time:
      totalProblems === 0 ? 0 : Math.round(totalDurationMs / totalProblems),
    created_at: new Date().toISOString()
  };
}
