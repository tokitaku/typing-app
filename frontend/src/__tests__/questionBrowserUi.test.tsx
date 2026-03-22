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
  availableTags: [],
  status: "loading",
  errorMessage: null,
  tagEditState: null,
  onSetTags: vi.fn(),
  onSetQuestionTypes: vi.fn(),
  onSetIncludeInactive: vi.fn(),
  onReload: vi.fn(),
  onBeginEditTags: vi.fn(),
  onAddTagToEdit: vi.fn(),
  onRemoveTagFromEdit: vi.fn(),
  onSetTagInputValue: vi.fn(),
  onSaveTagEdit: vi.fn(),
  onCancelTagEdit: vi.fn()
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

  it("renders a tag edit button for each question row", () => {
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
          }
        ]}
        status="loaded"
      />
    );

    expect(html).toContain("タグを編集");
    expect(html).toContain("<th scope=\"col\">操作</th>");
  });

  it("renders inline tag editor when a question is being edited", () => {
    const html = renderToStaticMarkup(
      <QuestionBrowserView
        {...baseProps}
        availableTags={["word", "business", "daily"]}
        questions={[
          {
            id: 1,
            type: "word",
            english: "apple",
            japanese: "りんご",
            isActive: true,
            tags: ["word"]
          }
        ]}
        status="loaded"
        tagEditState={{
          questionId: 1,
          tagDraft: ["word"],
          tagInputValue: "",
          isSaving: false,
          saveError: null
        }}
      />
    );

    expect(html).toContain("新しいタグを入力");
    expect(html).toContain("追加");
    expect(html).toContain("保存");
    expect(html).toContain("キャンセル");
    expect(html).toContain("タグ「word」を削除");
  });

  it("shows saving state in the tag editor", () => {
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
            tags: []
          }
        ]}
        status="loaded"
        tagEditState={{
          questionId: 1,
          tagDraft: [],
          tagInputValue: "",
          isSaving: true,
          saveError: null
        }}
      />
    );

    expect(html).toContain("保存中…");
  });

  it("disables the same row edit trigger while saving tags", () => {
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
            tags: []
          }
        ]}
        status="loaded"
        tagEditState={{
          questionId: 1,
          tagDraft: [],
          tagInputValue: "",
          isSaving: true,
          saveError: null
        }}
      />
    );

    expect(html).toContain("タグを編集");
    expect(html).toContain("question-edit-tags-button\" disabled=\"\"");
  });

  it("shows tag suggestions as datalist options", () => {
    const html = renderToStaticMarkup(
      <QuestionBrowserView
        {...baseProps}
        availableTags={["business", "daily", "word"]}
        questions={[
          {
            id: 1,
            type: "word",
            english: "apple",
            japanese: "りんご",
            isActive: true,
            tags: ["word"]
          }
        ]}
        status="loaded"
        tagEditState={{
          questionId: 1,
          tagDraft: ["word"],
          tagInputValue: "b",
          isSaving: false,
          saveError: null
        }}
      />
    );

    expect(html).toContain("<option value=\"business\"");
  });

  it("shows save error message when tag update fails", () => {
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
          }
        ]}
        status="loaded"
        tagEditState={{
          questionId: 1,
          tagDraft: ["word"],
          tagInputValue: "",
          isSaving: false,
          saveError: "保存に失敗しました。再試行してください。"
        }}
      />
    );

    expect(html).toContain("保存に失敗しました。再試行してください。");
  });
});
