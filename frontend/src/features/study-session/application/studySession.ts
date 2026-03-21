import {
  buildQuizSet,
  calculateStudyResult
} from "@/features/study-session/model/session";
import type {
  MistakeLog,
  Quiz,
  QuizProgress,
  Settings,
  StudyMode,
  StudyResult
} from "@/domain/models/study";

export type CompletedStudySessionDto = {
  summary: StudyResult;
  reviewQueueToAppend: number[];
  recoveredQuizIds: number[];
  mistakeLogs: MistakeLog[];
  latestResult: StudyResult;
  historyResult: StudyResult;
  nextRoute: "/result";
};

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
  createStudyResult?: typeof calculateStudyResult;
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
}: CompleteStudySessionInput): CompletedStudySessionDto {
  const reviewQueueToAppend = progressList
    .filter((progress) => progress.wasMistaken)
    .map((progress) => progress.quizId);
  const recoveredQuizIds = progressList
    .filter((progress) => !progress.wasMistaken)
    .map((progress) => progress.quizId);
  const summary = createStudyResult(progressList, mode);

  return {
    summary,
    reviewQueueToAppend,
    recoveredQuizIds,
    mistakeLogs: progressList
      .filter((progress) => progress.wasMistaken)
      .map((progress) => ({
        question_id: progress.quizId,
        mistake_count: progress.mistakeCount,
        created_at: progress.completedAt
      })),
    latestResult: summary,
    historyResult: summary,
    nextRoute: "/result"
  };
}
