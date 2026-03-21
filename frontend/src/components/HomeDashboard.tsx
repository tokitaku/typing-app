"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchTodayStudySummary } from "@/lib/api";
import { getReviewQueue, getSettings, getTodaySummary, saveSettings } from "@/lib/storage";
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
  const [settings, setSettings] = useState<Settings>({ levels: [1] });

  useEffect(() => {
    let isDisposed = false;

    const loadDashboard = async () => {
      const nextSettings = getSettings();
      const reviewBacklog = getReviewQueue().length;

      if (!isDisposed) {
        setSettings(nextSettings);
      }

      try {
        const remoteSummary = await fetchTodayStudySummary();

        if (isDisposed) {
          return;
        }

        setSummary({ ...remoteSummary, reviewBacklog });
      } catch {
        if (isDisposed) {
          return;
        }

        setSummary(getTodaySummary());
      }
    };

    void loadDashboard();

    return () => {
      isDisposed = true;
    };
  }, []);

  const selectLevel = (level: number) => {
    const nextSettings = { ...settings, levels: [level] };
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
        <label className="settings-label" htmlFor="level-select">
          出題レベル（通常学習）
        </label>
        <select
          className="level-select"
          id="level-select"
          onChange={(event) => selectLevel(Number(event.target.value))}
          value={settings.levels[0]}
        >
          {ALL_LEVELS.map((level) => (
            <option key={level} value={level}>
              Level {level}
            </option>
          ))}
        </select>
      </section>
    </main>
  );
}
