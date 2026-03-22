import {
  buildQuizSet,
  calculateStudyResult
} from "@/features/study-session/model/session";
import type {
  MistakeLog,
  Question,
  QuizProgress,
  Settings,
  StudyMode,
  StudyResult
} from "@/shared/types/study";

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
  questions: Question[];
  mode: StudyMode;
  reviewQueue: number[];
  settings: Settings;
  sessionQuestionCount?: number;
};

type StartStudySessionResult = {
  quizSet: Question[];
  isEmptyQuizSet: boolean;
};

type CompleteStudySessionInput = {
  mode: StudyMode;
  progressList: QuizProgress[];
  createStudyResult?: typeof calculateStudyResult;
};

export function startStudySession({
  questions,
  mode,
  reviewQueue,
  settings,
  sessionQuestionCount
}: StartStudySessionInput): StartStudySessionResult {
  const quizSet = buildQuizSet(
    questions,
    mode,
    reviewQueue,
    settings.tags,
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
