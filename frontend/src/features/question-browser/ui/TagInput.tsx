"use client";

import React, { useRef, useState } from "react";
import { addTagToList, filterTagSuggestions, normalizeTagInput, removeTagFromList } from "@/features/question-browser/application/questionForm";

export type TagInputProps = {
  selectedTags: string[];
  availableTags: string[];
  onChange: (tags: string[]) => void;
  id?: string;
};

export function TagInput({ selectedTags, availableTags, onChange, id }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = filterTagSuggestions(availableTags, selectedTags, inputValue);

  function commitInput(value: string) {
    const { tags: nextTags, valid } = addTagToList(selectedTags, value);

    if (valid) {
      onChange(nextTags);
    }

    setInputValue("");
    setIsSuggestionsOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitInput(inputValue);
    } else if (event.key === "Backspace" && inputValue === "" && selectedTags.length > 0) {
      onChange(removeTagFromList(selectedTags, selectedTags[selectedTags.length - 1])); // 入力が空の場合はバックスペースで末尾タグを削除する
    } else if (event.key === "Escape") {
      setIsSuggestionsOpen(false);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;

    if (value.endsWith(",")) {
      commitInput(value.slice(0, -1)); // カンマ入力でタグを確定する
    } else {
      setInputValue(value);
      setIsSuggestionsOpen(true);
    }
  }

  function handleSuggestionClick(tag: string) {
    const normalized = normalizeTagInput(tag);
    const { tags: nextTags, valid } = addTagToList(selectedTags, normalized);

    if (valid) {
      onChange(nextTags);
    }

    setInputValue("");
    setIsSuggestionsOpen(false);
    inputRef.current?.focus();
  }

  function handleBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(event.relatedTarget as Node)) {
      setIsSuggestionsOpen(false); // フォーカスがコンポーネント外に移動したらサジェストを閉じる
    }
  }

  const showSuggestions = isSuggestionsOpen && suggestions.length > 0;

  return (
    <div
      className="relative"
      onBlur={handleBlur}
      ref={containerRef}
    >
      <div className="flex flex-wrap items-center gap-1.5 min-h-10 px-3 py-1.5 border border-border rounded-md bg-background cursor-text focus-within:outline-2 focus-within:outline-primary focus-within:-outline-offset-1 focus-within:border-primary">
        {selectedTags.map((tag) => (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[13px] font-medium" key={tag}>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{tag}</span>
            <button
              aria-label={`${tag} を削除`}
              className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-sm leading-none text-muted-foreground hover:bg-border hover:text-foreground"
              onClick={() => onChange(removeTagFromList(selectedTags, tag))}
              type="button"
            >
              ×
            </button>
          </span>
        ))}
        <input
          autoComplete="off"
          className="min-w-25 flex-1 border-0 bg-transparent font-[inherit] text-sm text-foreground outline-none placeholder:text-muted-foreground"
          id={id}
          onChange={handleInputChange}
          onFocus={() => setIsSuggestionsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? "タグを入力 (Enter または , で確定)" : ""}
          ref={inputRef}
          type="text"
          value={inputValue}
        />
      </div>
      {showSuggestions ? (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[200px] list-none overflow-y-auto rounded-md border border-border bg-background py-1 shadow-lg" role="listbox">
          {suggestions.map((tag) => (
            <li
              className="cursor-pointer px-3 py-2 text-sm hover:bg-muted"
              key={tag}
              onMouseDown={(e) => {
                e.preventDefault(); // blur の前に click を発火させるために mousedown を抑制する
                handleSuggestionClick(tag);
              }}
              role="option"
              aria-selected={false}
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
