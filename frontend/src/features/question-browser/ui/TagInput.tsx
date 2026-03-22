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
      className="tag-input-container"
      onBlur={handleBlur}
      ref={containerRef}
    >
      <div className="tag-input-field">
        {selectedTags.map((tag) => (
          <span className="tag-chip" key={tag}>
            <span className="tag-chip-label">{tag}</span>
            <button
              aria-label={`${tag} を削除`}
              className="tag-chip-remove"
              onClick={() => onChange(removeTagFromList(selectedTags, tag))}
              type="button"
            >
              ×
            </button>
          </span>
        ))}
        <input
          autoComplete="off"
          className="tag-input-text"
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
        <ul className="tag-suggestions" role="listbox">
          {suggestions.map((tag) => (
            <li
              className="tag-suggestion-item"
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
