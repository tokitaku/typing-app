import type { DailySummary, Question, Quiz } from "@/shared/types/study";

export type QuizListResponseDto = {
  quizzes: Quiz[];
};

export type QuestionListResponseDto = {
  questions: Question[];
};

export type StudySummaryResponseDto = Omit<DailySummary, "reviewBacklog">;
