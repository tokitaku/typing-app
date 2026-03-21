# backend/AGENTS.md

## 基本方針

- ルートの `AGENTS.md` を前提に、ここではバックエンド固有の判断だけを補足する。
- FastAPI や SQLModel の都合より、ユースケースとドメインルールを優先する。

## 設計方針

- `presentation` は HTTP 入出力、schema、レスポンス整形に限定し、業務判断は `application` へ委譲する。
- `application` はユースケース単位で責務を閉じ、トランザクション境界や repository 呼び出しの調停を担う。
- `domain` にはエンティティ、値オブジェクト、ドメインサービス、repository interface だけを置き、FastAPI、SQLModel、DB モデルを持ち込まない。
- `infrastructure` は永続化や外部連携の実装に限定し、`domain` / `application` で定義した境界を実装する。

## テストと確認

- バックエンド変更時は少なくとも `pytest` を実行し、API 契約や OpenAPI に影響する変更では関連テストを追加で確認する。
