# shadcn Foundation Design

## 概要

GitHub Issue [#89](https://github.com/tokitaku/typing-app/issues/89) に対して、`frontend` に shadcn/ui の基盤を導入する。
今回の目的は、既存 UI を全面移行することではなく、`#90` で段階移行できる土台を整えることにある。

## 目的

- `frontend` で shadcn/ui の primitive を追加できる状態にする
- `src/components/ui` と `src/lib/utils.ts` を整備する
- `button` / `input` / `card` / `badge` / `table` / `dialog` / `checkbox` を追加する
- 既存画面の 1 つ以上で primitive を実使用し、受け入れ条件を満たす

## 非目的

- 既存 4 画面すべての UI を shadcn ベースへ移行すること
- `frontend/src/app/globals.css` の大規模な整理や削減
- 業務ロジック、hooks、API 呼び出しの設計変更

## 現状整理

- Tailwind CSS v4 の導入は `main` に取り込まれており、`frontend/package.json` と `frontend/src/app/globals.css` に基盤が存在する
- 一方で `frontend/components.json`、`frontend/src/lib/utils.ts`、`frontend/src/components/ui/*` は未作成
- 既存画面は `btn`、`card`、`badge`、`text-input`、`question-table` などのグローバル CSS class に依存している
- `frontend/src/features/question-browser/ui/QuestionBrowser.tsx` は `button` / `input` / `card` / `table` / `checkbox` をまとめて差し替えやすい

## 採用方針

### 方針

`QuestionBrowser` を最初の実使用先とし、shadcn の primitive を `src/components/ui` に導入する。
`QuestionForm` も同じ feature 配下にあるため、`button` / `input` / `card` はここでも利用する。
`dialog` と `badge` はこの issue で基盤として追加するが、画面での利用は強制しない。

### 採用理由

- `QuestionBrowser` は `table` と `checkbox` を含み、今回追加する primitive の利用効率が高い
- 既存の UI テストがあり、差し替え後の描画を比較しやすい
- `#90` の全面移行より前に、feature 層から primitive を読み込む形を小さく実証できる

## 変更範囲

### 追加

- `frontend/components.json`
- `frontend/src/lib/utils.ts`
- `frontend/src/components/ui/button.tsx`
- `frontend/src/components/ui/input.tsx`
- `frontend/src/components/ui/card.tsx`
- `frontend/src/components/ui/badge.tsx`
- `frontend/src/components/ui/table.tsx`
- `frontend/src/components/ui/dialog.tsx`
- `frontend/src/components/ui/checkbox.tsx`

### 修正

- `frontend/src/app/globals.css`
- `frontend/src/features/question-browser/ui/QuestionBrowser.tsx`
- `frontend/src/features/question-browser/ui/QuestionForm.tsx`
- `frontend/src/__tests__/questionBrowserUi.test.tsx`

## 責務分割

### `src/components/ui`

- shadcn 由来の primitive を置く
- 表示責務だけを持つ
- 業務ルール、API 呼び出し、永続化判断を持ち込まない

### `src/features/question-browser/ui`

- feature 固有の composition を維持する
- primitive の組み合わせと props の受け渡しに責務を限定する
- 既存の hooks / application のインターフェースは変更しない

### `globals.css`

- 既存 class を全廃せず、今回必要な token や base layer だけ調整する
- `#90` で段階移行できるよう、互換性を壊さない

## 実装アプローチ

### 採用案

1. `components.json` と `cn()` を追加する
2. 必要な 7 primitive を `src/components/ui` に追加する
3. `QuestionBrowser` のアクション、フィルター、テーブル、カードを primitive ベースへ差し替える
4. `QuestionForm` の入力欄とアクションを primitive ベースへ差し替える
5. 既存グローバル CSS への依存を最小限だけ残しつつ、shadcn 導入後も表示崩れしないことを確認する

### 採用しなかった案

- 基盤だけ追加して画面では使わない案
  - issue の受け入れ条件である「primitive を 1 つ以上画面で読み込める」を満たしにくい
- `button` / `input` / `card` の最小 3 コンポーネントだけを追加する案
  - 今回は user 判断で option 3 を選択済みであり、`#90` 直前で不足 primitive を追加し直す手戻りが発生する

## リスクと対策

### リスク 1

既存の `globals.css` と shadcn コンポーネントの style 方針が衝突する可能性がある。

対策:
既存 class の削除は行わず、primitive を使う箇所だけを差し替える。

### リスク 2

`QuestionBrowser` の描画構造変更により既存 UI テストが壊れる可能性がある。

対策:
先に failing test を書き、表示文言と操作要素の存在を挙動として固定する。

### リスク 3

`dialog` など今回未使用の primitive が未検証のまま残る可能性がある。

対策:
今回は「導入可能な状態」を受け入れ条件とし、広範な利用確認は `#90` で行う。

## テスト方針

TDD で進める。

1. `frontend/src/__tests__/questionBrowserUi.test.tsx` に、shadcn 導入後も `QuestionBrowser` が主要文言と操作要素を描画する failing test を追加する
2. 必要に応じて `QuestionForm` の描画確認を追加する
3. minimal 実装で test を Green にする
4. `npm run test` を実行する
5. `npm run lint` を実行する
6. `npm run build` を実行する

## 完了条件

- shadcn CLI 相当の構成として `components.json` と `src/components/ui` / `src/lib/utils.ts` が整備されている
- `button` / `input` / `card` / `badge` / `table` / `dialog` / `checkbox` が追加されている
- `QuestionBrowser` もしくは `QuestionForm` で primitive が利用されている
- `frontend` の test / lint / build が通る

## 実装前提

- 作業ブランチは `codex/feat/shadcn-foundation`
- 実装はルート `AGENTS.md` と `frontend/AGENTS.md` に従う
- `#90` での段階移行を邪魔しないよう、今回の変更は基盤整備に留める
