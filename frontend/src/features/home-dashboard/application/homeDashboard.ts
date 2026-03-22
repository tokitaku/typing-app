import type {
  DailySummary,
  Settings
} from "@/shared/types/study";
import type { StudySummaryResponseDto } from "@/shared/api/studyApiTypes";

export type HomeDashboardDto = {
  summary: DailySummary;
  settings: Settings;
  availableTags: string[];
};

type CreateHomeDashboardInput = {
  settings: Settings;
  reviewQueueCount: number;
  localSummary: DailySummary;
  availableTags?: string[];
  remoteSummary?: StudySummaryResponseDto | null;
};

export function createHomeDashboardModel({
  settings,
  reviewQueueCount,
  localSummary,
  availableTags = [],
  remoteSummary = null
}: CreateHomeDashboardInput): HomeDashboardDto {
  const summary = remoteSummary
    ? { ...remoteSummary, reviewBacklog: reviewQueueCount }
    : { ...localSummary, reviewBacklog: reviewQueueCount };

  return { summary, settings, availableTags };
}

export function toggleTag(settings: Settings, tag: string): Settings {
  const nextTags = settings.tags.includes(tag)
    ? settings.tags.filter((value) => value !== tag)
    : [...settings.tags, tag];

  return {
    ...settings,
    tags: nextTags
  };
}
