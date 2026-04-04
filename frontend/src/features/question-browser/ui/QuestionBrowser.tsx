"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuestionBrowser } from "@/features/question-browser/hooks/useQuestionBrowser";
import type {
  QuestionBrowserFilters,
  QuestionBrowserFormState,
  QuestionBrowserStatus
} from "@/features/question-browser/application/questionBrowser";
import type { QuestionFormValues } from "@/features/question-browser/application/questionForm";
import { QuestionForm } from "@/features/question-browser/ui/QuestionForm";
import type { Question } from "@/shared/types/study";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

export type QuestionBrowserViewProps = {
  filters: QuestionBrowserFilters;
  questions: Question[];
  status: QuestionBrowserStatus;
  errorMessage: string | null;
  onSetTags: (tags: string[]) => void;
  onSetIncludeInactive: (includeInactive: boolean) => void;
  onReload: () => void;
  formState: QuestionBrowserFormState;
  availableTags: string[];
  isFormSubmitting: boolean;
  formSubmitError: string | null;
  onOpenCreateForm: () => void;
  onOpenEditForm: (question: Question) => void;
  onCloseForm: () => void;
  onSubmitForm: (values: QuestionFormValues) => void;
};

function parseTagInput(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag, index, tags) => tag !== "" && tags.indexOf(tag) === index);
}

function QuestionTable({
  questions,
  isFormSubmitting,
  onOpenEditForm
}: {
  questions: Question[];
  isFormSubmitting: boolean;
  onOpenEditForm: (question: Question) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const allSelected = questions.length > 0 && selectedIds.size === questions.length;

  function handleToggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map((q) => q.id)));
    }
  }

  function handleToggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10 border-r border-border text-center" scope="col">
            <input
              checked={allSelected}
              className="size-4 cursor-pointer"
              onChange={handleToggleAll}
              type="checkbox"
            />
          </TableHead>
          <TableHead className="w-15" scope="col">ID</TableHead>
          <TableHead scope="col">英語</TableHead>
          <TableHead scope="col">日本語</TableHead>
          <TableHead className="w-40" scope="col">タグ</TableHead>
          <TableHead className="w-25" scope="col">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {questions.map((question) => (
          <TableRow key={question.id}>
            <TableCell className="w-10 border-r border-border text-center">
              <input
                checked={selectedIds.has(question.id)}
                className="size-4 cursor-pointer"
                onChange={() => handleToggle(question.id)}
                type="checkbox"
              />
            </TableCell>
            <TableCell className="w-15">{question.id}</TableCell>
            <TableCell className="min-w-45 max-w-90 break-normal wrap-anywhere">{question.english}</TableCell>
            <TableCell className="min-w-45 max-w-90 break-normal wrap-anywhere">{question.japanese}</TableCell>
            <TableCell className="w-40">
              {question.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {question.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : (
                "-"
              )}
            </TableCell>
            <TableCell className="w-25">
              <Button
                disabled={isFormSubmitting}
                onClick={() => onOpenEditForm(question)}
                type="button"
              >
                編集
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function QuestionBrowserView({
  filters,
  questions,
  status,
  errorMessage,
  onSetTags,
  onSetIncludeInactive,
  onReload,
  formState,
  availableTags,
  isFormSubmitting,
  formSubmitError,
  onOpenCreateForm,
  onOpenEditForm,
  onCloseForm,
  onSubmitForm
}: QuestionBrowserViewProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between h-14 px-4 sm:px-8 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" ry="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M7 16h10"/></svg>
          <span className="text-base font-semibold">Type &amp; Learn</span>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            ホームへ戻る
          </Link>
        </Button>
      </header>

      <div className="flex-1 p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="m-0 text-[28px] font-bold">typing questions 一覧</h1>
            <p className="mt-1 text-sm text-muted-foreground">登録済みの問題をタグで絞り込みながら確認できます。</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onReload} type="button">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
              再読み込み
            </Button>
            <Button
              disabled={isFormSubmitting}
              onClick={onOpenCreateForm}
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              新規作成
            </Button>
          </div>
        </div>

        {formState.mode !== null ? (
          <QuestionForm
            availableTags={availableTags}
            isSubmitting={isFormSubmitting}
            mode={formState.mode}
            onCancel={onCloseForm}
            onSubmit={onSubmitForm}
            question={formState.mode === "edit" ? formState.question : undefined}
            submitError={formSubmitError}
          />
        ) : null}

        <div className="mt-6 overflow-hidden rounded-md border border-border bg-secondary shadow-sm">
          <div className="flex items-center gap-2 px-5 py-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <span className="text-sm font-semibold">フィルター</span>
          </div>
          <div className="px-5 py-4">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="question-tags">
              タグ
            </label>
            <Input
              id="question-tags"
              onChange={(event) => onSetTags(parseTagInput(event.target.value))}
              placeholder="daily, business"
              type="text"
              value={filters.tags.join(", ")}
            />
            <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-border">
              <label className="text-sm font-medium" htmlFor="include-inactive">
                無効問題を含む
              </label>
              <input
                checked={filters.includeInactive}
                id="include-inactive"
                onChange={(event) => onSetIncludeInactive(event.target.checked)}
                type="checkbox"
              />
            </div>
          </div>
        </div>

        {status === "loading" ? (
          <div className="mt-6 overflow-hidden rounded-md border border-border bg-secondary shadow-sm">
            <div className="p-6">
              <h2 className="text-2xl font-semibold mb-2">問題一覧を読み込んでいます。</h2>
              <p className="text-sm text-muted-foreground mb-6">DB から最新の問題一覧を取得しています。</p>
            </div>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="mt-6 overflow-hidden rounded-md border border-border bg-secondary shadow-sm">
            <div className="p-6">
              <h2 className="text-2xl font-semibold mb-2">問題一覧の取得に失敗しました。</h2>
              <p className="text-sm text-muted-foreground mb-6">{errorMessage ?? "時間を置いて再読み込みしてください。"}</p>
              <Button onClick={onReload} type="button">
                再読み込み
              </Button>
            </div>
          </div>
        ) : null}

        {status === "empty" ? (
          <div className="mt-6 overflow-hidden rounded-md border border-border bg-secondary shadow-sm">
            <div className="p-6">
              <h2 className="text-2xl font-semibold mb-2">条件に一致する問題がありません。</h2>
              <p className="text-sm text-muted-foreground mb-6">フィルタ条件を広げるか、無効問題を含めて再確認してください。</p>
            </div>
          </div>
        ) : null}

        {status === "loaded" ? (
          <div className="mt-6 overflow-hidden rounded-md border border-border bg-secondary shadow-sm">
            <QuestionTable
              isFormSubmitting={isFormSubmitting}
              onOpenEditForm={onOpenEditForm}
              questions={questions}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function QuestionBrowser() {
  const {
    filters,
    questions,
    status,
    errorMessage,
    setTags,
    setIncludeInactive,
    reload,
    formState,
    availableTags,
    isFormSubmitting,
    formSubmitError,
    openCreateForm,
    openEditForm,
    closeForm,
    submitForm
  } = useQuestionBrowser();

  return (
    <QuestionBrowserView
      availableTags={availableTags}
      errorMessage={errorMessage}
      filters={filters}
      formState={formState}
      formSubmitError={formSubmitError}
      isFormSubmitting={isFormSubmitting}
      onCloseForm={closeForm}
      onOpenCreateForm={openCreateForm}
      onOpenEditForm={openEditForm}
      onReload={reload}
      onSetIncludeInactive={setIncludeInactive}
      onSetTags={setTags}
      onSubmitForm={submitForm}
      questions={questions}
      status={status}
    />
  );
}
