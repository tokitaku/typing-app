"use client";

import { useEffect, useState } from "react";
import {
  createHomeDashboardModel,
  selectEikenLevel,
  toggleQuestionType
} from "@/features/home-dashboard/application/homeDashboard";
import type { HomeDashboardDto } from "@/features/home-dashboard/application/homeDashboard";
import { fetchTodayStudySummary } from "@/features/home-dashboard/api/homeDashboardApi";
import {
  getReviewQueue,
  getSettings,
  getTodaySummary,
  saveSettings
} from "@/features/home-dashboard/storage/homeDashboardStorage";
import type { EikenLevel, QuizType } from "@/domain/models/study";

function createFallbackDashboard(): HomeDashboardDto {
  return {
    summary: {
      date: new Date().toISOString().slice(0, 10),
      sessions: 0,
      solvedProblems: 0,
      reviewBacklog: 0
    },
    settings: {
      eikenLevels: ["5"],
      questionTypes: ["word", "sentence"]
    }
  }; // 初期表示で空のダッシュボード状態を返す
}

export function useHomeDashboard() {
  const [dashboard, setDashboard] = useState<HomeDashboardDto>(createFallbackDashboard);

  useEffect(() => {
    let isDisposed = false;

    const loadDashboard = async () => {
      const settings = getSettings();
      const reviewQueueCount = getReviewQueue().length;
      const localSummary = getTodaySummary();
      const localDashboard = createHomeDashboardModel({
        settings,
        reviewQueueCount,
        localSummary
      });

      if (!isDisposed) {
        setDashboard(localDashboard);
      }

      try {
        const remoteSummary = await fetchTodayStudySummary();

        if (isDisposed) {
          return;
        }

        setDashboard(
          createHomeDashboardModel({
            settings,
            reviewQueueCount,
            localSummary,
            remoteSummary
          })
        );
      } catch {
        if (!isDisposed) {
          setDashboard(localDashboard);
        }
      }
    };

    void loadDashboard();

    return () => {
      isDisposed = true;
    };
  }, []);

  const handleSelectEikenLevel = (eikenLevel: EikenLevel) => {
    setDashboard((current) => {
      const nextSettings = selectEikenLevel(current.settings, eikenLevel);
      saveSettings(nextSettings);

      return {
        ...current,
        settings: nextSettings
      };
    });
  };

  const handleToggleQuestionType = (questionType: QuizType) => {
    setDashboard((current) => {
      const nextSettings = toggleQuestionType(current.settings, questionType);
      saveSettings(nextSettings);

      return {
        ...current,
        settings: nextSettings
      };
    });
  };

  return {
    summary: dashboard.summary,
    settings: dashboard.settings,
    selectEikenLevel: handleSelectEikenLevel,
    toggleQuestionType: handleToggleQuestionType
  };
}
