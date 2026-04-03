# shadcn Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `frontend` に shadcn/ui の基盤を導入し、`QuestionBrowser` と `QuestionForm` で primitive を使える状態にする

**Architecture:** `src/components/ui` に shadcn 由来の表示 primitive を追加し、feature 側はそれらを組み合わせるだけに留める。既存の `globals.css` は全廃せず、Tailwind v4 と shadcn の token を共存させながら、`QuestionBrowser` を最初の採用画面として段階移行の足場にする。

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS v4, shadcn/ui, Vitest

---

## File Structure

- Create: `frontend/components.json`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/components/ui/input.tsx`
- Create: `frontend/src/components/ui/card.tsx`
- Create: `frontend/src/components/ui/badge.tsx`
- Create: `frontend/src/components/ui/table.tsx`
- Create: `frontend/src/components/ui/dialog.tsx`
- Create: `frontend/src/components/ui/checkbox.tsx`
- Modify: `frontend/package.json`
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/features/question-browser/ui/QuestionBrowser.tsx`
- Modify: `frontend/src/features/question-browser/ui/QuestionForm.tsx`
- Modify: `frontend/src/__tests__/questionBrowserUi.test.tsx`

### Task 1: 依存関係と shadcn 設定を追加する

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/components.json`
- Create: `frontend/src/lib/utils.ts`
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: 設定ファイル用の failing チェックを書く準備をする**

確認対象:

```text
frontend/components.json
frontend/src/lib/utils.ts
frontend/package.json
frontend/src/app/globals.css
```

- [ ] **Step 2: 依存関係の不足を確認する**

Run:

```bash
cd frontend
npm ls class-variance-authority clsx tailwind-merge lucide-react tw-animate-css @radix-ui/react-dialog @radix-ui/react-checkbox @radix-ui/react-slot
```

Expected:

```text
missing dependencies が表示される
```

- [ ] **Step 3: 必要な依存を追加する**

追加対象:

```json
{
  "dependencies": {
    "@radix-ui/react-checkbox": "...",
    "@radix-ui/react-dialog": "...",
    "@radix-ui/react-slot": "...",
    "class-variance-authority": "...",
    "clsx": "...",
    "lucide-react": "...",
    "tailwind-merge": "...",
    "tw-animate-css": "..."
  }
}
```

Run:

```bash
cd frontend
npm install @radix-ui/react-checkbox @radix-ui/react-dialog @radix-ui/react-slot class-variance-authority clsx lucide-react tailwind-merge tw-animate-css
```

- [ ] **Step 4: shadcn 設定と `cn()` を追加する**

`frontend/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

`frontend/src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: `globals.css` に shadcn 前提の import と token を追加する**

先頭付近の追記例:

```css
@import "tailwindcss";
@import "tw-animate-css";

:root {
  --background: #ffffff;
  --foreground: #0a0a0a;
  --card: #ffffff;
  --card-foreground: #0a0a0a;
  --primary: #171717;
  --primary-foreground: #fafafa;
  --border: #e5e5e5;
  --input: #e5e5e5;
  --ring: #171717;
  --radius: 0.5rem;
}
```

- [ ] **Step 6: 依存と設定が入ったことを確認する**

Run:

```bash
cd frontend
npm ls class-variance-authority clsx tailwind-merge lucide-react tw-animate-css @radix-ui/react-dialog @radix-ui/react-checkbox @radix-ui/react-slot
test -f components.json && test -f src/lib/utils.ts
```

Expected:

```text
依存解決エラーが出ず、components.json と utils.ts が存在する
```

- [ ] **Step 7: コミットする**

```bash
git add frontend/package.json frontend/package-lock.json frontend/components.json frontend/src/lib/utils.ts frontend/src/app/globals.css
git commit -m "feat: add shadcn foundation config"
```

### Task 2: `QuestionBrowser` 向けの failing UI test を追加する

**Files:**
- Modify: `frontend/src/__tests__/questionBrowserUi.test.tsx`
- Test: `frontend/src/__tests__/questionBrowserUi.test.tsx`

- [ ] **Step 1: shadcn 置き換えを検知する failing test を追加する**

追加する観点:

```tsx
it("renders question browser with shadcn primitives", () => {
  const html = renderToStaticMarkup(
    <QuestionBrowserView
      {...baseProps}
      questions={[
        {
          id: 1,
          english: "apple",
          japanese: "りんご",
          isActive: true,
          tags: ["word"]
        }
      ]}
      status="loaded"
    />
  );

  expect(html).toContain("typing questions 一覧");
  expect(html).not.toContain("btn btn-primary");
  expect(html).toContain("rounded-md");
  expect(html).toContain("data-slot=\"table\"");
});
```

- [ ] **Step 2: 追加した test を単体実行して正しく fail させる**

Run:

```bash
cd frontend
npx vitest run src/__tests__/questionBrowserUi.test.tsx
```

Expected:

```text
FAIL
旧 class 名が残っている、または新しい primitive の markup が存在しない
```

- [ ] **Step 3: 失敗理由が狙いどおりかを確認する**

確認ポイント:

```text
構文エラーではなく、QuestionBrowser がまだ旧 UI class を描画しているため fail している
```

- [ ] **Step 4: コミットする**

```bash
git add frontend/src/__tests__/questionBrowserUi.test.tsx
git commit -m "test: add shadcn browser ui expectations"
```

### Task 3: shadcn primitive を `src/components/ui` に実装する

**Files:**
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/components/ui/input.tsx`
- Create: `frontend/src/components/ui/card.tsx`
- Create: `frontend/src/components/ui/badge.tsx`
- Create: `frontend/src/components/ui/table.tsx`
- Create: `frontend/src/components/ui/dialog.tsx`
- Create: `frontend/src/components/ui/checkbox.tsx`

- [ ] **Step 1: `Button` を最小実装する**

`frontend/src/components/ui/button.tsx`:

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--primary)] text-[var(--primary-foreground)]",
        outline: "border border-[var(--border)] bg-transparent text-[var(--foreground)]"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant }), className)} data-slot="button" {...props} />;
}
```

- [ ] **Step 2: `Input` と `Card` を追加する**

`frontend/src/components/ui/input.tsx`:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm",
        className
      )}
      data-slot="input"
      {...props}
    />
  );
}
```

`frontend/src/components/ui/card.tsx`:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-[var(--border)] bg-[var(--card)]", className)} data-slot="card" {...props} />;
}
```

- [ ] **Step 3: `Badge` `Table` `Dialog` `Checkbox` を追加する**

実装方針:

```text
- Badge: cva ベースで default / secondary / outline
- Table: Table, TableHeader, TableBody, TableRow, TableHead, TableCell を export
- Dialog: Radix Dialog Root/Trigger/Content などの薄い wrapper
- Checkbox: Radix Checkbox Root を薄く wrap
```

- [ ] **Step 4: TypeScript と import 解決を確認する**

Run:

```bash
cd frontend
npx tsc --noEmit
```

Expected:

```text
PASS
```

- [ ] **Step 5: コミットする**

```bash
git add frontend/src/components/ui frontend/src/lib/utils.ts
git commit -m "feat: add shadcn ui primitives"
```

### Task 4: `QuestionBrowser` と `QuestionForm` を primitive 利用へ差し替える

**Files:**
- Modify: `frontend/src/features/question-browser/ui/QuestionBrowser.tsx`
- Modify: `frontend/src/features/question-browser/ui/QuestionForm.tsx`
- Test: `frontend/src/__tests__/questionBrowserUi.test.tsx`

- [ ] **Step 1: `QuestionBrowser.tsx` で primitive を import する**

追加 import 例:

```tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
```

- [ ] **Step 2: アクション、フィルター、一覧テーブルを差し替える**

差し替え方針:

```tsx
<Button onClick={onReload} type="button" variant="outline">
  再読み込み
</Button>

<Input
  id="question-tags"
  onChange={(event) => onSetTags(parseTagInput(event.target.value))}
  placeholder="daily, business"
  value={filters.tags.join(", ")}
/>

<Card className="filter-card">
  ...
</Card>

<Checkbox
  checked={filters.includeInactive}
  id="include-inactive"
  onCheckedChange={(checked) => onSetIncludeInactive(checked === true)}
/>

<Table>
  <TableHeader>...</TableHeader>
  <TableBody>...</TableBody>
</Table>
```

- [ ] **Step 3: `QuestionForm.tsx` も `Card` `Input` `Button` に差し替える**

差し替え方針:

```tsx
<Card className="question-form-card">
  <form onSubmit={handleSubmit}>
    <Input
      id="question-english"
      onChange={(e) => setValues((current) => ({ ...current, english: e.target.value }))}
      value={values.english}
    />
    <div className="question-form-actions">
      <Button onClick={onCancel} type="button" variant="outline">
        キャンセル
      </Button>
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "処理中..." : submitLabel}
      </Button>
    </div>
  </form>
</Card>
```

- [ ] **Step 4: Task 2 の failing test を再実行して Green にする**

Run:

```bash
cd frontend
npx vitest run src/__tests__/questionBrowserUi.test.tsx
```

Expected:

```text
PASS
```

- [ ] **Step 5: 既存 UI 表示に必要な class だけを `globals.css` へ残す**

確認観点:

```text
filter-card, table-card, question-form-card など layout class は残す
btn, text-input, question-table 依存は差し替えた箇所から外す
```

- [ ] **Step 6: コミットする**

```bash
git add frontend/src/features/question-browser/ui/QuestionBrowser.tsx frontend/src/features/question-browser/ui/QuestionForm.tsx frontend/src/app/globals.css frontend/src/__tests__/questionBrowserUi.test.tsx
git commit -m "feat: adopt shadcn primitives in question browser"
```

### Task 5: 全体検証を実行して仕上げる

**Files:**
- Verify only: `frontend/*`

- [ ] **Step 1: frontend test を通す**

Run:

```bash
cd frontend
npm run test
```

Expected:

```text
PASS
```

- [ ] **Step 2: frontend lint を通す**

Run:

```bash
cd frontend
npm run lint
```

Expected:

```text
PASS
```

- [ ] **Step 3: frontend build を通す**

Run:

```bash
cd frontend
npm run build
```

Expected:

```text
PASS
```

- [ ] **Step 4: 変更差分を確認する**

Run:

```bash
git status --short
git diff --stat
```

Expected:

```text
想定ファイルのみ変更されている
```

- [ ] **Step 5: 最終コミットを作る**

```bash
git add frontend/package.json frontend/package-lock.json frontend/components.json frontend/src/lib/utils.ts frontend/src/components/ui frontend/src/features/question-browser/ui/QuestionBrowser.tsx frontend/src/features/question-browser/ui/QuestionForm.tsx frontend/src/app/globals.css frontend/src/__tests__/questionBrowserUi.test.tsx
git commit -m "feat: add shadcn foundation"
```
