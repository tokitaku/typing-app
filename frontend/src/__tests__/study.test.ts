import { describe, expect, it } from "vitest";
import {
  SESSION_QUESTION_COUNT,
  buildQuizSet,
  calculateStudyResult
} from "@/features/study-session/model/session";
import {
  countIncrementalMistakes,
  getCharacterStates
} from "@/features/study-session/typing/typing";
import type { Quiz } from "@/shared/types/study";

const quizzes: Quiz[] = [
  { id: 1, type: "word", eikenLevel: "5", english: "apple", japanese: "りんご" },
  { id: 2, type: "word", eikenLevel: "5", english: "library", japanese: "図書館" },
  { id: 3, type: "word", eikenLevel: "4", english: "beautiful", japanese: "美しい" },
  { id: 4, type: "word", eikenLevel: "4", english: "schedule", japanese: "予定" },
  { id: 5, type: "word", eikenLevel: "3", english: "environment", japanese: "環境" },
  { id: 6, type: "sentence", eikenLevel: "5", english: "I drink coffee every morning.", japanese: "私は毎朝コーヒーを飲みます。" },
  { id: 7, type: "sentence", eikenLevel: "4", english: "We need to finish this report today.", japanese: "私たちは今日このレポートを終える必要があります。" },
  { id: 8, type: "sentence", eikenLevel: "3", english: "Small daily habits often create meaningful progress.", japanese: "小さな毎日の習慣が大きな前進を生みます。" },
  { id: 9, type: "word", eikenLevel: "5", english: "practice", japanese: "練習" },
  { id: 10, type: "word", eikenLevel: "4", english: "through", japanese: "通り抜けて" },
  { id: 11, type: "word", eikenLevel: "3", english: "confidence", japanese: "自信" }
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
    const learnQuizzes = buildQuizSet(quizzes, "learn", [], ["5", "4", "3"], ["word", "sentence"]);

    expect(learnQuizzes).toHaveLength(SESSION_QUESTION_COUNT);
    expect(new Set(learnQuizzes.map((quiz) => quiz.id)).size).toBe(SESSION_QUESTION_COUNT);
    expect(
      learnQuizzes.every((quiz) => quizzes.some((candidate) => candidate.id === quiz.id))
    ).toBe(true);
  });

  it("filters learn quizzes by specified levels", () => {
    const level1Only = buildQuizSet(quizzes, "learn", [], ["5"], ["word", "sentence"]);

    expect(level1Only.length).toBeGreaterThan(0);
    expect(level1Only.every((quiz) => quiz.eikenLevel === "5")).toBe(true);
  });

  it("filters learn quizzes by question type", () => {
    const sentenceOnly = buildQuizSet(quizzes, "learn", [], ["5", "4", "3"], ["sentence"]);

    expect(sentenceOnly.length).toBeGreaterThan(0);
    expect(sentenceOnly.every((quiz) => quiz.type === "sentence")).toBe(true);
  });

  it("filters learn quizzes by eiken level and question type together", () => {
    const filtered = buildQuizSet(quizzes, "learn", [], ["4"], ["word"]);

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((quiz) => quiz.eikenLevel === "4")).toBe(true);
    expect(filtered.every((quiz) => quiz.type === "word")).toBe(true);
  });

  it("does not apply learn filters in review mode", () => {
    const level5Id = quizzes.find((quiz) => quiz.eikenLevel === "5")!.id;
    const level3Id = quizzes.find((quiz) => quiz.eikenLevel === "3")!.id;
    const reviewQuizzes = buildQuizSet(quizzes, "review", [level5Id, level3Id], ["5"], ["word"]);

    expect(reviewQuizzes).toHaveLength(2);
    const ids = reviewQuizzes.map((quiz) => quiz.id).sort((a, b) => a - b);
    expect(ids).toEqual([level5Id, level3Id].sort((a, b) => a - b));
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
