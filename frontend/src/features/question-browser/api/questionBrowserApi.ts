import {
  createQuestionResponse,
  fetchQuestionListResponse,
  fetchTagListResponse,
  updateQuestionResponse,
  type FetchQuestionListOptions
} from "@/shared/api/studyApiClient";
import type {
  QuestionCreateRequestDto,
  QuestionUpdateRequestDto
} from "@/shared/api/studyApiTypes";
import type { Question } from "@/shared/types/study";

export async function fetchQuestions(
  options: FetchQuestionListOptions = {},
  signal?: AbortSignal
): Promise<Question[]> {
  const response = await fetchQuestionListResponse(options, signal);

  return response.questions; // API DTO から feature で扱う一覧へ展開する
}

export async function fetchAvailableTags(signal?: AbortSignal): Promise<string[]> {
  const response = await fetchTagListResponse(signal);

  return response.tags; // タグ候補一覧を返す
}

export async function createQuestion(data: QuestionCreateRequestDto): Promise<Question> {
  return createQuestionResponse(data); // 新規問題を作成して返す
}

export async function updateQuestion(
  id: number,
  data: QuestionUpdateRequestDto
): Promise<Question> {
  return updateQuestionResponse(id, data); // 問題を更新して返す
}
