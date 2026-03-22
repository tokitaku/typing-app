import type {
  Question,
  QuizProgress,
  StudyMode,
  StudyResult
} from "@/shared/types/study";

export const SESSION_QUESTION_COUNT = 10;

function shuffleQuizzes(items: Question[]): Question[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function buildQuizSet(
  quizzes: Question[],
  mode: StudyMode,
  missedIds: number[],
  tags: string[] = [],
  sessionQuestionCount = SESSION_QUESTION_COUNT
): Question[] {
  if (mode === "review") {
    const uniqueMissedIds = Array.from(new Set(missedIds));
    const reviewSet = quizzes.filter((quiz) => uniqueMissedIds.includes(quiz.id));
    return shuffleQuizzes(reviewSet).slice(0, sessionQuestionCount);
  }

  const filtered = quizzes.filter(
    (quiz) => tags.length === 0 || tags.some((tag) => quiz.tags.includes(tag))
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
