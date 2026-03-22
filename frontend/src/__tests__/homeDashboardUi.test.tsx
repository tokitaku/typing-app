import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  HomeDashboardView,
  type HomeDashboardViewProps
} from "@/features/home-dashboard/ui/HomeDashboard";

const baseProps: HomeDashboardViewProps = {
  settings: {
    eikenLevels: ["5"],
    questionTypes: ["word", "sentence"]
  },
  summary: {
    date: "2026-03-22",
    sessions: 2,
    solvedProblems: 16,
    reviewBacklog: 3
  },
  onSelectEikenLevel: vi.fn(),
  onToggleQuestionType: vi.fn()
};

describe("home dashboard ui", () => {
  it("renders a visible link to the questions browser", () => {
    const html = renderToStaticMarkup(<HomeDashboardView {...baseProps} />);

    expect(html).toContain("登録問題を確認する");
    expect(html).toContain("href=\"/questions\"");
    expect(html).toContain("typing_questions の一覧を閲覧できます。");
  });
});
