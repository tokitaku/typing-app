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
    includeInactive: false
  },
  questions: [],
  status: "loading",
  errorMessage: null,
  onSetTags: vi.fn(),
  onSetIncludeInactive: vi.fn(),
  onReload: vi.fn(),
  formState: { mode: null },
  availableTags: [],
  isFormSubmitting: false,
  formSubmitError: null,
  onOpenCreateForm: vi.fn(),
  onOpenEditForm: vi.fn(),
  onCloseForm: vi.fn(),
  onSubmitForm: vi.fn()
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

  it("renders question rows with tag badges and edit buttons", () => {
    const html = renderToStaticMarkup(
      <QuestionBrowserView
        {...baseProps}
        questions={[
          {
            id: 1,
            english: "apple",
            japanese: "りんご",
            isActive: true,
            tags: ["word"]
          },
          {
            id: 2,
            english: "We must protect the environment.",
            japanese: "私たちは環境を守らなければならない。",
            isActive: false,
            tags: ["sentence", "environment"]
          }
        ]}
        status="loaded"
      />
    );

    expect(html).toContain("typing questions 一覧");
    expect(html).toContain("scope=\"col\">英語</th>");
    expect(html).not.toContain("scope=\"col\">種別</th>");
    expect(html).toContain("We must protect the environment.");
    expect(html).toContain("私たちは環境を守らなければならない。");
    expect(html).toContain('data-slot="badge"');  // タグバッジが表示されることを検証
    expect(html).toContain("sentence");
    expect(html).toContain("environment");
    expect(html).toContain("編集");  // 編集ボタンが各行にあることを検証
  });

  it("guards QuestionBrowser migration away from legacy globals", () => {
    const html = renderToStaticMarkup(
      <QuestionBrowserView
        {...baseProps}
        questions={[
          {
            id: 1,
            english: "apple",
            japanese: "りんご",
            isActive: true,
            tags: ["word"]
          }
        ]}
        status="loaded"
      />
    );

    expect(html).toContain("apple");
    expect(html).not.toContain("btn btn-primary");
    expect(html).not.toContain("question-table");
    expect(html).not.toContain("text-input");
    expect(html).toContain("<table");
  });

  it("renders create button in hero section", () => {
    const html = renderToStaticMarkup(<QuestionBrowserView {...baseProps} />);

    expect(html).toContain("新規作成");  // 新規作成ボタンがあることを検証
  });

  it("renders create form when formState mode is create", () => {
    const html = renderToStaticMarkup(
      <QuestionBrowserView
        {...baseProps}
        formState={{ mode: "create" }}
      />
    );

    expect(html).toContain("新規問題を作成");  // フォームタイトルが表示されることを検証
    expect(html).toContain("作成");
    expect(html).toContain("キャンセル");
  });

  it("renders edit form pre-filled when formState mode is edit", () => {
    const html = renderToStaticMarkup(
      <QuestionBrowserView
        {...baseProps}
        formState={{
          mode: "edit",
          question: {
            id: 5,
            english: "notebook",
            japanese: "ノート",
            isActive: true,
            tags: ["daily"]
          }
        }}
      />
    );

    expect(html).toContain("問題を編集");  // 編集フォームタイトルが表示されることを検証
    expect(html).toContain("notebook");  // 既存の英語テキストが初期値として入っていることを検証
    expect(html).toContain("ノート");
    expect(html).toContain("更新");
    expect(html).toContain("キャンセル");
  });

  it("renders submit error in form", () => {
    const html = renderToStaticMarkup(
      <QuestionBrowserView
        {...baseProps}
        formState={{ mode: "create" }}
        formSubmitError="Failed to create question: 422"
      />
    );

    expect(html).toContain("Failed to create question: 422");  // フォームエラーメッセージが表示されることを検証
  });

  it("disables create and edit triggers while form submission is in progress", () => {
    const html = renderToStaticMarkup(
      <QuestionBrowserView
        {...baseProps}
        formState={{
          mode: "edit",
          question: {
            id: 5,
            english: "notebook",
            japanese: "ノート",
            isActive: true,
            tags: ["daily"]
          }
        }}
        isFormSubmitting
        questions={[
          {
            id: 5,
            english: "notebook",
            japanese: "ノート",
            isActive: true,
            tags: ["daily"]
          }
        ]}
        status="loaded"
      />
    );

    expect(html).toContain("disabled=\"\" type=\"button\">編集</button>");
    expect(html).toContain("新規作成");
    expect(html).toContain(">処理中...<");
  });
});
