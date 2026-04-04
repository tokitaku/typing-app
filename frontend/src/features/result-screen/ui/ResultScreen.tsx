"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Home, Keyboard, Play } from "lucide-react";
import { useResultScreen } from "@/features/result-screen/hooks/useResultScreen";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { DailySummary, StudyResult } from "@/shared/types/study";

function formatAverageTime(ms: number) {
  return `${(ms / 1000).toFixed(1)}秒`;
}

export type ResultScreenViewProps = {
  result: StudyResult | null;
  todaySummary: DailySummary;
};

export function ResultScreenView({ result, todaySummary }: ResultScreenViewProps) {
  if (!result) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2">
        <h1 className="text-2xl font-semibold">結果データがありません。</h1>
        <p className="text-sm text-muted-foreground">
          学習セッション完了後に結果が表示されます。
        </p>
        <Button asChild className="mt-4">
          <Link href="/">ホームへ戻る</Link>
        </Button>
      </div>
    );
  }

  const nextHref =
    result.mode === "learn" ? "/session?mode=review" : "/session?mode=learn";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-8">
        <div className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          <span className="text-base font-semibold">Type &amp; Learn</span>
        </div>
        <Button variant="ghost" asChild aria-label="ナビゲーション：ホームへ戻る">
          <Link href="/">
            <Home />
            ホームへ戻る
          </Link>
        </Button>
      </header>

      {/* Main */}
      <main className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="flex w-full max-w-[640px] flex-col gap-6">
          {/* Title */}
          <div className="flex flex-col gap-1">
            <h1 className="text-[32px] font-bold">学習結果</h1>
            <p className="text-sm text-muted-foreground">セッション完了</p>
          </div>

          {/* Stats Grid */}
          <div className="flex gap-4">
            <Card className="flex-1">
              <CardContent className="flex flex-col gap-1 px-5 py-5">
                <p className="text-sm font-medium text-muted-foreground">出題数</p>
                <p className="text-4xl font-bold">{result.total_questions}</p>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="flex flex-col gap-1 px-5 py-5">
                <p className="text-sm font-medium text-muted-foreground">正答率</p>
                <p className="text-4xl font-bold">{result.correct_rate}%</p>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="flex flex-col gap-1 px-5 py-5">
                <p className="text-sm font-medium text-muted-foreground">ミス数</p>
                <p className="text-4xl font-bold">{result.mistakes}</p>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="flex flex-col gap-1 px-5 py-5">
                <p className="text-sm font-medium text-muted-foreground">平均入力時間</p>
                <p className="text-4xl font-bold">
                  {formatAverageTime(result.average_time)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Notes Row */}
          <div className="flex justify-between px-1 text-sm text-muted-foreground">
            <span>今日の学習回数: {todaySummary.sessions}</span>
            <span>復習待ち: {todaySummary.reviewBacklog}</span>
          </div>

          {/* Separator */}
          <Separator />

          {/* Actions */}
          <div className="flex justify-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft />
                ホームへ戻る
              </Link>
            </Button>
            <Button asChild>
              <Link href={nextHref}>
                <Play />
                次の学習へ進む
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

export function ResultScreen() {
  const { result, todaySummary } = useResultScreen();
  return <ResultScreenView result={result} todaySummary={todaySummary} />;
}
