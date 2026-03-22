"use client";

import { useEffect, useState } from "react";
import {
  createHomeDashboardModel,
  toggleTag
} from "@/features/home-dashboard/application/homeDashboard";
import type { HomeDashboardDto } from "@/features/home-dashboard/application/homeDashboard";
import {
  fetchAvailableTags,
  fetchTodayStudySummary
} from "@/features/home-dashboard/api/homeDashboardApi";
import {
  getReviewQueue,
  getSettings,
  getTodaySummary,
  saveSettings
} from "@/features/home-dashboard/storage/homeDashboardStorage";

function createFallbackDashboard(): HomeDashboardDto {
  return {
    summary: {
      date: new Date().toISOString().slice(0, 10),
      sessions: 0,
      solvedProblems: 0,
      reviewBacklog: 0
    },
    settings: { tags: [] },
    availableTags: []
  }; // 初期表示で空のダッシュボード状態を返す
}

export function useHomeDashboard() {
  const [dashboard, setDashboard] = useState<HomeDashboardDto>(createFallbackDashboard);

  useEffect(() => {
    const abortController = new AbortController();
    let isDisposed = false;

    const loadDashboard = async () => {
      const settings = getSettings();
      const reviewQueueCount = getReviewQueue().length;
      const localSummary = getTodaySummary();
      let availableTags: string[] = [];

      try {
        availableTags = await fetchAvailableTags(abortController.signal);
      } catch {
        availableTags = [];
      }

      const localDashboard = createHomeDashboardModel({
        settings,
        reviewQueueCount,
        localSummary,
        availableTags
      });

      if (!isDisposed) {
        setDashboard(localDashboard);
      }

      try {
        const remoteSummary = await fetchTodayStudySummary(abortController.signal);

        if (isDisposed) {
          return;
        }

        setDashboard(
          createHomeDashboardModel({
            settings,
            reviewQueueCount,
            localSummary,
            availableTags,
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
      abortController.abort();
      isDisposed = true;
    };
  }, []);

  const handleToggleTag = (tag: string) => {
    setDashboard((current) => {
      const nextSettings = toggleTag(current.settings, tag);
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
    availableTags: dashboard.availableTags,
    toggleTag: handleToggleTag
  };
}
