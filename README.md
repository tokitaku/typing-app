# Type & Learn

英語を入力しながら、英単語と英文章を反復練習するタイピング学習アプリです。  
フロントエンドは `Next.js 14`、バックエンドは `FastAPI` で構成され、学習結果は `SQLite` に保存されます。

## できること

- ホーム画面 `/`
  - 通常学習 / 復習の開始
  - 今日の学習回数、出題数、復習待ち件数の表示
  - 出題英検級と出題タイプの設定
- 学習画面 `/session?mode=learn|review`
  - 英単語 / 英文章のタイピング
  - 入力中の正誤ハイライト
  - 最大 10 問の出題
- 結果画面 `/result`
  - 出題数、正答率、ミス数、平均入力時間の表示

## API 方針

- 出題用データ取得と問題管理の単一ソースとして `GET /questions` を利用する
- 学習画面の出題導線では `include_inactive=false` を付与し、inactive 問題を除外する
- 旧 `GET /quizzes` は廃止済みで、関連する DTO / OpenAPI schema も削除している

## 技術スタック

- フロントエンド: `Next.js 14` / `React 18` / `TypeScript`
- バックエンド: `FastAPI` / `SQLModel` / `Alembic`
- データベース: `SQLite`
- 開発環境: `docker compose`
- テスト: `Vitest` / `pytest`

## セットアップ

```bash
make setup
make dev
```

- フロントエンド: `http://localhost:3000`
- バックエンド: `http://localhost:8000`

停止:

```bash
make down
```

DB ボリュームも削除する場合:

```bash
docker compose down -v
```

### `git worktree` で並列開発する場合

`.env` は必須ではありません。単一 worktree の既定値はそのまま `3000` / `8000` を使います。

既定の worktree を起動する場合:

```bash
docker compose -p typing-app-a up --build
```

- フロントエンド: `http://localhost:3000`
- バックエンド: `http://localhost:8000`

2 本目の worktree を別ポートで起動する場合:

```bash
FRONTEND_PORT=3001 BACKEND_PORT=8001 NEXT_PUBLIC_API_BASE_URL=http://localhost:8001 BACKEND_CORS_ORIGINS=http://localhost:3001 docker compose -p typing-app-b up --build
```

- フロントエンド: `http://localhost:3001`
- バックエンド: `http://localhost:8001`

停止する場合:

```bash
docker compose -p typing-app-a down
FRONTEND_PORT=3001 BACKEND_PORT=8001 NEXT_PUBLIC_API_BASE_URL=http://localhost:8001 BACKEND_CORS_ORIGINS=http://localhost:3001 docker compose -p typing-app-b down
```

利用できる環境変数:

- `FRONTEND_PORT`: ホスト側のフロントエンド公開ポート。既定値は `3000`
- `BACKEND_PORT`: ホスト側のバックエンド公開ポート。既定値は `8000`
- `NEXT_PUBLIC_API_BASE_URL`: フロントエンドが参照する API の URL。未指定時は `http://localhost:${BACKEND_PORT}` を使う
- `BACKEND_CORS_ORIGINS`: バックエンドが許可する origin。カンマ区切りで複数指定でき、未指定時は `http://localhost:${FRONTEND_PORT}` を使う

## よく使うコマンド

```bash
make test
make lint
make build
make openapi
```

## ディレクトリ構成

```text
.
├── frontend/
│   └── src/
│       ├── app/
│       ├── features/
│       ├── shared/
│       └── __tests__/
├── backend/
│   ├── application/
│   │   └── tests/
│   ├── domain/
│   ├── infrastructure/
│   │   └── sqlmodel/
│   │       └── tests/
│   ├── presentation/
│   │   └── tests/
│   ├── alembic/
│   └── commands/
├── compose.yml
├── Makefile
└── README.md
```
