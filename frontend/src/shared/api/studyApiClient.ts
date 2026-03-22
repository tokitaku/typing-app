import type {
  QuestionListResponseDto,
  StudySummaryResponseDto
} from "@/shared/api/studyApiTypes";
import type {
  QuizType,
  StudyResult
} from "@/shared/types/study";

const DEFAULT_API_BASE_URL = "http://localhost:8000";

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

export type FetchQuestionListOptions = {
  questionTypes?: QuizType[];
  tags?: string[];
  includeInactive?: boolean;
};

async function readJsonResponse<T>(response: Response, errorMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${errorMessage}: ${response.status}`);
  }

  return await response.json() as T;
}

export async function fetchQuestionListResponse(
  options: FetchQuestionListOptions = {},
  signal?: AbortSignal
): Promise<QuestionListResponseDto> {
  const searchParams = new URLSearchParams();

  if (options.questionTypes && options.questionTypes.length > 0) {
    searchParams.set("question_types", options.questionTypes.join(",")); // 問題種別フィルタを API 契約へ変換する
  }

  if (options.tags && options.tags.length > 0) {
    searchParams.set("tags", options.tags.join(",")); // タグフィルタを API 契約へ変換する
  }

  if (options.includeInactive !== undefined) {
    searchParams.set("include_inactive", String(options.includeInactive)); // true/false を query string へ明示的に変換する
  }

  const queryString = searchParams.toString();
  const response = await fetch(
    `${getApiBaseUrl()}/questions${queryString ? `?${queryString}` : ""}`,
    {
      cache: "no-store",
      signal
    }
  );

  return readJsonResponse<QuestionListResponseDto>(response, "Failed to fetch questions");
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

export async function patchQuestion(
  questionId: number,
  payload: { tags?: string[] }
): Promise<Question> {
  const response = await fetch(`${getApiBaseUrl()}/questions/${questionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }); // タグ更新などの部分変更を PATCH エンドポイントへ委譲する

  return readJsonResponse<Question>(response, "Failed to update question");
}
