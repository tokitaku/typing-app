import {
  fetchQuestionListResponse,
  patchQuestion,
  type FetchQuestionListOptions
} from "@/shared/api/studyApiClient";
import type { Question } from "@/shared/types/study";

export async function fetchQuestions(
  options: FetchQuestionListOptions = {},
  signal?: AbortSignal
): Promise<Question[]> {
  const response = await fetchQuestionListResponse(options, signal);

  return response.questions; // API DTO から feature で扱う一覧へ展開する
}

export async function updateQuestionTags(
  questionId: number,
  tags: string[]
): Promise<Question> {
  return patchQuestion(questionId, { tags }); // タグ一覧を全置換して更新する
}
