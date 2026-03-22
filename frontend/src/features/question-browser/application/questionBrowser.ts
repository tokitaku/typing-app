import type { FetchQuestionListOptions } from "@/shared/api/studyApiClient";
import type { EikenLevel, Question, QuizType } from "@/shared/types/study";

export type QuestionBrowserFilters = {
  eikenLevels: EikenLevel[];
  questionTypes: QuizType[];
  includeInactive: boolean;
};

export type QuestionBrowserStatus = "loading" | "error" | "loaded" | "empty";

type ResolveQuestionBrowserStatusInput = {
  isLoading: boolean;
  hasError: boolean;
  questions: Question[];
};

export function createDefaultQuestionBrowserFilters(): QuestionBrowserFilters {
  return {
    eikenLevels: [],
    questionTypes: [],
    includeInactive: false
  }; // 一覧閲覧の初期状態では有効問題のみを対象にする
}

export function createQuestionBrowserQuery(
  filters: QuestionBrowserFilters
): FetchQuestionListOptions {
  return {
    eikenLevels: filters.eikenLevels,
    questionTypes: filters.questionTypes,
    includeInactive: filters.includeInactive
  }; // filter state を API query 契約へそのまま写像する
}

export function resolveQuestionBrowserStatus({
  isLoading,
  hasError,
  questions
}: ResolveQuestionBrowserStatusInput): QuestionBrowserStatus {
  if (isLoading) {
    return "loading";
  }

  if (hasError) {
    return "error";
  }

  if (questions.length === 0) {
    return "empty";
  }

  return "loaded";
}
