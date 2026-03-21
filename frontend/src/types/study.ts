export type QuizType = "word" | "sentence";
export type StudyMode = "learn" | "review";

export type Quiz = {
  id: number;
  type: QuizType;
  english: string;
  japanese: string;
  level: number;
};

export type QuizListResponse = {
  quizzes: Quiz[];
};

export type QuizProgress = {
  quizId: number;
  durationMs: number;
  mistakeCount: number;
  wasMistaken: boolean;
  completedAt: string;
};

export type MistakeLog = {
  question_id: number;
  mistake_count: number;
  created_at: string;
};

export type StudyResult = {
  mode: StudyMode;
  total_questions: number;
  correct_rate: number;
  mistakes: number;
  average_time: number;
  created_at: string;
};

export type DailySummary = {
  date: string;
  sessions: number;
  solvedProblems: number;
  reviewBacklog: number;
};

export type StudySummaryResponse = Omit<DailySummary, "reviewBacklog">;

export type Settings = {
  levels: number[];
};
