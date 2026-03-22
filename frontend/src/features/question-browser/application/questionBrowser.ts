import type { FetchQuestionListOptions } from "@/shared/api/studyApiClient";
import type { Question } from "@/shared/types/study";

export type QuestionBrowserFilters = {
  tags: string[];
  includeInactive: boolean;
};

export type QuestionBrowserStatus = "loading" | "error" | "loaded" | "empty";

export type QuestionBrowserFormState =
  | { mode: null }
  | { mode: "create" }
  | { mode: "edit"; question: Question };

type ResolveQuestionBrowserStatusInput = {
  isLoading: boolean;
  hasError: boolean;
  questions: Question[];
};

export function createDefaultQuestionBrowserFilters(): QuestionBrowserFilters {
  return {
    tags: [],
    includeInactive: false
  }; // 一覧閲覧の初期状態では有効問題のみを対象にする
}

export function createQuestionBrowserQuery(
  filters: QuestionBrowserFilters
): FetchQuestionListOptions {
  return {
    tags: filters.tags,
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

export function openCreateQuestionBrowserForm({
  current,
  isSubmitting
}: {
  current: QuestionBrowserFormState;
  isSubmitting: boolean;
}): QuestionBrowserFormState {
  if (isSubmitting) {
    return current; // 保存中はフォーム遷移させず現在のドラフトを維持する
  }

  return { mode: "create" };
}

export function openEditQuestionBrowserForm({
  current,
  isSubmitting,
  question
}: {
  current: QuestionBrowserFormState;
  isSubmitting: boolean;
  question: Question;
}): QuestionBrowserFormState {
  if (isSubmitting) {
    return current; // 保存中は別問題の編集に切り替えない
  }

  return { mode: "edit", question };
}

export function closeQuestionBrowserForm({
  current,
  isSubmitting
}: {
  current: QuestionBrowserFormState;
  isSubmitting: boolean;
}): QuestionBrowserFormState {
  if (isSubmitting) {
    return current; // 保存中はクローズも抑止して送信完了を待つ
  }

  return { mode: null };
}
