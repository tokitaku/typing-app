import type { StudyResult } from "@/domain/models/study";
import type {
  QuizListResponseDto,
  StudySummaryResponseDto
} from "@/shared/api/studyApiTypes";

const DEFAULT_API_BASE_URL = "http://localhost:8000";

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

async function readJsonResponse<T>(response: Response, errorMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${errorMessage}: ${response.status}`);
  }

  return await response.json() as T;
}

export async function fetchQuizList(
  queryString = "",
  signal?: AbortSignal
): Promise<QuizListResponseDto> {
  const response = await fetch(`${getApiBaseUrl()}/quizzes${queryString}`, {
    cache: "no-store",
    signal
  });

  return readJsonResponse<QuizListResponseDto>(response, "Failed to fetch quizzes");
}

export async function postStudyResult(result: StudyResult): Promise<StudyResult> {
  const response = await fetch(`${getApiBaseUrl()}/study-results`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(result)
  });

  return readJsonResponse<StudyResult>(response, "Failed to save study result");
}

export async function fetchLatestStudyResultResponse(
  signal?: AbortSignal
): Promise<StudyResult | null> {
  const response = await fetch(`${getApiBaseUrl()}/study-results/latest`, {
    cache: "no-store",
    signal
  });

  if (response.status === 404) {
    return null;
  }

  return readJsonResponse<StudyResult>(response, "Failed to fetch latest study result");
}

export async function fetchTodayStudySummaryResponse(
  signal?: AbortSignal
): Promise<StudySummaryResponseDto> {
  const response = await fetch(`${getApiBaseUrl()}/study-results/summary/today`, {
    cache: "no-store",
    signal
  });

  return readJsonResponse<StudySummaryResponseDto>(
    response,
    "Failed to fetch today summary"
  );
}
