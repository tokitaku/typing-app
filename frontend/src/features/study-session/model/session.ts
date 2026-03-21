import type {
  EikenLevel,
  Quiz,
  QuizProgress,
  QuizType,
  StudyMode,
  StudyResult
} from "@/shared/types/study";

export const SESSION_QUESTION_COUNT = 10;

function shuffleQuizzes(items: Quiz[]): Quiz[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function buildQuizSet(
  quizzes: Quiz[],
  mode: StudyMode,
  missedIds: number[],
  eikenLevels: EikenLevel[] = ["5", "4", "3", "pre2", "2", "pre1", "1"],
  questionTypes: QuizType[] = ["word", "sentence"],
  sessionQuestionCount = SESSION_QUESTION_COUNT
): Quiz[] {
  if (mode === "review") {
    const uniqueMissedIds = Array.from(new Set(missedIds));
    const reviewSet = quizzes.filter((quiz) => uniqueMissedIds.includes(quiz.id));
    return shuffleQuizzes(reviewSet).slice(0, sessionQuestionCount);
  }

  const filtered = quizzes.filter(
    (quiz) =>
      (eikenLevels.length === 0 || eikenLevels.includes(quiz.eikenLevel)) &&
      (questionTypes.length === 0 || questionTypes.includes(quiz.type))
  );
  return shuffleQuizzes(filtered).slice(0, Math.min(sessionQuestionCount, filtered.length));
}

export function calculateStudyResult(
  progressList: QuizProgress[],
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
