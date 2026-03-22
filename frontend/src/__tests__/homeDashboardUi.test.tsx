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

    expect(html).toContain("登録問題を確認する");
    expect(html).toContain("href=\"/questions\"");
    expect(html).toContain("typing_questions の一覧を閲覧できます。");
  });

  it("renders tag selection ui and explains empty selection behavior", () => {
    const html = renderToStaticMarkup(<HomeDashboardView {...baseProps} />);

    expect(html).toContain("出題タグ");
    expect(html).toContain("business");
    expect(html).toContain("daily");
    expect(html).toContain("タグ未選択時はすべてのタグを対象に出題します。");
  });
});
