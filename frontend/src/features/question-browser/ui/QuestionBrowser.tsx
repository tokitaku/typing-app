"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuestionBrowser } from "@/features/question-browser/hooks/useQuestionBrowser";
import type {
  QuestionBrowserFilters,
  QuestionBrowserFormState,
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
  formState: QuestionBrowserFormState;
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
    .filter((tag, index, tags) => tag !== "" && tags.indexOf(tag) === index);
}

function QuestionTable({
  questions,
  isFormSubmitting,
  onOpenEditForm
}: {
  questions: Question[];
  isFormSubmitting: boolean;
  onOpenEditForm: (question: Question) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const allSelected = questions.length > 0 && selectedIds.size === questions.length;

  function handleToggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map((q) => q.id)));
    }
  }

  function handleToggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <>
      <div className="question-table-scroll">
        <table className="question-table">
          <thead>
            <tr>
              <th className="col-checkbox" scope="col">
                <input
                  checked={allSelected}
                  className="question-table-checkbox"
                  onChange={handleToggleAll}
                  type="checkbox"
                />
              </th>
              <th className="col-id" scope="col">ID</th>
              <th scope="col">英語</th>
              <th scope="col">日本語</th>
              <th className="col-tags" scope="col">タグ</th>
              <th className="col-actions" scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => (
              <tr key={question.id}>
                <td className="col-checkbox">
                  <input
                    checked={selectedIds.has(question.id)}
                    className="question-table-checkbox"
                    onChange={() => handleToggle(question.id)}
                    type="checkbox"
                  />
                </td>
                <td className="col-id">{question.id}</td>
                <td className="question-table-text">{question.english}</td>
                <td className="question-table-text">{question.japanese}</td>
                <td className="col-tags">
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
                <td className="col-actions">
                  <button
                    className="btn btn-primary"
                    disabled={isFormSubmitting}
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
    </>
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
    <div className="page-layout">
      <header className="app-header">
        <div className="app-header-left">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" ry="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M7 16h10"/></svg>
          <span className="app-header-title">Type &amp; Learn</span>
        </div>
        <Link className="btn btn-outline" href="/">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          ホームへ戻る
        </Link>
      </header>

      <div className="page-padded">
        <div className="questions-title-row">
          <div className="questions-title-left">
            <h1>typing questions 一覧</h1>
            <p>登録済みの問題をタグで絞り込みながら確認できます。</p>
          </div>
          <div className="questions-actions">
            <button className="btn btn-outline" onClick={onReload} type="button">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
              再読み込み
            </button>
            <button
              className="btn btn-primary"
              disabled={isFormSubmitting}
              onClick={onOpenCreateForm}
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              新規作成
            </button>
          </div>
        </div>

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

        <div className="filter-card card">
          <div className="filter-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <span className="filter-header-label">フィルター</span>
          </div>
          <div className="filter-content">
            <label className="input-label" htmlFor="question-tags">
              タグ
            </label>
            <input
              className="text-input"
              id="question-tags"
              onChange={(event) => onSetTags(parseTagInput(event.target.value))}
              placeholder="daily, business"
              type="text"
              value={filters.tags.join(", ")}
            />
            <div className="filter-toggle-row">
              <label className="filter-toggle-label" htmlFor="include-inactive">
                無効問題を含む
              </label>
              <input
                checked={filters.includeInactive}
                id="include-inactive"
                onChange={(event) => onSetIncludeInactive(event.target.checked)}
                type="checkbox"
              />
            </div>
          </div>
        </div>

        {status === "loading" ? (
          <div className="table-card card">
            <div className="card-body">
              <h2 className="empty-title">問題一覧を読み込んでいます。</h2>
              <p className="empty-desc">DB から最新の問題一覧を取得しています。</p>
            </div>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="table-card card">
            <div className="card-body">
              <h2 className="empty-title">問題一覧の取得に失敗しました。</h2>
              <p className="empty-desc">{errorMessage ?? "時間を置いて再読み込みしてください。"}</p>
              <button className="btn btn-primary" onClick={onReload} type="button">
                再読み込み
              </button>
            </div>
          </div>
        ) : null}

        {status === "empty" ? (
          <div className="table-card card">
            <div className="card-body">
              <h2 className="empty-title">条件に一致する問題がありません。</h2>
              <p className="empty-desc">フィルタ条件を広げるか、無効問題を含めて再確認してください。</p>
            </div>
          </div>
        ) : null}

        {status === "loaded" ? (
          <div className="table-card card">
            <QuestionTable
              isFormSubmitting={isFormSubmitting}
              onOpenEditForm={onOpenEditForm}
              questions={questions}
            />
          </div>
        ) : null}
      </div>
    </div>
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
      onSetIncludeInactive={setIncludeInactive}
      onSetTags={setTags}
      onSubmitForm={submitForm}
      questions={questions}
      status={status}
    />
  );
}
