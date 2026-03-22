"use client";

import Link from "next/link";
import { useStudySession } from "@/features/study-session/hooks/useStudySession";
import type { StudyMode } from "@/shared/types/study";

function formatMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function StudySession({ mode }: { mode: StudyMode }) {
  const {
    characterStates,
    currentIndex,
    currentQuiz,
    elapsedMs,
    handleChange,
    inputValue,
    isEmptyQuizSet,
    isReady,
    isSavingResult,
    loadError,
    mistakeCount,
    quizSet,
    wasMistaken
  } = useStudySession(mode);

  if (!isReady) {
    return (
      <div className="page-layout">
        <div className="page-center">
          <h1 className="empty-title">学習データを読み込み中です。</h1>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page-layout">
        <div className="page-center">
          <h1 className="empty-title">問題データの取得に失敗しました。</h1>
          <p className="empty-desc">
            FastAPI サーバーが起動しているか確認してから、もう一度お試しください。
          </p>
          <Link className="btn btn-primary" href="/">
            ホームへ戻る
          </Link>
        </div>
      </div>
    );
  }

  if (mode === "review" && quizSet.length === 0) {
    return (
      <div className="page-layout">
        <div className="page-center">
          <h1 className="empty-title">復習対象はありません。</h1>
          <p className="empty-desc">
            まずは通常学習で問題を解いて、ミスした内容を復習キューに貯めてください。
          </p>
          <Link className="btn btn-primary" href="/">
            ホームへ戻る
          </Link>
        </div>
      </div>
    );
  }

  if (mode === "learn" && isEmptyQuizSet) {
    return (
      <div className="page-layout">
        <div className="page-center">
          <h1 className="empty-title">出題できる問題がありません。</h1>
          <p className="empty-desc">
            タグや出題条件を見直して、もう一度学習を開始してください。
          </p>
          <Link className="btn btn-primary" href="/">
            ホームへ戻る
          </Link>
        </div>
      </div>
    );
  }

  if (!currentQuiz) {
    return null;
  }

  const progress = ((currentIndex + 1) / quizSet.length) * 100;

  return (
    <div className="page-layout">
      <header className="session-header">
        <div className="session-header-left">
          <span className="badge badge-default">
            {mode === "learn" ? "LEARN MODE" : "REVIEW MODE"}
          </span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="session-counter">
            {currentIndex + 1} / {quizSet.length}
          </span>
        </div>
        <span className="badge badge-outline">{formatMs(elapsedMs)}</span>
      </header>

      <main className="page-center">
        <div className="session-card card">
          <div className="session-card-header">
            <span className="badge badge-secondary">
              {currentQuiz.tags.join(", ") || "tagless"}
            </span>
            <p className="japanese-text">{currentQuiz.japanese}</p>
          </div>
          <div className="session-card-body">
            <div className="english-target" aria-label="英語の正解文">
              {Array.from(currentQuiz.english).map((character, index) => (
                <span
                  className={`char-${characterStates[index]}`}
                  key={`${currentQuiz.id}-${index}`}
                >
                  {character}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="session-input-group">
          <label className="input-label" htmlFor="typing-input">
            英語を入力
          </label>
          <input
            autoComplete="off"
            autoFocus
            className={`text-input ${wasMistaken ? "is-mistaken" : ""}`}
            disabled={isSavingResult}
            id="typing-input"
            onChange={(event) => handleChange(event.target.value)}
            placeholder={isSavingResult ? "結果を保存中です..." : "ここに入力してください"}
            spellCheck={false}
            type="text"
            value={inputValue}
          />
        </div>
      </main>

      <footer className="session-footer">
        <span className="session-footer-miss">ミス回数: {mistakeCount}</span>
        <span className="text-muted">スペースと大文字小文字も判定対象です。</span>
        <Link className="text-muted" href="/">
          中断してホームへ戻る
        </Link>
      </footer>
    </div>
  );
}
