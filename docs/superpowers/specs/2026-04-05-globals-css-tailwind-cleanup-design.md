# globals.css を Tailwind v4 ベストプラクティスに準拠させる

**Issue:** tokitaku/typing-app#101
**Date:** 2026-04-05

## 概要

globals.css（~663行）のカスタムCSSを Tailwind v4 + shadcn/ui のベストプラクティスに準拠するようリファクタリングする。最終的に globals.css を ~60行（`@theme inline` + `:root` 変数 + `@layer base` の最小リセット）まで削減する。

## 方針

- ダークモードは今回スキップ（別 issue で対応）
- 全てのカスタムCSS を JSX 側の Tailwind ユーティリティクラスまたは shadcn/ui コンポーネントに移行
- globals.css にはテーマ変数定義と最小限の base レイヤーのみ残す

## 現状分析

### 未使用CSS（即時削除可能）

shadcn/ui コンポーネントへの移行済みだが CSS が残っているもの:

| CSS クラス | 理由 |
|---|---|
| `.btn`, `.btn-primary`, `.btn-outline`, `.btn-ghost`, `.btn-destructive` | shadcn/ui `Button` に移行済み |
| `.badge`, `.badge-default`, `.badge-secondary`, `.badge-outline` | shadcn/ui `Badge` に移行済み |
| `.text-input`, `.is-mistaken`, `.text-input:focus`, `.text-input::placeholder` | shadcn/ui `Input` に移行済み |
| `.page-center` | どのファイルにも未使用 |
| `.question-table`, `.question-table-scroll`, `.question-table-actions`, `.question-table-checkbox`, `.question-table-text` | shadcn/ui `Table` に移行済み |
| `.question-status-badge`, `.question-status-badge.is-active`, `.question-status-badge.is-inactive` | 未使用 |
| `.text-muted` | 未使用 |
| `* { box-sizing: border-box }` | Tailwind v4 Preflight で設定済み |
| `body { margin: 0 }` | Tailwind v4 Preflight で設定済み |
| `html { min-height: 100% }` | 不要 |

### 移行が必要なファイル

| ファイル | 使用中のカスタムクラス数 |
|---|---|
| `QuestionBrowser.tsx` | ~20クラス（レイアウト、フィルター、empty-state、tag-badge） |
| `QuestionForm.tsx` | 6クラス（form系） |
| `TagInput.tsx` | 8クラス（tag-input系） |
| `StudySession.tsx` | 3クラス（`char-correct/wrong/pending`） |

## 実装設計

### Phase 1: 死んだCSSの削除

globals.css から未使用クラスを一括削除する。コンポーネント側の変更なし。

削除対象:
- Buttons セクション全体（`.btn` 〜 `.btn-destructive`）
- Badges セクション全体（`.badge` 〜 `.badge-outline`）
- Cards セクション全体（`.card` 〜 `.card-body`）
- Inputs セクション全体（`.text-input` 〜 `.input-label`）
- `.page-center`
- `.text-muted`
- `* { box-sizing }` ルール
- `html { min-height }` ルール
- `body` の `margin: 0`
- Question Table 系（`.question-table` 〜 `.question-table-text`）
- `.question-status-badge` 系
- Empty States セクション（`.empty-title`, `.empty-desc`）— Phase 2 で JSX に移行後

### Phase 2: コンポーネント別 Tailwind ユーティリティ移行

#### 2-1. QuestionBrowser.tsx

レイアウトクラスの移行:

| カスタムクラス | Tailwind ユーティリティ |
|---|---|
| `page-layout` | `flex flex-col min-h-screen` |
| `app-header` | `flex items-center justify-between h-14 px-8 border-b border-border shrink-0` |
| `app-header-left` | `flex items-center gap-2` |
| `app-header-title` | `text-base font-semibold` |
| `page-padded` | `flex-1 p-8` |
| `questions-title-row` | `flex justify-between items-end gap-4` |
| `questions-title-left h1` | `text-[28px] font-bold m-0` (JSXの直接スタイル) |
| `questions-title-left p` | `mt-1 text-sm text-muted-foreground` |
| `questions-actions` | `flex gap-2` |

フィルターカードの移行:

| カスタムクラス | 移行先 |
|---|---|
| `filter-card` + `card` | `<Card className="mt-6 bg-secondary shadow-sm">` |
| `filter-header` | `flex items-center gap-2 px-5 py-4` |
| `filter-header-label` | `text-sm font-semibold` |
| `filter-content` | `px-5 py-4` |
| `input-label` | `block mb-1.5 text-sm font-medium` |
| `filter-toggle-row` | `flex items-center justify-between gap-4 mt-4 pt-4 border-t border-border` |
| `filter-toggle-label` | `text-sm font-medium` |

テーブルカード・Empty State の移行:

| カスタムクラス | 移行先 |
|---|---|
| `table-card` + `card` / `card-body` | `<Card className="mt-6 bg-secondary shadow-sm"><CardContent>` |
| `empty-title` | `text-2xl font-semibold mb-2` |
| `empty-desc` | `text-sm text-muted-foreground mb-6` |

タグバッジの移行:

| カスタムクラス | 移行先 |
|---|---|
| `question-tag-list` | `flex flex-wrap gap-1` |
| `question-tag-badge` | `<Badge variant="outline">` (shadcn/ui) |

レスポンシブ対応（`@media (max-width: 640px)` を Tailwind モバイルファーストに変換）:
- `app-header` の `padding: 0 16px` → ヘッダーに `px-4 sm:px-8` を適用
- `page-center/page-padded` の `padding: 24px 16px` → `p-4 sm:p-8` を適用
- `questions-title-row` の `flex-direction: column` → `flex-col sm:flex-row sm:items-end` を適用

#### 2-2. QuestionForm.tsx

| カスタムクラス | Tailwind ユーティリティ |
|---|---|
| `question-form-card` | `<Card className="mt-6 p-6">` |
| `question-form-title` | `text-lg font-semibold mb-5` |
| `question-form-field` | `mt-4` |
| `question-form-field-label` | `block mb-1.5 text-sm font-medium` |
| `question-form-error` | `mt-3 text-sm text-[var(--wrong)]` |
| `question-form-actions` | `flex gap-3 mt-6` |

#### 2-3. TagInput.tsx

| カスタムクラス | Tailwind ユーティリティ |
|---|---|
| `tag-input-container` | `relative` |
| `tag-input-field` | `flex flex-wrap items-center gap-1.5 min-h-10 px-3 py-1.5 border border-border rounded-md bg-background focus-within:outline-2 focus-within:outline-primary focus-within:-outline-offset-1 focus-within:border-primary` |
| `tag-chip` | `inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[13px] font-medium` |
| `tag-chip-label` | `overflow-hidden text-ellipsis whitespace-nowrap` |
| `tag-chip-remove` | `inline-flex items-center justify-center w-4 h-4 p-0 border-0 rounded-full bg-transparent text-muted-foreground text-sm cursor-pointer leading-none hover:bg-border hover:text-foreground` |
| `tag-input-text` | `flex-1 min-w-[100px] border-0 outline-none bg-transparent font-[inherit] text-sm text-foreground placeholder:text-muted-foreground` |
| `tag-suggestions` | `absolute top-full left-0 right-0 mt-1 py-1 list-none border border-border rounded-md bg-background shadow-lg z-50 max-h-[200px] overflow-y-auto` |
| `tag-suggestion-item` | `px-3 py-2 text-sm cursor-pointer hover:bg-muted` |

#### 2-4. StudySession.tsx

`char-correct/wrong/pending` は動的クラス (`char-${characterStates[idx]}`) で使用されている。

対応:
1. `@theme inline` に以下を追加:
   ```css
   --color-correct: var(--correct);
   --color-wrong: var(--wrong);
   --color-pending: var(--pending);
   ```
2. これにより `text-correct`, `text-wrong`, `text-pending`, `bg-wrong/10` が Tailwind ユーティリティとして使える
3. JSX側で動的クラスをユーティリティマップに変更:
   ```tsx
   const charStyleMap: Record<string, string> = {
     correct: "text-correct",
     wrong: "text-wrong bg-wrong/10",
     pending: "text-pending",
   };
   // 使用: className={charStyleMap[characterStates[idx]]}
   ```

### Phase 3: globals.css クリーンアップ

最終的な globals.css の構成（~60行）:

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

## テスト方針

- 各 Phase 完了後にビルド確認（`npm run build`）
- 各コンポーネントの見た目を目視確認（レイアウト崩れ、色、余白）
- レスポンシブ確認（640px ブレークポイント）

## スコープ外

- ダークモード対応（別 issue）
- `--wrong` と `--destructive` の統一（既存の使い分けを維持）
- shadcn/ui コンポーネント自体の変更
