# created_at UTC 正規化の集約 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `created_at` の UTC 正規化ロジックを3箇所から削除し、usecase でサーバー側 UTC タイムスタンプを生成する一箇所に集約する。

**Architecture:** クライアントから `created_at` を受け取るのをやめ、`record_study_result` usecase が `datetime.now(timezone.utc)` で生成する。presentation・infrastructure の正規化ロジックはすべて削除する。テスト容易性のため usecase に `now_fn` パラメータを注入できる設計にする。

**Tech Stack:** Python 3.10, FastAPI, SQLModel, Pydantic v2, pytest

---

## ファイルマップ

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `backend/application/dtos.py` | Modify | `RecordStudyResultCommand` から `created_at` を削除 |
| `backend/application/usecases.py` | Modify | `_normalize_created_at` 削除、`record_study_result` に `now_fn` 追加 |
| `backend/application/tests/test_study_result_usecases.py` | Modify | `created_at` 削除、`now_fn` 注入で UTC 生成を検証 |
| `backend/domain/entities.py` | Modify | `StudyResult.created_at` のコメント削除 |
| `backend/infrastructure/sqlmodel/repositories.py` | Modify | `_normalize_created_at` メソッドと呼び出し2箇所を削除 |
| `backend/presentation/schemas.py` | Modify | `StudyResultRequest` を `StudyResultCreate`（入力）と `StudyResultResponse`（出力）に分割 |
| `backend/presentation/api.py` | Modify | 新スキーマを使うよう更新 |
| `backend/presentation/tests/test_study_results_api.py` | Modify | `created_at` をリクエストから削除、サマリーテスト簡略化 |
| `backend/presentation/tests/test_openapi.py` | Modify | `StudyResultRequest` → `StudyResultResponse` に更新 |

---

## Task 1: usecase から `created_at` を削除し `now_fn` で UTC 生成する

**Files:**
- Modify: `backend/application/dtos.py`
- Modify: `backend/application/usecases.py`
- Modify: `backend/application/tests/test_study_result_usecases.py`

- [ ] **Step 1: 既存テストを確認して失敗させる準備**

`backend/application/tests/test_study_result_usecases.py` を以下のように書き換える。`RecordStudyResultCommand` から `created_at` を除き、`now_fn` で固定タイムスタンプを渡す形に変更し、「今日と昨日の分離」を新テストで追加する。

```python
from datetime import datetime, timezone

from backend.application.dtos import DailyStudySummaryDto, RecordStudyResultCommand, StudyResultDto
from backend.application.usecases import get_latest_study_result, get_today_study_summary, record_study_result
from backend.domain.entities import StudyMode
from backend.application.tests.fakes import FakeStudyResultRepository

FIXED_UTC = datetime(2026, 3, 21, 8, 0, tzinfo=timezone.utc)


def _make_command(**overrides) -> RecordStudyResultCommand:
    defaults = dict(mode="learn", total_questions=10, correct_rate=90, mistakes=1, average_time=1200)
    return RecordStudyResultCommand(**{**defaults, **overrides})


def test_study_result_use_cases_record_and_summarize_results() -> None:
    repository = FakeStudyResultRepository()
    command = _make_command()

    saved = record_study_result(repository, command, now_fn=lambda: FIXED_UTC)
    summary = get_today_study_summary(repository, "2026-03-21")

    assert saved == StudyResultDto(
        mode=StudyMode.LEARN.value,
        total_questions=10,
        correct_rate=90,
        mistakes=1,
        average_time=1200,
        created_at=FIXED_UTC,
    )
    assert summary == DailyStudySummaryDto(date="2026-03-21", sessions=1, solvedProblems=10)


def test_record_study_result_excludes_yesterday_from_today_summary() -> None:
    repository = FakeStudyResultRepository()
    today = datetime(2026, 3, 21, 8, 0, tzinfo=timezone.utc)
    yesterday = datetime(2026, 3, 20, 8, 0, tzinfo=timezone.utc)
    command = _make_command(total_questions=5, correct_rate=80)

    record_study_result(repository, command, now_fn=lambda: today)
    record_study_result(repository, command, now_fn=lambda: yesterday)
    summary = get_today_study_summary(repository, "2026-03-21")

    assert summary.sessions == 1
    assert summary.solvedProblems == 5


def test_get_latest_study_result_returns_none_when_empty() -> None:
    repository = FakeStudyResultRepository()

    result = get_latest_study_result(repository)

    assert result is None
```

- [ ] **Step 2: テストを実行して失敗を確認**

```bash
cd /path/to/typing-app && backend/.venv/bin/pytest backend/application/tests/test_study_result_usecases.py -v
```

期待: `TypeError: RecordStudyResultCommand.__init__() got an unexpected keyword argument` または `record_study_result() got an unexpected keyword argument 'now_fn'` で FAIL

- [ ] **Step 3: `RecordStudyResultCommand` から `created_at` を削除**

`backend/application/dtos.py` の `RecordStudyResultCommand` を以下に変更:

```python
@dataclass(frozen=True)
class RecordStudyResultCommand:
    mode: str
    total_questions: int
    correct_rate: int
    mistakes: int
    average_time: int
```

（`from datetime import datetime` のインポートは `StudyResultDto` で使用中のため残す）

- [ ] **Step 4: `record_study_result` に `now_fn` を追加し `_normalize_created_at` を削除**

`backend/application/usecases.py` を以下のように変更する。

冒頭のインポートを変更:
```python
from collections.abc import Callable
from datetime import datetime, timezone
```

`_normalize_created_at` 関数（25〜29行目）を丸ごと削除:
```python
# この関数を削除
def _normalize_created_at(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)
```

`record_study_result` を以下に変更:
```python
def record_study_result(
    repository: StudyResultRepository,
    command: RecordStudyResultCommand,
    *,
    now_fn: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
) -> StudyResultDto:
    saved_result = repository.save(
        StudyResult(
            mode=StudyMode(command.mode),
            total_questions=TotalQuestions(command.total_questions),
            correct_rate=CorrectRate(command.correct_rate),
            mistakes=MistakeCount(command.mistakes),
            average_time=AverageTime(command.average_time),
            created_at=now_fn(),  # サーバー側で UTC タイムスタンプを生成する
        )
    )
    return _to_study_result_dto(saved_result)
```

- [ ] **Step 5: テストを実行して通過を確認**

```bash
backend/.venv/bin/pytest backend/application/tests/test_study_result_usecases.py -v
```

期待: 全テスト PASS

- [ ] **Step 6: コミット**

```bash
git add backend/application/dtos.py backend/application/usecases.py backend/application/tests/test_study_result_usecases.py
git commit -m "feat: generate UTC timestamp server-side in record_study_result (#86)"
```

---

## Task 2: infrastructure から `_normalize_created_at` を削除する

**Files:**
- Modify: `backend/infrastructure/sqlmodel/repositories.py`

- [ ] **Step 1: `_normalize_created_at` の呼び出しを直接代入に置き換える**

`backend/infrastructure/sqlmodel/repositories.py` の `_build_study_result` メソッド（204〜212行目）を変更:

```python
def _build_study_result(self, record: StudyResultRecord) -> StudyResult:
    return StudyResult(
        mode=StudyMode(record.mode.value),
        total_questions=TotalQuestions(record.total_questions),
        correct_rate=CorrectRate(record.correct_rate),
        mistakes=MistakeCount(record.mistakes),
        average_time=AverageTime(record.average_time),
        created_at=record.created_at,  # PostgreSQL TSTZ が UTC-aware を保証するため正規化不要
    )
```

`save` メソッド（214〜229行目）の `normalized_created_at` を削除:

```python
def save(self, result: StudyResult) -> StudyResult:
    with get_session(self.database_url) as session:
        record = StudyResultRecord(
            mode=StudyModeRecord(result.mode.value),
            total_questions=result.total_questions.value,
            correct_rate=result.correct_rate.value,
            mistakes=result.mistakes.value,
            average_time=result.average_time.value,
            created_at=result.created_at,  # usecase で UTC 保証済み
        )
        session.add(record)
        session.commit()
        session.refresh(record)

    return self._build_study_result(record)
```

- [ ] **Step 2: `_normalize_created_at` メソッドを削除**

198〜202行目の以下のメソッドを削除:

```python
def _normalize_created_at(self, value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)
```

`timezone` が他で使われているか確認:

```bash
grep -n "timezone" backend/infrastructure/sqlmodel/repositories.py
```

170行目の `datetime.now(timezone.utc)` で使用中のため `timezone` インポートは残す。

- [ ] **Step 3: テストを実行して通過を確認**

```bash
backend/.venv/bin/pytest backend -q
```

期待: 全テスト PASS（infrastructure 層の変更は既存テストで検証）

- [ ] **Step 4: コミット**

```bash
git add backend/infrastructure/sqlmodel/repositories.py
git commit -m "refactor: remove _normalize_created_at from repository (#86)"
```

---

## Task 3: presentation スキーマを分割し API を更新する

**Files:**
- Modify: `backend/presentation/schemas.py`
- Modify: `backend/presentation/api.py`
- Modify: `backend/presentation/tests/test_study_results_api.py`
- Modify: `backend/presentation/tests/test_openapi.py`

- [ ] **Step 1: テストを先に更新して失敗させる**

`backend/presentation/tests/test_study_results_api.py` を以下に書き換える:

```python
from datetime import datetime, timezone


def test_post_study_result_persists_payload(client) -> None:
    payload = {
        "mode": "learn",
        "total_questions": 10,
        "correct_rate": 80,
        "mistakes": 3,
        "average_time": 1200,
    }

    response = client.post("/study-results", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["mode"] == "learn"
    assert body["total_questions"] == 10
    assert body["correct_rate"] == 80
    assert body["mistakes"] == 3
    assert body["average_time"] == 1200
    assert "created_at" in body  # サーバー側で UTC タイムスタンプが付与されることを確認する

    latest_response = client.get("/study-results/latest")

    assert latest_response.status_code == 200
    assert latest_response.json()["mode"] == "learn"


def test_post_study_result_rejects_invalid_payload(client) -> None:
    payload = {
        "mode": "learn",
        "total_questions": 0,
        "correct_rate": 110,
        "mistakes": -1,
        "average_time": -5,
    }

    response = client.post("/study-results", json=payload)

    assert response.status_code == 422


def test_today_summary_aggregates_saved_results(client) -> None:
    client.post(
        "/study-results",
        json={
            "mode": "learn",
            "total_questions": 4,
            "correct_rate": 75,
            "mistakes": 2,
            "average_time": 1000,
        },
    )
    client.post(
        "/study-results",
        json={
            "mode": "review",
            "total_questions": 6,
            "correct_rate": 100,
            "mistakes": 0,
            "average_time": 900,
        },
    )

    response = client.get("/study-results/summary/today")

    assert response.status_code == 200
    assert response.json() == {
        "date": datetime.now(timezone.utc).date().isoformat(),
        "sessions": 2,
        "solvedProblems": 10,
    }  # 昨日の除外はユースケース単体テストで検証するため、ここでは今日分の集計のみ確認する


def test_get_latest_study_result_returns_not_found_when_no_data(client) -> None:
    response = client.get("/study-results/latest")

    assert response.status_code == 404
```

`backend/presentation/tests/test_openapi.py` の該当行を変更:

```python
# 変更前:
study_result_properties = schema["components"]["schemas"]["StudyResultRequest"]["properties"]
# 変更後:
study_result_response_properties = schema["components"]["schemas"]["StudyResultResponse"]["properties"]
```

```python
# 変更前:
assert study_result_properties["created_at"]["format"] == "date-time"
# 変更後:
assert study_result_response_properties["created_at"]["format"] == "date-time"  # レスポンスに UTC タイムスタンプが含まれることを確認する
```

- [ ] **Step 2: テストを実行して失敗を確認**

```bash
backend/.venv/bin/pytest backend/presentation/tests/ -v
```

期待: `test_post_study_result_persists_payload` が FAIL（`created_at` が必須フィールドのため 422 が返る）、`test_openapi.py` が FAIL（`StudyResultRequest` キーが存在しない or `StudyResultResponse` がない）

- [ ] **Step 3: `schemas.py` を更新する**

`backend/presentation/schemas.py` を以下に置き換える:

```python
from datetime import datetime
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
            raise ValueError("must not be blank")

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
            return None

        normalized_value = value.strip()

        if normalized_value == "":
            raise ValueError("must not be blank")

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


class StudyResultBase(BaseModel):
    mode: Literal["learn", "review"]
    total_questions: int = Field(ge=1)
    correct_rate: int = Field(ge=0, le=100)
    mistakes: int = Field(ge=0)
    average_time: int = Field(ge=0)


class StudyResultCreate(StudyResultBase):
    pass  # created_at はサーバー側で生成するため入力に含めない


class StudyResultResponse(StudyResultBase):
    created_at: datetime  # サーバー側で付与された UTC タイムスタンプ


class DailyStudySummaryResponse(BaseModel):
    date: str
    sessions: int
    solvedProblems: int
```

（`from pydantic import BaseModel, Field, field_validator` — `field_validator` は `QuestionBase` と `QuestionUpdate` で使用中のため残す）

- [ ] **Step 4: `api.py` のインポートとエンドポイントを更新する**

`api.py` のインポート部分（31〜39行目）を変更:

```python
from backend.presentation.schemas import (
    DailyStudySummaryResponse,
    QuestionCreate,
    QuestionListResponse,
    QuestionResponse,
    QuestionUpdate,
    StudyResultCreate,
    StudyResultResponse,
    TagListResponse,
)
```

`post_study_result` エンドポイント（144〜150行目）を変更:

```python
@app.post("/study-results", response_model=StudyResultResponse, status_code=status.HTTP_201_CREATED)
def post_study_result(study_result: StudyResultCreate) -> StudyResultResponse:
    saved_result = record_study_result(
        study_result_repository,
        RecordStudyResultCommand(**study_result.model_dump()),
    )
    return StudyResultResponse(**saved_result.__dict__)
```

`get_latest_result` エンドポイント（152〜159行目）を変更:

```python
@app.get("/study-results/latest", response_model=StudyResultResponse)
def get_latest_result() -> StudyResultResponse:
    latest_result = get_latest_study_result(study_result_repository)

    if latest_result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return StudyResultResponse(**latest_result.__dict__)
```

- [ ] **Step 5: テストを実行して通過を確認**

```bash
backend/.venv/bin/pytest backend/presentation/tests/ -v
```

期待: 全テスト PASS

- [ ] **Step 6: コミット**

```bash
git add backend/presentation/schemas.py backend/presentation/api.py backend/presentation/tests/test_study_results_api.py backend/presentation/tests/test_openapi.py
git commit -m "refactor: split StudyResultRequest into Create/Response, remove client-side created_at (#86)"
```

---

## Task 4: domain のコメント削除と全テスト確認

**Files:**
- Modify: `backend/domain/entities.py`

- [ ] **Step 1: `StudyResult.created_at` のコメントを削除**

`backend/domain/entities.py` の `StudyResult` クラスを変更:

```python
@dataclass(frozen=True)
class StudyResult:
    mode: StudyMode
    total_questions: TotalQuestions
    correct_rate: CorrectRate
    mistakes: MistakeCount
    average_time: AverageTime
    created_at: datetime
```

（`# UTC 正規化は #86 で対応` コメントを削除する）

- [ ] **Step 2: 全テストを実行して通過を確認**

```bash
backend/.venv/bin/pytest backend -q
```

期待:
```
passed in X.XXs
```

全テスト PASS であること。

- [ ] **Step 3: コミット**

```bash
git add backend/domain/entities.py
git commit -m "chore: remove resolved TODO comment from StudyResult.created_at (#86)"
```
