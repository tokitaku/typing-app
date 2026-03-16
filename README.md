# Type & Learn

英単語と英語短文をタイピングしながら学ぶ MVP です。  
固定問題を使って学習し、ミスした問題を `localStorage` に保存して復習モードで再出題します。

## 機能

- ホーム画面
  - 学習開始
  - 復習する
  - 今日の学習サマリ
- 問題画面
  - 単語 / 短文の出題
  - リアルタイム正誤ハイライト
  - 問題番号 / タイマー表示
- 結果画面
  - 出題数
  - 正答率
  - ミス数
  - 平均入力時間
- 復習モード
  - ミスした問題のみ再出題
  - 対象がない場合は空状態を表示

## ダミーデータ

- 問題データは [src/data/problems.ts](./src/data/problems.ts) にあります
- 初期データは `word` 30件、`sentence` 12件です
- 通常モードはこの固定データからランダムで10問出題します

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

## テストと確認

```bash
npm test
npm run lint
npm run build
```

## 実装方針

- リポジトリが空だったため、MVP は Next.js 単体で最小構成を作成
- 問題データは [`src/data/problems.ts`](./src/data/problems.ts) の固定配列で管理
- 出題ロジックは [`src/lib/study.ts`](./src/lib/study.ts)、保存処理は [`src/lib/storage.ts`](./src/lib/storage.ts) に分離
- `localStorage` には `mistake_log`、`study_result`、復習用キューを保存
- FastAPI / PostgreSQL は今回の MVP スコープでは未導入

## ローカル保存データ

- `typing-app::mistake_log`
  - `question_id`
  - `mistake_count`
  - `created_at`
- `typing-app::study_result`
  - `total_questions`
  - `correct_rate`
  - `mistakes`
  - `average_time`
  - `created_at`
# typing-app
