import type {
  QuestionListResponseDto,
  StudySummaryResponseDto
} from "@/shared/api/studyApiTypes";
import type {
  Question,
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

export type QuestionListResponse = {
  questions: Question[];
};

async function readJsonResponse<T>(response: Response, errorMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${errorMessage}: ${response.status}`);
  }

  return await response.json() as T;
}

function resolveQuestionType(tags: string[], type?: QuizType): QuizType | undefined {
  if (type !== undefined) {
    return type; // 後方互換のため API が type を返す場合はそのまま使う
  }

  if (tags.includes("sentence")) {
    return "sentence"; // legacy question_type を引き継いだタグから種別を推定する
  }

  if (tags.includes("word")) {
    return "word"; // 単語タグがあれば一覧・学習画面で従来表示を維持する
  }

  return undefined
}

function shouldIncludeQuestion(question: Question, questionTypes?: QuizType[]): boolean {
  if (!questionTypes || questionTypes.length === 0) {
    return true; // 問題種別の UI フィルタ未指定時は全件返す
  }

  return question.type !== undefined && questionTypes.includes(question.type)
}

export async function fetchQuestionListResponse(
  options: FetchQuestionListOptions = {},
  signal?: AbortSignal
): Promise<QuestionListResponse> {
  const searchParams = new URLSearchParams();

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

  const payload = await readJsonResponse<QuestionListResponseDto>(response, "Failed to fetch questions");

  return {
    questions: payload.questions
      .map((question) => ({
        ...question,
        type: resolveQuestionType(question.tags, question.type)
      }))
      .filter((question) => shouldIncludeQuestion(question, options.questionTypes))
  };
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
