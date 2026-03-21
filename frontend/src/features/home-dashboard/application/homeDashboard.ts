import type {
  DailySummary,
  EikenLevel,
  QuizType,
  Settings
} from "@/domain/models/study";
import type { StudySummaryResponseDto } from "@/shared/api/studyApiTypes";

export type HomeDashboardDto = {
  summary: DailySummary;
  settings: Settings;
};

type CreateHomeDashboardInput = {
  settings: Settings;
  reviewQueueCount: number;
  localSummary: DailySummary;
  remoteSummary?: StudySummaryResponseDto | null;
};

export function createHomeDashboardModel({
  settings,
  reviewQueueCount,
  localSummary,
  remoteSummary = null
}: CreateHomeDashboardInput): HomeDashboardDto {
  const summary = remoteSummary
    ? { ...remoteSummary, reviewBacklog: reviewQueueCount }
    : { ...localSummary, reviewBacklog: reviewQueueCount };

  return { summary, settings };
}

export function selectEikenLevel(settings: Settings, eikenLevel: EikenLevel): Settings {
  return {
    ...settings,
    eikenLevels: [eikenLevel]
  };
}

export function toggleQuestionType(settings: Settings, questionType: QuizType): Settings {
  const nextQuestionTypes = settings.questionTypes.includes(questionType)
    ? settings.questionTypes.filter((value) => value !== questionType)
    : [...settings.questionTypes, questionType];

  return {
    ...settings,
    questionTypes:
      nextQuestionTypes.length > 0 ? nextQuestionTypes : settings.questionTypes
  };
}
