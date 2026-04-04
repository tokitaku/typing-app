import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  HomeDashboardView,
  type HomeDashboardViewProps
} from "@/features/home-dashboard/ui/HomeDashboard";

const baseProps: HomeDashboardViewProps = {
  settings: { tags: ["word", "business"] },
  availableTags: ["word", "business", "daily"],
  summary: {
    date: "2026-03-22",
    sessions: 2,
    solvedProblems: 16,
    reviewBacklog: 3
  },
  onToggleTag: vi.fn()
};

describe("home dashboard ui", () => {
  it("renders a visible link to the questions browser", () => {
    const html = renderToStaticMarkup(<HomeDashboardView {...baseProps} />);

    expect(html).toContain("問題一覧へ");
    expect(html).toContain("href=\"/questions\"");
  });

  it("renders the shadcn home layout without legacy button classes", () => {
    const html = renderToStaticMarkup(<HomeDashboardView {...baseProps} />);

    expect(html).toContain("Type &amp; Learn");
    expect(html).toContain("学習開始");
    expect(html).toContain("復習する");
    expect(html).toContain("今日の学習回数");
    expect(html).not.toContain("btn btn-primary");
    expect(html).not.toContain("hero-actions");
  });

  it("renders tag selection ui and explains empty selection behavior", () => {
    const html = renderToStaticMarkup(<HomeDashboardView {...baseProps} />);

    expect(html).toContain("出題対象タグ");
    expect(html).toContain("タグ未選択時はすべてのタグを対象に出題します。");
    expect(html).toContain("2件選択中");
  });
});
