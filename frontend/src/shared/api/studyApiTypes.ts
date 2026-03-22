import type { DailySummary, Question } from "@/shared/types/study";

export type QuestionListResponseDto = {
  questions: Question[];
};

export type StudySummaryResponseDto = Omit<DailySummary, "reviewBacklog">;
