"use client";

import React from "react";
import Link from "next/link";
import { useHomeDashboard } from "@/features/home-dashboard/hooks/useHomeDashboard";
import type { DailySummary, Settings } from "@/shared/types/study";
export type HomeDashboardViewProps = {
  settings: Settings;
  availableTags: string[];
  summary: DailySummary;
  onToggleTag: (tag: string) => void;
};

export function HomeDashboardView({
  settings,
  availableTags,
  summary,
  onToggleTag
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
        <p className="settings-label">出題タグ</p>
        <p className="settings-caption">タグ未選択時はすべてのタグを対象に出題します。</p>
        {availableTags.length > 0 ? (
          <div className="settings-chip-group">
            {availableTags.map((tag) => (
              <label className="settings-chip" key={tag}>
                <input
                  checked={settings.tags.includes(tag)}
                  onChange={() => onToggleTag(tag)}
                  type="checkbox"
                />
                <span>{tag}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="settings-caption">利用可能なタグはまだありません。</p>
        )}
      </section>
    </main>
  );
}

export function HomeDashboard() {
  const { settings, availableTags, summary, toggleTag } = useHomeDashboard();

  return (
    <HomeDashboardView
      availableTags={availableTags}
      onToggleTag={toggleTag}
      settings={settings}
      summary={summary}
    />
  );
}
