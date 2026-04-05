# created_at UTC 正規化の集約設計

**Issue:** #86  
**Date:** 2026-04-05

## 背景

`StudyResult.created_at` の UTC 正規化ロジックが以下の3箇所に重複している。

- `backend/presentation/schemas.py` — Pydantic `field_validator`
- `backend/application/usecases.py` — モジュール関数 `_normalize_created_at`
- `backend/infrastructure/sqlmodel/repositories.py` — インスタンスメソッド `_normalize_created_at`

ルール変更時に複数層を同時修正する必要があり、SRP を満たしていない。

## 調査結果

- DB は PostgreSQL、`created_at` カラムは `sa.DateTime(timezone=True)` (TIMESTAMP WITH TIME ZONE)
- PostgreSQL + TSTZ は内部で UTC 格納し、読み出し時も UTC-aware な datetime を返す
- したがって **DB 読み出しパスでの正規化は不要**（既に保証されている）
- 正規化が必要なのは API 入力受け取り時のみ

## 設計方針

`created_at` の生成責務をサーバー側（usecase）に移し、クライアントからの入力を受け付けない。

これにより：
- 「naive/aware を UTC に正規化する」というロジック自体が不要になる
- クライアントが任意の過去・未来日時を送れるというデータ整合性リスクがなくなる
- 3箇所の重複コードをすべて削除できる

## 変更内容

### 削除するもの

| ファイル | 削除対象 |
|---|---|
| `presentation/schemas.py` | `StudyResultCreate.created_at` フィールドと `validate_created_at` バリデーター |
| `application/dtos.py` | `RecordStudyResultCommand.created_at` フィールド |
| `application/usecases.py` | `_normalize_created_at` 関数と呼び出し箇所 |
| `infrastructure/sqlmodel/repositories.py` | `_normalize_created_at` メソッドと呼び出し箇所2箇所 |
| `domain/entities.py` | `StudyResult.created_at` のコメント `# UTC 正規化は #86 で対応` |

### 追加・変更するもの

**`application/usecases.py` — `record_study_result`:**

```python
def record_study_result(
    repository: StudyResultRepository,
    command: RecordStudyResultCommand,
) -> StudyResultDto:
    saved_result = repository.save(
        StudyResult(
            mode=StudyMode(command.mode),
            total_questions=TotalQuestions(command.total_questions),
            correct_rate=CorrectRate(command.correct_rate),
            mistakes=MistakeCount(command.mistakes),
            average_time=AverageTime(command.average_time),
            created_at=datetime.now(timezone.utc),  # サーバー側で生成
        )
    )
    return _to_study_result_dto(saved_result)
```

## データフロー（変更後）

**Write path:**
```
POST /study_results
  └─ StudyResultCreate (created_at なし)
       └─ RecordStudyResultCommand (created_at なし)
            └─ record_study_result()
                 └─ datetime.now(timezone.utc)  ← usecase で生成
                      └─ StudyResult(created_at=utc_now)
                           └─ repository.save()
```

**Read path:**
```
DB (TIMESTAMP WITH TIME ZONE → UTC-aware datetime)
  └─ StudyResultRecord.created_at
       └─ _to_study_result()  ← 正規化なし、そのまま渡す
            └─ StudyResult.created_at
                 └─ StudyResultDto.created_at
```

## テスト戦略

**削除・修正が必要なテスト:**

| ファイル | 変更内容 |
|---|---|
| `presentation/tests/test_study_results_api.py` | リクエストボディから `created_at` を削除。UTC変換の期待値検証も削除 |
| `application/tests/test_study_result_usecases.py` | `RecordStudyResultCommand` から `created_at` 引数を削除。UTC変換のアサーションを削除 |

**影響なし:**

- `presentation/tests/test_openapi.py` — レスポンス側の `created_at` を検証しているため変更不要

**追加するテスト:**

- `application/tests/test_study_result_usecases.py` に、`record_study_result` がサーバー側で UTC datetime を生成することを確認するテストを追加（`unittest.mock.patch("backend.application.usecases.datetime")` で `datetime.now` を固定値に差し替え）

## 受け入れ条件

- `StudyResult.created_at` はサーバー側で `datetime.now(timezone.utc)` により生成される
- クライアントから `created_at` を受け付けない（API スキーマから削除）
- UTC 正規化ロジック（`_normalize_created_at`）が3箇所すべてから削除されている
- `backend/.venv/bin/pytest backend -q` が成功する
