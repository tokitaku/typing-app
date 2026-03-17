import type { DailySummary, MistakeLog, Settings, StudyResult } from "@/types/study";

const REVIEW_QUEUE_KEY = "typing-app::review-queue";
const MISTAKE_LOG_KEY = "typing-app::mistake_log";
const STUDY_RESULT_KEY = "typing-app::study_result";
const LATEST_RESULT_KEY = "typing-app::latest-result";
const SETTINGS_KEY = "typing-app::settings";
const AVAILABLE_LEVELS = [1, 2, 3] as const;

const DEFAULT_SETTINGS: Settings = { levels: [1] };

function normalizeLevel(level: unknown): number | null {
  const numericLevel =
    typeof level === "number"
      ? level
      : typeof level === "string" && level.trim() !== ""
        ? Number(level)
        : Number.NaN;

  return AVAILABLE_LEVELS.includes(numericLevel as (typeof AVAILABLE_LEVELS)[number])
    ? numericLevel
    : null;
}

function normalizeSettings(input: unknown): Settings {
  const mergedSettings =
    typeof input === "object" && input !== null
      ? { ...DEFAULT_SETTINGS, ...(input as Partial<Settings>) }
      : DEFAULT_SETTINGS;
  const sourceLevels = Array.isArray(mergedSettings.levels)
    ? mergedSettings.levels
    : DEFAULT_SETTINGS.levels;
  const normalizedLevels = Array.from(
    new Set(
      sourceLevels
        .map((level) => normalizeLevel(level))
        .filter((level): level is number => level !== null)
    )
  ).sort((left, right) => left - right);

  return {
    ...DEFAULT_SETTINGS,
    levels:
      normalizedLevels.length > 0
        ? normalizedLevels
        : [...DEFAULT_SETTINGS.levels]
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

export function removeRecoveredProblemIds(ids: number[]) {
  const nextIds = getReviewQueue().filter((problemId) => !ids.includes(problemId));
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
