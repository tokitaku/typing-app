import type {
  DailySummary,
  MistakeLog,
  Quiz,
  Settings,
  StudyResult
} from "@/domain/models/study";

export type QuizListResponseDto = {
  quizzes: Quiz[];
};

export type StudySummaryResponseDto = Omit<DailySummary, "reviewBacklog">;

export type CompletedStudySessionDto = {
  summary: StudyResult;
  reviewQueueToAppend: number[];
  recoveredQuizIds: number[];
  mistakeLogs: MistakeLog[];
  latestResult: StudyResult;
  historyResult: StudyResult;
  nextRoute: "/result";
};

export type HomeDashboardDto = {
  summary: DailySummary;
  settings: Settings;
};

export type ResultScreenDto = {
  result: StudyResult | null;
  todaySummary: DailySummary;
};
