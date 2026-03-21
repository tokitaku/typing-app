"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { completeStudySession, startStudySession } from "@/application/usecases/studySession";
import type { CompletedStudySessionDto } from "@/application/dtos/study";
import {
  countIncrementalMistakes,
  getCharacterStates
} from "@/domain/services/studyService";
import { fetchQuizzes, saveStudyResult } from "@/infrastructure/api/studyApi";
import {
  appendMistakeLog,
  appendReviewQueue,
  appendStudyResult,
  getReviewQueue,
  getSettings,
  removeRecoveredQuizIds,
  saveLatestResult
} from "@/infrastructure/storage/studyStorage";
import type { Quiz, QuizProgress, StudyMode } from "@/domain/models/study";

type UseStudySessionResult = {
  quizSet: Quiz[];
  currentQuiz: Quiz | null;
  currentIndex: number;
  inputValue: string;
  elapsedMs: number;
  mistakeCount: number;
  wasMistaken: boolean;
  isReady: boolean;
  loadError: boolean;
  isEmptyQuizSet: boolean;
  isSavingResult: boolean;
  characterStates: ReturnType<typeof getCharacterStates>;
  handleChange: (nextValue: string) => void;
};

function createProgress(
  quizId: number,
  quizStartedAt: number,
  mistakeCount: number,
  wasMistaken: boolean
): QuizProgress {
  return {
    quizId,
    durationMs: Date.now() - quizStartedAt,
    mistakeCount,
    wasMistaken,
    completedAt: new Date().toISOString()
  }; // 完了時点の進捗情報を組み立てる
}

export function useStudySession(mode: StudyMode): UseStudySessionResult {
  const router = useRouter();
  const [quizSet, setQuizSet] = useState<Quiz[]>([]);
  const [isEmptyQuizSet, setIsEmptyQuizSet] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [progressList, setProgressList] = useState<QuizProgress[]>([]);
  const [quizStartedAt, setQuizStartedAt] = useState<number | null>(null);
  const [wasMistaken, setWasMistaken] = useState(false);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [isSavingResult, setIsSavingResult] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();

    setIsReady(false);
    setLoadError(false);
    setCurrentIndex(0);
    setInputValue("");
    setElapsedMs(0);
    setProgressList([]);
    setQuizStartedAt(null);
    setWasMistaken(false);
    setMistakeCount(0);
    setIsSavingResult(false);

    const loadQuizSet = async () => {
      try {
        const settings = getSettings();
        const quizzes = await fetchQuizzes(
          mode === "learn"
            ? {
                eikenLevels: settings.eikenLevels,
                questionTypes: settings.questionTypes
              }
            : {},
          abortController.signal
        );
        const session = startStudySession({
          quizzes,
          mode,
          reviewQueue: getReviewQueue(),
          settings
        });

        setQuizSet(session.quizSet);
        setIsEmptyQuizSet(session.isEmptyQuizSet);
        setIsReady(true);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setQuizSet([]);
        setIsEmptyQuizSet(false);
        setLoadError(true);
        setIsReady(true);
      }
    };

    void loadQuizSet();

    return () => {
      abortController.abort();
    };
  }, [mode]);

  const currentQuiz = quizSet[currentIndex] ?? null;

  useEffect(() => {
    if (!currentQuiz || quizStartedAt !== null) {
      return;
    }

    setQuizStartedAt(Date.now()); // クイズ開始時刻を保持して所要時間を計測する
  }, [currentQuiz, quizStartedAt]);

  useEffect(() => {
    if (!currentQuiz) {
      return;
    }

    const timerId = window.setInterval(() => {
      setElapsedMs((value) => value + 100);
    }, 100);

    return () => window.clearInterval(timerId);
  }, [currentQuiz]);

  const persistCompletedSession = async (completedSession: CompletedStudySessionDto) => {
    if (completedSession.reviewQueueToAppend.length > 0) {
      appendReviewQueue(completedSession.reviewQueueToAppend);
      appendMistakeLog(completedSession.mistakeLogs);
    }

    if (mode === "review" && completedSession.recoveredQuizIds.length > 0) {
      removeRecoveredQuizIds(completedSession.recoveredQuizIds);
    }

    saveLatestResult(completedSession.latestResult);
    appendStudyResult(completedSession.historyResult);

    try {
      await saveStudyResult(completedSession.summary);
    } catch {
      return;
    } finally {
      router.push(completedSession.nextRoute);
    }
  };

  const finishQuiz = () => {
    if (!currentQuiz || quizStartedAt === null) {
      return;
    }

    const nextProgress = createProgress(
      currentQuiz.id,
      quizStartedAt,
      mistakeCount,
      wasMistaken
    );
    const nextProgressList = [...progressList, nextProgress];

    setProgressList(nextProgressList);

    if (currentIndex === quizSet.length - 1) {
      const completedSession = completeStudySession({
        mode,
        progressList: nextProgressList
      });

      setIsSavingResult(true);
      void persistCompletedSession(completedSession);
      return;
    }

    setCurrentIndex((value) => value + 1);
    setInputValue("");
    setQuizStartedAt(null);
    setWasMistaken(false);
    setMistakeCount(0);
  };

  const handleChange = (nextValue: string) => {
    if (!currentQuiz || isSavingResult) {
      return;
    }

    if (nextValue.length > currentQuiz.english.length) {
      return;
    }

    const nextMistakes = countIncrementalMistakes(
      inputValue,
      nextValue,
      currentQuiz.english
    );

    setInputValue(nextValue);

    if (nextMistakes > 0) {
      setWasMistaken(true);
      setMistakeCount((value) => value + nextMistakes);
    }

    if (nextValue === currentQuiz.english) {
      finishQuiz();
    }
  };

  return {
    quizSet,
    currentQuiz,
    currentIndex,
    inputValue,
    elapsedMs,
    mistakeCount,
    wasMistaken,
    isReady,
    loadError,
    isEmptyQuizSet,
    isSavingResult,
    characterStates: currentQuiz ? getCharacterStates(currentQuiz.english, inputValue) : [],
    handleChange
  };
}
