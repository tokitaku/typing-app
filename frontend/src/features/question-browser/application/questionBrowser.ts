import type { FetchQuestionListOptions } from "@/shared/api/studyApiClient";
import type { Question, QuizType } from "@/shared/types/study";

export type QuestionBrowserFilters = {
  tags: string[];
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
    tags: [],
    questionTypes: [],
    includeInactive: false
  }; // 一覧閲覧の初期状態では有効問題のみを対象にする
}

export function createQuestionBrowserQuery(
  filters: QuestionBrowserFilters
): FetchQuestionListOptions {
  return {
    tags: filters.tags,
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

export function normalizeTagInput(value: string): string {
  return value.trim().toLowerCase(); // バックエンドの正規化ルールに合わせる
}

export function getTagSuggestions(
  availableTags: string[],
  currentTags: string[],
  input: string
): string[] {
  const excluded = new Set(currentTags);
  const candidates = availableTags.filter((tag) => !excluded.has(tag));
  const normalized = normalizeTagInput(input);

  if (!normalized) {
    return candidates; // 入力がなければ未選択タグをすべて候補とする
  }

  return candidates.filter((tag) => tag.includes(normalized)); // 前方一致ではなく部分一致で候補を絞る
}
