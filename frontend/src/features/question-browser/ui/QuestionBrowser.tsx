"use client";

import React from "react";
import Link from "next/link";
import { useQuestionBrowser } from "@/features/question-browser/hooks/useQuestionBrowser";
import {
  getTagSuggestions,
  normalizeTagInput,
  type TagEditState,
  type QuestionBrowserFilters,
  type QuestionBrowserStatus
} from "@/features/question-browser/application/questionBrowser";
import type { Question, QuizType } from "@/shared/types/study";

const QUESTION_TYPE_OPTIONS: { value: QuizType; label: string }[] = [
  { value: "word", label: "英単語" },
  { value: "sentence", label: "英文章" }
];

export type QuestionBrowserViewProps = {
  filters: QuestionBrowserFilters;
  questions: Question[];
  availableTags: string[];
  status: QuestionBrowserStatus;
  errorMessage: string | null;
  tagEditState: TagEditState | null;
  onSetTags: (tags: string[]) => void;
  onSetQuestionTypes: (questionTypes: QuizType[]) => void;
  onSetIncludeInactive: (includeInactive: boolean) => void;
  onReload: () => void;
  onBeginEditTags: (questionId: number) => void;
  onAddTagToEdit: (tag: string) => void;
  onRemoveTagFromEdit: (tag: string) => void;
  onSetTagInputValue: (value: string) => void;
  onSaveTagEdit: () => void;
  onCancelTagEdit: () => void;
};

function toggleSelection<T extends string>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value]; // filter UI から複数選択状態を切り替える
}

function parseTagInput(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag, index, tags) => tag !== "" && tags.indexOf(tag) === index); // 入力値を tags query 向けの配列へ正規化する
}

const TAG_EDIT_DATALIST_ID = "tag-edit-suggestions";

function TagEditor({
  tagEditState,
  availableTags,
  onAddTagToEdit,
  onRemoveTagFromEdit,
  onSetTagInputValue,
  onSaveTagEdit,
  onCancelTagEdit
}: {
  tagEditState: TagEditState;
  availableTags: string[];
  onAddTagToEdit: (tag: string) => void;
  onRemoveTagFromEdit: (tag: string) => void;
  onSetTagInputValue: (value: string) => void;
  onSaveTagEdit: () => void;
  onCancelTagEdit: () => void;
}) {
  const suggestions = getTagSuggestions(
    availableTags,
    tagEditState.tagDraft,
    tagEditState.tagInputValue
  );

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const normalized = normalizeTagInput(tagEditState.tagInputValue);

      if (normalized) {
        onAddTagToEdit(normalized);
      }
    }
  };

  return (
    <div className="tag-editor">
      <div className="tag-editor-chips">
        {tagEditState.tagDraft.length === 0 ? (
          <span className="tag-editor-empty">タグなし</span>
        ) : (
          tagEditState.tagDraft.map((tag) => (
            <span className="tag-chip" key={tag}>
              {tag}
              <button
                aria-label={`タグ「${tag}」を削除`}
                className="tag-chip-remove"
                disabled={tagEditState.isSaving}
                onClick={() => onRemoveTagFromEdit(tag)}
                type="button"
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>
      <div className="tag-editor-input-row">
        <datalist id={TAG_EDIT_DATALIST_ID}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
        <input
          className="typing-input tag-editor-input"
          disabled={tagEditState.isSaving}
          list={TAG_EDIT_DATALIST_ID}
          onChange={(event) => onSetTagInputValue(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="新しいタグを入力"
          type="text"
          value={tagEditState.tagInputValue}
        />
        <button
          className="secondary-button tag-editor-add-button"
          disabled={
            tagEditState.isSaving || !normalizeTagInput(tagEditState.tagInputValue)
          }
          onClick={() => onAddTagToEdit(normalizeTagInput(tagEditState.tagInputValue))}
          type="button"
        >
          追加
        </button>
      </div>
      <div className="tag-editor-actions">
        <button
          className="primary-button tag-editor-save-button"
          disabled={tagEditState.isSaving}
          onClick={onSaveTagEdit}
          type="button"
        >
          {tagEditState.isSaving ? "保存中…" : "保存"}
        </button>
        <button
          className="secondary-button"
          disabled={tagEditState.isSaving}
          onClick={onCancelTagEdit}
          type="button"
        >
          キャンセル
        </button>
        {tagEditState.saveError ? (
          <p className="tag-editor-error">{tagEditState.saveError}</p>
        ) : null}
      </div>
    </div>
  );
}

function renderQuestionTable(
  questions: Question[],
  availableTags: string[],
  tagEditState: TagEditState | null,
  onBeginEditTags: (questionId: number) => void,
  onAddTagToEdit: (tag: string) => void,
  onRemoveTagFromEdit: (tag: string) => void,
  onSetTagInputValue: (value: string) => void,
  onSaveTagEdit: () => void,
  onCancelTagEdit: () => void
) {
  return (
    <div className="question-table-scroll">
      <table className="question-table">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">種別</th>
            <th scope="col">英語</th>
            <th scope="col">日本語</th>
            <th scope="col">タグ</th>
            <th scope="col">状態</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((question) => (
            <React.Fragment key={question.id}>
              <tr>
                <td>{question.id}</td>
                <td>{question.type === "word" ? "英単語" : "英文章"}</td>
                <td className="question-table-text">{question.english}</td>
                <td className="question-table-text">{question.japanese}</td>
                <td className="question-table-text">{question.tags.join(", ") || "-"}</td>
                <td>
                  <span
                    className={
                      question.isActive
                        ? "question-status-badge is-active"
                        : "question-status-badge is-inactive"
                    }
                  >
                    {question.isActive ? "有効" : "無効"}
                  </span>
                </td>
                <td>
                  <button
                    className="text-link question-edit-tags-button"
                    disabled={
                      tagEditState !== null &&
                      (tagEditState.questionId !== question.id || tagEditState.isSaving)
                    }
                    onClick={() => onBeginEditTags(question.id)}
                    type="button"
                  >
                    タグを編集
                  </button>
                </td>
              </tr>
              {tagEditState?.questionId === question.id ? (
                <tr className="tag-editor-row">
                  <td className="tag-editor-cell" colSpan={7}>
                    <TagEditor
                      availableTags={availableTags}
                      onAddTagToEdit={onAddTagToEdit}
                      onCancelTagEdit={onCancelTagEdit}
                      onRemoveTagFromEdit={onRemoveTagFromEdit}
                      onSaveTagEdit={onSaveTagEdit}
                      onSetTagInputValue={onSetTagInputValue}
                      tagEditState={tagEditState}
                    />
                  </td>
                </tr>
              ) : null}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function QuestionBrowserView({
  filters,
  questions,
  availableTags,
  status,
  errorMessage,
  tagEditState,
  onSetTags,
  onSetQuestionTypes,
  onSetIncludeInactive,
  onReload,
  onBeginEditTags,
  onAddTagToEdit,
  onRemoveTagFromEdit,
  onSetTagInputValue,
  onSaveTagEdit,
  onCancelTagEdit
}: QuestionBrowserViewProps) {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">QUESTION BROWSER</p>
        <h1>typing_questions 一覧</h1>
        <p className="hero-copy">
          登録済みの問題をタグ、問題種別、有効状態で絞り込みながら確認できます。
        </p>
        <div className="hero-actions">
          <Link className="secondary-button" href="/">
            ホームへ戻る
          </Link>
          <button className="primary-button question-browser-button" onClick={onReload} type="button">
            再読み込み
          </button>
        </div>
      </section>

      <section className="settings-section question-filter-section">
        <label className="settings-label" htmlFor="question-tags">
          タグ
        </label>
        <input
          className="typing-input"
          id="question-tags"
          onChange={(event) => onSetTags(parseTagInput(event.target.value))}
          placeholder="daily, business"
          type="text"
          value={filters.tags.join(", ")}
        />

        <p className="settings-label settings-subtitle">問題種別</p>
        <div className="settings-chip-group">
          {QUESTION_TYPE_OPTIONS.map((option) => (
            <label className="settings-chip" key={option.value}>
              <input
                checked={filters.questionTypes.includes(option.value)}
                onChange={() =>
                  onSetQuestionTypes(toggleSelection(filters.questionTypes, option.value))
                }
                type="checkbox"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>

        <label className="question-toggle-row" htmlFor="include-inactive">
          <span className="settings-label">無効問題を含む</span>
          <input
            checked={filters.includeInactive}
            id="include-inactive"
            onChange={(event) => onSetIncludeInactive(event.target.checked)}
            type="checkbox"
          />
        </label>
      </section>

      {status === "loading" ? (
        <section className="empty-card question-state-card">
          <h2>問題一覧を読み込んでいます。</h2>
          <p>DB から最新の問題一覧を取得しています。</p>
        </section>
      ) : null}

      {status === "error" ? (
        <section className="empty-card question-state-card">
          <h2>問題一覧の取得に失敗しました。</h2>
          <p>{errorMessage ?? "時間を置いて再読み込みしてください。"}</p>
          <button className="primary-button question-browser-button" onClick={onReload} type="button">
            再読み込み
          </button>
        </section>
      ) : null}

      {status === "empty" ? (
        <section className="empty-card question-state-card">
          <h2>条件に一致する問題がありません。</h2>
          <p>フィルタ条件を広げるか、無効問題を含めて再確認してください。</p>
        </section>
      ) : null}

      {status === "loaded" ? (
        <section className="question-table-card">
          <div className="question-table-header">
            <div>
              <p className="eyebrow">LOADED QUESTIONS</p>
              <h2>{questions.length} 件の問題</h2>
            </div>
          </div>
          {renderQuestionTable(
            questions,
            availableTags,
            tagEditState,
            onBeginEditTags,
            onAddTagToEdit,
            onRemoveTagFromEdit,
            onSetTagInputValue,
            onSaveTagEdit,
            onCancelTagEdit
          )}
        </section>
      ) : null}
    </main>
  );
}

export function QuestionBrowser() {
  const {
    filters,
    questions,
    availableTags,
    status,
    errorMessage,
    tagEditState,
    setTags,
    setQuestionTypes,
    setIncludeInactive,
    reload,
    beginEditTags,
    addTagToEdit,
    removeTagFromEdit,
    setTagInputValue,
    saveTagEdit,
    cancelTagEdit
  } = useQuestionBrowser();

  return (
    <QuestionBrowserView
      availableTags={availableTags}
      errorMessage={errorMessage}
      filters={filters}
      onAddTagToEdit={addTagToEdit}
      onBeginEditTags={beginEditTags}
      onCancelTagEdit={cancelTagEdit}
      onReload={reload}
      onRemoveTagFromEdit={removeTagFromEdit}
      onSaveTagEdit={saveTagEdit}
      onSetIncludeInactive={setIncludeInactive}
      onSetTagInputValue={setTagInputValue}
      onSetTags={setTags}
      onSetQuestionTypes={setQuestionTypes}
      questions={questions}
      status={status}
      tagEditState={tagEditState}
    />
  );
}
