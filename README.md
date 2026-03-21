# Type & Learn

英単語と英語短文をタイピングしながら学ぶ MVP です。  
`FastAPI` で管理する英単語データと組み込みの短文データからクイズを生成し、SQLite に保存した学習結果と `localStorage` の復習キューを組み合わせて再出題します。

## 技術構成

- フロントエンド: `Next.js 14`
- バックエンド: `FastAPI`
- DBアクセス: `SQLModel`
- 永続化DB: `SQLite`
- マイグレーション: `Alembic`
- 開発環境: `docker compose`

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

- `FastAPI` は `GET /words` で登録済み英単語一覧を返します
- `FastAPI` は `POST /words` `PATCH /words/{word_id}` `DELETE /words/{word_id}` で英単語を管理します
- `FastAPI` は `GET /quizzes` でクイズ一覧を返します
- `FastAPI` は `POST /study-results` で学習結果を保存します
- `FastAPI` は `GET /study-results/latest` と `GET /study-results/summary/today` で結果表示と日次集計を返します
- 初期データは英単語 30 件、短文 12 件です
- フロントは取得した一覧からランダムで10問出題します

## 開発サーバー起動

```bash
make dev
```

ブラウザで `http://localhost:3000` を開いてください。  
`FastAPI` は `http://localhost:8000` で起動します。  
SQLite のデータは `docker compose` の named volume `sqlite_data` に保存されるため、`docker compose down` では消えません。  
DB スキーマ変更は backend 起動時に `Alembic` の `head` まで自動適用されます。  

停止する場合は別ターミナルで以下を実行してください。

```bash
make down
```

DBデータも削除したい場合は以下を実行してください。

```bash
docker compose down -v
```

## 永続化の考え方

- サーバー側の永続データ
  - 英単語データ: 起動時に SQLite へシード
  - 短文データ: アプリ内の組み込みデータとして配信
  - 学習結果: `POST /study-results` で SQLite に保存
- ブラウザ側のローカルデータ
  - 復習キュー
  - ミス履歴
  - 最新結果キャッシュ
  - レベル設定
- 役割分担
  - SQLite: セッションをまたいで保持したいサーバー側データ
  - `localStorage`: UI都合の即時参照やブラウザ依存の状態

## 環境変数

- `NEXT_PUBLIC_API_BASE_URL`
  - フロントエンドが参照するAPIベースURL
  - `docker compose` では `http://localhost:8000`
- `DATABASE_URL`
  - バックエンドが参照するDB接続文字列
  - `docker compose` では `sqlite:////data/app.db`
  - ホスト実行時のデフォルトは `sqlite:///./backend/app.db`

## テストと確認

ホスト環境でテストや lint を実行する場合は、先に依存関係をセットアップします。

```bash
make setup
```

その後に以下を実行してください。

```bash
make test
make openapi
make lint
make build
```

手動で migration を適用する場合は以下を実行してください。

```bash
make migrate-backend
```

新しい migration を自動生成する場合は以下を実行してください。

```bash
make revision-backend message="add new table"
```

OpenAPI spec をファイル出力したい場合は、以下でも生成できます。

```bash
make openapi
```

生成先は `backend/openapi.json` です。実行中のサーバーがある場合は、`http://localhost:8000/openapi.json` でも同じ schema を取得できます。

## ディレクトリ構成

```text
.
├── frontend/  # Next.js フロントエンド一式
│   ├── src/
│   │   ├── app/            # App Router のページと layout
│   │   ├── features/       # 画面単位の UI / hooks / application / api / storage / model
│   │   ├── shared/         # 明確に再利用される types / API client / DTO / browser helper
│   │   └── __tests__/      # フロントの feature / shared テスト
│   ├── public/
│   ├── next.config.mjs
│   ├── tsconfig.json
│   └── vitest.config.ts
└── backend/   # FastAPI バックエンド
    ├── application/      # ユースケースと DTO
    ├── domain/           # ドメインエンティティと repository 境界
    ├── infrastructure/   # SQLModel 実装と DB bootstrap
    ├── presentation/     # FastAPI ルートと schema
    └── tests/            # API / usecase テスト
```

## 実装方針

- リポジトリが空だったため、MVP は Next.js と FastAPI の最小構成で作成
- 英単語データは起動時に SQLite へシードし、`SQLModel` 経由で CRUD と問題配信を行う
- 短文クイズは後方互換のためアプリ内データとして配信する
- バックエンドは `domain -> application -> infrastructure -> presentation` の依存方向で責務分離する
- フロントエンドは `app` をルーティング入口に限定し、実装本体を `features` 配下へ集約する
- `home-dashboard`、`result-screen`、`study-session` は `frontend/src/features` 配下で UI / hooks / application / api / storage を閉じ込める
- タイピング中の入力判定は `frontend/src/features/study-session/typing`、出題セット生成と結果集計は `frontend/src/features/study-session/model` に寄せ、フロント固有ロジックとして扱う
- 共通型は `frontend/src/shared/types`、共有 API DTO は `frontend/src/shared/api`、画面専用 DTO は各 feature の `application` に置く
- 共通型は [`frontend/src/shared/types/study.ts`](./frontend/src/shared/types/study.ts)、共有 API DTO は [`frontend/src/shared/api/studyApiTypes.ts`](./frontend/src/shared/api/studyApiTypes.ts) に分離する
- `localStorage` には `mistake_log`、最新結果、復習用キュー、設定値を保存
- SQLite は `DATABASE_URL` で切り替え可能で、`docker compose` では named volume 上の `sqlite:////data/app.db` を使用

## DBスキーマ概要

- `words`
  - `id`
  - `english`
  - `japanese`
  - `level`
  - `is_active`
- `study_results`
  - `id`
  - `mode`
  - `total_questions`
  - `correct_rate`
  - `mistakes`
  - `average_time`
  - `created_at`

## ローカル保存データ

- `typing-app::mistake_log`
  - `question_id`
  - `mistake_count`
  - `created_at`
- `typing-app::study_result`
  - API 保存失敗時のフォールバック用セッション履歴
- `typing-app::latest-result`
  - 結果画面の即時表示用キャッシュ
