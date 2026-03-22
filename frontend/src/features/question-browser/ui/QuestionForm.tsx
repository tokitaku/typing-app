"use client";

import React, { useState } from "react";
import {
  createDefaultQuestionFormValues,
  createFormValuesFromQuestion,
  type QuestionFormMode,
  type QuestionFormValues
} from "@/features/question-browser/application/questionForm";
import { TagInput } from "@/features/question-browser/ui/TagInput";
import type { Question, QuizType } from "@/shared/types/study";

const QUESTION_TYPE_OPTIONS: { value: QuizType; label: string }[] = [
  { value: "word", label: "英単語" },
  { value: "sentence", label: "英文章" }
];

export type QuestionFormProps = {
  mode: QuestionFormMode;
  question?: Question;
  availableTags: string[];
  onSubmit: (values: QuestionFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitError: string | null;
};

export function QuestionForm({
  mode,
  question,
  availableTags,
  onSubmit,
  onCancel,
  isSubmitting,
  submitError
}: QuestionFormProps) {
  const [values, setValues] = useState<QuestionFormValues>(
    mode === "edit" && question
      ? createFormValuesFromQuestion(question)
      : createDefaultQuestionFormValues()
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit(values);
  }

  const titleText = mode === "create" ? "新規問題を作成" : "問題を編集";
  const submitLabel = mode === "create" ? "作成" : "更新";

  return (
    <section className="question-form-card settings-section">
      <form onSubmit={handleSubmit}>
        <h2 className="question-form-title">{titleText}</h2>

        <div className="question-form-field">
          <p className="settings-label settings-subtitle">問題種別</p>
          <div className="settings-chip-group">
            {QUESTION_TYPE_OPTIONS.map((option) => (
              <label className="settings-chip" key={option.value}>
                <input
                  checked={values.questionType === option.value}
                  onChange={() => setValues((current) => ({ ...current, questionType: option.value }))}
                  type="radio"
                  name="question-type"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="question-form-field">
          <label className="settings-label settings-subtitle" htmlFor="question-english">
            英語
          </label>
          <input
            className="typing-input question-form-input"
            id="question-english"
            onChange={(e) => setValues((current) => ({ ...current, english: e.target.value }))}
            placeholder="例: I drink coffee every morning."
            required
            type="text"
            value={values.english}
          />
        </div>

        <div className="question-form-field">
          <label className="settings-label settings-subtitle" htmlFor="question-japanese">
            日本語
          </label>
          <input
            className="typing-input question-form-input"
            id="question-japanese"
            onChange={(e) => setValues((current) => ({ ...current, japanese: e.target.value }))}
            placeholder="例: 私は毎朝コーヒーを飲みます。"
            required
            type="text"
            value={values.japanese}
          />
        </div>

        <div className="question-form-field">
          <label className="settings-label settings-subtitle" htmlFor="question-tags">
            タグ
          </label>
          <TagInput
            availableTags={availableTags}
            id="question-tags"
            onChange={(tags) => setValues((current) => ({ ...current, tags }))}
            selectedTags={values.tags}
          />
        </div>

        {submitError ? (
          <p className="question-form-error">{submitError}</p>
        ) : null}

        <div className="question-form-actions">
          <button
            className="secondary-button question-browser-button"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            キャンセル
          </button>
          <button
            className="primary-button question-browser-button"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "処理中..." : submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
