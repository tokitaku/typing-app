import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchLatestStudyResult,
  fetchTodayStudySummary,
  saveStudyResult
} from "@/lib/api";
import type { StudyResult } from "@/types/study";

const sampleResult: StudyResult = {
  mode: "learn",
  total_questions: 10,
  correct_rate: 90,
  mistakes: 1,
  average_time: 1234,
  created_at: "2026-03-21T01:23:45.000Z"
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("study result api", () => {
  it("posts study results to the backend", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => sampleResult
    }));

    vi.stubGlobal("fetch", fetchMock);

    await expect(saveStudyResult(sampleResult)).resolves.toEqual(sampleResult);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/study-results",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleResult)
      })
    );
  });

  it("fetches the latest study result from the backend", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => sampleResult
    }));

    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchLatestStudyResult()).resolves.toEqual(sampleResult);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/study-results/latest",
      expect.objectContaining({ cache: "no-store" })
    );
  });

  it("fetches today's aggregated study summary from the backend", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        date: "2026-03-21",
        sessions: 2,
        solvedProblems: 16
      })
    }));

    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTodayStudySummary()).resolves.toEqual({
      date: "2026-03-21",
      sessions: 2,
      solvedProblems: 16
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/study-results/summary/today",
      expect.objectContaining({ cache: "no-store" })
    );
  });
});
