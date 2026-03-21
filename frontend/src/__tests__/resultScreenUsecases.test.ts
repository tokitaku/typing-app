import { describe, expect, it } from "vitest";
import { createResultScreenModel } from "@/features/result-screen/application/resultScreen";
import type { DailySummary, StudyResult } from "@/domain/models/study";

const localResult: StudyResult = {
  mode: "learn",
  total_questions: 10,
  correct_rate: 80,
  mistakes: 2,
  average_time: 1300,
  created_at: "2026-03-21T01:23:45.000Z"
};

const localSummary: DailySummary = {
  date: "2026-03-21",
  sessions: 1,
  solvedProblems: 10,
  reviewBacklog: 3
};

describe("result screen use cases", () => {
  it("prefers remote result and remote summary when available", () => {
    const remoteResult: StudyResult = {
      ...localResult,
      correct_rate: 90
    };

    const result = createResultScreenModel({
      localResult,
      remoteResult,
      localSummary,
      remoteSummary: {
        date: "2026-03-21",
        sessions: 2,
        solvedProblems: 18
      },
      reviewQueueCount: 4
    });

    expect(result.result).toEqual(remoteResult);
    expect(result.todaySummary).toEqual({
      date: "2026-03-21",
      sessions: 2,
      solvedProblems: 18,
      reviewBacklog: 4
    });
  });

  it("falls back to local state when remote data is unavailable", () => {
    const result = createResultScreenModel({
      localResult,
      localSummary,
      reviewQueueCount: 3
    });

    expect(result.result).toEqual(localResult);
    expect(result.todaySummary).toEqual(localSummary);
  });
});
