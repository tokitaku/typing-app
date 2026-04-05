# Design: presentation からタグ正規化の業務ルールを外して application/domain に集約する

**Issue:** tokitaku/typing-app#87  
**Date:** 2026-04-05  
**Status:** Approved

---

## 概要

`backend/presentation/schemas.py` が `normalize_tags()` を直接呼び出しており、HTTP 入力境界で業務ルールの正規化まで実行している。presentation は HTTP 構文レベルの検証に留め、タグ正規化の業務ルールは application/domain 側へ集約する。

---

## アプローチ

**Approach A: バリデーターを完全除去**

`QuestionBase.validate_tags` と `QuestionUpdate.validate_optional_tags` を削除し、`normalize_tags` インポートを除去する。追加のエラーハンドリングコードは不要（ルーターの既存 `except ValueError` が補完する）。

---

## 変更ファイル

### `backend/presentation/schemas.py`

- `from backend.domain.tag_rules import normalize_tags` を削除
- `QuestionBase.validate_tags` バリデーターメソッドを削除
- `QuestionUpdate.validate_optional_tags` バリデーターメソッドを削除

presentation のタグ責務は「JSON が `list[str]` 形式であること」のみ（Pydantic の型チェックで十分）。

---

## データフロー

### 正常系

```
POST /questions {"tags": [" Speaking ", "speaking"]}
  → QuestionCreate (Pydantic: list[str] チェックのみ)
  → CreateQuestionCommand(tags=[" Speaking ", "speaking"])
  → create_question usecase
  → TagCollection([" Speaking ", "speaking"])  ← normalize_tags を呼ぶ
  → ("speaking",) に正規化・重複排除
  → DB 保存 → 201
```

### 異常系（空白タグ → 422）

```
POST /questions {"tags": ["   "]}
  → QuestionCreate (Pydantic: list[str] ✓)
  → CreateQuestionCommand(tags=["   "])
  → create_question usecase
  → TagCollection(["   "])
  → normalize_tag("   ") → ValueError("Tag must not be blank")
  → api.py: except ValueError → _handle_invalid_master_code(error)
  → HTTPException(422)
```

---

## テスト責務

テストコードの修正は不要。各テストは既に責務に沿った階層に配置されている。

| テストファイル | 責務 |
|---|---|
| `presentation/tests/test_questions_api.py` | HTTP 契約（ステータスコード・レスポンス形式） |
| `application/tests/test_question_usecases.py` | タグ正規化・重複排除がユースケース層で行われること |
| `domain/tests/test_tag_rules.py` | `normalize_tag` / `normalize_tags` のドメインルール |

---

## 受け入れ条件

- `backend/presentation/schemas.py` が `normalize_tags()` を直接呼び出していない
- タグ正規化の業務ルールが application/domain 側に集約されている
- presentation テストと application テストの責務が分かれている
- 既存 API 契約を壊さず `backend/.venv/bin/pytest backend -q` が成功する
