import type { DailySummary, StudyResult } from "@/shared/types/study";
import type { StudySummaryResponseDto } from "@/shared/api/studyApiTypes";

export type ResultScreenDto = {
  result: StudyResult | null;
  todaySummary: DailySummary;
};

type CreateResultScreenInput = {
  localResult: StudyResult | null;
  remoteResult?: StudyResult | null;
  localSummary: DailySummary;
  remoteSummary?: StudySummaryResponseDto | null;
  reviewQueueCount: number;
};

export function createResultScreenModel({
  localResult,
  remoteResult = null,
  localSummary,
  remoteSummary = null,
  reviewQueueCount
}: CreateResultScreenInput): ResultScreenDto {
  const todaySummary = remoteSummary
    ? { ...remoteSummary, reviewBacklog: reviewQueueCount }
    : { ...localSummary, reviewBacklog: reviewQueueCount };

  return {
    result: remoteResult ?? localResult,
    todaySummary
  };
}
