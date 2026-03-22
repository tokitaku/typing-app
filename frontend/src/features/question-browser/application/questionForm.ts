import type { QuestionCreateRequestDto, QuestionUpdateRequestDto } from "@/shared/api/studyApiTypes";
import type { Question, QuizType } from "@/shared/types/study";

export type QuestionFormValues = {
  questionType: QuizType;
  english: string;
  japanese: string;
  tags: string[];
};

export type QuestionFormMode = "create" | "edit";

export function createDefaultQuestionFormValues(): QuestionFormValues {
  return {
    questionType: "word",
    english: "",
    japanese: "",
    tags: []
  }; // 新規作成フォームの初期値を生成する
}

export function createFormValuesFromQuestion(question: Question): QuestionFormValues {
  return {
    questionType: question.type,
    english: question.english,
    japanese: question.japanese,
    tags: [...question.tags]
  }; // 既存問題のデータをフォーム初期値に変換する
}

export function normalizeTagInput(input: string): string {
  return input.trim().toLowerCase(); // タグ入力値を正規化する（先頭末尾の空白除去 + 小文字化）
}

export function addTagToList(tags: string[], input: string): { tags: string[]; valid: boolean } {
  const normalized = normalizeTagInput(input);

  if (normalized === "") {
    return { tags, valid: false }; // 空文字は追加しない
  }

  if (tags.includes(normalized)) {
    return { tags, valid: false }; // 重複は追加しない
  }

  return { tags: [...tags, normalized], valid: true }; // 正規化済みタグを末尾へ追加する
}

export function removeTagFromList(tags: string[], tagToRemove: string): string[] {
  return tags.filter((tag) => tag !== tagToRemove); // 指定タグを一覧から除外する
}

export function filterTagSuggestions(
  availableTags: string[],
  selectedTags: string[],
  input: string
): string[] {
  const normalized = normalizeTagInput(input);

  return availableTags.filter(
    (tag) =>
      !selectedTags.includes(tag) && // 選択済みは候補から除外する
      (normalized === "" || tag.includes(normalized)) // 入力がある場合は部分一致でフィルタする
  );
}

export function buildCreateCommand(values: QuestionFormValues): QuestionCreateRequestDto {
  return {
    question_type: values.questionType,
    english: values.english,
    japanese: values.japanese,
    tags: values.tags
  }; // フォーム値を POST /questions のリクエスト形式に変換する
}

export function buildUpdateCommand(
  values: QuestionFormValues,
  original: Question
): QuestionUpdateRequestDto {
  const updates: QuestionUpdateRequestDto = {};

  if (values.questionType !== original.type) {
    updates.question_type = values.questionType;
  }

  if (values.english !== original.english) {
    updates.english = values.english;
  }

  if (values.japanese !== original.japanese) {
    updates.japanese = values.japanese;
  }

  const tagsChanged =
    values.tags.length !== original.tags.length ||
    values.tags.some((tag, i) => tag !== original.tags[i]);

  if (tagsChanged) {
    updates.tags = values.tags;
  }

  return updates; // 変更があったフィールドのみを含む PATCH リクエストを返す
}
