# #84 Tailwind CSS v4 導入設計

## 対象 Issue

- [#84 フロントに Tailwind CSS v4 を導入する](https://github.com/tokitaku/typing-app/issues/84)

## 結論

`#84` は `frontend` のビルド基盤に `Tailwind CSS v4` を最小差分で追加する issue として扱う。
この issue で完了させるのは「Tailwind の utility class が解決される状態」までとし、`shadcn/ui` 初期化や既存画面の本格的なスタイル移行は後続 issue に分離する。

## 背景

現状の `frontend` は `Next.js 14` / `React 18` / `TypeScript` 構成で、スタイルは [globals.css](/Users/tokimasatakuya/Dev/typing-app/frontend/src/app/globals.css) に集約された手書き CSS が中心になっている。
一方で open issue には [#89](https://github.com/tokitaku/typing-app/issues/89) と [#90](https://github.com/tokitaku/typing-app/issues/90) があり、どちらも `#84` を前提としている。
そのため、`#84` の目的は UI の刷新ではなく、後続作業を unblock するための基盤追加に限定する。

## 目的

- `frontend` で Tailwind v4 の utility class を解決可能にする
- 既存の手書き CSS を壊さずに Tailwind を共存させる
- `#89` と `#90` が前提として利用できるビルド構成を整える

## 非スコープ

以下は `#84` では扱わない。

- `shadcn/ui` の初期化
- `components.json` の追加
- `src/components/ui/*` や `src/lib/utils.ts` の追加
- `lucide-react` や `tw-animate-css` の導入
- `.btn` / `.card` / `.badge` / `.text-input` など既存 class の Tailwind 置換
- 画面デザインの刷新
- ダークモード導入

## 変更範囲

`#84` の変更対象は次に限定する。

- [frontend/package.json](/Users/tokimasatakuya/Dev/typing-app/frontend/package.json)
- `frontend/package-lock.json`
- `frontend/postcss.config.mjs` を新規追加
- [frontend/src/app/globals.css](/Users/tokimasatakuya/Dev/typing-app/frontend/src/app/globals.css)
- 必要に応じて [frontend/src/app/layout.tsx](/Users/tokimasatakuya/Dev/typing-app/frontend/src/app/layout.tsx) または既存 view の 1 箇所だけ

## 現状整理

### UI 入口

- [page.tsx](/Users/tokimasatakuya/Dev/typing-app/frontend/src/app/page.tsx)
- [questions/page.tsx](/Users/tokimasatakuya/Dev/typing-app/frontend/src/app/questions/page.tsx)
- [session/page.tsx](/Users/tokimasatakuya/Dev/typing-app/frontend/src/app/session/page.tsx)
- [result/page.tsx](/Users/tokimasatakuya/Dev/typing-app/frontend/src/app/result/page.tsx)

これらの App Router 側ファイルは feature UI への委譲のみを担っている。
したがって、`#84` の主戦場はページルーティングではなくスタイル基盤である。

### 既存スタイル構造

- [globals.css](/Users/tokimasatakuya/Dev/typing-app/frontend/src/app/globals.css) に共通 token と共通 class が集中している
- 各 feature UI は `.btn` / `.card` / `.badge` / `.text-input` などの既存 class に依存している
- Tailwind 未導入のため utility class を利用できない

### feature UI の責務

- `home-dashboard`
- `question-browser`
- `study-session`
- `result-screen`

これらは UI 表示責務を持つが、`#84` では内部の class 構造を変えない。
影響を最小化するため、Tailwind が有効であることを示す最小 1 箇所の利用に留める。

## 設計方針

### 1. Tailwind は基盤追加に限定する

`#84` は CSS ビルドパイプラインへ Tailwind を追加する issue とする。
既存 UI を Tailwind 化することは目的に含めない。

### 2. 既存 CSS と共存させる

[globals.css](/Users/tokimasatakuya/Dev/typing-app/frontend/src/app/globals.css) の既存 token と既存 class は維持する。
導入初期段階では「手書き CSS の上に Tailwind を使えるようにする」状態を目指す。

### 3. 後続 issue の責務を先食いしない

- `#89`: `shadcn/ui` 基盤導入
- `#90`: 既存画面の段階移行

この 2 件に含まれる責務を `#84` に持ち込まない。
特に `components.json`、`src/components/ui`、`cn()` 導入は `#89` の責務とする。

## 実装設計

### 依存追加

[package.json](/Users/tokimasatakuya/Dev/typing-app/frontend/package.json) に以下を追加する。

- `tailwindcss`
- `@tailwindcss/postcss`
- `postcss`

責務は「Next.js の CSS ビルドで Tailwind を解決できる状態」に限定する。

### PostCSS 設定

`frontend/postcss.config.mjs` を追加し、`@tailwindcss/postcss` を有効化する。
このファイルは Tailwind を Next.js の CSS pipeline に接続する単一責務ファイルとする。

### globals.css への組み込み

[globals.css](/Users/tokimasatakuya/Dev/typing-app/frontend/src/app/globals.css) の先頭へ `@import "tailwindcss";` を追加する。
既存の CSS ルールは削除しない。
この issue では preflight の影響を見極めるためにも、既存ルールの再編は行わない。

### 最小動作確認用の utility class

Tailwind が本当に有効かを確認するため、既存 UI の単一要素にだけ utility class を追加する。
候補は次のどちらかに限定する。

1. [layout.tsx](/Users/tokimasatakuya/Dev/typing-app/frontend/src/app/layout.tsx) の `body`
2. 既存 view の装飾影響が小さいテキスト要素

この変更は「Tailwind がビルドされる」ことの確認用であり、見た目の改善を目的に広げない。

## 責務分割

### package.json

- Tailwind 関連依存の定義だけを持つ

### postcss.config.mjs

- Tailwind を CSS pipeline へ接続する

### globals.css

- Tailwind import の入口
- 既存 token と既存 global class の維持

### app / feature UI

- Tailwind 有効化の最小確認だけを担う
- 既存 UI 構造の刷新は担わない

## テスト方針

### 変更前確認

リファクタリングではないが、既存成功状態を確認してから入る。

- `npm run test`

### 変更後確認

以下を最小検証セットとする。

- `npm run test`
- `npm run lint`
- `npm run build`

### 検証観点

- Tailwind utility class がビルド時に解決される
- 既存画面が大きく崩れない
- TypeScript / ESLint / Next.js build に新規設定起因の失敗が出ない

### 新規テスト追加方針

新規 unit test は原則追加しない。
理由は、この issue の成否がロジック変更ではなく build pipeline の成立にあるためである。

## リスクと対策

### Tailwind preflight が既存 UI に干渉する

対策:

- `#84` では class 置換に踏み込まない
- `npm run build` と既存画面確認で大崩れの有無を見る

### 責務の越境

対策:

- `shadcn/ui` 初期化や primitive 追加は行わない
- `globals.css` の整理は `#90` に残す

### 変更が広がりすぎる

対策:

- utility class の利用は 1 箇所だけ
- feature UI の構造変更はしない

## サブ issue 要否

現時点ではサブ issue は追加しない。
理由は、`#84` 自体がすでに「基盤導入」という最小有効スライスであり、後続の分割先も [#89](https://github.com/tokitaku/typing-app/issues/89) と [#90](https://github.com/tokitaku/typing-app/issues/90) として存在しているためである。

## 実装順

1. `frontend` の既存テスト成功を確認する
2. Tailwind v4 と PostCSS 依存を追加する
3. `postcss.config.mjs` を追加する
4. [globals.css](/Users/tokimasatakuya/Dev/typing-app/frontend/src/app/globals.css) に Tailwind import を追加する
5. utility class を 1 箇所だけ適用して動作確認用の足場を作る
6. `npm run test` を再実行する
7. `npm run lint` を実行する
8. `npm run build` を実行する

## 完了条件

- Tailwind utility class が `frontend` で解決される
- 既存画面が大きく崩れていない
- `npm run test` が成功する
- `npm run lint` が成功する
- `npm run build` が成功する
- `#89` と `#90` がこの基盤の上で着手可能な状態になっている
