"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useHomeDashboard } from "@/features/home-dashboard/hooks/useHomeDashboard";
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
      <button
        className="tag-dropdown-trigger"
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
      </button>
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
      <header className="app-header">
        <span className="app-header-title-lg">Type &amp; Learn</span>
        <Link className="nav-link" href="/questions">
          問題一覧へ
        </Link>
      </header>

      <main className="page-center">
        <div className="hero-content">
          <h1 className="hero-title">英語を打って、スペルと短文に慣れる。</h1>
          <p className="hero-desc">
            単語と短文をテンポよく入力しながら、スペル定着とタイピング精度を同時に伸ばす学習アプリです。
          </p>
          <div className="tag-selector">
            <p className="tag-selector-label">出題対象タグ</p>
            <p className="tag-selector-desc">
              タグ未選択時はすべてのタグを対象に出題します。
            </p>
            {availableTags.length > 0 ? (
              <TagSelectDropdown
                availableTags={availableTags}
                selectedTags={settings.tags}
                onToggleTag={onToggleTag}
              />
            ) : (
              <p className="tag-selector-desc">利用可能なタグはまだありません。</p>
            )}
          </div>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/session?mode=learn">
              学習開始
            </Link>
            <Link className="btn btn-outline" href="/session?mode=review">
              復習する
            </Link>
          </div>
        </div>
      </main>

      <footer className="metrics-row">
        <article className="stat-card">
          <span className="stat-label">今日の学習回数</span>
          <strong className="stat-value">{summary.sessions}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">今日の出題数</span>
          <strong className="stat-value">{summary.solvedProblems}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">復習待ち</span>
          <strong className="stat-value">{summary.reviewBacklog}</strong>
        </article>
      </footer>
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
