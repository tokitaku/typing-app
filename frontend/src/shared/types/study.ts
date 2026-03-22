export type QuizType = "word" | "sentence";
export type StudyMode = "learn" | "review";

export type Question = {
  id: number;
  type?: QuizType;
  english: string;
  japanese: string;
  isActive: boolean;
  tags: string[];
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

export type Settings = {
  tags: string[];
};
