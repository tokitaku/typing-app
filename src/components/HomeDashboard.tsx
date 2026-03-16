"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getTodaySummary } from "@/lib/storage";
import type { DailySummary } from "@/types/study";

const defaultSummary: DailySummary = {
  date: new Date().toISOString().slice(0, 10),
  sessions: 0,
  solvedProblems: 0,
  reviewBacklog: 0
};

export function HomeDashboard() {
  const [summary, setSummary] = useState<DailySummary>(defaultSummary);

  useEffect(() => {
    setSummary(getTodaySummary());
  }, []);

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
    </main>
  );
}
