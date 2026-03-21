import type {
  ResultScreenDto,
  StudySummaryResponseDto
} from "@/application/dtos/study";
import type { DailySummary, StudyResult } from "@/domain/models/study";

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
