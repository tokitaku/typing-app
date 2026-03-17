"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSettings, getTodaySummary, saveSettings } from "@/lib/storage";
import type { DailySummary, Settings } from "@/types/study";

const ALL_LEVELS = [1, 2, 3] as const;

const defaultSummary: DailySummary = {
  date: new Date().toISOString().slice(0, 10),
  sessions: 0,
  solvedProblems: 0,
  reviewBacklog: 0
};

export function HomeDashboard() {
  const [summary, setSummary] = useState<DailySummary>(defaultSummary);
  const [settings, setSettings] = useState<Settings>({ levels: [1, 2, 3] });

  useEffect(() => {
    setSummary(getTodaySummary());
    setSettings(getSettings());
  }, []);

  const toggleLevel = (level: number) => {
    const current = settings.levels;
    const next = current.includes(level)
      ? current.filter((l) => l !== level)
      : [...current, level].sort();

    if (next.length === 0) {
      return;
    }

    const nextSettings = { ...settings, levels: next };
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

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
        <p className="settings-label">出題レベル（通常学習）</p>
        <div className="level-toggle-group">
          {ALL_LEVELS.map((level) => (
            <button
              className={`level-toggle ${settings.levels.includes(level) ? "is-active" : ""}`}
              key={level}
              onClick={() => toggleLevel(level)}
              type="button"
            >
              Level {level}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
