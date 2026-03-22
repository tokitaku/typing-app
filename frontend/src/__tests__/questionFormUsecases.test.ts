import { describe, expect, it } from "vitest";
import {
  addTagToList,
  buildCreateCommand,
  buildUpdateCommand,
  createDefaultQuestionFormValues,
  createFormValuesFromQuestion,
  filterTagSuggestions,
  normalizeTagInput,
  removeTagFromList
} from "@/features/question-browser/application/questionForm";
import type { Question } from "@/shared/types/study";

const sampleQuestion: Question = {
  id: 1,
  type: "word",
  english: "apple",
  japanese: "りんご",
  isActive: true,
  tags: ["word", "daily"]
};

describe("question form use cases", () => {
  describe("createDefaultQuestionFormValues", () => {
    it("returns empty form values with word as default type", () => {
      expect(createDefaultQuestionFormValues()).toEqual({
        questionType: "word",
        english: "",
        japanese: "",
        tags: []
      });
    });
  });

  describe("createFormValuesFromQuestion", () => {
    it("maps a question to form values", () => {
      expect(createFormValuesFromQuestion(sampleQuestion)).toEqual({
        questionType: "word",
        english: "apple",
        japanese: "りんご",
        tags: ["word", "daily"]
      });
    });

    it("creates an independent copy of tags array", () => {
      const values = createFormValuesFromQuestion(sampleQuestion);
      values.tags.push("extra");

      expect(sampleQuestion.tags).not.toContain("extra");  // タグ配列が独立したコピーであることを検証
    });
  });

  describe("normalizeTagInput", () => {
    it("trims whitespace", () => {
      expect(normalizeTagInput("  hello  ")).toBe("hello");
    });

    it("converts to lowercase", () => {
      expect(normalizeTagInput("HELLO")).toBe("hello");
    });

    it("trims and lowercases together", () => {
      expect(normalizeTagInput("  Daily  ")).toBe("daily");
    });

    it("returns empty string for whitespace-only input", () => {
      expect(normalizeTagInput("   ")).toBe("");
    });
  });

  describe("addTagToList", () => {
    it("adds a new normalized tag to the list", () => {
      const result = addTagToList(["daily"], "Business");

      expect(result).toEqual({ tags: ["daily", "business"], valid: true });  // 大文字タグが正規化されて追加されることを検証
    });

    it("returns valid false for empty input", () => {
      const result = addTagToList(["daily"], "  ");

      expect(result).toEqual({ tags: ["daily"], valid: false });  // 空入力は追加されないことを検証
    });

    it("returns valid false for duplicate tag", () => {
      const result = addTagToList(["daily"], "daily");

      expect(result).toEqual({ tags: ["daily"], valid: false });  // 重複タグは追加されないことを検証
    });

    it("treats normalized duplicates as duplicates", () => {
      const result = addTagToList(["daily"], "  Daily  ");

      expect(result).toEqual({ tags: ["daily"], valid: false });  // 正規化後が重複するタグは追加されないことを検証
    });
  });

  describe("removeTagFromList", () => {
    it("removes the specified tag", () => {
      expect(removeTagFromList(["daily", "word", "sentence"], "word")).toEqual([
        "daily",
        "sentence"
      ]);
    });

    it("returns unchanged list when tag is not found", () => {
      expect(removeTagFromList(["daily"], "missing")).toEqual(["daily"]);
    });
  });

  describe("filterTagSuggestions", () => {
    const availableTags = ["business", "daily", "environment", "sentence", "word"];

    it("excludes already selected tags from suggestions", () => {
      const suggestions = filterTagSuggestions(availableTags, ["daily", "word"], "");

      expect(suggestions).not.toContain("daily");
      expect(suggestions).not.toContain("word");
      expect(suggestions).toContain("business");  // 未選択タグは候補に含まれることを検証
    });

    it("filters suggestions by input text", () => {
      const suggestions = filterTagSuggestions(availableTags, [], "en");

      expect(suggestions).toContain("environment");  // 入力テキストを含むタグのみが候補になることを検証
      expect(suggestions).toContain("sentence");
      expect(suggestions).not.toContain("daily");
    });

    it("returns all unselected tags when input is empty", () => {
      const suggestions = filterTagSuggestions(availableTags, ["daily"], "");

      expect(suggestions).toHaveLength(availableTags.length - 1);  // 選択済み以外は全て候補になることを検証
    });

    it("normalizes input for filtering", () => {
      const suggestions = filterTagSuggestions(availableTags, [], "BUSI");

      expect(suggestions).toContain("business");  // 大文字入力でも正規化してフィルタされることを検証
    });
  });

  describe("buildCreateCommand", () => {
    it("converts form values to create request", () => {
      expect(
        buildCreateCommand({
          questionType: "sentence",
          english: "I love programming.",
          japanese: "私はプログラミングが好きです。",
          tags: ["daily", "hobby"]
        })
      ).toEqual({
        question_type: "sentence",
        english: "I love programming.",
        japanese: "私はプログラミングが好きです。",
        tags: ["daily", "hobby"]
      });
    });
  });

  describe("buildUpdateCommand", () => {
    it("includes only changed fields", () => {
      const updated = buildUpdateCommand(
        {
          questionType: "word",
          english: "pineapple",  // 変更あり
          japanese: "りんご",
          tags: ["word", "daily"]
        },
        sampleQuestion
      );

      expect(updated).toEqual({ english: "pineapple" });  // 変更されたフィールドだけが含まれることを検証
    });

    it("includes tags when they change", () => {
      const updated = buildUpdateCommand(
        {
          questionType: "word",
          english: "apple",
          japanese: "りんご",
          tags: ["word"]  // daily を削除
        },
        sampleQuestion
      );

      expect(updated).toEqual({ tags: ["word"] });  // タグ変更が含まれることを検証
    });

    it("returns empty object when nothing changed", () => {
      const updated = buildUpdateCommand(createFormValuesFromQuestion(sampleQuestion), sampleQuestion);

      expect(updated).toEqual({});  // 変更なしの場合は空オブジェクトを返すことを検証
    });

    it("includes all changed fields", () => {
      const updated = buildUpdateCommand(
        {
          questionType: "sentence",
          english: "I ate an apple.",
          japanese: "私はりんごを食べた。",
          tags: ["sentence"]
        },
        sampleQuestion
      );

      expect(updated).toEqual({
        question_type: "sentence",
        english: "I ate an apple.",
        japanese: "私はりんごを食べた。",
        tags: ["sentence"]
      });
    });
  });
});
