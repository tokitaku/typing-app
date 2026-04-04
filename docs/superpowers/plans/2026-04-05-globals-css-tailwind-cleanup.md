# globals.css Tailwind v4 Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** globals.css (~663行) のカスタムCSSを Tailwind v4 + shadcn/ui ベストプラクティスに準拠させ、~60行まで削減する。

**Architecture:** 3 Phase で進める。Phase 1 はリスクゼロの死んだCSSの削除。Phase 2 は4コンポーネントのTailwindユーティリティ移行。Phase 3 は残りのCSSセクション削除とglobals.cssの最終形への整理。

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS v4, shadcn/ui, PostCSS

---

## File Map

| ファイル | 変更内容 |
|---|---|
| `frontend/src/app/globals.css` | Phase 1: 未使用CSS削除 / Phase 2: @theme inline に正誤色追加 / Phase 3: 残りCSS削除・最終形 |
| `frontend/src/features/study-session/ui/StudySession.tsx` | `char-${state}` 動的クラスをユーティリティマップに置換 |
| `frontend/src/features/question-browser/ui/TagInput.tsx` | tag-input系クラス全てをTailwindユーティリティに置換 |
| `frontend/src/features/question-browser/ui/QuestionForm.tsx` | form系クラス全てをTailwindユーティリティに置換 |
| `frontend/src/features/question-browser/ui/QuestionBrowser.tsx` | レイアウト・フィルター・empty-state・tag-badgeクラスを置換 |

---

## Task 1: Phase 1 — 未使用CSS の削除

globals.css から、既に shadcn/ui コンポーネントへの移行済みで JSX から参照されていないクラスを一括削除する。コンポーネント側の変更は一切不要。

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: 未使用CSSセクションを globals.css から削除**

`frontend/src/app/globals.css` の以下のブロックを削除する。`body` ルールは `@layer base` に移動して残す。

削除対象（該当行をそのまま削除）:

```
* {
  box-sizing: border-box;
}

html {
  min-height: 100%;
}
```

```
body {
  margin: 0;
  min-height: 100vh;
  color: var(--foreground);
  background: var(--background);
  -webkit-font-smoothing: antialiased;
}
```

```
/* ===== App Header ===== */

.app-header-title-lg {
  font-size: 18px;
  font-weight: 600;
}

.nav-link {
  font-size: 14px;
  font-weight: 500;
  color: var(--muted-foreground);
}

.nav-link:hover {
  color: var(--foreground);
}
```

```
/* ===== Page Content Areas ===== */

.page-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 32px;
}
```

```
/* ===== Buttons ===== */
（.btn から .btn-destructive まで全て）
```

```
/* ===== Badges ===== */
（.badge から .badge-outline まで全て）
```

```
/* ===== Cards ===== */
（.card から .card-body まで全て）
```

```
/* ===== Text Utilities ===== */

.text-muted {
  color: var(--muted-foreground);
}
```

```
/* ===== Inputs ===== */
（.text-input から .input-label まで全て）
```

```
/* ===== Empty States ===== */
（.empty-title と .empty-desc）
```

（※ `.question-status-badge` 系・Question Table 系も同様に削除）

また、`body` ルールは完全削除し、`@layer base` ブロックに以下を追記する:

既存の `@layer base`:
```css
@layer base {
  a {
    color: inherit;
    text-decoration: none;
  }
}
```

変更後:
```css
@layer base {
  body {
    color: var(--foreground);
    background: var(--background);
    -webkit-font-smoothing: antialiased;
  }

  a {
    color: inherit;
    text-decoration: none;
  }
}
```

- [ ] **Step 2: ビルド確認**

```bash
cd frontend && npm run build
```

Expected: ビルドエラーなし（削除したクラスは JSX で参照されていないため）

- [ ] **Step 3: コミット**

```bash
git add frontend/src/app/globals.css
git commit -m "style: remove dead CSS from globals.css (unused after shadcn/ui migration)"
```

---

## Task 2: Phase 2a — StudySession.tsx の char-* クラス移行

`char-${characterStates[idx]}` という動的クラスを Tailwind ユーティリティマップに置き換える。先に globals.css に `--color-correct/wrong/pending` を `@theme inline` に追加して Tailwind カラーとして使えるようにする。

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/features/study-session/ui/StudySession.tsx`

- [ ] **Step 1: @theme inline に正誤カラーを追加**

`frontend/src/app/globals.css` の `@theme inline` ブロックの末尾（`--radius-xl` の直後）に追記する:

```css
  --color-correct: var(--correct);
  --color-wrong: var(--wrong);
  --color-pending: var(--pending);
```

結果として `@theme inline` の末尾は以下のようになる:

```css
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-correct: var(--correct);
  --color-wrong: var(--wrong);
  --color-pending: var(--pending);
}
```

- [ ] **Step 2: StudySession.tsx にユーティリティマップを追加し char-* を置換**

`frontend/src/features/study-session/ui/StudySession.tsx` の `formatMs` 関数の直前に以下を追加する:

```tsx
const charClassMap: Record<"correct" | "wrong" | "pending", string> = {
  correct: "text-correct",
  wrong: "text-wrong bg-wrong/10",
  pending: "text-pending",
};
```

同ファイルの 185 行目付近（`<span className={`char-${characterStates[idx]}`}` の箇所）を変更する:

変更前:
```tsx
<span
  className={`char-${characterStates[idx]}`}
  key={`${quiz.id}-${idx}`}
>
```

変更後:
```tsx
<span
  className={charClassMap[characterStates[idx]]}
  key={`${quiz.id}-${idx}`}
>
```

- [ ] **Step 3: ビルド確認**

```bash
cd frontend && npm run build
```

Expected: ビルドエラーなし

- [ ] **Step 4: コミット**

```bash
git add frontend/src/app/globals.css frontend/src/features/study-session/ui/StudySession.tsx
git commit -m "style: replace char-* dynamic classes with Tailwind utility map in StudySession"
```

---

## Task 3: Phase 2b — TagInput.tsx の移行

tag-input系のカスタムCSSクラスを全て Tailwind ユーティリティに置き換える。

**Files:**
- Modify: `frontend/src/features/question-browser/ui/TagInput.tsx`

- [ ] **Step 1: TagInput.tsx の className を全て置換**

`frontend/src/features/question-browser/ui/TagInput.tsx` のレンダリング部分（`return` 以下）を以下に置き換える:

```tsx
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
```

- [ ] **Step 2: ビルド確認**

```bash
cd frontend && npm run build
```

Expected: ビルドエラーなし

- [ ] **Step 3: コミット**

```bash
git add frontend/src/features/question-browser/ui/TagInput.tsx
git commit -m "style: replace tag-input custom CSS classes with Tailwind utilities in TagInput"
```

---

## Task 4: Phase 2c — QuestionForm.tsx の移行

question-form系のカスタムCSSクラスを全て Tailwind ユーティリティに置き換える。

**Files:**
- Modify: `frontend/src/features/question-browser/ui/QuestionForm.tsx`

- [ ] **Step 1: QuestionForm.tsx の className を全て置換**

`frontend/src/features/question-browser/ui/QuestionForm.tsx` の `return` 部分を以下に置き換える:

```tsx
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
          <p className="mt-3 text-sm text-[var(--wrong)]">{submitError}</p>
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
```

- [ ] **Step 2: ビルド確認**

```bash
cd frontend && npm run build
```

Expected: ビルドエラーなし

- [ ] **Step 3: コミット**

```bash
git add frontend/src/features/question-browser/ui/QuestionForm.tsx
git commit -m "style: replace question-form custom CSS classes with Tailwind utilities in QuestionForm"
```

---

## Task 5: Phase 2d — QuestionBrowser.tsx の移行

レイアウト・フィルター・empty-state・tag-badge 系のカスタムCSSクラスを全て Tailwind ユーティリティに置き換える。また `question-tag-badge` を shadcn/ui `Badge` に変更する。

**Files:**
- Modify: `frontend/src/features/question-browser/ui/QuestionBrowser.tsx`

- [ ] **Step 1: import に Badge を追加**

`frontend/src/features/question-browser/ui/QuestionBrowser.tsx` の import セクションに `Badge` を追加する:

変更前:
```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
```

変更後:
```tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
```

- [ ] **Step 2: QuestionTable 内の tag-badge を Badge に置換**

同ファイルの `QuestionTable` コンポーネント内（118〜125行付近）を変更する:

変更前:
```tsx
              {question.tags.length > 0 ? (
                <div className="question-tag-list">
                  {question.tags.map((tag) => (
                    <span className="question-tag-badge" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                "-"
              )}
```

変更後:
```tsx
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
```

- [ ] **Step 3: QuestionBrowserView の JSX を全て置換**

同ファイルの `QuestionBrowserView` コンポーネント（162行〜283行）の `return` 内を以下に置き換える:

```tsx
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
```

- [ ] **Step 4: ビルド確認**

```bash
cd frontend && npm run build
```

Expected: ビルドエラーなし

- [ ] **Step 5: コミット**

```bash
git add frontend/src/features/question-browser/ui/QuestionBrowser.tsx
git commit -m "style: replace layout/filter/badge custom CSS with Tailwind utilities in QuestionBrowser"
```

---

## Task 6: Phase 3 — globals.css の最終クリーンアップ

全コンポーネントの移行が完了したので、globals.css の残りのカスタムCSSセクションを全て削除し、最終形（~60行）に整理する。

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: globals.css を最終形に書き換える**

`frontend/src/app/globals.css` の内容全体を以下に置き換える:

```css
@import "tailwindcss";
@import "tw-animate-css";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-correct: var(--correct);
  --color-wrong: var(--wrong);
  --color-pending: var(--pending);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --background: #ffffff;
  --foreground: #0a0a0a;
  --card: #ffffff;
  --card-foreground: #0a0a0a;
  --popover: #ffffff;
  --popover-foreground: #0a0a0a;
  --secondary: #f5f5f5;
  --secondary-foreground: #171717;
  --accent: #f5f5f5;
  --accent-foreground: #171717;
  --muted: #f5f5f5;
  --muted-foreground: #737373;
  --border: #e5e5e5;
  --input: #e5e5e5;
  --ring: #171717;
  --primary: #171717;
  --primary-foreground: #fafafa;
  --destructive: #e7000b;
  --destructive-foreground: #fafafa;
  --correct: #16a34a;
  --wrong: #ef4444;
  --pending: #a3a3a3;
  --radius: 0.5rem;
}

@layer base {
  body {
    color: var(--foreground);
    background: var(--background);
    -webkit-font-smoothing: antialiased;
  }

  a {
    color: inherit;
    text-decoration: none;
  }
}
```

- [ ] **Step 2: ビルド確認**

```bash
cd frontend && npm run build
```

Expected: ビルドエラーなし

- [ ] **Step 3: 目視確認**

`npm run dev` でアプリを起動し、以下のページを目視確認する:

1. `/` — ホーム画面（HomeDashboard）: レイアウト崩れなし
2. `/questions` — 問題一覧（QuestionBrowser）:
   - ヘッダー表示
   - フィルターカード表示・動作
   - テーブル表示、タグバッジ表示
   - 問題作成フォーム表示・タグ入力動作
   - モバイル幅（640px以下）でのレイアウト
3. `/session?mode=learn` — 学習画面（StudySession）:
   - 文字入力時の正誤色（緑/赤/グレー）が正しく表示される
4. `/result` — 結果画面: レイアウト崩れなし

- [ ] **Step 4: コミット**

```bash
git add frontend/src/app/globals.css
git commit -m "style: finalize globals.css cleanup - reduce to ~60 lines of theme variables only"
```

---

## Self-Review チェック

**Spec coverage:**
- [x] コンポーネントスタイルを JSX 側の Tailwind ユーティリティクラスまたは shadcn/ui コンポーネントに移行 → Task 2〜5
- [x] 残すカスタムCSS は `@layer base` で囲む → Task 1 Step 1, Task 6 Step 1
- [x] ハードコードされた色値を CSS 変数に置換 → `:root` 変数は既存のまま維持。新規追加なし（既存変数で対応済み）
- [x] 不要なリセット削除 → Task 1 Step 1
- [x] ダークモードはスキップ（スコープ外）

**Placeholder scan:** なし。全ステップに具体的なコードあり。

**Type consistency:** `charClassMap` は `Record<"correct" | "wrong" | "pending", string>` で型定義と `characterStates` の型 `("correct" | "wrong" | "pending")[]` と一致。
