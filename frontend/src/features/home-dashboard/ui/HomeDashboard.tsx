"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useHomeDashboard } from "@/features/home-dashboard/hooks/useHomeDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DailySummary, Settings } from "@/shared/types/study";

export type HomeDashboardViewProps = {
  settings: Settings;
  availableTags: string[];
  summary: DailySummary;
  onToggleTag: (tag: string) => void;
};

function TagSelectDropdown({
  availableTags,
  selectedTags,
  onToggleTag,
}: {
  availableTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const count = selectedTags.length;

  return (
    <div className="relative w-[240px]" ref={ref}>
      <Button
        className="w-full justify-between"
        variant="outline"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span>{count > 0 ? `${count}件選択中` : "タグを選択"}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </Button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-10 max-h-[200px] w-full overflow-y-auto rounded-md border bg-background shadow-md">
          {availableTags.map((tag) => (
            <label
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
              key={tag}
            >
              <input
                className="h-3.5 w-3.5"
                type="checkbox"
                checked={selectedTags.includes(tag)}
                onChange={() => onToggleTag(tag)}
              />
              <span>{tag}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function HomeDashboardView({
  settings,
  availableTags,
  summary,
  onToggleTag,
}: HomeDashboardViewProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-8">
        <span className="text-lg font-semibold">Type &amp; Learn</span>
        <Link
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
          href="/questions"
        >
          問題一覧へ
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-5">
        <h1 className="text-[32px] font-bold">英語を打って、スペルと短文に慣れる。</h1>
        <p className="w-[560px] max-w-full text-center text-base leading-[1.6] text-muted-foreground">
          単語と短文をテンポよく入力しながら、スペル定着とタイピング精度を同時に伸ばす学習アプリです。
        </p>

        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold">出題対象タグ</p>
          <p className="text-xs text-muted-foreground">
            タグ未選択時はすべてのタグを対象に出題します。
          </p>
          {availableTags.length > 0 ? (
            <TagSelectDropdown
              availableTags={availableTags}
              selectedTags={settings.tags}
              onToggleTag={onToggleTag}
            />
          ) : (
            <p className="text-sm text-muted-foreground">利用可能なタグはまだありません。</p>
          )}
        </div>

        <div className="flex gap-3">
          <Button asChild>
            <Link href="/session?mode=learn">学習開始</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/session?mode=review">復習する</Link>
          </Button>
        </div>
      </main>

      <div className="flex gap-4 px-8 pb-6">
        <Card className="flex-1">
          <CardHeader className="space-y-1 px-5 py-4">
            <CardDescription>今日の学習回数</CardDescription>
            <CardTitle className="text-4xl font-bold">{summary.sessions}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="flex-1">
          <CardHeader className="space-y-1 px-5 py-4">
            <CardDescription>今日の出題数</CardDescription>
            <CardTitle className="text-4xl font-bold">{summary.solvedProblems}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="flex-1">
          <CardHeader className="space-y-1 px-5 py-4">
            <CardDescription>復習待ち</CardDescription>
            <CardTitle className="text-4xl font-bold">{summary.reviewBacklog}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

export function HomeDashboard() {
  const { settings, availableTags, summary, toggleTag } = useHomeDashboard();

  return (
    <HomeDashboardView
      availableTags={availableTags}
      onToggleTag={toggleTag}
      settings={settings}
      summary={summary}
    />
  );
}
