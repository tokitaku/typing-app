import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ResultScreenView,
  type ResultScreenViewProps,
} from "@/features/result-screen/ui/ResultScreen";

const baseProps: ResultScreenViewProps = {
  result: {
    mode: "learn" as const,
    total_questions: 2,
    correct_rate: 50,
    mistakes: 7,
    average_time: 7700,
    created_at: "2026-03-22T10:00:00Z",
  },
  todaySummary: {
    date: "2026-03-22",
    sessions: 1,
    solvedProblems: 2,
    reviewBacklog: 0,
  },
};

describe("result screen ui", () => {
  it("renders empty state when no result", () => {
    const html = renderToStaticMarkup(
      <ResultScreenView result={null} todaySummary={baseProps.todaySummary} />
    );
    expect(html).toContain("結果データがありません。");
    expect(html).toContain('href="/"');
    expect(html).toContain("ホームへ戻る");
    expect(html).not.toContain("btn btn-primary");
  });

  it("renders header with lucide icons and home button", () => {
    const html = renderToStaticMarkup(<ResultScreenView {...baseProps} />);
    expect(html).toContain("Type &amp; Learn");
    expect(html).toContain("ホームへ戻る");
    expect(html).not.toContain("btn btn-ghost");
    expect(html).not.toContain("app-header");
  });

  it("renders title section", () => {
    const html = renderToStaticMarkup(<ResultScreenView {...baseProps} />);
    expect(html).toContain("学習結果");
    expect(html).toContain("セッション完了");
  });

  it("renders four stat cards with correct values", () => {
    const html = renderToStaticMarkup(<ResultScreenView {...baseProps} />);
    expect(html).toContain("出題数");
    expect(html).toContain(">2<");
    expect(html).toContain("正答率");
    expect(html).toContain("50%");
    expect(html).toContain("ミス数");
    expect(html).toContain(">7<");
    expect(html).toContain("平均入力時間");
    expect(html).toContain("7.7秒");
  });

  it("renders notes row and separator", () => {
    const html = renderToStaticMarkup(<ResultScreenView {...baseProps} />);
    expect(html).toContain("今日の学習回数: 1");
    expect(html).toContain("復習待ち: 0");
    expect(html).toContain('data-slot="separator"');
  });

  it("renders action buttons with correct links for learn mode", () => {
    const html = renderToStaticMarkup(<ResultScreenView {...baseProps} />);
    expect(html).toContain("次の学習へ進む");
    expect(html).toContain('href="/session?mode=review"');
    expect(html).toContain("ホームへ戻る");
  });

  it("links to learn mode when result is review", () => {
    const html = renderToStaticMarkup(
      <ResultScreenView {...baseProps} result={{ ...baseProps.result!, mode: "review" }} />
    );
    expect(html).toContain('href="/session?mode=learn"');
  });

  it("uses shadcn primitives without legacy CSS classes", () => {
    const html = renderToStaticMarkup(<ResultScreenView {...baseProps} />);
    expect(html).toContain('data-slot="card"');
    expect(html).toContain('data-slot="separator"');
    expect(html).not.toContain("btn btn-primary");
    expect(html).not.toContain("btn btn-outline");
    expect(html).not.toContain("btn btn-ghost");
    expect(html).not.toContain("app-header");
    expect(html).not.toContain("stat-card");
    expect(html).not.toContain("result-content");
    expect(html).not.toContain("result-title");
    expect(html).not.toContain("result-notes");
    expect(html).not.toContain("result-actions");
  });
});
