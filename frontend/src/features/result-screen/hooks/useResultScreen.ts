"use client";

import { useEffect, useState } from "react";
import { createResultScreenModel } from "@/features/result-screen/application/resultScreen";
import type { ResultScreenDto } from "@/application/dtos/study";
import { fetchLatestStudyResult, fetchTodayStudySummary } from "@/infrastructure/api/studyApi";
import {
  getLatestResult,
  getReviewQueue,
  getTodaySummary
} from "@/infrastructure/storage/studyStorage";

function createFallbackResultScreen(): ResultScreenDto {
  return {
    result: null,
    todaySummary: {
      date: new Date().toISOString().slice(0, 10),
      sessions: 0,
      solvedProblems: 0,
      reviewBacklog: 0
    }
  }; // 結果画面の初期表示用フォールバックを返す
}

export function useResultScreen() {
  const [screen, setScreen] = useState<ResultScreenDto>(createFallbackResultScreen);

  useEffect(() => {
    let isDisposed = false;

    const loadResultScreen = async () => {
      const localResult = getLatestResult();
      const reviewQueueCount = getReviewQueue().length;
      const localSummary = getTodaySummary();
      const localScreen = createResultScreenModel({
        localResult,
        localSummary,
        reviewQueueCount
      });

      if (!isDisposed) {
        setScreen(localScreen);
      }

      try {
        const [remoteResult, remoteSummary] = await Promise.all([
          fetchLatestStudyResult(),
          fetchTodayStudySummary()
        ]);

        if (isDisposed) {
          return;
        }

        setScreen(
          createResultScreenModel({
            localResult,
            remoteResult,
            localSummary,
            remoteSummary,
            reviewQueueCount
          })
        );
      } catch {
        if (!isDisposed) {
          setScreen(localScreen);
        }
      }
    };

    void loadResultScreen();

    return () => {
      isDisposed = true;
    };
  }, []);

  return screen;
}
