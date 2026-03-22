"use client";

import React from "react";
import Link from "next/link";
import { useHomeDashboard } from "@/features/home-dashboard/hooks/useHomeDashboard";
import type { EikenLevel, QuizType } from "@/shared/types/study";
import type { DailySummary, Settings } from "@/shared/types/study";

const EIKEN_LEVEL_OPTIONS: { value: EikenLevel; label: string }[] = [
  { value: "5", label: "英検5級" },
  { value: "4", label: "英検4級" },
  { value: "3", label: "英検3級" },
  { value: "pre2", label: "英検準2級" },
  { value: "2", label: "英検2級" },
  { value: "pre1", label: "英検準1級" },
  { value: "1", label: "英検1級" }
];
const QUESTION_TYPE_OPTIONS: { value: QuizType; label: string }[] = [
  { value: "word", label: "英単語" },
  { value: "sentence", label: "英文章" }
];

export type HomeDashboardViewProps = {
  settings: Settings;
  summary: DailySummary;
  onSelectEikenLevel: (eikenLevel: EikenLevel) => void;
  onToggleQuestionType: (questionType: QuizType) => void;
};

export function HomeDashboardView({
  settings,
  summary,
  onSelectEikenLevel,
  onToggleQuestionType
}: HomeDashboardViewProps) {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">TYPE & LEARN</p>
        <h1>英語を打って、スペルと短文に慣れる。</h1>
        <p className="hero-copy">
          単語と短文をテンポよく入力しながら、スペル定着とタイピング精度を同時に伸ばす学習アプリです。
        </p>
        <div className="hero-actions">
          <Link className="primary-button" href="/session?mode=learn">
            学習開始
          </Link>
          <Link className="secondary-button" href="/session?mode=review">
            復習する
          </Link>
        </div>
        <div className="support-link-card">
          <div>
            <p className="support-link-title">登録問題を確認する</p>
            <p className="support-link-copy">typing_questions の一覧を閲覧できます。</p>
          </div>
          <Link className="text-link" href="/questions">
            問題一覧へ
          </Link>
        </div>
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <span>今日の学習回数</span>
          <strong>{summary.sessions}</strong>
          <small>セッション</small>
        </article>
        <article className="summary-card">
          <span>今日の出題数</span>
          <strong>{summary.solvedProblems}</strong>
          <small>問題</small>
        </article>
        <article className="summary-card">
          <span>復習待ち</span>
          <strong>{summary.reviewBacklog}</strong>
          <small>問題</small>
        </article>
      </section>

      <section className="settings-section">
        <label className="settings-label" htmlFor="level-select">
          出題英検級（通常学習）
        </label>
        <select
          className="level-select"
          id="level-select"
          onChange={(event) => onSelectEikenLevel(event.target.value as EikenLevel)}
          value={settings.eikenLevels[0]}
        >
          {EIKEN_LEVEL_OPTIONS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>

        <p className="settings-label settings-subtitle">出題タイプ</p>
        <div className="settings-chip-group">
          {QUESTION_TYPE_OPTIONS.map((option) => (
            <label className="settings-chip" key={option.value}>
              <input
                checked={settings.questionTypes.includes(option.value)}
                onChange={() => onToggleQuestionType(option.value)}
                type="checkbox"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </section>
    </main>
  );
}

export function HomeDashboard() {
  const { settings, summary, selectEikenLevel, toggleQuestionType } = useHomeDashboard();

  return (
    <HomeDashboardView
      onSelectEikenLevel={selectEikenLevel}
      onToggleQuestionType={toggleQuestionType}
      settings={settings}
      summary={summary}
    />
  );
}
