import type {
  DailySummary,
  MistakeLog,
  Settings,
  StudyResult
} from "@/domain/models/study";

const REVIEW_QUEUE_KEY = "typing-app::review-queue";
const MISTAKE_LOG_KEY = "typing-app::mistake_log";
const STUDY_RESULT_KEY = "typing-app::study_result";
const LATEST_RESULT_KEY = "typing-app::latest-result";
const SETTINGS_KEY = "typing-app::settings";
const AVAILABLE_EIKEN_LEVELS = ["5", "4", "3", "pre2", "2", "pre1", "1"] as const;
const AVAILABLE_QUESTION_TYPES = ["word", "sentence"] as const;
const LEGACY_LEVEL_TO_EIKEN_LEVEL: Record<number, (typeof AVAILABLE_EIKEN_LEVELS)[number]> = {
  1: "5",
  2: "4",
  3: "3"
};

const DEFAULT_SETTINGS: Settings = {
  eikenLevels: ["5"],
  questionTypes: ["word", "sentence"]
};

function normalizeEikenLevel(level: unknown): Settings["eikenLevels"][number] | null {
  if (typeof level === "string") {
    const normalizedLevel = level.trim();

    return AVAILABLE_EIKEN_LEVELS.includes(
      normalizedLevel as (typeof AVAILABLE_EIKEN_LEVELS)[number]
    )
      ? (normalizedLevel as (typeof AVAILABLE_EIKEN_LEVELS)[number])
      : null;
  }

  if (typeof level === "number") {
    return LEGACY_LEVEL_TO_EIKEN_LEVEL[level] ?? null;
  }

  return null;
}

function normalizeQuestionType(type: unknown): Settings["questionTypes"][number] | null {
  if (typeof type !== "string") {
    return null;
  }

  const normalizedType = type.trim();

  return AVAILABLE_QUESTION_TYPES.includes(
    normalizedType as (typeof AVAILABLE_QUESTION_TYPES)[number]
  )
    ? (normalizedType as (typeof AVAILABLE_QUESTION_TYPES)[number])
    : null;
}

function normalizeSettings(input: unknown): Settings {
  const mergedSettings =
    typeof input === "object" && input !== null
      ? { ...DEFAULT_SETTINGS, ...(input as Partial<Settings>) }
      : DEFAULT_SETTINGS;
  const eikenLevelsValue = (mergedSettings as Partial<Settings>).eikenLevels;
  const legacyLevelsValue = (mergedSettings as { levels?: unknown[] }).levels;
  const questionTypesValue = mergedSettings.questionTypes;
  const sourceEikenLevels: unknown[] = Array.isArray(eikenLevelsValue)
    ? [...eikenLevelsValue]
    : Array.isArray(legacyLevelsValue)
      ? [...legacyLevelsValue]
      : [...DEFAULT_SETTINGS.eikenLevels];
  const sourceQuestionTypes: unknown[] = Array.isArray(questionTypesValue)
    ? [...questionTypesValue]
    : [...DEFAULT_SETTINGS.questionTypes];
  const normalizedEikenLevels = Array.from(
    new Set(
      sourceEikenLevels
        .map((level) => normalizeEikenLevel(level))
        .filter((level): level is Settings["eikenLevels"][number] => level !== null)
    )
  );
  const normalizedQuestionTypes = Array.from(
    new Set(
      sourceQuestionTypes
        .map((type) => normalizeQuestionType(type))
        .filter((type): type is Settings["questionTypes"][number] => type !== null)
    )
  );

  return {
    ...DEFAULT_SETTINGS,
    eikenLevels:
      normalizedEikenLevels.length > 0
        ? normalizedEikenLevels
        : [...DEFAULT_SETTINGS.eikenLevels],
    questionTypes:
      normalizedQuestionTypes.length > 0
        ? normalizedQuestionTypes
        : [...DEFAULT_SETTINGS.questionTypes]
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
