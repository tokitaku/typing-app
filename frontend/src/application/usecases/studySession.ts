import {
  buildQuizSet,
  calculateStudyResult
} from "@/domain/services/studyService";
import type {
  MistakeLog,
  Quiz,
  QuizProgress,
  Settings,
  StudyMode,
  StudyResult
} from "@/types/study";

type StartStudySessionInput = {
  quizzes: Quiz[];
  mode: StudyMode;
  reviewQueue: number[];
  settings: Settings;
  sessionQuestionCount?: number;
};

type StartStudySessionResult = {
  quizSet: Quiz[];
  isEmptyQuizSet: boolean;
};

type CompleteStudySessionInput = {
  mode: StudyMode;
  progressList: QuizProgress[];
  createStudyResult?: (progressList: QuizProgress[], mode: StudyMode) => StudyResult;
};

type CompleteStudySessionResult = {
  summary: StudyResult;
  nextReviewQueueIds: number[];
  recoveredIds: number[];
  mistakeLogs: MistakeLog[];
};

export function startStudySession({
  quizzes,
  mode,
  reviewQueue,
  settings,
  sessionQuestionCount
}: StartStudySessionInput): StartStudySessionResult {
  const quizSet = buildQuizSet(
    quizzes,
    mode,
    reviewQueue,
    settings.eikenLevels,
    settings.questionTypes,
    sessionQuestionCount
  );

  return {
    quizSet,
    isEmptyQuizSet: mode === "learn" && quizSet.length === 0
  };
}

export function completeStudySession({
  mode,
  progressList,
  createStudyResult = calculateStudyResult
}: CompleteStudySessionInput): CompleteStudySessionResult {
  const nextReviewQueueIds = progressList
    .filter((progress) => progress.wasMistaken)
    .map((progress) => progress.quizId);
  const recoveredIds = progressList
    .filter((progress) => !progress.wasMistaken)
    .map((progress) => progress.quizId);

  return {
    summary: createStudyResult(progressList, mode),
    nextReviewQueueIds,
    recoveredIds,
    mistakeLogs: progressList
      .filter((progress) => progress.wasMistaken)
      .map((progress) => ({
        question_id: progress.quizId,
        mistake_count: progress.mistakeCount,
        created_at: progress.completedAt
      }))
  };
}
