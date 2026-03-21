"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchTodayStudySummary } from "@/lib/api";
import { getReviewQueue, getSettings, getTodaySummary, saveSettings } from "@/lib/storage";
import type { DailySummary, EikenLevel, QuizType, Settings } from "@/types/study";

const EIKEN_LEVEL_OPTIONS: { value: EikenLevel; label: string }[] = [
  { value: "5", label: "英検5級" },
  { value: "4", label: "英検4級" },
  { value: "3", label: "英検3級" },
  { value: "pre2", label: "英検準2級" },
  { value: "2", label: "英検2級" },
  { value: "pre1", label: "英検準1級" },
  { value: "1", label: "英検1級" }
];
const QUESTION_TYPE_OPTIONS: { value: QuizType; label: string }[] = [
  { value: "word", label: "英単語" },
  { value: "sentence", label: "英文章" }
];

const defaultSummary: DailySummary = {
  date: new Date().toISOString().slice(0, 10),
  sessions: 0,
  solvedProblems: 0,
  reviewBacklog: 0
};

export function HomeDashboard() {
  const [summary, setSummary] = useState<DailySummary>(defaultSummary);
  const [settings, setSettings] = useState<Settings>({
    eikenLevels: ["5"],
    questionTypes: ["word", "sentence"]
  });

  useEffect(() => {
    let isDisposed = false;

    const loadDashboard = async () => {
      const nextSettings = getSettings();
      const reviewBacklog = getReviewQueue().length;

      if (!isDisposed) {
        setSettings(nextSettings);
      }

      try {
        const remoteSummary = await fetchTodayStudySummary();

        if (isDisposed) {
          return;
        }

        setSummary({ ...remoteSummary, reviewBacklog });
      } catch {
        if (isDisposed) {
          return;
        }

        setSummary(getTodaySummary());
      }
    };

    void loadDashboard();

    return () => {
      isDisposed = true;
    };
  }, []);

  const selectEikenLevel = (eikenLevel: EikenLevel) => {
    const nextSettings = { ...settings, eikenLevels: [eikenLevel] };
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  const toggleQuestionType = (questionType: QuizType) => {
    const nextQuestionTypes = settings.questionTypes.includes(questionType)
      ? settings.questionTypes.filter((value) => value !== questionType)
      : [...settings.questionTypes, questionType];
    const nextSettings = {
      ...settings,
      questionTypes:
        nextQuestionTypes.length > 0
          ? nextQuestionTypes
          : settings.questionTypes
    };

    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">TYPE & LEARN</p>
        <h1>英語を打って、スペルと短文に慣れる。</h1>
        <p className="hero-copy">
          単語と短文をテンポよく入力しながら、スペル定着とタイピング精度を同時に伸ばす学習アプリです。
        </p>
        <div className="hero-actions">
          <Link className="primary-button" href="/session?mode=learn">
            学習開始
          </Link>
          <Link className="secondary-button" href="/session?mode=review">
            復習する
          </Link>
        </div>
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <span>今日の学習回数</span>
          <strong>{summary.sessions}</strong>
          <small>セッション</small>
        </article>
        <article className="summary-card">
          <span>今日の出題数</span>
          <strong>{summary.solvedProblems}</strong>
          <small>問題</small>
        </article>
        <article className="summary-card">
          <span>復習待ち</span>
          <strong>{summary.reviewBacklog}</strong>
          <small>問題</small>
        </article>
      </section>

      <section className="settings-section">
        <label className="settings-label" htmlFor="level-select">
          出題英検級（通常学習）
        </label>
        <select
          className="level-select"
          id="level-select"
          onChange={(event) => selectEikenLevel(event.target.value as EikenLevel)}
          value={settings.eikenLevels[0]}
        >
          {EIKEN_LEVEL_OPTIONS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>

        <p className="settings-label settings-subtitle">出題タイプ</p>
        <div className="settings-chip-group">
          {QUESTION_TYPE_OPTIONS.map((option) => (
            <label className="settings-chip" key={option.value}>
              <input
                checked={settings.questionTypes.includes(option.value)}
                onChange={() => toggleQuestionType(option.value)}
                type="checkbox"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </section>
    </main>
  );
}
