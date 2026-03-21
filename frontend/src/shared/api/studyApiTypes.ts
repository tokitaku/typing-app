import type { DailySummary, Quiz } from "@/domain/models/study";

export type QuizListResponseDto = {
  quizzes: Quiz[];
};

export type StudySummaryResponseDto = Omit<DailySummary, "reviewBacklog">;
