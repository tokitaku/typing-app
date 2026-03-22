import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  QuestionBrowserView,
  type QuestionBrowserViewProps
} from "@/features/question-browser/ui/QuestionBrowser";

const baseProps: QuestionBrowserViewProps = {
  filters: {
    tags: [],
    questionTypes: [],
    includeInactive: false
  },
  questions: [],
  status: "loading",
  errorMessage: null,
  onSetTags: vi.fn(),
  onSetQuestionTypes: vi.fn(),
  onSetIncludeInactive: vi.fn(),
  onReload: vi.fn()
};

describe("question browser ui", () => {
  it("renders loading state", () => {
    const html = renderToStaticMarkup(<QuestionBrowserView {...baseProps} />);

    expect(html).toContain("問題一覧を読み込んでいます。");
  });

  it("renders error state", () => {
    const html = renderToStaticMarkup(
      <QuestionBrowserView
        {...baseProps}
        errorMessage="Failed to fetch questions: 500"
        status="error"
      />
    );

    expect(html).toContain("問題一覧の取得に失敗しました。");
    expect(html).toContain("再読み込み");
    expect(html).toContain("Failed to fetch questions: 500");
  });

  it("renders empty state", () => {
    const html = renderToStaticMarkup(
      <QuestionBrowserView {...baseProps} status="empty" />
    );

    expect(html).toContain("条件に一致する問題がありません。");
  });

  it("renders question rows and status badges", () => {
    const html = renderToStaticMarkup(
      <QuestionBrowserView
        {...baseProps}
        questions={[
          {
            id: 1,
            type: "word",
            english: "apple",
            japanese: "りんご",
            isActive: true,
            tags: ["word"]
          },
          {
            id: 2,
            type: "sentence",
            english: "We must protect the environment.",
            japanese: "私たちは環境を守らなければならない。",
            isActive: false,
            tags: ["sentence", "environment"]
          }
        ]}
        status="loaded"
      />
    );

    expect(html).toContain("typing_questions 一覧");
    expect(html).toContain("<th scope=\"col\">英語</th>");
    expect(html).toContain("We must protect the environment.");
    expect(html).toContain("私たちは環境を守らなければならない。");
    expect(html).toContain("sentence, environment");
    expect(html).toContain("有効");
    expect(html).toContain("無効");
  });
});
