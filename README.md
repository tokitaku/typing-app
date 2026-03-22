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
│   ├── domain/
│   ├── infrastructure/
│   ├── presentation/
│   └── tests/
├── compose.yml
├── Makefile
└── README.md
```
