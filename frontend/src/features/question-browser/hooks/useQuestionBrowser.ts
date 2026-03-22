"use client";

import { useEffect, useState } from "react";
import {
  createQuestion,
  fetchAvailableTags,
  fetchQuestions,
  updateQuestion
} from "@/features/question-browser/api/questionBrowserApi";
import {
  buildCreateCommand,
  buildUpdateCommand,
  type QuestionFormValues
} from "@/features/question-browser/application/questionForm";
import {
  createDefaultQuestionBrowserFilters,
  createQuestionBrowserQuery,
  resolveQuestionBrowserStatus,
  type QuestionBrowserFilters,
  type QuestionBrowserStatus
} from "@/features/question-browser/application/questionBrowser";
import type { Question, QuizType } from "@/shared/types/study";

type FormState =
  | { mode: null }
  | { mode: "create" }
  | { mode: "edit"; question: Question };

type UseQuestionBrowserResult = {
  filters: QuestionBrowserFilters;
  questions: Question[];
  status: QuestionBrowserStatus;
  errorMessage: string | null;
  setTags: (tags: string[]) => void;
  setQuestionTypes: (questionTypes: QuizType[]) => void;
  setIncludeInactive: (includeInactive: boolean) => void;
  reload: () => void;
  formState: FormState;
  availableTags: string[];
  isFormSubmitting: boolean;
  formSubmitError: string | null;
  openCreateForm: () => void;
  openEditForm: (question: Question) => void;
  closeForm: () => void;
  submitForm: (values: QuestionFormValues) => Promise<void>;
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
  const [formState, setFormState] = useState<FormState>({ mode: null });
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null);

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

  useEffect(() => {
    const abortController = new AbortController();

    const loadTags = async () => {
      try {
        const tags = await fetchAvailableTags(abortController.signal);
        setAvailableTags(tags);
      } catch {
        // タグ取得失敗は non-critical なため握りつぶす
      }
    };

    void loadTags();

    return () => {
      abortController.abort();
    };
  }, [reloadKey]);

  const status = resolveQuestionBrowserStatus({
    isLoading,
    hasError,
    questions
  });

  async function submitForm(values: QuestionFormValues) {
    if (formState.mode === null) return;

    setIsFormSubmitting(true);
    setFormSubmitError(null);

    try {
      if (formState.mode === "create") {
        await createQuestion(buildCreateCommand(values));
      } else {
        await updateQuestion(formState.question.id, buildUpdateCommand(values, formState.question));
      }

      setFormState({ mode: null });
      setReloadKey((current) => current + 1); // 作成・更新後に一覧を再取得する
    } catch (error) {
      setFormSubmitError(
        error instanceof Error ? error.message : "Failed to save question"
      );
    } finally {
      setIsFormSubmitting(false);
    }
  }

  return {
    filters,
    questions,
    status,
    errorMessage,
    setTags: (tags) => {
      setFilters((current) => ({ ...current, tags }));
    },
    setQuestionTypes: (questionTypes) => {
      setFilters((current) => ({ ...current, questionTypes }));
    },
    setIncludeInactive: (includeInactive) => {
      setFilters((current) => ({ ...current, includeInactive }));
    },
    reload: () => {
      setReloadKey((current) => current + 1);
    },
    formState,
    availableTags,
    isFormSubmitting,
    formSubmitError,
    openCreateForm: () => {
      setFormSubmitError(null);
      setFormState({ mode: "create" }); // 新規作成フォームを開く
    },
    openEditForm: (question: Question) => {
      setFormSubmitError(null);
      setFormState({ mode: "edit", question }); // 選択した問題の編集フォームを開く
    },
    closeForm: () => {
      setFormState({ mode: null }); // フォームを閉じる
    },
    submitForm
  };
}
