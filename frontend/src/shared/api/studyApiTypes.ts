import type { DailySummary, Question } from "@/shared/types/study";

export type QuestionListResponseDto = {
  questions: Question[];
};

export type TagListResponseDto = {
  tags: string[];
};

export type QuestionCreateRequestDto = {
  english: string;
  japanese: string;
  tags: string[];
};

export type QuestionUpdateRequestDto = {
  english?: string;
  japanese?: string;
  is_active?: boolean;
  tags?: string[];
};

export type StudySummaryResponseDto = Omit<DailySummary, "reviewBacklog">;
