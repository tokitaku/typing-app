import {
  fetchQuestionListResponse,
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
