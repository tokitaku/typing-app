# Type & Learn

英単語と英語短文をタイピングしながら学ぶ MVP です。  
`FastAPI` から問題データを取得し、ミスした問題を `localStorage` に保存して復習モードで再出題します。

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
- 初期データは `word` 30件、`sentence` 12件です
- フロントは取得した一覧からランダムで10問出題します

## セットアップ

```bash
npm install
export NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
uv venv .venv
source .venv/bin/activate
uv pip install -r backend/requirements.txt
uv run uvicorn main:app --reload --app-dir backend
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。  
`FastAPI` は `http://localhost:8000` で起動します。

## テストと確認

```bash
npm test
uv run pytest backend/tests
npm run build
```

## 実装方針

- リポジトリが空だったため、MVP は Next.js と FastAPI の最小構成で作成
- 問題データは `backend/main.py` の固定配列から API 配信
- 出題ロジックは [`src/lib/study.ts`](./src/lib/study.ts)、保存処理は [`src/lib/storage.ts`](./src/lib/storage.ts) に分離
- `localStorage` には `mistake_log`、`study_result`、復習用キューを保存
- PostgreSQL は今回の MVP スコープでは未導入

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
