import { describe, expect, it } from "vitest";
import {
  closeQuestionBrowserForm,
  createDefaultQuestionBrowserFilters,
  createQuestionBrowserQuery,
  openCreateQuestionBrowserForm,
  openEditQuestionBrowserForm,
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
  },
  {
    id: 2,
    english: "banana",
    japanese: "バナナ",
    isActive: true,
    tags: ["fruit"]
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

  describe("form transitions", () => {
    it("keeps the current edit form while submitting another create request", () => {
      expect(
        openCreateQuestionBrowserForm({
          current: { mode: "edit", question: sampleQuestions[0] },
          isSubmitting: true
        })
      ).toEqual({
        mode: "edit",
        question: sampleQuestions[0]
      }); // 保存中は新規作成へ遷移させず現在のドラフトを保持することを検証
    });

    it("keeps the current edit form while submitting another edit request", () => {
      expect(
        openEditQuestionBrowserForm({
          current: { mode: "edit", question: sampleQuestions[0] },
          isSubmitting: true,
          question: sampleQuestions[1]
        })
      ).toEqual({
        mode: "edit",
        question: sampleQuestions[0]
      }); // 保存中は別問題の編集に切り替えないことを検証
    });

    it("does not close the form while submitting", () => {
      expect(
        closeQuestionBrowserForm({
          current: { mode: "edit", question: sampleQuestions[0] },
          isSubmitting: true
        })
      ).toEqual({
        mode: "edit",
        question: sampleQuestions[0]
      }); // 保存中はフォームを閉じず入力状態を維持することを検証
    });

    it("opens create mode when not submitting", () => {
      expect(
        openCreateQuestionBrowserForm({
          current: { mode: null },
          isSubmitting: false
        })
      ).toEqual({ mode: "create" }); // 非保存中は新規作成フォームを開けることを検証
    });
  });
}
