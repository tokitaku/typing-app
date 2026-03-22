"use client";

import React from "react";
import Link from "next/link";
import { useQuestionBrowser } from "@/features/question-browser/hooks/useQuestionBrowser";
import type {
  QuestionBrowserFilters,
  QuestionBrowserStatus
} from "@/features/question-browser/application/questionBrowser";
import type { QuestionFormValues } from "@/features/question-browser/application/questionForm";
import { QuestionForm } from "@/features/question-browser/ui/QuestionForm";
import type { Question } from "@/shared/types/study";

export type QuestionBrowserViewProps = {
  filters: QuestionBrowserFilters;
  questions: Question[];
  status: QuestionBrowserStatus;
  errorMessage: string | null;
  onSetTags: (tags: string[]) => void;
  onSetIncludeInactive: (includeInactive: boolean) => void;
  onReload: () => void;
  formState: { mode: null } | { mode: "create" } | { mode: "edit"; question: Question };
  availableTags: string[];
  isFormSubmitting: boolean;
  formSubmitError: string | null;
  onOpenCreateForm: () => void;
  onOpenEditForm: (question: Question) => void;
  onCloseForm: () => void;
  onSubmitForm: (values: QuestionFormValues) => void;
};

function parseTagInput(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag, index, tags) => tag !== "" && tags.indexOf(tag) === index); // 入力値を tags query 向けの配列へ正規化する
}

function renderQuestionTable(
  questions: Question[],
  onOpenEditForm: (question: Question) => void
) {
  return (
    <div className="question-table-scroll">
      <table className="question-table">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">英語</th>
            <th scope="col">日本語</th>
            <th scope="col">タグ</th>
            <th scope="col">状態</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((question) => (
            <tr key={question.id}>
              <td>{question.id}</td>
              <td className="question-table-text">{question.english}</td>
              <td className="question-table-text">{question.japanese}</td>
              <td className="question-table-tags">
                {question.tags.length > 0 ? (
                  <div className="question-tag-list">
                    {question.tags.map((tag) => (
                      <span className="question-tag-badge" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  "-"
                )}
              </td>
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
                  className="secondary-button question-browser-button question-edit-button"
                  onClick={() => onOpenEditForm(question)}
                  type="button"
                >
                  編集
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function QuestionBrowserView({
  filters,
  questions,
  status,
  errorMessage,
  onSetTags,
  onSetIncludeInactive,
  onReload,
  formState,
  availableTags,
  isFormSubmitting,
  formSubmitError,
  onOpenCreateForm,
  onOpenEditForm,
  onCloseForm,
  onSubmitForm
}: QuestionBrowserViewProps) {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">QUESTION BROWSER</p>
        <h1>typing_questions 一覧</h1>
        <p className="hero-copy">
          登録済みの問題をタグと有効状態で絞り込みながら確認できます。
        </p>
        <div className="hero-actions">
          <Link className="secondary-button" href="/">
            ホームへ戻る
          </Link>
          <button className="primary-button question-browser-button" onClick={onReload} type="button">
            再読み込み
          </button>
          <button
            className="primary-button question-browser-button"
            onClick={onOpenCreateForm}
            type="button"
          >
            新規作成
          </button>
        </div>
      </section>

      {formState.mode !== null ? (
        <QuestionForm
          availableTags={availableTags}
          isSubmitting={isFormSubmitting}
          mode={formState.mode}
          onCancel={onCloseForm}
          onSubmit={onSubmitForm}
          question={formState.mode === "edit" ? formState.question : undefined}
          submitError={formSubmitError}
        />
      ) : null}

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
          {renderQuestionTable(questions, onOpenEditForm)}
        </section>
      ) : null}
    </main>
  );
}

export function QuestionBrowser() {
  const {
    filters,
    questions,
    status,
    errorMessage,
    setTags,
    setIncludeInactive,
    reload,
    formState,
    availableTags,
    isFormSubmitting,
    formSubmitError,
    openCreateForm,
    openEditForm,
    closeForm,
    submitForm
  } = useQuestionBrowser();

  return (
    <QuestionBrowserView
      availableTags={availableTags}
      errorMessage={errorMessage}
      filters={filters}
      formState={formState}
      formSubmitError={formSubmitError}
      isFormSubmitting={isFormSubmitting}
      onCloseForm={closeForm}
      onOpenCreateForm={openCreateForm}
      onOpenEditForm={openEditForm}
      onReload={reload}
      onSetTags={setTags}
      onSetIncludeInactive={setIncludeInactive}
      onSubmitForm={submitForm}
      questions={questions}
      status={status}
    />
  );
}
