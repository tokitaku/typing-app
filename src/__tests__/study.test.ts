import { describe, expect, it } from "vitest";
import {
  SESSION_QUESTION_COUNT,
  buildProblemSet,
  calculateStudyResult,
  countIncrementalMistakes,
  getCharacterStates
} from "@/lib/study";
import type { Problem } from "@/types/study";

const problems: Problem[] = [
  { id: 1, type: "word", english: "apple", japanese: "りんご", level: 1 },
  { id: 2, type: "word", english: "library", japanese: "図書館", level: 1 },
  { id: 3, type: "word", english: "beautiful", japanese: "美しい", level: 2 },
  { id: 4, type: "word", english: "schedule", japanese: "予定", level: 2 },
  { id: 5, type: "word", english: "environment", japanese: "環境", level: 3 },
  { id: 6, type: "sentence", english: "I drink coffee every morning.", japanese: "私は毎朝コーヒーを飲みます。", level: 1 },
  { id: 7, type: "sentence", english: "We need to finish this report today.", japanese: "私たちは今日このレポートを終える必要があります。", level: 2 },
  { id: 8, type: "sentence", english: "Small daily habits often create meaningful progress.", japanese: "小さな毎日の習慣が大きな前進を生みます。", level: 3 },
  { id: 9, type: "word", english: "practice", japanese: "練習", level: 1 },
  { id: 10, type: "word", english: "through", japanese: "通り抜けて", level: 2 },
  { id: 11, type: "word", english: "confidence", japanese: "自信", level: 3 }
];

describe("study utilities", () => {
  it("returns only review problems when review ids exist", () => {
    const reviewProblems = buildProblemSet(problems, "review", [2, 8]);

    expect(reviewProblems).toHaveLength(2);
    expect(reviewProblems.map((problem) => problem.id).sort((left, right) => left - right)).toEqual([
      2,
      8
    ]);
  });

  it("returns random ten questions in learn mode", () => {
    const learnProblems = buildProblemSet(problems, "learn", []);

    expect(learnProblems).toHaveLength(SESSION_QUESTION_COUNT);
    expect(new Set(learnProblems.map((problem) => problem.id)).size).toBe(SESSION_QUESTION_COUNT);
    expect(
      learnProblems.every((problem) => problems.some((candidate) => candidate.id === problem.id))
    ).toBe(true);
  });

  it("filters learn problems by specified levels", () => {
    const level1Only = buildProblemSet(problems, "learn", [], [1]);

    expect(level1Only.length).toBeGreaterThan(0);
    expect(level1Only.every((problem) => problem.level === 1)).toBe(true);
  });

  it("filters learn problems by level 3", () => {
    const level3Only = buildProblemSet(problems, "learn", [], [3]);

    expect(level3Only.length).toBeGreaterThan(0);
    expect(level3Only.every((problem) => problem.level === 3)).toBe(true);
  });

  it("does not apply level filter in review mode", () => {
    const level1Id = problems.find((p) => p.level === 1)!.id;
    const level3Id = problems.find((p) => p.level === 3)!.id;
    const reviewProblems = buildProblemSet(problems, "review", [level1Id, level3Id], [1]);

    expect(reviewProblems).toHaveLength(2);
    const ids = reviewProblems.map((p) => p.id).sort((a, b) => a - b);
    expect(ids).toEqual([level1Id, level3Id].sort((a, b) => a - b));
  });

  it("marks typed characters with real-time states", () => {
    const states = getCharacterStates("apple", "apx");

    expect(states).toEqual(["correct", "correct", "wrong", "pending", "pending"]);
  });

  it("counts only newly added mistakes so backspace does not overcount", () => {
    expect(countIncrementalMistakes("ap", "apx", "apple")).toBe(1);
    expect(countIncrementalMistakes("apx", "ap", "apple")).toBe(0);
    expect(countIncrementalMistakes("ap", "apple", "apple")).toBe(0);
  });

  it("calculates study result from progress entries", () => {
    const summary = calculateStudyResult(
      [
        {
          problemId: 1,
          durationMs: 3000,
          mistakeCount: 0,
          wasMistaken: false,
          completedAt: "2026-03-16T00:00:00.000Z"
        },
        {
          problemId: 2,
          durationMs: 5000,
          mistakeCount: 2,
          wasMistaken: true,
          completedAt: "2026-03-16T00:00:10.000Z"
        }
      ],
      "learn"
    );

    expect(summary.total_questions).toBe(2);
    expect(summary.correct_rate).toBe(50);
    expect(summary.mistakes).toBe(2);
    expect(summary.average_time).toBe(4000);
  });
});
