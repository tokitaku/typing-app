import type { DailySummary, Question, QuizType } from "@/shared/types/study";

export type QuestionListResponseDto = {
  questions: Question[];
};

export type TagListResponseDto = {
  tags: string[];
};

export type QuestionCreateRequestDto = {
  question_type: QuizType;
  english: string;
  japanese: string;
  tags: string[];
};

export type QuestionUpdateRequestDto = {
  question_type?: QuizType;
  english?: string;
  japanese?: string;
  is_active?: boolean;
  tags?: string[];
};

export type StudySummaryResponseDto = Omit<DailySummary, "reviewBacklog">;
