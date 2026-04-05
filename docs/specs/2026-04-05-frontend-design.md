# フロントエンド設計改善ガイドライン

**作成日:** 2026-04-05
**関連issue:** tokitaku/typing-app#129
**目的:** 保守性・テスタビリティの向上

---

## 問題の整理

### 現状の主な問題

| 問題 | 代表例 |
|------|--------|
| フックの肥大化 | `useStudySession.ts` 255行・`useState` 14個 |
| フックが責務を持ちすぎている | API・ロジック・storage・router・エラー処理を全部担っている |
| エラーハンドリングの不統一 | フックごとに異なる戦略、一部はサイレントに無視 |
| 無意味なre-export層 | `features/*/storage/` が `shared/lib/studyLocalStorage` をそのまま再エクスポートするだけ |

---

## 設計方針

### アプローチ: Application層強化 + `useReducer` の組み合わせ

---

## セクション1: レイヤーの責務定義

### 責務の分担

| レイヤー | 責務 | テスト方法 |
|---------|------|-----------|
| `application/` | **純粋関数のみ** — reducer、状態遷移ロジック、計算、derived values | `vitest` で直接呼ぶ（React不要）|
| `hooks/` | **副作用の協調のみ** — fetch / storage / router の呼び出しと `dispatch` | `renderHook` でテスト |
| `ui/` | **表示のみ** — props を受け取って描画 | `render` でテスト |

### ルール

1. `application/` に副作用を書かない（`fetch`、`localStorage`、`useRouter` 禁止）
2. `hooks/` にビジネスロジックを書かない（計算・判定は `application/` へ）
3. `ui/` はフィーチャーフック（`useStudySession` など）を直接呼ばない（state と handler は props として受け取る）。ローカルUI状態（ドロップダウンの開閉など）の `useState` は可

---

## セクション2: `useReducer` + `application/` の具体的パターン

### 状態の定義（`application/` に置く）

状態を `phase` による判別可能なユニオン型で定義することで、「この状態でこのアクションは起きえない」をTypeScriptで表現できる。

```ts
// application/studySessionReducer.ts

type SessionState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "playing"; quizSet: Quiz[]; currentIndex: number; inputValue: string; mistakeCount: number; startedAt: number }
  | { phase: "submitting"; result: StudyResult }
  | { phase: "done" }
  | { phase: "error"; reason: "fetch_failed" | "save_failed"; retryable: boolean }

type SessionAction =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; quizSet: Quiz[] }
  | { type: "INPUT_CHANGE"; value: string }
  | { type: "QUIZ_ADVANCE" }
  | { type: "SUBMIT_START"; result: StudyResult }
  | { type: "SUBMIT_DONE" }
  | { type: "ERROR"; reason: "fetch_failed" | "save_failed"; retryable: boolean }

// 純粋なreducer — Reactなしでテスト可能
export function studySessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (state.phase) {
    case "idle":
      if (action.type === "LOAD_START") return { phase: "loading" }
      return state
    case "loading":
      if (action.type === "LOAD_SUCCESS") return { phase: "playing", quizSet: action.quizSet, currentIndex: 0, inputValue: "", mistakeCount: 0, startedAt: Date.now() }
      if (action.type === "ERROR") return { phase: "error", reason: action.reason, retryable: action.retryable }
      return state
    // ...
  }
}
```

### フックは副作用のみ（`hooks/` に置く）

```ts
// hooks/useStudySession.ts
export function useStudySession(mode: StudyMode) {
  const [state, dispatch] = useReducer(studySessionReducer, { phase: "idle" })
  const router = useRouter()

  // 副作用1: データ取得
  useEffect(() => {
    const controller = new AbortController()
    dispatch({ type: "LOAD_START" })
    fetchStudyQuestions(controller.signal)
      .then(qs => dispatch({ type: "LOAD_SUCCESS", quizSet: qs }))
      .catch(e => {
        if (e.name === "AbortError") return
        dispatch({ type: "ERROR", reason: "fetch_failed", retryable: true })
      })
    return () => controller.abort()
  }, [mode])

  // 副作用2: 完了後のルーティング
  useEffect(() => {
    if (state.phase === "done") router.push("/result")
  }, [state.phase])

  return { state, dispatch }
}
```

### テストの変化

```ts
// Before: renderHook + 複数のモックが必要
test("入力でミスカウントが増える", () => {
  const { result } = renderHook(() => useStudySession("learn"))
  // fetchのモック、routerのモックが必要...
})

// After: 純粋関数を直接テストできる（モック不要）
test("入力でミスカウントが増える", () => {
  const state: SessionState = { phase: "playing", mistakeCount: 0, inputValue: "", currentIndex: 0, quizSet: [...], startedAt: 0 }
  const next = studySessionReducer(state, { type: "INPUT_CHANGE", value: "x" })
  expect(next.mistakeCount).toBe(1)
})
```

---

## セクション3: エラーハンドリングのパターン

### 原則: エラーも状態の一部にする

エラーを `catch` してサイレントに続行するのではなく、`dispatch` して状態に反映する。

```ts
// hooks/ でのエラーハンドリング
try {
  const result = await saveStudyResult(data)
  dispatch({ type: "SUBMIT_DONE" })
} catch (e) {
  if (e instanceof AbortError) return           // キャンセルは無視
  dispatch({ type: "ERROR", reason: "save_failed", retryable: true })
  // ← サイレントに続行しない。必ず state に反映する
}
```

### UIへの伝達

```ts
// ui/ は phase に応じて表示を切り替えるだけ
if (state.phase === "error") {
  return <ErrorView reason={state.reason} retryable={state.retryable} />
}
```

### AbortController の共通化

全フィーチャーで繰り返されているボイラープレートを共通フックに切り出す。

```ts
// shared/hooks/useAbortEffect.ts
export function useAbortEffect(
  fn: (signal: AbortSignal) => Promise<void>,
  deps: unknown[]
) {
  useEffect(() => {
    const controller = new AbortController()
    fn(controller.signal).catch(e => {
      if (e.name !== "AbortError") throw e
    })
    return () => controller.abort()
  }, deps)
}
```

---

## セクション4: Storageレイヤーの整理

### 方針: re-exportのみのファイルは削除

```ts
// 削除対象（抽象化の価値がない）
// features/study-session/storage/studySessionStorage.ts
export { getReviewQueue, saveReviewQueue, ... } from "@/shared/lib/studyLocalStorage"
```

`shared/lib/studyLocalStorage` を `hooks/` から直接インポートする。

```ts
// hooks/useStudySession.ts
import { getReviewQueue, saveReviewQueue } from "@/shared/lib/studyLocalStorage"
```

### フィーチャー固有ロジックがある場合のみ `storage/` を作る

```ts
// features/question-browser/storage/questionBrowserStorage.ts
// フィルター状態の永続化など、フィーチャー固有の処理がある場合のみ
export function saveFilterState(filters: FilterState): void {
  localStorage.setItem("question_browser_filters", JSON.stringify(filters))
}
```

---

## セクション5: ファイル構成の理想形

```
features/study-session/
├── api/studySessionApi.ts              # fetchのみ（副作用）
├── application/
│   ├── studySessionReducer.ts          # reducer + State / Action 型（純粋関数）
│   └── studySessionSelectors.ts        # state から派生値を計算（純粋関数）
├── hooks/useStudySession.ts            # 副作用の協調のみ（薄い）
└── ui/StudySession.tsx                 # 表示のみ
```

**`storage/` はフィーチャー固有のロジックがなければ作らない。**

---

## 実装優先度

| フィーチャー | 理由 |
|-------------|------|
| `study-session` | 最も複雑（useState 14個、255行フック）|
| `question-browser` | 最大ファイル（324行UI、195行フック）|
| `home-dashboard` | 比較的シンプル |
| `result-screen` | 比較的シンプル |

各フィーチャーは独立したPRで対応する。

---

## チェックリスト（実装時の確認用）

- [ ] `application/` に `fetch` / `localStorage` / `useRouter` を使っていないか
- [ ] `hooks/` にビジネスロジック（計算・判定）を書いていないか
- [ ] reducer に対して `vitest` で純粋関数テストを書いているか
- [ ] エラーを `dispatch` せずにサイレントに無視していないか
- [ ] re-exportだけの `storage/` ファイルを作っていないか
