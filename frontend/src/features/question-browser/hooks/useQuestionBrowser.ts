"use client";

import { useEffect, useState } from "react";
import { fetchQuestions } from "@/features/question-browser/api/questionBrowserApi";
import {
  createDefaultQuestionBrowserFilters,
  createQuestionBrowserQuery,
  resolveQuestionBrowserStatus,
  type QuestionBrowserFilters,
  type QuestionBrowserStatus
} from "@/features/question-browser/application/questionBrowser";
import type { Question } from "@/shared/types/study";

type UseQuestionBrowserResult = {
  filters: QuestionBrowserFilters;
  questions: Question[];
  status: QuestionBrowserStatus;
  errorMessage: string | null;
  setTags: (tags: string[]) => void;
  setIncludeInactive: (includeInactive: boolean) => void;
  reload: () => void;
};

export function useQuestionBrowser(
  initialFilters: QuestionBrowserFilters = createDefaultQuestionBrowserFilters()
): UseQuestionBrowserResult {
  const [filters, setFilters] = useState<QuestionBrowserFilters>(initialFilters);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();

    const loadQuestions = async () => {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage(null);

      try {
        const nextQuestions = await fetchQuestions(
          createQuestionBrowserQuery(filters),
          abortController.signal
        );

        setQuestions(nextQuestions);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setQuestions([]);
        setHasError(true);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load questions"
        );
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadQuestions();

    return () => {
      abortController.abort();
    };
  }, [filters, reloadKey]);

  const status = resolveQuestionBrowserStatus({
    isLoading,
    hasError,
    questions
  });

  return {
    filters,
    questions,
    status,
    errorMessage,
    setTags: (tags) => {
      setFilters((current) => ({ ...current, tags }));
    },
    setIncludeInactive: (includeInactive) => {
      setFilters((current) => ({ ...current, includeInactive }));
    },
    reload: () => {
      setReloadKey((current) => current + 1);
    }
  };
}
