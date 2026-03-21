export type QuizType = "word" | "sentence";
export type StudyMode = "learn" | "review";
export type EikenLevel = "5" | "4" | "3" | "pre2" | "2" | "pre1" | "1";

export type Quiz = {
  id: number;
  type: QuizType;
  eikenLevel: EikenLevel;
  english: string;
  japanese: string;
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
  eikenLevels: EikenLevel[];
  questionTypes: QuizType[];
};
