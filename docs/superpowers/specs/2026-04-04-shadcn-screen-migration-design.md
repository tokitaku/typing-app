# shadcn Screen Migration Design

## 概要

GitHub Issue [#90](https://github.com/tokitaku/typing-app/issues/90) に対して、既存フロント画面を shadcn/ui ベースの共通 UI へ段階移行する。
今回の対象は `Home` / `StudySession` / `ResultScreen` を中心とし、[typing_app.pen](/Users/tokimasatakuya/Dev/typing-app/.worktrees/shadcn-screen-migration/frontend/docs/typing_app.pen) の `shadcn - Home` / `shadcn - Session` / `shadcn - Result` を視覚基準として採用する。

## 目的

- `#89` で導入した shadcn primitive を、残り主要画面へ実運用レベルで展開する
- `frontend/docs/typing_app.pen` の shadcn デザインに主要 3 画面を寄せる
- `btn` / `badge` / `card` / `text-input` などの旧グローバル class 依存を削減する
- 業務ロジックを変えずに、表示責務だけを `ui` 層で再構成する

## 非目的

- `hooks` / `application` / `api` / `storage` の責務変更
- `QuestionBrowser` の追加改修
- `globals.css` の全面削除やデザイントークンの大規模刷新
- `.pen` にない新規機能や独自 UI の追加

## 現状整理

- `#84` 相当の Tailwind CSS v4 基盤は `main` に取り込まれている
- `#89` 相当の shadcn 基盤と `QuestionBrowser` の一部移行も `main` に取り込まれている
- 一方で `HomeDashboard` / `StudySession` / `ResultScreen` は依然として `btn`、`badge`、`card`、`text-input` などの旧グローバル class に依存している
- `.pen` には現行画面とは別に `shadcn - Home` / `shadcn - Session` / `shadcn - Result` が存在し、今回の移行先デザインを明示できる

## 採用方針

### 方針

`.pen` にできるだけ忠実に寄せる。
既存レイアウトを温存するのではなく、3 画面を `header + centered main + simple footer/metrics` の骨格へ揃え、shadcn primitive を中心に再構成する。

### 採用理由

- user が `.pen` の shadcn Home を基準にすることを明示的に選択した
- `#90` の目的は単なる class の置換ではなく、shadcn/ui ベースの共通 UI への段階移行にある
- `Home` / `StudySession` / `ResultScreen` の骨格を揃えることで、今後の画面追加や refinement でも共通パターンを再利用しやすい

## 変更範囲

### 主対象

- `frontend/src/features/home-dashboard/ui/HomeDashboard.tsx`
- `frontend/src/features/study-session/ui/StudySession.tsx`
- `frontend/src/features/result-screen/ui/ResultScreen.tsx`
- `frontend/src/__tests__/homeDashboardUi.test.tsx`
- `frontend/src/__tests__/resultScreenUi.test.tsx` または既存テスト追加先
- `frontend/src/__tests__/studySessionUi.test.tsx` または既存テスト追加先
- `frontend/src/app/globals.css`

### 条件付きで追加

- `frontend/src/components/ui/progress.tsx`
- `frontend/src/components/ui/separator.tsx`
- 画面ごとの表示専用 helper

既存 primitive だけで十分なら、新規 component 追加は行わない。

## 画面ごとの設計

### Home

- 56px のシンプルな header を配置し、左に `Type & Learn`、右に `問題一覧へ` を置く
- main は中央寄せの hero 構成とし、タイトル、説明文、タグ選択、`学習開始` / `復習する` の CTA を縦方向に整理する
- footer 相当として metrics row を下部に配置し、`今日の学習回数` / `今日の出題数` / `復習待ち` の 3 card を並べる
- 既存 `TagSelectDropdown` のロジックは維持し、見た目だけ `.pen` に寄せる

### StudySession

- `.pen` の `header / main / footer` 構成を採用する
- header は mode badge、progress bar、counter、timer を並べる
- main は 1 枚の card に集約し、上段にタグ badge と日本語、中央に英語ターゲット、下段に入力欄を置く
- footer は `ミス回数`、ヒント、`中断してホームへ戻る` の 3 点へ整理する
- loading / error / empty state も同じ骨格の中で shadcn ベースに揃える

### ResultScreen

- `.pen` の header + centered content 構成に寄せる
- title section、4 枚の stat card、notes row、separator、action row の順で再構成する
- header と action の icon は inline SVG ではなく `lucide-react` を使う
- result 不在時の empty state も同じ visual language に揃える

## 責務分割

### `src/features/*/ui`

- `.pen` に沿ったレイアウトと primitive の組み合わせだけを担う
- hook や application が返す値の表示に責務を限定する
- 業務判断やデータ整形ロジックを追加しない

### `src/components/ui`

- 汎用 primitive を置く
- 必要な場合のみ `Progress` や `Separator` のような表示部品を追加する
- feature 固有の事情を持ち込まない

### `globals.css`

- token、base layer、既存画面との互換維持に必要な最小限だけを担う
- 今回の 3 画面で不要になった旧 class は削減対象とする
- ただし `QuestionBrowser` など未移行画面に必要な class は残す

## 実装アプローチ

### 採用案

1. 画面単位で failing test を先に追加する
2. `Home` を `.pen` 準拠で shadcn ベースへ移行する
3. `StudySession` を `.pen` 準拠で shadcn ベースへ移行する
4. `ResultScreen` を `.pen` 準拠で shadcn ベースへ移行する
5. 旧グローバル class の依存を減らし、frontend 全体の test / lint / build を確認する

### 採用しなかった案

- 既存レイアウトを維持して primitive だけ置換する案
  - 差分は小さいが `.pen` 基準から離れ、`#90` の移行目的を満たしにくい
- `QuestionBrowser` まで含めて再度全面再構成する案
  - 既に一定の移行が入っており、今回の主目的から外れる
- `.pen` を参考程度にして独自再解釈する案
  - 判断コストが増え、今回の user 意図とずれる

## リスクと対策

### リスク 1

`globals.css` に残る旧 class と、新しい primitive ベースの見た目が衝突する可能性がある。

対策:
今回の対象画面で使う旧 class を明示的に減らしつつ、未移行画面に必要な class は残す。

### リスク 2

`.pen` は静的デザインであり、loading / error / empty state の扱いが明示されていない。

対策:
通常状態と同じ骨格を維持し、空メッセージや CTA だけを差し替える。

### リスク 3

3 画面を一度に動かすと、どの画面の崩れが原因か追いにくい。

対策:
画面単位で Red → Green → Refactor を守り、テストと commit を細かく区切る。

## テスト方針

TDD で進める。

1. `Home` の UI テストを追加し、hero、CTA、metrics card、旧 class 非依存を固定する
2. `StudySession` の UI テストを追加し、header、main card、input、footer、旧 class 非依存を固定する
3. `ResultScreen` の UI テストを追加し、header、4 stat card、action row、icon 差し替えを固定する
4. 各画面を順に Green にする
5. `frontend` で `npm run test` を実行する
6. `frontend` で `npm run lint` を実行する
7. `frontend` で `npm run build` を実行する

## 完了条件

- `Home` / `StudySession` / `ResultScreen` が `.pen` の shadcn デザインに概ね沿って描画される
- 対象 3 画面が `btn` / `badge` / `card` / `text-input` などの旧グローバル class へ過度に依存していない
- `lucide-react` へ寄せられる icon が inline SVG から置き換わっている
- frontend の test / lint / build が通る

## 実装前提

- 作業ブランチは `codex/feat/shadcn-screen-migration`
- 実装はルート `AGENTS.md` と `frontend/AGENTS.md` に従う
- 視覚基準は `frontend/docs/typing_app.pen` の `shadcn - Home` / `Session` / `Result` を優先する
