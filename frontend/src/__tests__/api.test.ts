import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchStudyQuestions,
  saveStudyResult
} from "@/features/study-session/api/studySessionApi";
import {
  fetchLatestStudyResult,
  fetchTodayStudySummary
} from "@/features/result-screen/api/resultScreenApi";
import { fetchQuestionListResponse } from "@/shared/api/studyApiClient";
import type { Question, StudyResult } from "@/shared/types/study";

const sampleResult: StudyResult = {
  mode: "learn",
  total_questions: 10,
  correct_rate: 90,
  mistakes: 1,
  average_time: 1234,
  created_at: "2026-03-21T01:23:45.000Z"
};

const sampleQuestions: Question[] = [
  {
    id: 1,
    english: "apple",
    japanese: "りんご",
    isActive: true,
    tags: ["word", "daily"]
  }
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("study result api", () => {
  it("fetches study questions from the backend", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ questions: sampleQuestions })
    }));

    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchStudyQuestions()).resolves.toEqual(sampleQuestions);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/questions?include_inactive=false",
      expect.objectContaining({ cache: "no-store" })
    );
  });

  it("fetches study questions with filters when requested", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ questions: sampleQuestions })
    }));

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchStudyQuestions({
        tags: ["business", "daily"]
      })
    ).resolves.toEqual(sampleQuestions);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/questions?tags=business%2Cdaily&include_inactive=false",
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

  it("fetches questions with tag filters", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ questions: sampleQuestions })
    }));

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchQuestionListResponse({
        tags: ["business"],
        includeInactive: false
      })
    ).resolves.toEqual({
      questions: sampleQuestions
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/questions?tags=business&include_inactive=false",
      expect.objectContaining({ cache: "no-store" })
    );
  });

  it("fetches questions without filters when no options are provided", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ questions: sampleQuestions })
    }));

    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchQuestionListResponse()).resolves.toEqual({
      questions: sampleQuestions
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/questions",
      expect.objectContaining({ cache: "no-store" })
    );
  });
});

import {
  createQuestionResponse,
  fetchTagListResponse,
  updateQuestionResponse
} from "@/shared/api/studyApiClient";

describe("question management api", () => {
  it("fetches available tags from the backend", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ tags: ["business", "daily", "word"] })
    }));

    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTagListResponse()).resolves.toEqual({
      tags: ["business", "daily", "word"]
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/tags",
      expect.objectContaining({ cache: "no-store" })
    );
  });

  it("posts a new question to the backend", async () => {
    const created: Question = {
      id: 42,
      english: "I love programming.",
      japanese: "私はプログラミングが好きです。",
      isActive: true,
      tags: ["daily", "hobby"]
    };

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => created
    }));

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createQuestionResponse({
        english: "I love programming.",
        japanese: "私はプログラミングが好きです。",
        tags: ["daily", "hobby"]
      })
    ).resolves.toEqual(created);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/questions",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })
    );
  });

  it("patches an existing question on the backend", async () => {
    const updated: Question = {
      id: 5,
      english: "notebook",
      japanese: "ノート",
      isActive: false,
      tags: ["office"]
    };

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => updated
    }));

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      updateQuestionResponse(5, { is_active: false, tags: ["office"] })
    ).resolves.toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/questions/5",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      })
    );
  });
});
