import { describe, expect, it } from "vitest";
import {
  SESSION_QUESTION_COUNT,
  buildQuizSet,
  calculateStudyResult,
  countIncrementalMistakes,
  getCharacterStates
} from "@/lib/study";
import type { Quiz } from "@/types/study";

const quizzes: Quiz[] = [
  { id: 1, type: "word", english: "apple", japanese: "りんご", level: 1 },
  { id: 2, type: "word", english: "library", japanese: "図書館", level: 1 },
  { id: 3, type: "word", english: "beautiful", japanese: "美しい", level: 2 },
  { id: 4, type: "word", english: "schedule", japanese: "予定", level: 2 },
  { id: 5, type: "word", english: "environment", japanese: "環境", level: 3 },
  { id: 6, type: "word", english: "morning", japanese: "朝", level: 1 },
  { id: 7, type: "word", english: "report", japanese: "報告書", level: 2 },
  { id: 8, type: "word", english: "progress", japanese: "前進", level: 3 },
  { id: 9, type: "word", english: "practice", japanese: "練習", level: 1 },
  { id: 10, type: "word", english: "through", japanese: "通り抜けて", level: 2 },
  { id: 11, type: "word", english: "confidence", japanese: "自信", level: 3 }
];

describe("study utilities", () => {
  it("returns only review quizzes when review ids exist", () => {
    const reviewQuizzes = buildQuizSet(quizzes, "review", [2, 8]);

    expect(reviewQuizzes).toHaveLength(2);
    expect(reviewQuizzes.map((quiz) => quiz.id).sort((left, right) => left - right)).toEqual([
      2,
      8
    ]);
  });

  it("returns random ten questions in learn mode", () => {
    const learnQuizzes = buildQuizSet(quizzes, "learn", []);

    expect(learnQuizzes).toHaveLength(SESSION_QUESTION_COUNT);
    expect(new Set(learnQuizzes.map((quiz) => quiz.id)).size).toBe(SESSION_QUESTION_COUNT);
    expect(
      learnQuizzes.every((quiz) => quizzes.some((candidate) => candidate.id === quiz.id))
    ).toBe(true);
  });

  it("filters learn quizzes by specified levels", () => {
    const level1Only = buildQuizSet(quizzes, "learn", [], [1]);

    expect(level1Only.length).toBeGreaterThan(0);
    expect(level1Only.every((quiz) => quiz.level === 1)).toBe(true);
  });

  it("filters learn quizzes by level 3", () => {
    const level3Only = buildQuizSet(quizzes, "learn", [], [3]);

    expect(level3Only.length).toBeGreaterThan(0);
    expect(level3Only.every((quiz) => quiz.level === 3)).toBe(true);
  });

  it("does not apply level filter in review mode", () => {
    const level1Id = quizzes.find((quiz) => quiz.level === 1)!.id;
    const level3Id = quizzes.find((quiz) => quiz.level === 3)!.id;
    const reviewQuizzes = buildQuizSet(quizzes, "review", [level1Id, level3Id], [1]);

    expect(reviewQuizzes).toHaveLength(2);
    const ids = reviewQuizzes.map((quiz) => quiz.id).sort((a, b) => a - b);
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
          quizId: 1,
          durationMs: 3000,
          mistakeCount: 0,
          wasMistaken: false,
          completedAt: "2026-03-16T00:00:00.000Z"
        },
        {
          quizId: 2,
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
