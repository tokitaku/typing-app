import type {
  EikenLevel,
  Quiz,
  QuizListResponse,
  QuizType,
  StudyResult,
  StudySummaryResponse
} from "@/types/study";

const DEFAULT_API_BASE_URL = "http://localhost:8000";

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

export type FetchQuizzesOptions = {
  eikenLevels?: EikenLevel[];
  questionTypes?: QuizType[];
};

async function readJsonResponse<T>(response: Response, errorMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${errorMessage}: ${response.status}`);
  }

  return await response.json() as T;
}

export async function fetchQuizzes(
  options: FetchQuizzesOptions = {},
  signal?: AbortSignal
): Promise<Quiz[]> {
  const searchParams = new URLSearchParams();

  if (options.eikenLevels && options.eikenLevels.length > 0) {
    searchParams.set("eiken_levels", options.eikenLevels.join(",")); // 英検級フィルタを付与する
  }

  if (options.questionTypes && options.questionTypes.length > 0) {
    searchParams.set("question_types", options.questionTypes.join(",")); // 種別フィルタを付与する
  }

  const queryString = searchParams.toString();
  const url = `${getApiBaseUrl()}/quizzes${queryString ? `?${queryString}` : ""}`;
  const response = await fetch(url, {
    cache: "no-store",
    signal
  });

  const body = await readJsonResponse<QuizListResponse>(
    response,
    "Failed to fetch quizzes"
  );

  return body.quizzes;
}

export async function saveStudyResult(result: StudyResult): Promise<StudyResult> {
  const response = await fetch(`${getApiBaseUrl()}/study-results`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(result)
  });

  return readJsonResponse<StudyResult>(response, "Failed to save study result");
}

export async function fetchLatestStudyResult(
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

export async function fetchTodayStudySummary(
  signal?: AbortSignal
): Promise<StudySummaryResponse> {
  const response = await fetch(`${getApiBaseUrl()}/study-results/summary/today`, {
    cache: "no-store",
    signal
  });

  return readJsonResponse<StudySummaryResponse>(
    response,
    "Failed to fetch today summary"
  );
}
