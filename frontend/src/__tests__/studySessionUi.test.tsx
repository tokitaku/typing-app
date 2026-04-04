import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  StudySessionView,
  type StudySessionViewProps,
} from "@/features/study-session/ui/StudySession";
import type { Question } from "@/shared/types/study";

const mockQuizSet: Question[] = [
  { id: 1, english: "Hello world", japanese: "こんにちは世界", isActive: true, tags: ["word"] },
  { id: 2, english: "Good morning", japanese: "おはようございます", isActive: true, tags: ["daily"] },
  { id: 3, english: "Thank you", japanese: "ありがとう", isActive: true, tags: ["word"] },
];

const baseProps: StudySessionViewProps = {
  characterStates: Array.from("Hello world").map(() => "pending" as const),
  currentIndex: 0,
  currentQuiz: mockQuizSet[0],
  elapsedMs: 45000,
  quizElapsedMs: 0,
  handleChange: vi.fn(),
  inputValue: "",
  isEmptyQuizSet: false,
  isReady: true,
  isSavingResult: false,
  loadError: false,
  mistakeCount: 0,
  mode: "learn",
  quizSet: mockQuizSet,
  wasMistaken: false,
};

describe("study session ui", () => {
  it("renders loading state", () => {
    const html = renderToStaticMarkup(
      <StudySessionView {...baseProps} isReady={false} />
    );
    expect(html).toContain("学習データを読み込み中です。");
  });

  it("renders error state with home link", () => {
    const html = renderToStaticMarkup(
      <StudySessionView {...baseProps} loadError={true} />
    );
    expect(html).toContain("問題データの取得に失敗しました。");
    expect(html).toContain('href="/"');
    expect(html).toContain("ホームへ戻る");
  });

  it("renders empty quiz set state for learn mode", () => {
    const html = renderToStaticMarkup(
      <StudySessionView {...baseProps} isEmptyQuizSet={true} />
    );
    expect(html).toContain("出題できる問題がありません。");
  });

  it("renders empty review state", () => {
    const html = renderToStaticMarkup(
      <StudySessionView {...baseProps} mode="review" quizSet={[]} currentQuiz={null} isEmptyQuizSet={true} />
    );
    expect(html).toContain("復習対象はありません。");
  });

  it("renders header with mode badge, progress, counter, and timer", () => {
    const html = renderToStaticMarkup(<StudySessionView {...baseProps} />);
    expect(html).toContain("LEARN MODE");
    expect(html).toContain('data-slot="progress"');
    expect(html).toContain("1 / 3");
    expect(html).toContain("00:45");
  });

  it("renders source text card with all japanese sentences", () => {
    const html = renderToStaticMarkup(<StudySessionView {...baseProps} />);
    expect(html).toContain("こんにちは世界");
    expect(html).toContain("おはようございます");
    expect(html).toContain("ありがとう");
  });

  it("renders typing card with english sentences and input", () => {
    const html = renderToStaticMarkup(<StudySessionView {...baseProps} />);
    expect(html).toContain("英文を入力");
    expect(html).toContain("文 1 / 3 を入力中");
    expect(html).toContain("Good morning");
    expect(html).toContain("Thank you");
    expect(html).toContain('id="typing-input"');
    expect(html).toContain('data-slot="input"');
  });

  it("renders stats bar with computed values", () => {
    const propsWithInput: StudySessionViewProps = {
      ...baseProps,
      inputValue: "Hello",
      elapsedMs: 60000,
      quizElapsedMs: 60000,
      characterStates: [
        "correct", "correct", "correct", "correct", "correct",
        "pending", "pending", "pending", "pending", "pending", "pending"
      ] as ("correct" | "wrong" | "pending")[],
      mistakeCount: 2,
    };
    const html = renderToStaticMarkup(<StudySessionView {...propsWithInput} />);
    // WPM: (5 chars / 5) / (60000ms / 60000) = 1 WPM
    expect(html).toContain("1 WPM");
    // Accuracy: 5 correct / 5 typed = 100.0%
    expect(html).toContain("正確率 100.0%");
    // Chars: 5 typed / 11 total (Hello world)
    expect(html).toContain("5 / 11 文字");
    // Mistakes
    expect(html).toContain("ミス 2回");
  });

  it("renders footer with shortcuts and home link", () => {
    const html = renderToStaticMarkup(<StudySessionView {...baseProps} />);
    expect(html).toContain("スペースと大文字小文字も判定対象です。");
    expect(html).toContain("中断してホームへ戻る");
  });

  it("uses shadcn primitives without legacy CSS classes", () => {
    const html = renderToStaticMarkup(<StudySessionView {...baseProps} />);
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain('data-slot="progress"');
    expect(html).toContain('data-slot="card"');
    expect(html).toContain('data-slot="input"');
    expect(html).not.toContain("session-header");
    expect(html).not.toContain("badge badge-default");
    expect(html).not.toContain("progress-bar");
    expect(html).not.toContain("session-card");
    expect(html).not.toContain("text-input");
    expect(html).not.toContain("btn btn-primary");
    expect(html).not.toContain("session-footer");
    expect(html).not.toContain("empty-title");
  });
});
