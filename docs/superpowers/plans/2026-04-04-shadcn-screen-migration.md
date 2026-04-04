# shadcn 画面移行 実装計画

> **エージェント向け:** 必須サブスキル: superpowers:subagent-driven-development（推奨）または superpowers:executing-plans を使ってタスク単位で実装してください。ステップはチェックボックス（`- [ ]`）形式で追跡します。

## 結論

`Home` / `StudySession` / `ResultScreen` を `typing_app.pen` の shadcn デザインに寄せて移行する。  
`frontend/src/features/*/ui` に presentational view を閉じ込め、hook 連携コンポーネントと描画専用コンポーネントを分離する。  
`Home` は既存 `HomeDashboardView` を更新し、`StudySession` と `ResultScreen` は view を新設してstatic markup テストを追加する。  
共通表現が必要な箇所だけ `src/components/ui` に `Progress` / `Separator` を最小追加し、`globals.css` はトークンと未移行画面の互換維持に必要な範囲へ絞る。

**技術スタック:** `Next.js 14`, `React 18`, `TypeScript`, `Vitest`, `Tailwind CSS v4`, `shadcn/ui`, `lucide-react`

## 理由

- 旧グローバル CSS クラス（`btn`, `badge`, `card`, `text-input` など）への依存を削減し、`shadcn/ui` ベースの共通 UI へ段階移行する
- 業務ロジックを変えずに、表示責務だけを `ui` 層で再構成することで保守性を高める
- TDD 方針に従い、failing test → 実装 → pass の順で画面単位に進める

## 次の手順

### ファイル構成

- 変更: `frontend/src/features/home-dashboard/ui/HomeDashboard.tsx`
  - `.pen` に沿った header / hero / metrics の再構成を行う
- 変更: `frontend/src/features/study-session/ui/StudySession.tsx`
  - hook 利用部と `StudySessionView` を分け、2 枚 card + stats bar 構成へ移行する
- 変更: `frontend/src/features/result-screen/ui/ResultScreen.tsx`
  - hook 利用部と `ResultScreenView` を分け、centered result layout へ移行する
- 新規: `frontend/src/components/ui/progress.tsx`
  - session header の progress bar を shadcn 互換の primitive に寄せる
- 新規: `frontend/src/components/ui/separator.tsx`
  - result の divider を primitive 化する
- 変更: `frontend/src/app/globals.css`
  - 対象 3 画面で不要になる旧 class を削減し、最低限の base / token のみ残す
- 変更: `frontend/src/__tests__/homeDashboardUi.test.tsx`
  - `Home` の shadcn レイアウト期待を追加する
- 新規: `frontend/src/__tests__/studySessionUi.test.tsx`
  - `StudySessionView` の static markup を固定する
- 新規: `frontend/src/__tests__/resultScreenUi.test.tsx`
  - `ResultScreenView` の static markup を固定する

### タスク 1: Home を `.pen` 準拠レイアウトへ移行する

**対象ファイル:**
- 変更: `frontend/src/__tests__/homeDashboardUi.test.tsx`
- 変更: `frontend/src/features/home-dashboard/ui/HomeDashboard.tsx`
- 変更: `frontend/src/app/globals.css`

- [ ] **ステップ 1: Home の failing UI test を追加する**

```tsx
it("renders the shadcn home layout without legacy button classes", () => {
  const html = renderToStaticMarkup(<HomeDashboardView {...baseProps} />);

  expect(html).toContain("Type &amp; Learn");
  expect(html).toContain("学習開始");
  expect(html).toContain("復習する");
  expect(html).toContain("今日の学習回数");
  expect(html).not.toContain("btn btn-primary");
  expect(html).not.toContain("hero-actions");
});
```

- [ ] **ステップ 2: 追加した test を単体実行して fail を確認する**

実行: `cd frontend && npx vitest run src/__tests__/homeDashboardUi.test.tsx`  
期待: FAIL。旧 `btn` / `hero-actions` 依存が残っているため assertion が落ちる

- [ ] **ステップ 3: `.pen` に沿って HomeDashboardView を最小実装で更新する**

```tsx
<header className="flex h-14 items-center justify-between border-b px-8">
  <span className="text-lg font-semibold">Type &amp; Learn</span>
  <Link className="text-sm text-muted-foreground" href="/questions">
    問題一覧へ
  </Link>
</header>
```

```tsx
<div className="flex gap-4 px-8">
  <Card className="flex-1">
    <CardHeader>
      <CardTitle className="text-sm font-medium">今日の学習回数</CardTitle>
    </CardHeader>
    <CardContent className="text-4xl font-bold">{summary.sessions}</CardContent>
  </Card>
</div>
```

- [ ] **ステップ 4: Home の単体 test を再実行して pass を確認する**

実行: `cd frontend && npx vitest run src/__tests__/homeDashboardUi.test.tsx`  
期待: PASS

- [ ] **ステップ 5: Home 変更を commit する**

```bash
git add frontend/src/__tests__/homeDashboardUi.test.tsx frontend/src/features/home-dashboard/ui/HomeDashboard.tsx frontend/src/app/globals.css
git commit -m "feat: migrate home dashboard to shadcn layout"
```

### タスク 2: Session / Result 用の最小 primitive を追加する

**対象ファイル:**
- 新規: `frontend/src/components/ui/progress.tsx`
- 新規: `frontend/src/components/ui/separator.tsx`
- 変更: `frontend/src/features/study-session/ui/StudySession.tsx`
- 変更: `frontend/src/features/result-screen/ui/ResultScreen.tsx`

- [ ] **ステップ 1: primitive 追加前提の failing import を用意する**

`StudySession.tsx` と `ResultScreen.tsx` で次の import を使う前提にする。

```tsx
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
```

- [ ] **ステップ 2: Home 以外はまだ実装しないまま lint / type レベルで不足を確認する**

実行: `cd frontend && npm run lint`  
期待: FAIL。`@/components/ui/progress` または `separator` が存在しない

- [ ] **ステップ 3: 最小の primitive を追加する**

`frontend/src/components/ui/progress.tsx`

```tsx
export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted" data-slot="progress">
      <div className="h-full bg-primary transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}
```

`frontend/src/components/ui/separator.tsx`

```tsx
export function Separator() {
  return <div className="h-px w-full bg-border" data-slot="separator" />;
}
```

- [ ] **ステップ 4: lint を再実行して import 不足が解消したことを確認する**

実行: `cd frontend && npm run lint`  
期待: PASS もしくは未使用 import 以外の lint error なし

- [ ] **ステップ 5: primitive 追加を commit する**

```bash
git add frontend/src/components/ui/progress.tsx frontend/src/components/ui/separator.tsx
git commit -m "feat: add progress and separator primitives"
```

### タスク 3: StudySessionView を導入して `.pen` の 2 枚 card 構成へ移行する

**対象ファイル:**
- 新規: `frontend/src/__tests__/studySessionUi.test.tsx`
- 変更: `frontend/src/features/study-session/ui/StudySession.tsx`
- 変更: `frontend/src/app/globals.css`

- [ ] **ステップ 1: StudySessionView の failing UI test を追加する**

```tsx
it("renders the session screen with source and typing cards", () => {
  const html = renderToStaticMarkup(
    <StudySessionView
      mode="learn"
      currentIndex={2}
      elapsedMs={225000}
      inputValue="In spring"
      isSavingResult={false}
      mistakeCount={1}
      quizSetLength={10}
      wasMistaken={false}
      currentQuiz={{
        id: 7,
        english: "In spring, cherry blossoms bloom and many people enjoy hanami.",
        japanese: "春には桜が咲き誇り、多くの人々が花見を楽しみます。",
        tags: ["passage"]
      }}
      characterStates={["correct"]}
      onChange={() => {}}
    />
  );

  expect(html).toContain("LEARN MODE");
  expect(html).toContain("文 2 / 4");
  expect(html).toContain("英語を入力");
  expect(html).toContain("中断してホームへ戻る");
  expect(html).not.toContain("text-input");
});
```

- [ ] **ステップ 2: 新規 test を単体実行して fail を確認する**

実行: `cd frontend && npx vitest run src/__tests__/studySessionUi.test.tsx`  
期待: FAIL。`StudySessionView` 未定義、または旧構造のため期待文言が存在しない

- [ ] **ステップ 3: StudySession.tsx から presentational view を抽出し、最小実装で Green にする**

```tsx
export function StudySessionView(props: StudySessionViewProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b px-8">
        <div className="flex flex-1 items-center gap-4">
          <Badge variant="secondary">{modeLabel}</Badge>
          <Progress value={progress} />
          <span className="text-sm text-muted-foreground">{currentIndex + 1} / {quizSetLength}</span>
        </div>
        <Badge variant="outline">{formatMs(elapsedMs)}</Badge>
      </header>
    </div>
  );
}
```

```tsx
<Card className="w-full max-w-[960px]">
  <CardHeader className="flex flex-row items-center justify-between">
    <Badge>{tagLabel}</Badge>
    <span className="text-sm text-muted-foreground">文 2 / 4</span>
  </CardHeader>
</Card>
```

- [ ] **ステップ 4: StudySession UI test を再実行して pass を確認する**

実行: `cd frontend && npx vitest run src/__tests__/studySessionUi.test.tsx`  
期待: PASS

- [ ] **ステップ 5: StudySession 変更を commit する**

```bash
git add frontend/src/__tests__/studySessionUi.test.tsx frontend/src/features/study-session/ui/StudySession.tsx frontend/src/app/globals.css
git commit -m "feat: migrate study session to shadcn layout"
```

### タスク 4: ResultScreenView を導入して centered result layout へ移行する

**対象ファイル:**
- 新規: `frontend/src/__tests__/resultScreenUi.test.tsx`
- 変更: `frontend/src/features/result-screen/ui/ResultScreen.tsx`
- 変更: `frontend/src/app/globals.css`

- [ ] **ステップ 1: ResultScreenView の failing UI test を追加する**

```tsx
it("renders the shadcn result layout with four stat cards", () => {
  const html = renderToStaticMarkup(
    <ResultScreenView
      result={{
        mode: "learn",
        total_questions: 12,
        correct_rate: 91,
        mistakes: 2,
        average_time: 4200
      }}
      todaySummary={{ sessions: 3, reviewBacklog: 4 }}
    />
  );

  expect(html).toContain("学習結果");
  expect(html).toContain("Type &amp; Learn");
  expect(html).toContain("次の学習へ進む");
  expect(html).not.toContain("btn btn-outline");
  expect(html).toContain("data-slot=\"separator\"");
});
```

- [ ] **ステップ 2: 新規 test を単体実行して fail を確認する**

実行: `cd frontend && npx vitest run src/__tests__/resultScreenUi.test.tsx`  
期待: FAIL。`ResultScreenView` 未定義、または旧 button / hr 構成が残っている

- [ ] **ステップ 3: ResultScreen.tsx から presentational view を抽出し、`lucide-react` と primitive へ移行する**

```tsx
import { ArrowLeft, Home, Keyboard, Play } from "lucide-react";
```

```tsx
export function ResultScreenView({ result, todaySummary }: ResultScreenViewProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b px-8">
        <div className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          <span className="text-sm font-semibold">Type &amp; Learn</span>
        </div>
      </header>
    </div>
  );
}
```

- [ ] **ステップ 4: ResultScreen UI test を再実行して pass を確認する**

実行: `cd frontend && npx vitest run src/__tests__/resultScreenUi.test.tsx`  
期待: PASS

- [ ] **ステップ 5: ResultScreen 変更を commit する**

```bash
git add frontend/src/__tests__/resultScreenUi.test.tsx frontend/src/features/result-screen/ui/ResultScreen.tsx frontend/src/app/globals.css
git commit -m "feat: migrate result screen to shadcn layout"
```

### タスク 5: 旧 class 依存を削減し、frontend 全体を検証する

**対象ファイル:**
- 変更: `frontend/src/app/globals.css`
- 確認: `frontend/src/features/home-dashboard/ui/HomeDashboard.tsx`
- 確認: `frontend/src/features/study-session/ui/StudySession.tsx`
- 確認: `frontend/src/features/result-screen/ui/ResultScreen.tsx`
- 確認: `frontend/src/__tests__/homeDashboardUi.test.tsx`
- 確認: `frontend/src/__tests__/studySessionUi.test.tsx`
- 確認: `frontend/src/__tests__/resultScreenUi.test.tsx`

- [ ] **ステップ 1: 対象 3 画面に残る旧 class 参照を検索する**

実行: `cd frontend && rg -n 'btn|badge-|text-input|session-card|result-content|hero-actions' src/features/home-dashboard src/features/study-session src/features/result-screen`  
期待: 対象 3 画面では旧 class 参照が 0 件、または未移行理由が明確な最小件数

- [ ] **ステップ 2: globals.css の不要ルールを最小限整理する**

```css
/* Home / Session / Result で未使用になった legacy rule を削除し、
   QuestionBrowser が使う class は残す */
```

- [ ] **ステップ 3: frontend の test を全件実行する**

実行: `cd frontend && npm run test`  
期待: PASS

- [ ] **ステップ 4: frontend の lint を実行する**

実行: `cd frontend && npm run lint`  
期待: PASS

- [ ] **ステップ 5: frontend の build を実行する**

実行: `cd frontend && npm run build`  
期待: PASS

- [ ] **ステップ 6: 最終差分を commit する**

```bash
git add frontend/src/app/globals.css
git add frontend/src/features/home-dashboard/ui/HomeDashboard.tsx frontend/src/features/study-session/ui/StudySession.tsx frontend/src/features/result-screen/ui/ResultScreen.tsx
git add frontend/src/__tests__/homeDashboardUi.test.tsx frontend/src/__tests__/studySessionUi.test.tsx frontend/src/__tests__/resultScreenUi.test.tsx
git commit -m "refactor: remove legacy styles from migrated screens"
```
