import { describe, expect, it } from "vitest";
import {
  SESSION_QUESTION_COUNT,
  buildProblemSet,
  calculateStudyResult,
  countIncrementalMistakes,
  getCharacterStates
} from "@/lib/study";
import { problems } from "@/data/problems";

describe("study utilities", () => {
  it("returns only review problems when review ids exist", () => {
    const reviewProblems = buildProblemSet("review", [2, 8]);

    expect(reviewProblems).toHaveLength(2);
    expect(reviewProblems.map((problem) => problem.id).sort((left, right) => left - right)).toEqual([
      2,
      8
    ]);
  });

  it("returns random ten questions in learn mode", () => {
    const learnProblems = buildProblemSet("learn", []);

    expect(learnProblems).toHaveLength(SESSION_QUESTION_COUNT);
    expect(new Set(learnProblems.map((problem) => problem.id)).size).toBe(SESSION_QUESTION_COUNT);
    expect(
      learnProblems.every((problem) => problems.some((candidate) => candidate.id === problem.id))
    ).toBe(true);
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
