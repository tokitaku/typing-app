import {
  fetchQuestionListResponse,
  fetchTodayStudySummaryResponse
} from "@/shared/api/studyApiClient";

export async function fetchTodayStudySummary(signal?: AbortSignal) {
  return fetchTodayStudySummaryResponse(signal);
}

export async function fetchAvailableTags(signal?: AbortSignal): Promise<string[]> {
  const response = await fetchQuestionListResponse(
    {
      includeInactive: false
    },
    signal
  );

  return Array.from(
    new Set(response.questions.flatMap((question) => question.tags))
  ).sort((left, right) => left.localeCompare(right));
}
