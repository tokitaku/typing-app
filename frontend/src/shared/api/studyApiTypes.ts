import type { DailySummary, Quiz } from "@/shared/types/study";

export type QuizListResponseDto = {
  quizzes: Quiz[];
};

export type StudySummaryResponseDto = Omit<DailySummary, "reviewBacklog">;
