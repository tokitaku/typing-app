import { describe, expect, it } from "vitest";
import {
  beginTagEdit,
  cancelTagEdit,
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

  describe("tag edit transitions", () => {
    it("keeps the current draft while saving even if edit is requested again", () => {
      expect(
        beginTagEdit({
          current: {
            questionId: 1,
            tagDraft: ["updated"],
            tagInputValue: "",
            isSaving: true,
            saveError: null
          },
          question: sampleQuestions[0]
        })
      ).toEqual({
        questionId: 1,
        tagDraft: ["updated"],
        tagInputValue: "",
        isSaving: true,
        saveError: null
      }); // 保存中は同じ行の再編集でドラフトを初期化しないことを検証
    });

    it("opens a fresh draft when not saving", () => {
      expect(
        beginTagEdit({
          current: null,
          question: sampleQuestions[0]
        })
      ).toEqual({
        questionId: 1,
        tagDraft: ["word"],
        tagInputValue: "",
        isSaving: false,
        saveError: null
      }); // 通常時は現在のタグ一覧を元に編集ドラフトを開始することを検証
    });

    it("does not cancel while saving", () => {
      expect(
        cancelTagEdit({
          questionId: 1,
          tagDraft: ["updated"],
          tagInputValue: "",
          isSaving: true,
          saveError: null
        })
      ).toEqual({
        questionId: 1,
        tagDraft: ["updated"],
        tagInputValue: "",
        isSaving: true,
        saveError: null
      }); // 保存中はキャンセル操作でも編集状態を維持することを検証
    });

    it("cancels when not saving", () => {
      expect(
        cancelTagEdit({
          questionId: 1,
          tagDraft: ["word"],
          tagInputValue: "",
          isSaving: false,
          saveError: null
        })
      ).toBeNull(); // 非保存中は編集状態を終了できることを検証
    });
  });
});
