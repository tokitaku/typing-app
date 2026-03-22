# backend テスト近接配置方針

## 結論

- このリポジトリのバックエンドテスト配置は、実装近接配置を採用する。
- テストは `backend/<layer>/tests` または `backend/infrastructure/<adapter>/tests` に置く。
- test-only 補助コードは、共有範囲が最も狭くなる場所に置き、全体で共有する fixture は `backend/conftest.py` に置く。

## 採用理由

### 1. 変更単位と探索単位を合わせたい

`application` の use case、`presentation` の API 入出力、`infrastructure` の永続化実装は、日常的な変更単位がそれぞれ異なる。  
テストを実装近くへ置くことで、対象コードを読んだ直後に同じ責務の検証へ移動でき、変更時の往復が減る。

### 2. DDD / クリーンアーキテクチャの責務分割と矛盾しない

このリポジトリは `domain` / `application` / `presentation` / `infrastructure` を責務で分けている。  
テストも同じ責務境界に沿って近接配置する方が、どの層の振る舞いを検証しているかをディレクトリ構造から直感的に読める。

### 3. 今後の `infrastructure` 拡張に備えやすい

永続化や外部連携の実装が増えると、旧集約配置の `backend/tests/infrastructure` は対象実装との対応づけが弱くなりやすい。  
`backend/infrastructure/sqlmodel/tests` のようにアダプタ近接で置けば、実装差し替えや adapter 追加に追従しやすい。

## 見送る案と理由

### 見送る案: `backend/tests` 集約を維持する

集約配置には「テストだけを一覧しやすい」という利点はある。  
ただし、このリポジトリでは責務ごとの層分割をすでに本体コードへ反映しているため、テストだけ別軸で集約すると、保守時には実装ディレクトリとテストディレクトリを毎回往復することになる。

特に `application` や `presentation` のような日常的に触る層では、モジュール近傍での把握のしやすさを優先した方が、将来の追加・修正のコストを下げやすい。  
そのため `#52` で整理した集約構成は過渡的な整理として扱い、今後は近接配置へ移行する。

## 配置ルール

### 層ごとの基本配置

- `backend/domain/tests`
  - entity / value object / domain service の振る舞い
- `backend/application/tests`
  - use case 単位の振る舞い
- `backend/presentation/tests`
  - FastAPI app factory、lifespan wiring、resource 単位の API 契約
- `backend/infrastructure/<adapter>/tests`
  - migration、bootstrap、repository 実装、永続化固有の振る舞い

### 補助コードと fixture

- `backend/conftest.py`
  - import path 調整のような pytest 全体設定
- `backend/presentation/tests/conftest.py`
  - API テストで共有する `TestClient` fixture
- `backend/application/tests/fakes.py`
  - application 層の use case テスト専用 fake repository

補助コードや fixture は「本当に複数層で共有するか」を先に判断し、そうでなければ利用元の `tests` 配下へ閉じ込める。

層固有の fixture が必要な場合だけ、各 `tests/conftest.py` をその層の近くに追加する。

## 命名規約

- ファイル名は `test_<subject>.py` を基本とする。
- 対象責務が明確になる場合は、既存命名を維持して `test_question_usecases.py`、`test_questions_api.py`、`test_bootstrap.py` のように表現する。
- 「どの層の、何の振る舞いを検証するか」がファイル名から分かることを優先する。

## pytest discovery / import / 実行コマンド

### discovery

新規テストを `backend` 配下へ分散しても、pytest の探索起点を `backend` にすれば一括実行できる。  
そのため、標準コマンドは以下に統一する。

- リポジトリ root: `uv run --project backend pytest backend`
- `backend` ディレクトリ内: `uv run pytest`

### import

全層で必要な pytest 設定は `backend/conftest.py` へ置く。  
一方で `client` のような層固有 fixture は、その層の `tests/conftest.py` に限定する。

### 実行単位

局所実行するときは、責務単位でディレクトリを直接指定する。

- `uv run --project backend pytest backend/application/tests`
- `uv run --project backend pytest backend/presentation/tests`
- `uv run --project backend pytest backend/infrastructure/sqlmodel/tests`

## 既存 issue との関係

- `#52` は「集約配置のまま責務別に棚卸しする」ための整理として有効だった。
- `#55` はその次の判断として、標準を実装近接配置へ切り替え、`integration` ディレクトリ自体を廃止する。
- app 起動時の wiring 確認は `backend/presentation/tests`、migration と bootstrap の確認は `backend/infrastructure/sqlmodel/tests` へ移す。
- `backend/tests` は廃止し、補助コードも利用する層の `tests` 配下へ寄せる。
