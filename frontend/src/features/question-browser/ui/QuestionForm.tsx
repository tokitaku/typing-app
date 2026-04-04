"use client";

import React, { useState } from "react";
import {
  createDefaultQuestionFormValues,
  createFormValuesFromQuestion,
  type QuestionFormMode,
  type QuestionFormValues
} from "@/features/question-browser/application/questionForm";
import { TagInput } from "@/features/question-browser/ui/TagInput";
import type { Question } from "@/shared/types/study";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <section className="mt-6 border border-border rounded-md p-6">
      <form onSubmit={handleSubmit}>
        <h2 className="mb-5 text-lg font-semibold">{titleText}</h2>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium" htmlFor="question-english">
            英語
          </label>
          <Input
            id="question-english"
            onChange={(e) => setValues((current) => ({ ...current, english: e.target.value }))}
            placeholder="例: I drink coffee every morning."
            required
            type="text"
            value={values.english}
          />
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium" htmlFor="question-japanese">
            日本語
          </label>
          <Input
            id="question-japanese"
            onChange={(e) => setValues((current) => ({ ...current, japanese: e.target.value }))}
            placeholder="例: 私は毎朝コーヒーを飲みます。"
            required
            type="text"
            value={values.japanese}
          />
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium" htmlFor="question-tags">
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
          <p className="mt-3 text-sm text-wrong">{submitError}</p>
        ) : null}

        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            キャンセル
          </Button>
          <Button
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "処理中..." : submitLabel}
          </Button>
        </div>
      </form>
    </section>
  );
}
