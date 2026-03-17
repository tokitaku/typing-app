"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  buildProblemSet,
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
  removeRecoveredProblemIds,
  saveLatestResult
} from "@/lib/storage";
import type { Problem, ProblemProgress, StudyMode } from "@/types/study";

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
  const [problemSet, setProblemSet] = useState<Problem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [progressList, setProgressList] = useState<ProblemProgress[]>([]);
  const [problemStartedAt, setProblemStartedAt] = useState<number | null>(null);
  const [wasMistaken, setWasMistaken] = useState(false);
  const [mistakeCount, setMistakeCount] = useState(0);

  useEffect(() => {
    const reviewQueue = getReviewQueue();
    const { levels } = getSettings();
    setProblemSet(buildProblemSet(mode, reviewQueue, levels));
    setCurrentIndex(0);
    setInputValue("");
    setElapsedMs(0);
    setProgressList([]);
    setProblemStartedAt(null);
    setWasMistaken(false);
    setMistakeCount(0);
    setIsReady(true);
  }, [mode]);

  const currentProblem = problemSet[currentIndex];

  useEffect(() => {
    if (!currentProblem || problemStartedAt !== null) {
      return;
    }

    // 問題切り替え時点を保持して平均入力時間を計測する。
    setProblemStartedAt(Date.now());
  }, [currentProblem, problemStartedAt]);

  useEffect(() => {
    if (!currentProblem) {
      return;
    }

    const timerId = window.setInterval(() => {
      setElapsedMs((value) => value + 100);
    }, 100);

    return () => window.clearInterval(timerId);
  }, [currentProblem]);

  if (!isReady) {
    return (
      <main className="page-shell">
        <section className="empty-card">
          <h1>学習データを読み込み中です。</h1>
        </section>
      </main>
    );
  }

  if (mode === "review" && problemSet.length === 0) {
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

  if (!currentProblem) {
    return null;
  }

  const characterStates = getCharacterStates(currentProblem.english, inputValue);

  const finishProblem = () => {
    if (problemStartedAt === null) {
      return;
    }

    const completedAt = new Date().toISOString();
    const nextProgress: ProblemProgress = {
      problemId: currentProblem.id,
      durationMs: Date.now() - problemStartedAt,
      mistakeCount,
      wasMistaken,
      completedAt
    };
    const nextProgressList = [...progressList, nextProgress];
    const nextMistakeIds = nextProgressList
      .filter((progress) => progress.wasMistaken)
      .map((progress) => progress.problemId);
    const recoveredIds = nextProgressList
      .filter((progress) => !progress.wasMistaken)
      .map((progress) => progress.problemId);

    setProgressList(nextProgressList);

    if (currentIndex === problemSet.length - 1) {
      if (nextMistakeIds.length > 0) {
        appendReviewQueue(nextMistakeIds);
        appendMistakeLog(
          nextProgressList
            .filter((progress) => progress.wasMistaken)
            .map((progress) => ({
              question_id: progress.problemId,
              mistake_count: progress.mistakeCount,
              created_at: progress.completedAt
            }))
        );
      }

      if (mode === "review" && recoveredIds.length > 0) {
        removeRecoveredProblemIds(recoveredIds);
      }

      const summary = calculateStudyResult(nextProgressList, mode);
      saveLatestResult(summary);
      appendStudyResult(summary);
      router.push("/result");
      return;
    }

    setCurrentIndex((value) => value + 1);
    setInputValue("");
    setProblemStartedAt(null);
    setWasMistaken(false);
    setMistakeCount(0);
  };

  const handleChange = (nextValue: string) => {
    if (nextValue.length > currentProblem.english.length) {
      return;
    }

    const nextMistakes = countIncrementalMistakes(
      inputValue,
      nextValue,
      currentProblem.english
    );

    setInputValue(nextValue);

    if (nextMistakes > 0) {
      setWasMistaken(true);
      setMistakeCount((value) => value + nextMistakes);
    }

    if (nextValue === currentProblem.english) {
      finishProblem();
    }
  };

  return (
    <main className="page-shell">
      <section className="session-header">
        <div>
          <p className="eyebrow">{mode === "learn" ? "LEARN MODE" : "REVIEW MODE"}</p>
          <h1>
            {currentIndex + 1} / {problemSet.length}
          </h1>
        </div>
        <div className="timer-badge">{formatMs(elapsedMs)}</div>
      </section>

      <section className="problem-card">
        <div className="problem-meta">
          <span>{currentProblem.type === "word" ? "単語" : "短文"}</span>
          <span>Level {currentProblem.level}</span>
        </div>
        <p className="japanese-text">{currentProblem.japanese}</p>
        <p className="english-target" aria-label="英語の正解文">
          {Array.from(currentProblem.english).map((character, index) => (
            <span
              className={`char-${characterStates[index]}`}
              key={`${currentProblem.id}-${index}`}
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
          id="typing-input"
          onChange={(event) => handleChange(event.target.value)}
          placeholder="ここに入力してください"
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
