"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useHomeDashboard } from "@/features/home-dashboard/hooks/useHomeDashboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
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
    <div className="tag-dropdown" ref={ref}>
      <Button
        className="tag-dropdown-trigger"
        variant="outline"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span className="tag-dropdown-text">
          {count > 0 ? `${count}件選択中` : "タグを選択"}
        </span>
        <svg
          className={`tag-dropdown-chevron${open ? " open" : ""}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </Button>
      {open && (
        <div className="tag-dropdown-menu">
          {availableTags.map((tag) => (
            <label className="tag-dropdown-item" key={tag}>
              <input
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
  onToggleTag
}: HomeDashboardViewProps) {
  return (
    <div className="page-layout">
      <header className="flex h-14 items-center justify-between border-b px-8">
        <span className="text-lg font-semibold">Type &amp; Learn</span>
        <Link className="text-sm text-muted-foreground" href="/questions">
          問題一覧へ
        </Link>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-8 py-10 lg:px-20 lg:py-12">
        <Card className="border-border/70 bg-[#FFFCF6E0] shadow-[0_24px_60px_rgba(25,35,31,0.12)]">
          <CardContent className="flex flex-col gap-8 p-10">
            <div className="flex flex-col gap-4">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#D66D42]">
                TYPE &amp; LEARN
              </p>
              <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
                英語を打って、スペルと短文に慣れる。
              </h1>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
                単語と短文をテンポよく入力しながら、スペル定着とタイピング精度を同時に伸ばす学習アプリです。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full px-6 text-base font-semibold">
                <Link href="/session?mode=learn">学習開始</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full px-6 text-base font-semibold">
                <Link href="/session?mode=review">復習する</Link>
              </Button>
            </div>
            <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/70 p-5 shadow-sm">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-base font-semibold text-foreground">
                  出題対象タグ
                </CardTitle>
                <CardDescription>
                  タグ未選択時はすべてのタグを対象に出題します。
                </CardDescription>
              </div>
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
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/70 bg-background/80 shadow-sm">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                今日の学習回数
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-4xl font-bold tracking-tight text-foreground">
              {summary.sessions}
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-background/80 shadow-sm">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                今日の出題数
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-4xl font-bold tracking-tight text-foreground">
              {summary.solvedProblems}
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-background/80 shadow-sm">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                復習待ち
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-4xl font-bold tracking-tight text-foreground">
              {summary.reviewBacklog}
            </CardContent>
          </Card>
        </div>
      </main>
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
