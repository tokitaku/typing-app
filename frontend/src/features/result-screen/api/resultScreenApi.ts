import {
  fetchLatestStudyResultResponse,
  fetchTodayStudySummaryResponse
} from "@/shared/api/studyApiClient";

export async function fetchLatestStudyResult(signal?: AbortSignal) {
  return fetchLatestStudyResultResponse(signal);
}

export async function fetchTodayStudySummary(signal?: AbortSignal) {
  return fetchTodayStudySummaryResponse(signal);
}
