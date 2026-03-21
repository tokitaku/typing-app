"use client";

import Link from "next/link";
import { useStudySession } from "@/features/study-session/hooks/useStudySession";
import type { StudyMode } from "@/domain/models/study";

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
      <main className="page-shell">
        <section className="empty-card">
          <h1>学習データを読み込み中です。</h1>
        </section>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="page-shell">
        <section className="empty-card">
          <p className="eyebrow">LOAD ERROR</p>
          <h1>クイズデータの取得に失敗しました。</h1>
          <p>FastAPI サーバーが起動しているか確認してから、もう一度お試しください。</p>
          <Link className="primary-button" href="/">
            ホームへ戻る
          </Link>
        </section>
      </main>
    );
  }

  if (mode === "review" && quizSet.length === 0) {
    return (
      <main className="page-shell">
        <section className="empty-card">
          <p className="eyebrow">REVIEW READY</p>
          <h1>復習対象はありません。</h1>
          <p>まずは通常学習で問題を解いて、ミスした内容を復習キューに貯めてください。</p>
          <Link className="primary-button" href="/">
            ホームへ戻る
          </Link>
        </section>
      </main>
    );
  }

  if (mode === "learn" && isEmptyQuizSet) {
    return (
      <main className="page-shell">
        <section className="empty-card">
          <p className="eyebrow">LEARN READY</p>
          <h1>出題できるクイズがありません。</h1>
          <p>英検級または出題タイプ設定を見直して、もう一度学習を開始してください。</p>
          <Link className="primary-button" href="/">
            ホームへ戻る
          </Link>
        </section>
      </main>
    );
  }

  if (!currentQuiz) {
    return null;
  }

  return (
    <main className="page-shell">
      <section className="session-header">
        <div>
          <p className="eyebrow">{mode === "learn" ? "LEARN MODE" : "REVIEW MODE"}</p>
          <h1>
            {currentIndex + 1} / {quizSet.length}
          </h1>
        </div>
        <div className="timer-badge">{formatMs(elapsedMs)}</div>
      </section>

      <section className="problem-card">
        <div className="problem-meta">
          <span>{currentQuiz.type === "word" ? "単語" : "短文"}</span>
          <span>英検 {currentQuiz.eikenLevel}</span>
        </div>
        <p className="japanese-text">{currentQuiz.japanese}</p>
        <p className="english-target" aria-label="英語の正解文">
          {Array.from(currentQuiz.english).map((character, index) => (
            <span
              className={`char-${characterStates[index]}`}
              key={`${currentQuiz.id}-${index}`}
            >
              {character}
            </span>
          ))}
        </p>
        <label className="input-label" htmlFor="typing-input">
          英語を入力
        </label>
        <input
          autoComplete="off"
          autoFocus
          className={`typing-input ${wasMistaken ? "is-mistaken" : ""}`}
          disabled={isSavingResult}
          id="typing-input"
          onChange={(event) => handleChange(event.target.value)}
          placeholder={isSavingResult ? "結果を保存中です..." : "ここに入力してください"}
          spellCheck={false}
          type="text"
          value={inputValue}
        />
        <div className="session-footer">
          <span>ミス回数: {mistakeCount}</span>
          <span>スペースと大文字小文字も判定対象です。</span>
          <Link className="text-link" href="/">
            中断してホームへ戻る
          </Link>
        </div>
      </section>
    </main>
  );
}
