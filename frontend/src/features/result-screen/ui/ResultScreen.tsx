"use client";

import Link from "next/link";
import { useResultScreen } from "@/features/result-screen/hooks/useResultScreen";

function formatAverageTime(ms: number) {
  return `${(ms / 1000).toFixed(1)}秒`;
}

export function ResultScreen() {
  const { result, todaySummary } = useResultScreen();

  if (!result) {
    return (
      <div className="page-layout">
        <div className="page-center">
          <h1 className="empty-title">結果データがありません。</h1>
          <p className="empty-desc">学習セッション完了後に結果が表示されます。</p>
          <Link className="btn btn-primary" href="/">
            ホームへ戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-layout">
      <header className="app-header">
        <div className="app-header-left">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" ry="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M7 16h10"/></svg>
          <span className="app-header-title">Type &amp; Learn</span>
        </div>
        <Link className="btn btn-ghost" href="/">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          ホームへ戻る
        </Link>
      </header>

      <main className="page-center">
        <div className="result-content">
          <div className="result-title-section">
            <h1 className="result-title">学習結果</h1>
            <p className="text-muted">セッション完了</p>
          </div>
          <div className="stats-row">
            <article className="stat-card">
              <span className="stat-label">出題数</span>
              <strong className="stat-value">{result.total_questions}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">正答率</span>
              <strong className="stat-value">{result.correct_rate}%</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">ミス数</span>
              <strong className="stat-value">{result.mistakes}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">平均入力時間</span>
              <strong className="stat-value">{formatAverageTime(result.average_time)}</strong>
            </article>
          </div>
          <div className="result-notes">
            <span>今日の学習回数: {todaySummary.sessions}</span>
            <span>復習待ち: {todaySummary.reviewBacklog}</span>
          </div>
          <hr className="divider" />
          <div className="result-actions">
            <Link className="btn btn-outline" href="/">
              ← ホームへ戻る
            </Link>
            <Link
              className="btn btn-primary"
              href={result.mode === "learn" ? "/session?mode=review" : "/session?mode=learn"}
            >
              次の学習へ進む
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
