import {
  fetchQuestionListResponse,
  postStudyResult
} from "@/shared/api/studyApiClient";
import type { Question, StudyResult } from "@/shared/types/study";

export type FetchStudyQuestionsOptions = {
  tags?: string[];
};

export async function fetchStudyQuestions(
  options: FetchStudyQuestionsOptions = {},
  signal?: AbortSignal
): Promise<Question[]> {
  const response = await fetchQuestionListResponse(
    {
      ...options,
      includeInactive: false // 出題導線では inactive 問題を返さない契約に統一する
    },
    signal
  );

  return response.questions;
}

export async function saveStudyResult(result: StudyResult): Promise<StudyResult> {
  return postStudyResult(result);
}
