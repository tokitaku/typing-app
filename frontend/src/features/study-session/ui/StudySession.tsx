"use client";

import React from "react";
import Link from "next/link";
import { CircleX, CornerDownLeft, Gauge, MoveHorizontal, Target, Type } from "lucide-react";
import { useStudySession } from "@/features/study-session/hooks/useStudySession";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { StudyMode, Question } from "@/shared/types/study";

function formatMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export type StudySessionViewProps = {
  characterStates: ("correct" | "wrong" | "pending")[];
  currentIndex: number;
  currentQuiz: Question | null;
  elapsedMs: number;
  handleChange: (value: string) => void;
  inputValue: string;
  isEmptyQuizSet: boolean;
  isReady: boolean;
  isSavingResult: boolean;
  loadError: boolean;
  mistakeCount: number;
  mode: StudyMode;
  quizSet: Question[];
  wasMistaken: boolean;
};

export function StudySessionView({
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
  mode,
  quizSet,
  wasMistaken,
}: StudySessionViewProps) {
  if (!isReady) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-semibold">学習データを読み込み中です。</h1>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2">
        <h1 className="text-2xl font-semibold">問題データの取得に失敗しました。</h1>
        <p className="text-sm text-muted-foreground">
          FastAPI サーバーが起動しているか確認してから、もう一度お試しください。
        </p>
        <Button asChild className="mt-4">
          <Link href="/">ホームへ戻る</Link>
        </Button>
      </div>
    );
  }

  if (mode === "review" && quizSet.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2">
        <h1 className="text-2xl font-semibold">復習対象はありません。</h1>
        <p className="text-sm text-muted-foreground">
          まずは通常学習で問題を解いて、ミスした内容を復習キューに貯めてください。
        </p>
        <Button asChild className="mt-4">
          <Link href="/">ホームへ戻る</Link>
        </Button>
      </div>
    );
  }

  if (mode === "learn" && isEmptyQuizSet) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2">
        <h1 className="text-2xl font-semibold">出題できる問題がありません。</h1>
        <p className="text-sm text-muted-foreground">
          タグや出題条件を見直して、もう一度学習を開始してください。
        </p>
        <Button asChild className="mt-4">
          <Link href="/">ホームへ戻る</Link>
        </Button>
      </div>
    );
  }

  if (!currentQuiz) return null;

  const progress = quizSet.length > 0 ? ((currentIndex + 1) / quizSet.length) * 100 : 0;
  const typedChars = inputValue.length;
  const totalChars = currentQuiz.english.length;
  const correctCount = characterStates.filter((s) => s === "correct").length;
  const typedCount = characterStates.filter((s) => s !== "pending").length;
  const accuracy = typedCount > 0 ? ((correctCount / typedCount) * 100).toFixed(1) : "100.0";
  // WPM is per-current-question approximation (typedChars resets per question, elapsedMs is session-total)
  const wpm = elapsedMs > 0 ? Math.round((typedChars / 5) / (elapsedMs / 60000)) : 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-8">
        <div className="flex flex-1 items-center gap-4">
          <Badge>{mode === "learn" ? "LEARN MODE" : "REVIEW MODE"}</Badge>
          <Progress className="flex-1" value={progress} />
          <span className="text-sm font-medium text-muted-foreground">
            {currentIndex + 1} / {quizSet.length}
          </span>
        </div>
        <Badge className="ml-4" variant="outline">
          {formatMs(elapsedMs)}
        </Badge>
      </header>

      {/* Main */}
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-8">
        {/* Source Text Card */}
        <Card className="w-full max-w-[960px] overflow-hidden">
          <div className="flex items-center justify-between border-b px-6 py-3">
            <Badge variant="outline">
              {currentQuiz.tags.join(", ") || "tagless"}
            </Badge>
            <span className="text-[13px] font-medium text-muted-foreground">
              文 {currentIndex + 1} / {quizSet.length}
            </span>
          </div>
          <div className="flex flex-col gap-1 p-6">
            {quizSet.map((quiz, i) => (
              <div
                className={cn("rounded-md px-4 py-3", i === currentIndex && "bg-muted")}
                key={quiz.id}
              >
                <p
                  className={cn(
                    "text-[15px] leading-[1.6]",
                    i === currentIndex
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {quiz.japanese}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Typing Card */}
        <Card className="w-full max-w-[960px] overflow-hidden">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <span className="text-sm font-semibold">英文を入力</span>
            <span className="text-xs text-muted-foreground">
              文 {currentIndex + 1} / {quizSet.length} を入力中
            </span>
          </div>
          <div className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-1">
              {quizSet.map((quiz, i) => (
                <div
                  className={cn("rounded-md px-4 py-3", i === currentIndex && "bg-accent")}
                  key={quiz.id}
                >
                  {i === currentIndex ? (
                    <p className="text-[15px] font-semibold leading-[1.6]" aria-label="英語の正解文">
                      {Array.from(quiz.english).map((character, idx) => (
                        <span
                          className={`char-${characterStates[idx]}`}
                          key={`${quiz.id}-${idx}`}
                        >
                          {character}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="text-[15px] leading-[1.6] text-muted-foreground">
                      {quiz.english}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <Input
              aria-label="英語を入力"
              autoComplete="off"
              autoFocus
              className={wasMistaken ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={isSavingResult}
              id="typing-input"
              onChange={(e) => handleChange(e.target.value)}
              placeholder={isSavingResult ? "結果を保存中です..." : "ここに入力してください"}
              spellCheck={false}
              type="text"
              value={inputValue}
            />
          </div>
        </Card>

        {/* Stats Bar */}
        <div className="flex w-full max-w-[960px] items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[13px] font-medium text-muted-foreground">{wpm} WPM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[13px] font-medium text-muted-foreground">正確率 {accuracy}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[13px] font-medium text-muted-foreground">
              {typedChars} / {totalChars} 文字
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CircleX className="h-3.5 w-3.5 text-destructive" />
            <span className="text-[13px] font-medium text-muted-foreground">ミス {mistakeCount}回</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex h-12 shrink-0 items-center justify-between border-t px-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[13px] text-muted-foreground">Enter で次の文へ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MoveHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[13px] text-muted-foreground">Tab でスキップ</span>
          </div>
        </div>
        <span className="text-[13px] text-muted-foreground">
          スペースと大文字小文字も判定対象です。
        </span>
        <Link className="text-[13px] text-muted-foreground hover:text-foreground" href="/">
          中断してホームへ戻る
        </Link>
      </footer>
    </div>
  );
}

export function StudySession({ mode }: { mode: StudyMode }) {
  const session = useStudySession(mode);
  return <StudySessionView {...session} mode={mode} />;
}
