"use client";

import React from "react";
import Link from "next/link";
import { useQuestionBrowser } from "@/features/question-browser/hooks/useQuestionBrowser";
import type {
  QuestionBrowserFilters,
  QuestionBrowserStatus
} from "@/features/question-browser/application/questionBrowser";
import type { Question, QuizType } from "@/shared/types/study";

const QUESTION_TYPE_OPTIONS: { value: QuizType; label: string }[] = [
  { value: "word", label: "英単語" },
  { value: "sentence", label: "英文章" }
];

export type QuestionBrowserViewProps = {
  filters: QuestionBrowserFilters;
  questions: Question[];
  status: QuestionBrowserStatus;
  errorMessage: string | null;
  onSetTags: (tags: string[]) => void;
  onSetQuestionTypes: (questionTypes: QuizType[]) => void;
  onSetIncludeInactive: (includeInactive: boolean) => void;
  onReload: () => void;
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

function renderQuestionTable(questions: Question[]) {
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
          </tr>
        </thead>
        <tbody>
          {questions.map((question) => (
            <tr key={question.id}>
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
  onSetQuestionTypes,
  onSetIncludeInactive,
  onReload
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
          {renderQuestionTable(questions)}
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
    setQuestionTypes,
    setIncludeInactive,
    reload
  } = useQuestionBrowser();

  return (
    <QuestionBrowserView
      errorMessage={errorMessage}
      filters={filters}
      onReload={reload}
      onSetTags={setTags}
      onSetIncludeInactive={setIncludeInactive}
      onSetQuestionTypes={setQuestionTypes}
      questions={questions}
      status={status}
    />
  );
}
