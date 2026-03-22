import { describe, expect, it } from "vitest";
import {
  createHomeDashboardModel,
  toggleTag
} from "@/features/home-dashboard/application/homeDashboard";
import type { DailySummary, Settings } from "@/shared/types/study";

const settings: Settings = {
  tags: ["word", "sentence"]
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

  it("toggles tags and allows clearing all tags", () => {
    expect(toggleTag(settings, "word")).toEqual({
      tags: ["sentence"]
    });
    expect(toggleTag({ tags: ["word"] }, "word")).toEqual({
      tags: []
    });
    expect(toggleTag(settings, "business")).toEqual({
      tags: ["word", "sentence", "business"]
    });
  });
});
