import type {
  DailySummary,
  MistakeLog,
  Settings,
  StudyResult
} from "@/shared/types/study";

const REVIEW_QUEUE_KEY = "typing-app::review-queue";
const MISTAKE_LOG_KEY = "typing-app::mistake_log";
const STUDY_RESULT_KEY = "typing-app::study_result";
const LATEST_RESULT_KEY = "typing-app::latest-result";
const SETTINGS_KEY = "typing-app::settings";

const DEFAULT_SETTINGS: Settings = {
  tags: []
};

function normalizeTag(tag: unknown): string | null {
  if (typeof tag !== "string") {
    return null;
  }

  const normalizedTag = tag.trim().toLowerCase();

  return normalizedTag === "" ? null : normalizedTag;
}

function normalizeSettings(input: unknown): Settings {
  const source =
    typeof input === "object" && input !== null
      ? (input as Partial<Settings>)
      : {};
  const tagsValue = source.tags;
  const sourceTags: unknown[] = Array.isArray(tagsValue)
    ? [...tagsValue]
    : [...DEFAULT_SETTINGS.tags];
  const normalizedTags = Array.from(
    new Set(
      sourceTags.map((tag) => normalizeTag(tag)).filter((tag): tag is string => tag !== null)
    )
  );

  return {
    ...DEFAULT_SETTINGS,
    tags: normalizedTags
  };
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getReviewQueue(): number[] {
  return safeRead<number[]>(REVIEW_QUEUE_KEY, []);
}

export function saveReviewQueue(ids: number[]) {
  const uniqueIds = Array.from(new Set(ids));
  safeWrite(REVIEW_QUEUE_KEY, uniqueIds);
}

export function appendReviewQueue(ids: number[]) {
  const existingIds = getReviewQueue();
  saveReviewQueue([...existingIds, ...ids]);
}

export function removeRecoveredQuizIds(ids: number[]) {
  const nextIds = getReviewQueue().filter((quizId) => !ids.includes(quizId));
  saveReviewQueue(nextIds);
}

export function appendMistakeLog(logs: MistakeLog[]) {
  const history = safeRead<MistakeLog[]>(MISTAKE_LOG_KEY, []);
  safeWrite(MISTAKE_LOG_KEY, [...logs, ...history].slice(0, 200));
}

export function saveLatestResult(result: StudyResult) {
  safeWrite(LATEST_RESULT_KEY, result);
}

export function getLatestResult(): StudyResult | null {
  return safeRead<StudyResult | null>(LATEST_RESULT_KEY, null);
}

export function appendStudyResult(result: StudyResult) {
  const history = safeRead<StudyResult[]>(STUDY_RESULT_KEY, []);
  safeWrite(STUDY_RESULT_KEY, [result, ...history].slice(0, 20));
}

export function getSettings(): Settings {
  const settings = safeRead<unknown>(SETTINGS_KEY, DEFAULT_SETTINGS);
  return normalizeSettings(settings);
}

export function saveSettings(settings: Settings): void {
  safeWrite(SETTINGS_KEY, normalizeSettings(settings));
}

export function getTodaySummary(): DailySummary {
  const history = safeRead<StudyResult[]>(STUDY_RESULT_KEY, []);
  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = history.filter((entry) => entry.created_at.startsWith(today));

  return {
    date: today,
    sessions: todaySessions.length,
    solvedProblems: todaySessions.reduce(
      (accumulator, entry) => accumulator + entry.total_questions,
      0
    ),
    reviewBacklog: getReviewQueue().length
  };
}
