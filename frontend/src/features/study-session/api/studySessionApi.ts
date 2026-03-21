import type { EikenLevel, Quiz, QuizType, StudyResult } from "@/domain/models/study";
import {
  fetchQuizList,
  postStudyResult
} from "@/shared/api/studyApiClient";

export type FetchQuizzesOptions = {
  eikenLevels?: EikenLevel[];
  questionTypes?: QuizType[];
};

export async function fetchQuizzes(
  options: FetchQuizzesOptions = {},
  signal?: AbortSignal
): Promise<Quiz[]> {
  const searchParams = new URLSearchParams();

  if (options.eikenLevels && options.eikenLevels.length > 0) {
    searchParams.set("eiken_levels", options.eikenLevels.join(",")); // 英検級フィルタを付与する
  }

  if (options.questionTypes && options.questionTypes.length > 0) {
    searchParams.set("question_types", options.questionTypes.join(",")); // 種別フィルタを付与する
  }

  const queryString = searchParams.toString();
  const response = await fetchQuizList(queryString ? `?${queryString}` : "", signal);

  return response.quizzes;
}

export async function saveStudyResult(result: StudyResult): Promise<StudyResult> {
  return postStudyResult(result);
}
