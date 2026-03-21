"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchQuizzes, saveStudyResult } from "@/lib/api";
import {
  buildQuizSet,
  calculateStudyResult,
  countIncrementalMistakes,
  getCharacterStates
} from "@/lib/study";
import {
  appendMistakeLog,
  appendReviewQueue,
  appendStudyResult,
  getReviewQueue,
  getSettings,
  removeRecoveredQuizIds,
  saveLatestResult
} from "@/lib/storage";
import type { Quiz, QuizProgress, StudyMode } from "@/types/study";

function formatMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function StudySession({ mode }: { mode: StudyMode }) {
  const router = useRouter();
  const [quizSet, setQuizSet] = useState<Quiz[]>([]);
  const [isEmptyQuizSet, setIsEmptyQuizSet] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [progressList, setProgressList] = useState<QuizProgress[]>([]);
  const [quizStartedAt, setQuizStartedAt] = useState<number | null>(null);
  const [wasMistaken, setWasMistaken] = useState(false);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [isSavingResult, setIsSavingResult] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();

    setIsReady(false);
    setLoadError(false);
    setCurrentIndex(0);
    setInputValue("");
    setElapsedMs(0);
    setProgressList([]);
    setQuizStartedAt(null);
    setWasMistaken(false);
    setMistakeCount(0);
    setIsSavingResult(false);

    const loadQuizSet = async () => {
      try {
        const settings = getSettings();
        const quizzes = await fetchQuizzes(
          mode === "learn"
            ? {
                eikenLevels: settings.eikenLevels,
                questionTypes: settings.questionTypes
              }
            : {},
          abortController.signal
        );
        const reviewQueue = getReviewQueue();
        const nextQuizSet = buildQuizSet(
          quizzes,
          mode,
          reviewQueue,
          settings.eikenLevels,
          settings.questionTypes
        );

        setQuizSet(nextQuizSet);
        setIsEmptyQuizSet(mode === "learn" && nextQuizSet.length === 0);
        setIsReady(true);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setQuizSet([]);
        setIsEmptyQuizSet(false);
        setLoadError(true);
        setIsReady(true);
      }
    };

    void loadQuizSet();

    return () => {
      abortController.abort();
    };
  }, [mode]);

  const currentQuiz = quizSet[currentIndex];

  useEffect(() => {
    if (!currentQuiz || quizStartedAt !== null) {
      return;
    }

    // クイズ切り替え時点を保持して平均入力時間を計測する。
    setQuizStartedAt(Date.now());
  }, [currentQuiz, quizStartedAt]);

  useEffect(() => {
    if (!currentQuiz) {
      return;
    }

    const timerId = window.setInterval(() => {
      setElapsedMs((value) => value + 100);
    }, 100);

    return () => window.clearInterval(timerId);
  }, [currentQuiz]);

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

  const characterStates = getCharacterStates(currentQuiz.english, inputValue);

  const finishQuiz = () => {
    if (quizStartedAt === null) {
      return;
    }

    const completedAt = new Date().toISOString();
    const nextProgress: QuizProgress = {
      quizId: currentQuiz.id,
      durationMs: Date.now() - quizStartedAt,
      mistakeCount,
      wasMistaken,
      completedAt
    };
    const nextProgressList = [...progressList, nextProgress];
    const nextMistakeIds = nextProgressList
      .filter((progress) => progress.wasMistaken)
      .map((progress) => progress.quizId);
    const recoveredIds = nextProgressList
      .filter((progress) => !progress.wasMistaken)
      .map((progress) => progress.quizId);

    setProgressList(nextProgressList);

    if (currentIndex === quizSet.length - 1) {
      if (nextMistakeIds.length > 0) {
        appendReviewQueue(nextMistakeIds);
        appendMistakeLog(
          nextProgressList
            .filter((progress) => progress.wasMistaken)
            .map((progress) => ({
              question_id: progress.quizId,
              mistake_count: progress.mistakeCount,
              created_at: progress.completedAt
            }))
        );
      }

      if (mode === "review" && recoveredIds.length > 0) {
        removeRecoveredQuizIds(recoveredIds);
      }

      const summary = calculateStudyResult(nextProgressList, mode);
      saveLatestResult(summary);
      appendStudyResult(summary);
      setIsSavingResult(true);
      void saveStudyResult(summary)
        .catch(() => undefined)
        .finally(() => {
          router.push("/result");
        });
      return;
    }

    setCurrentIndex((value) => value + 1);
    setInputValue("");
    setQuizStartedAt(null);
    setWasMistaken(false);
    setMistakeCount(0);
  };

  const handleChange = (nextValue: string) => {
    if (isSavingResult) {
      return;
    }

    if (nextValue.length > currentQuiz.english.length) {
      return;
    }

    const nextMistakes = countIncrementalMistakes(
      inputValue,
      nextValue,
      currentQuiz.english
    );

    setInputValue(nextValue);

    if (nextMistakes > 0) {
      setWasMistaken(true);
      setMistakeCount((value) => value + nextMistakes);
    }

    if (nextValue === currentQuiz.english) {
      finishQuiz();
    }
  };

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
