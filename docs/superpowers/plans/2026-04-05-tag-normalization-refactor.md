# Tag Normalization Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `presentation/schemas.py` から `normalize_tags()` の呼び出しを除去し、タグ正規化の業務ルールを application/domain 層に集約する。

**Architecture:** presentation は Pydantic の型チェック（`list[str]`）のみを担い、タグの正規化・重複排除・空白チェックはすべて `domain/value_objects.py` の `TagCollection` が行う。空白タグの 422 応答は、ルーターの既存 `except ValueError` ハンドラーが `TagCollection` の送出する `ValueError` を捕捉することで維持される。

**Tech Stack:** Python 3.10, FastAPI, Pydantic v2, pytest

---

### Task 1: presentation/schemas.py からタグバリデーターを除去する

**Files:**
- Modify: `backend/presentation/schemas.py`

- [ ] **Step 1: ベースラインのテストを実行して全パスを確認する**

```bash
backend/.venv/bin/pytest backend -q --ignore=backend/.venv
```

Expected: 全テストが PASSED であること（失敗があれば後続作業前に確認する）

- [ ] **Step 2: `normalize_tags` インポートとバリデーターを除去した後の完成形を確認する**

除去対象は以下の 3 箇所:

1. `from backend.domain.tag_rules import normalize_tags` 行（ファイル先頭）
2. `QuestionBase` の `validate_tags` メソッド全体（行 24–27）
3. `QuestionUpdate` の `validate_optional_tags` メソッド全体（行 53–59）

- [ ] **Step 3: `backend/presentation/schemas.py` を下記の内容に書き換える**

```python
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class QuestionBase(BaseModel):
    english: str = Field(min_length=1)
    japanese: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list)

    @field_validator("english", "japanese")
    @classmethod
    def validate_non_empty_text(cls, value: str) -> str:
        normalized_value = value.strip()

        if normalized_value == "":
            raise ValueError("must not be blank")  # 空文字は拒否する

        return normalized_value


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    english: str | None = Field(default=None, min_length=1)
    japanese: str | None = Field(default=None, min_length=1)
    is_active: bool | None = None
    tags: list[str] | None = None

    @field_validator("english", "japanese")
    @classmethod
    def validate_optional_non_empty_text(cls, value: str | None) -> str | None:
        if value is None:
            return None  # 未指定は許可する

        normalized_value = value.strip()

        if normalized_value == "":
            raise ValueError("must not be blank")  # 空白のみは拒否する

        return normalized_value


class QuestionResponse(BaseModel):
    id: int
    english: str
    japanese: str
    isActive: bool
    tags: list[str]


class QuestionListResponse(BaseModel):
    questions: list[QuestionResponse]


class TagListResponse(BaseModel):
    tags: list[str]


class StudyResultRequest(BaseModel):
    mode: Literal["learn", "review"]
    total_questions: int = Field(ge=1)
    correct_rate: int = Field(ge=0, le=100)
    mistakes: int = Field(ge=0)
    average_time: int = Field(ge=0)
    created_at: datetime

    @field_validator("created_at")
    @classmethod
    def validate_created_at(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            return value.replace(tzinfo=timezone.utc)  # タイムゾーン未指定は UTC として扱う

        return value.astimezone(timezone.utc)  # 内部では UTC に正規化して扱う


class DailyStudySummaryResponse(BaseModel):
    date: str
    sessions: int
    solvedProblems: int
```

- [ ] **Step 4: 全テストを実行して全パスを確認する**

```bash
backend/.venv/bin/pytest backend -q --ignore=backend/.venv
```

Expected: 全テストが PASSED。特に以下が通ること:
- `presentation/tests/test_questions_api.py::test_post_question_rejects_whitespace_only_tags` — 空白タグが 422 で弾かれること
- `presentation/tests/test_questions_api.py::test_post_question_creates_new_question` — `[" Speaking ", "speaking"]` → `["speaking"]` に正規化されること
- `application/tests/test_question_usecases.py::test_create_question_use_case_normalizes_tags` — ユースケース層でタグが正規化されること

- [ ] **Step 5: コミットする**

```bash
git add backend/presentation/schemas.py
git commit -m "refactor: remove normalize_tags from presentation schemas (#87)"
```
