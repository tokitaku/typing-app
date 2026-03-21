import { describe, expect, it } from "vitest";
import {
  createHomeDashboardModel,
  selectEikenLevel,
  toggleQuestionType
} from "@/features/home-dashboard/application/homeDashboard";
import type { DailySummary, Settings } from "@/domain/models/study";

const settings: Settings = {
  eikenLevels: ["5"],
  questionTypes: ["word", "sentence"]
};

const localSummary: DailySummary = {
  date: "2026-03-21",
  sessions: 1,
  solvedProblems: 10,
  reviewBacklog: 3
};

describe("home dashboard use cases", () => {
  it("builds dashboard summary from remote aggregate and local backlog", () => {
    const result = createHomeDashboardModel({
      settings,
      reviewQueueCount: 4,
      localSummary,
      remoteSummary: {
        date: "2026-03-21",
        sessions: 2,
        solvedProblems: 16
      }
    });

    expect(result.settings).toEqual(settings);
    expect(result.summary).toEqual({
      date: "2026-03-21",
      sessions: 2,
      solvedProblems: 16,
      reviewBacklog: 4
    });
  });

  it("replaces the selected eiken level", () => {
    expect(selectEikenLevel(settings, "pre2")).toEqual({
      eikenLevels: ["pre2"],
      questionTypes: ["word", "sentence"]
    });
  });

  it("does not allow removing the last question type", () => {
    const wordOnly: Settings = {
      eikenLevels: ["5"],
      questionTypes: ["word"]
    };

    expect(toggleQuestionType(settings, "word")).toEqual({
      eikenLevels: ["5"],
      questionTypes: ["sentence"]
    });
    expect(toggleQuestionType(wordOnly, "word")).toEqual(wordOnly);
  });
});
