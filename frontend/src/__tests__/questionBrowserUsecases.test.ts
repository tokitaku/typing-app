import { describe, expect, it } from "vitest";
import {
  createDefaultQuestionBrowserFilters,
  createQuestionBrowserQuery,
  resolveQuestionBrowserStatus
} from "@/features/question-browser/application/questionBrowser";
import type { Question } from "@/shared/types/study";

const sampleQuestions: Question[] = [
  {
    id: 1,
    english: "apple",
    japanese: "りんご",
    isActive: true,
    tags: ["word"]
  }
];

describe("question browser use cases", () => {
  it("creates default filters for initial browsing", () => {
    expect(createDefaultQuestionBrowserFilters()).toEqual({
      tags: [],
      includeInactive: false
    });
  });

  it("builds a question query from filters", () => {
    expect(
      createQuestionBrowserQuery({
        tags: ["business", "daily"],
        includeInactive: true
      })
    ).toEqual({
      tags: ["business", "daily"],
      includeInactive: true
    });
  });

  it("returns loading while fetching", () => {
    expect(
      resolveQuestionBrowserStatus({
        isLoading: true,
        hasError: false,
        questions: []
      })
    ).toBe("loading");
  });

  it("returns error when the request fails", () => {
    expect(
      resolveQuestionBrowserStatus({
        isLoading: false,
        hasError: true,
        questions: []
      })
    ).toBe("error");
  });

  it("returns empty when no questions are loaded", () => {
    expect(
      resolveQuestionBrowserStatus({
        isLoading: false,
        hasError: false,
        questions: []
      })
    ).toBe("empty");
  });

  it("returns loaded when questions are available", () => {
    expect(
      resolveQuestionBrowserStatus({
        isLoading: false,
        hasError: false,
        questions: sampleQuestions
      })
    ).toBe("loaded");
  });
});
