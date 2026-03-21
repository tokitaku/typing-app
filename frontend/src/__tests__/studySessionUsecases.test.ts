import { describe, expect, it } from "vitest";
import {
  completeStudySession,
  startStudySession
} from "@/features/study-session/application/studySession";
import type { Quiz, QuizProgress, Settings } from "@/domain/models/study";

const settings: Settings = {
  eikenLevels: ["5", "4"],
  questionTypes: ["word", "sentence"]
};

const quizzes: Quiz[] = [
  { id: 1, type: "word", eikenLevel: "5", english: "apple", japanese: "りんご" },
  { id: 2, type: "word", eikenLevel: "4", english: "library", japanese: "図書館" },
  { id: 3, type: "sentence", eikenLevel: "3", english: "I read books.", japanese: "私は本を読みます。" }
];

describe("study session use cases", () => {
  it("builds a learn session with settings filters", () => {
    const result = startStudySession({
      quizzes,
      mode: "learn",
      reviewQueue: [3],
      settings,
      sessionQuestionCount: 10
    });

    expect(result.quizSet.length).toBe(2);
    expect(result.quizSet.every((quiz) => settings.eikenLevels.includes(quiz.eikenLevel))).toBe(true);
    expect(result.isEmptyQuizSet).toBe(false);
  });

  it("returns empty flag when learn session has no matching quizzes", () => {
    const result = startStudySession({
      quizzes,
      mode: "learn",
      reviewQueue: [],
      settings: {
        eikenLevels: ["1"],
        questionTypes: ["word"]
      },
      sessionQuestionCount: 10
    });

    expect(result.quizSet).toEqual([]);
    expect(result.isEmptyQuizSet).toBe(true);
  });

  it("summarizes a finished learn session and collects persistence payloads", () => {
    const progressList: QuizProgress[] = [
      {
        quizId: 1,
        durationMs: 1500,
        mistakeCount: 0,
        wasMistaken: false,
        completedAt: "2026-03-21T10:00:00.000Z"
      },
      {
        quizId: 2,
        durationMs: 2500,
        mistakeCount: 2,
        wasMistaken: true,
        completedAt: "2026-03-21T10:00:05.000Z"
      }
    ];

    const result = completeStudySession({
      mode: "learn",
      progressList
    });

    expect(result.summary.mode).toBe("learn");
    expect(result.summary.total_questions).toBe(2);
    expect(result.summary.correct_rate).toBe(50);
    expect(result.summary.mistakes).toBe(2);
    expect(result.summary.average_time).toBe(2000);
    expect(result.summary.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.reviewQueueToAppend).toEqual([2]);
    expect(result.recoveredQuizIds).toEqual([1]);
    expect(result.latestResult).toEqual(result.summary);
    expect(result.historyResult).toEqual(result.summary);
    expect(result.nextRoute).toBe("/result");
    expect(result.mistakeLogs).toEqual([
      {
        question_id: 2,
        mistake_count: 2,
        created_at: "2026-03-21T10:00:05.000Z"
      }
    ]);
  });

  it("returns recovered ids for review mode", () => {
    const progressList: QuizProgress[] = [
      {
        quizId: 3,
        durationMs: 1000,
        mistakeCount: 0,
        wasMistaken: false,
        completedAt: "2026-03-21T10:00:00.000Z"
      }
    ];

    const result = completeStudySession({
      mode: "review",
      progressList
    });

    expect(result.reviewQueueToAppend).toEqual([]);
    expect(result.recoveredQuizIds).toEqual([3]);
  });
});
