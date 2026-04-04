import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  HomeDashboardView,
  type HomeDashboardViewProps,
} from "@/features/home-dashboard/ui/HomeDashboard";

const baseProps: HomeDashboardViewProps = {
  settings: { tags: ["word", "business"] },
  availableTags: ["word", "business", "daily"],
  summary: {
    date: "2026-03-22",
    sessions: 2,
    solvedProblems: 16,
    reviewBacklog: 3,
  },
  onToggleTag: vi.fn(),
};

describe("home dashboard ui", () => {
  it("renders header with app name and questions link", () => {
    const html = renderToStaticMarkup(<HomeDashboardView {...baseProps} />);
    expect(html).toContain("Type &amp; Learn");
    expect(html).toContain("問題一覧へ");
    expect(html).toContain('href="/questions"');
    expect(html.match(/href="\/questions"/g)?.length).toBe(1);
  });

  it("renders hero with title, description, and CTA buttons", () => {
    const html = renderToStaticMarkup(<HomeDashboardView {...baseProps} />);
    expect(html).toContain("英語を打って、スペルと短文に慣れる。");
    expect(html).toContain("スペル定着とタイピング精度を同時に伸ばす学習アプリです。");
    expect(html).toContain("学習開始");
    expect(html).toContain('href="/session?mode=learn"');
    expect(html).toContain("復習する");
    expect(html).toContain('href="/session?mode=review"');
  });

  it("renders tag selection ui", () => {
    const html = renderToStaticMarkup(<HomeDashboardView {...baseProps} />);
    expect(html).toContain("出題対象タグ");
    expect(html).toContain("タグ未選択時はすべてのタグを対象に出題します。");
    expect(html).toContain("2件選択中");
  });

  it("renders metrics row with summary values", () => {
    const html = renderToStaticMarkup(<HomeDashboardView {...baseProps} />);
    expect(html).toContain("今日の学習回数");
    expect(html).toContain("今日の出題数");
    expect(html).toContain("復習待ち");
  });

  it("uses shadcn primitives without legacy CSS classes", () => {
    const html = renderToStaticMarkup(<HomeDashboardView {...baseProps} />);
    expect(html).toContain('data-slot="card"');
    expect(html).not.toContain("btn btn-primary");
    expect(html).not.toContain("btn btn-outline");
    expect(html).not.toContain("hero-actions");
    expect(html).not.toContain("bg-[#FFFCF6E0]");
    expect(html).not.toContain("tag-dropdown-trigger");
    expect(html).not.toContain("tag-dropdown-menu");
    expect(html).not.toContain("tag-dropdown-item");
  });
});
