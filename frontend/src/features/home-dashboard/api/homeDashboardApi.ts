import { fetchTodayStudySummaryResponse } from "@/shared/api/studyApiClient";

export async function fetchTodayStudySummary(signal?: AbortSignal) {
  return fetchTodayStudySummaryResponse(signal);
}
