"use client";

import { useEffect, useState } from "react";
import {
  fetchQuestions,
  updateQuestionTags
} from "@/features/question-browser/api/questionBrowserApi";
import {
  beginTagEdit,
  cancelTagEdit as cancelTagEditTransition,
  createDefaultQuestionBrowserFilters,
  createQuestionBrowserQuery,
  normalizeTagInput,
  resolveQuestionBrowserStatus,
  type TagEditState,
  type QuestionBrowserFilters,
  type QuestionBrowserStatus
} from "@/features/question-browser/application/questionBrowser";
import type { Question, QuizType } from "@/shared/types/study";

type UseQuestionBrowserResult = {
  filters: QuestionBrowserFilters;
  questions: Question[];
  availableTags: string[];
  status: QuestionBrowserStatus;
  errorMessage: string | null;
  tagEditState: TagEditState | null;
  setTags: (tags: string[]) => void;
  setQuestionTypes: (questionTypes: QuizType[]) => void;
  setIncludeInactive: (includeInactive: boolean) => void;
  reload: () => void;
  beginEditTags: (questionId: number) => void;
  addTagToEdit: (tag: string) => void;
  removeTagFromEdit: (tag: string) => void;
  setTagInputValue: (value: string) => void;
  saveTagEdit: () => void;
  cancelTagEdit: () => void;
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
  const [tagEditState, setTagEditState] = useState<TagEditState | null>(null);

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

  const availableTags = Array.from(
    new Set(questions.flatMap((question) => question.tags))
  ).sort(); // ロード済み問題のタグ一覧を候補として導出する

  const beginEditTags = (questionId: number) => {
    const question = questions.find((question) => question.id === questionId);

    setTagEditState((current) =>
      beginTagEdit({
        current,
        question
      })
    ); // 編集開始時に現在のタグをドラフトへコピーする
  };

  const addTagToEdit = (tag: string) => {
    const normalized = normalizeTagInput(tag);

    if (!normalized) {
      return; // 空白だけのタグは追加しない
    }

    setTagEditState((current) => {
      if (!current || current.tagDraft.includes(normalized)) {
        return current; // 既に存在するタグは追加しない
      }

      return { ...current, tagDraft: [...current.tagDraft, normalized], tagInputValue: "", saveError: null };
    });
  };

  const removeTagFromEdit = (tag: string) => {
    setTagEditState((current) => {
      if (!current) {
        return null;
      }

      return { ...current, tagDraft: current.tagDraft.filter((t) => t !== tag) };
    });
  };

  const setTagInputValue = (value: string) => {
    setTagEditState((current) => {
      if (!current) {
        return null;
      }

      return { ...current, tagInputValue: value };
    });
  };

  const saveTagEdit = () => {
    if (!tagEditState || tagEditState.isSaving) {
      return;
    }

    const { questionId, tagDraft } = tagEditState;

    setTagEditState((current) => (current ? { ...current, isSaving: true } : null));

    void updateQuestionTags(questionId, tagDraft)
      .then((updatedQuestion) => {
        setQuestions((current) =>
          current.map((question) =>
            question.id === updatedQuestion.id ? updatedQuestion : question
          )
        ); // 保存成功後に一覧を楽観的に更新する
        setTagEditState(null);
      })
      .catch(() => {
        setTagEditState((current) =>
          current ? { ...current, isSaving: false, saveError: "保存に失敗しました。再試行してください。" } : null
        ); // 保存失敗時は編集状態を維持してエラーメッセージを表示する
      });
  };

  const cancelTagEdit = () => {
    setTagEditState((current) => cancelTagEditTransition(current));
  };

  return {
    filters,
    questions,
    availableTags,
    status,
    errorMessage,
    tagEditState,
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
    beginEditTags,
    addTagToEdit,
    removeTagFromEdit,
    setTagInputValue,
    saveTagEdit,
    cancelTagEdit
  };
}
