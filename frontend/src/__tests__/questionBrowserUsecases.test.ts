import { describe, expect, it } from "vitest";
import {
  createDefaultQuestionBrowserFilters,
  createQuestionBrowserQuery,
  getTagSuggestions,
  normalizeTagInput,
  resolveQuestionBrowserStatus
} from "@/features/question-browser/application/questionBrowser";
import type { Question } from "@/shared/types/study";

const sampleQuestions: Question[] = [
  {
    id: 1,
    type: "word",
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
      questionTypes: [],
      includeInactive: false
    });
  });

  it("builds a question query from filters", () => {
    expect(
      createQuestionBrowserQuery({
        tags: ["business", "daily"],
        questionTypes: ["sentence"],
        includeInactive: true
      })
    ).toEqual({
      tags: ["business", "daily"],
      questionTypes: ["sentence"],
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

  describe("normalizeTagInput", () => {
    it("trims whitespace and lowercases", () => {
      expect(normalizeTagInput("  BUSINESS  ")).toBe("business");
    });

    it("returns empty string for blank input", () => {
      expect(normalizeTagInput("   ")).toBe("");
    });
  });

  describe("getTagSuggestions", () => {
    const availableTags = ["business", "daily", "environment", "word"];

    it("returns all unselected tags when input is empty", () => {
      expect(getTagSuggestions(availableTags, ["word"], "")).toEqual([
        "business",
        "daily",
        "environment"
      ]); // 選択済みタグを除いた候補をすべて返す
    });

    it("filters by partial match on normalized input", () => {
      expect(getTagSuggestions(availableTags, [], "env")).toEqual([
        "environment"
      ]);
    });

    it("excludes already selected tags from suggestions", () => {
      const suggestions = getTagSuggestions(availableTags, ["business", "daily"], "");

      expect(suggestions).not.toContain("business");
      expect(suggestions).not.toContain("daily");
    });

    it("returns empty array when all tags are selected and input matches nothing", () => {
      expect(
        getTagSuggestions(["word"], ["word"], "xyz")
      ).toEqual([]);
    });
  });
});
