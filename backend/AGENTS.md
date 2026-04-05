# backend/AGENTS.md

## 基本方針

- ルートの `AGENTS.md` を前提に、ここではバックエンド固有の判断だけを補足する。
- FastAPI や SQLModel の都合より、ユースケースとドメインルールを優先する。

## 設計方針

- `presentation` は HTTP 入出力、schema、レスポンス整形に限定し、業務判断は `application` へ委譲する。
- `application` はユースケース単位で責務を閉じ、トランザクション境界や repository 呼び出しの調停を担う。
- `domain` にはエンティティ、値オブジェクト、ドメインサービス、repository interface だけを置き、FastAPI、SQLModel、DB モデルを持ち込まない。
- `infrastructure` は永続化や外部連携の実装に限定し、`domain` / `application` で定義した境界を実装する。

## ディレクトリ補足

- `commands/` は CLI スクリプト（例: `export_openapi.py`）を置く場所で、DDD の層には属さない。アプリ起動や開発ツールとして使う運用コードはここに置く。

## テストと確認

- バックエンド変更時は少なくとも `pytest` を実行し、API 契約や OpenAPI に影響する変更では関連テストを追加で確認する。

## `backend.main` の import 副作用

`backend/main.py` はモジュールトップレベルで `get_database_url()` を呼び出し、`SqlModelQuestionRepository` / `SqlModelStudyResultRepository` を生成します。
`DATABASE_URL` 未設定時は `DEFAULT_DATABASE_URL`（ローカル PostgreSQL のデフォルト値）にフォールバックするため即時エラーにはなりませんが、`backend.main` を import するだけでこれらの評価が走ります。

- テストや CI で `backend.main` を直接 import する場合はこの副作用に注意してください。
- `presentation/openapi.py` のような補助スクリプトでは `from backend.main import app` を lazy import（関数内 import）にして副作用を呼び出し時点に限定してください。
