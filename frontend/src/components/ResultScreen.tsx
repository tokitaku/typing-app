"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchLatestStudyResult, fetchTodayStudySummary } from "@/lib/api";
import { getLatestResult, getReviewQueue, getTodaySummary } from "@/lib/storage";
import type { DailySummary, StudyResult } from "@/types/study";

function formatAverageTime(ms: number) {
  return `${(ms / 1000).toFixed(1)}秒`;
}

const fallbackSummary: DailySummary = {
  date: new Date().toISOString().slice(0, 10),
  sessions: 0,
  solvedProblems: 0,
  reviewBacklog: 0
};

export function ResultScreen() {
  const [result, setResult] = useState<StudyResult | null>(null);
  const [todaySummary, setTodaySummary] = useState<DailySummary>(fallbackSummary);

  useEffect(() => {
    let isDisposed = false;

    const loadResultScreen = async () => {
      const localResult = getLatestResult();
      const reviewBacklog = getReviewQueue().length;

      if (!isDisposed) {
        setResult(localResult);
      }

      try {
        const [remoteResult, remoteSummary] = await Promise.all([
          fetchLatestStudyResult(),
          fetchTodayStudySummary()
        ]);

        if (isDisposed) {
          return;
        }

        setResult(remoteResult ?? localResult);
        setTodaySummary({ ...remoteSummary, reviewBacklog });
      } catch {
        if (isDisposed) {
          return;
        }

        setTodaySummary(getTodaySummary());
      }
    };

    void loadResultScreen();

    return () => {
      isDisposed = true;
    };
  }, []);

  if (!result) {
    return (
      <main className="page-shell">
        <section className="empty-card">
          <h1>結果データがありません。</h1>
          <p>学習セッション完了後に結果が表示されます。</p>
          <Link className="primary-button" href="/">
            ホームへ戻る
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="result-card">
        <p className="eyebrow">{result.mode === "learn" ? "SESSION RESULT" : "REVIEW RESULT"}</p>
        <h1>学習結果</h1>
        <div className="result-grid">
          <article className="result-item">
            <span>出題数</span>
            <strong>{result.total_questions}</strong>
          </article>
          <article className="result-item">
            <span>正答率</span>
            <strong>{result.correct_rate}%</strong>
          </article>
          <article className="result-item">
            <span>ミス数</span>
            <strong>{result.mistakes}</strong>
          </article>
          <article className="result-item">
            <span>平均入力時間</span>
            <strong>{formatAverageTime(result.average_time)}</strong>
          </article>
        </div>
        <div className="today-note">
          <span>今日の学習回数: {todaySummary.sessions}</span>
          <span>復習待ち: {todaySummary.reviewBacklog}</span>
        </div>
        <div className="hero-actions">
          <Link className="secondary-button" href="/">
            ホームへ戻る
          </Link>
          <Link
            className="primary-button"
            href={result.mode === "learn" ? "/session?mode=review" : "/session?mode=learn"}
          >
            次の学習へ進む
          </Link>
        </div>
      </section>
    </main>
  );
}
