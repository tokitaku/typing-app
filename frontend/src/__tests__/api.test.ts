import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchQuizzes,
  fetchLatestStudyResult,
  fetchTodayStudySummary,
  saveStudyResult
} from "@/lib/api";
import type { Quiz, StudyResult } from "@/types/study";

const sampleResult: StudyResult = {
  mode: "learn",
  total_questions: 10,
  correct_rate: 90,
  mistakes: 1,
  average_time: 1234,
  created_at: "2026-03-21T01:23:45.000Z"
};

const sampleQuizzes: Quiz[] = [
  {
    id: 1,
    type: "word",
    english: "apple",
    japanese: "りんご",
    level: 1
  }
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("study result api", () => {
  it("fetches quizzes from the backend", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ quizzes: sampleQuizzes })
    }));

    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchQuizzes()).resolves.toEqual(sampleQuizzes);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/quizzes",
      expect.objectContaining({ cache: "no-store" })
    );
  });

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
