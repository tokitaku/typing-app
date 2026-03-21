# Type & Learn

英単語と英語短文をタイピングしながら学ぶ MVP です。  
`FastAPI` から問題データを取得し、SQLite に保存した学習結果と `localStorage` の復習キューを組み合わせて再出題します。

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

## 問題データ API

- `FastAPI` は `GET /problems` で問題一覧を返します
- `FastAPI` は `POST /study-results` で学習結果を保存します
- `FastAPI` は `GET /study-results/latest` と `GET /study-results/summary/today` で結果表示と日次集計を返します
- 初期データは `word` 30件、`sentence` 12件です
- フロントは取得した一覧からランダムで10問出題します

## 開発サーバー起動

```bash
docker compose up --build
```

ブラウザで `http://localhost:3000` を開いてください。  
`FastAPI` は `http://localhost:8000` で起動します。  

停止する場合は別ターミナルで以下を実行してください。

```bash
docker compose down
```

## テストと確認

ホスト環境でテストや lint を実行する場合は、先に依存関係をセットアップします。

```bash
npm run setup
```

その後に以下を実行してください。

```bash
npm test
uv run --python .venv/bin/python pytest backend/tests
npm run lint
npm run build
```

## ディレクトリ構成

```text
.
├── frontend/  # Next.js フロントエンド一式
│   ├── app/   # App Router のページ
│   ├── src/   # components, lib, types, tests
│   ├── public/
│   ├── next.config.mjs
│   ├── tsconfig.json
│   └── vitest.config.ts
└── backend/   # FastAPI バックエンド
```

## 実装方針

- リポジトリが空だったため、MVP は Next.js と FastAPI の最小構成で作成
- 問題データは起動時に SQLite へシードし、API は DB 経由で配信
- 出題ロジックは [`frontend/src/lib/study.ts`](./frontend/src/lib/study.ts)、API 呼び出しは [`frontend/src/lib/api.ts`](./frontend/src/lib/api.ts)、ローカル保存は [`frontend/src/lib/storage.ts`](./frontend/src/lib/storage.ts) に分離
- `localStorage` には `mistake_log`、最新結果、復習用キュー、設定値を保存
- SQLite は `DATABASE_URL` で切り替え可能で、デフォルトは `sqlite:///./backend/app.db`

## ローカル保存データ

- `typing-app::mistake_log`
  - `question_id`
  - `mistake_count`
  - `created_at`
- `typing-app::study_result`
  - API 保存失敗時のフォールバック用セッション履歴
- `typing-app::latest-result`
  - 結果画面の即時表示用キャッシュ
