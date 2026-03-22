import type { DailySummary, Question, QuizType } from "@/shared/types/study";

export type QuestionListResponseDto = {
  questions: Array<Omit<Question, "type"> & { type?: QuizType }>;
};

export type StudySummaryResponseDto = Omit<DailySummary, "reviewBacklog">;
