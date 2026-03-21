# AGENTS.md

## 基本方針

- すべての出力は日本語で行い、返答は「結論 → 理由 → 次ステップ」の順で構成する。
- 変更は最小単位にとどめ、依頼範囲外の修正や既存のユーザー変更の巻き戻しは行わない。
- コード例を提示する場合は、インラインコメントを入れる。

## 実装フロー

- 実装前に、目的、変更範囲、責務分割、テスト方針を含む設計を必ず整理する。
- 新規実装やバグ修正は、原則として失敗するテストを先に書き、`Red → Green → Refactor` の順で進める。
- リファクタリング前は関連テストが成功していることを確認し、変更後は影響範囲に応じてテスト・lint・build を実行する。
- 並列化できる作業は分担してよいが、担当ファイルを明確に分け、最終担当が矛盾を解消してから反映する。

## 設計方針

- 設計は DDD とクリーンアーキテクチャを基本方針とし、UI やフレームワーク都合ではなく業務ルールを中心に責務を分ける。
- 依存方向は `domain -> application <- infrastructure/presentation` ではなく、実装上は `presentation -> application -> domain` とし、`infrastructure` は `domain` または `application` の境界を実装する外側の層として扱う。
- `domain` にはエンティティ、値オブジェクト、ドメインサービス、repository interface だけを置き、`FastAPI`、`Next.js`、`SQLModel`、`localStorage` などの技術詳細を持ち込まない。
- `application` にはユースケース、コマンド、クエリ、DTO を置き、1 ユースケース 1 責務を原則とする。
- `presentation` にはルーター、ページ、コンポーネント、schema、view model だけを置き、業務判断や永続化判断を直接書かない。
- `infrastructure` には DB 実装、API クライアント、ストレージ実装、外部サービス連携を置き、`domain` / `application` で定義した境界を実装する。
- 既存規模では過剰設計を避け、Aggregate、Domain Event、Factory などは必要性が明確な場合のみ導入する。
- 既存コードを移行する際は、まずユースケース単位で境界を切り出し、公開 API や画面挙動を維持したまま内部構造だけを段階的に置き換える。
- フロントエンドは `feature-first` を基本とし、`app` は Next.js のルーティング入口、実装本体は `features/*` に集約する。
- フロントエンドの各 feature には必要に応じて `ui`、`hooks`、`application`、`api`、`storage`、`model`、`typing` を置き、画面単位で責務を閉じ込める。
- フロントエンドの `shared` には複数 feature で再利用が明確なものだけを置き、共通型は `shared/types`、共有 API DTO は `shared/api` に置く。
- フロントエンドでは `components` や `ui` から直接 API / storage / 業務ロジックを抱え込ませず、必要に応じて feature 内の `application`、`hooks`、`model` に分離する。
- 命名は業務用語を優先し、`manager` や `util` のような曖昧な名前へ逃がさず、`QuestionRepository`、`RecordStudyResultUseCase` のように役割が分かる名前にする。
- オブジェクト指向を基本とし、データと振る舞いを不必要に分離せず、責務ごとに関心を閉じ込め、カプセル化と明確な公開 `interface` を通じて変更容易性を保つ。継承よりも合成を優先し、状態を書き換える手続きの集積ではなく、役割を持つオブジェクト同士の協調で業務を表現する。

## ブランチ運用

- 作業ブランチは `main` から作成し、1つの目的に対して1ブランチを原則とする。
- ブランチ名は `codex/<種別>/<短い要約>` を基本とし、直接 `main` にコミットしない。
- `main` は最新取り込み用の保護ブランチとして扱い、実装・修正・コミット作業は必ず作業ブランチ上で行う。
- 作業開始時は `git branch --show-current` で現在ブランチを確認し、`main` だった場合は作業前に `git switch -c codex/<種別>/<短い要約>` で新規ブランチを切る。
- 誤って `main` 上で変更を始めた場合も、変更を保持したまま `git switch -c codex/<種別>/<短い要約>` で退避し、そのブランチでコミットを続ける。
- コミット直前にも `git branch --show-current` を再確認し、`main` が表示された場合はそのままコミットしない。
- ブランチ作成からコミット、PR 作成まで求められた場合は `git-branch-pr` skill を使用し、ローカル修正だけで終えない。
- マージ前に、設計更新、関連テスト成功、不要差分がないことを確認する。
