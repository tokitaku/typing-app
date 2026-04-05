# Domain Invariants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Question` / `StudyResult` の不変条件を domain 値オブジェクトに閉じ込め、presentation/application を経由しない経路でも不正状態が生成できない設計にする。

**Architecture:** `backend/domain/value_objects.py` を新設し、`QuestionText`・`TagCollection`・`TotalQuestions`・`CorrectRate`・`MistakeCount`・`AverageTime` の 6 つの値オブジェクトを定義する。各 VO は `@dataclass(frozen=True)` + `__post_init__` で不変条件を自己検証する。`entities.py` はフィールド型を VO に差し替え、infrastructure は VO ↔ プリミティブ変換を境界で担う。

**Tech Stack:** Python 3.12, dataclasses (stdlib), pytest, uv

---

### Task 1: QuestionText と TagCollection の TDD 実装

**Files:**
- Create: `backend/domain/value_objects.py`
- Create: `backend/domain/tests/test_value_objects.py`

- [ ] **Step 1: failing テストを書く**

`backend/domain/tests/test_value_objects.py` を新規作成する:

```python
import pytest

from backend.domain.value_objects import QuestionText, TagCollection


class TestQuestionText:
    def test_valid_text_is_stored(self) -> None:
        assert QuestionText("Hello").value == "Hello"

    def test_strips_leading_trailing_whitespace(self) -> None:
        assert QuestionText(" Hello world ").value == "Hello world"

    def test_empty_string_raises(self) -> None:
        with pytest.raises(ValueError, match="blank"):
            QuestionText("")

    def test_whitespace_only_raises(self) -> None:
        with pytest.raises(ValueError, match="blank"):
            QuestionText("   ")


class TestTagCollection:
    def test_no_args_returns_empty_tuple(self) -> None:
        assert TagCollection().value == ()

    def test_normalizes_case_and_whitespace(self) -> None:
        assert TagCollection((" Essay ", "EIKEN")).value == ("essay", "eiken")

    def test_deduplicates_after_normalization(self) -> None:
        assert TagCollection(("a", "A")).value == ("a",)

    def test_preserves_insertion_order(self) -> None:
        assert TagCollection(("b", "a")).value == ("b", "a")

    def test_blank_tag_raises(self) -> None:
        with pytest.raises(ValueError, match="blank"):
            TagCollection(("valid", ""))

    def test_list_input_is_accepted(self) -> None:
        assert TagCollection(["essay", "eiken"]).value == ("essay", "eiken")
```

- [ ] **Step 2: テストを実行して失敗を確認する**

```bash
uv run --project backend pytest backend/domain/tests/test_value_objects.py -v
```

期待: `ImportError: cannot import name 'QuestionText' from 'backend.domain.value_objects'` (ファイルが存在しない)

- [ ] **Step 3: `value_objects.py` を実装する**

`backend/domain/value_objects.py` を新規作成する:

```python
from __future__ import annotations

from collections.abc import Iterable
from dataclasses import InitVar, dataclass, field

from backend.domain.tag_rules import normalize_tags


@dataclass(frozen=True)
class QuestionText:
    value: str

    def __post_init__(self) -> None:
        stripped = self.value.strip()
        if not stripped:
            raise ValueError("QuestionText must not be blank")
        object.__setattr__(self, "value", stripped)


@dataclass(frozen=True)
class TagCollection:
    _tags: InitVar[Iterable[str]] = ()
    value: tuple[str, ...] = field(init=False)

    def __post_init__(self, tags: Iterable[str]) -> None:
        object.__setattr__(self, "value", normalize_tags(tags))
```

- [ ] **Step 4: テストを実行して成功を確認する**

```bash
uv run --project backend pytest backend/domain/tests/test_value_objects.py -v
```

期待: `10 passed`

- [ ] **Step 5: コミットする**

```bash
git add backend/domain/value_objects.py backend/domain/tests/test_value_objects.py
git commit -m "feat: add QuestionText and TagCollection value objects (#92)"
```

---

### Task 2: 数値系 VO の TDD 実装

**Files:**
- Modify: `backend/domain/value_objects.py`
- Modify: `backend/domain/tests/test_value_objects.py`

- [ ] **Step 1: 数値 VO の failing テストを追記する**

`backend/domain/tests/test_value_objects.py` の末尾に追記する:

```python
from backend.domain.value_objects import (
    AverageTime,
    CorrectRate,
    MistakeCount,
    QuestionText,
    TagCollection,
    TotalQuestions,
)


class TestTotalQuestions:
    def test_one_is_valid(self) -> None:
        assert TotalQuestions(1).value == 1

    def test_large_number_is_valid(self) -> None:
        assert TotalQuestions(100).value == 100

    def test_zero_raises(self) -> None:
        with pytest.raises(ValueError, match="total_questions"):
            TotalQuestions(0)

    def test_negative_raises(self) -> None:
        with pytest.raises(ValueError, match="total_questions"):
            TotalQuestions(-1)


class TestCorrectRate:
    def test_zero_is_valid(self) -> None:
        assert CorrectRate(0).value == 0

    def test_hundred_is_valid(self) -> None:
        assert CorrectRate(100).value == 100

    def test_fifty_is_valid(self) -> None:
        assert CorrectRate(50).value == 50

    def test_over_100_raises(self) -> None:
        with pytest.raises(ValueError, match="correct_rate"):
            CorrectRate(101)

    def test_negative_raises(self) -> None:
        with pytest.raises(ValueError, match="correct_rate"):
            CorrectRate(-1)


class TestMistakeCount:
    def test_zero_is_valid(self) -> None:
        assert MistakeCount(0).value == 0

    def test_positive_is_valid(self) -> None:
        assert MistakeCount(5).value == 5

    def test_negative_raises(self) -> None:
        with pytest.raises(ValueError, match="mistakes"):
            MistakeCount(-1)


class TestAverageTime:
    def test_zero_is_valid(self) -> None:
        assert AverageTime(0).value == 0

    def test_positive_is_valid(self) -> None:
        assert AverageTime(300).value == 300

    def test_negative_raises(self) -> None:
        with pytest.raises(ValueError, match="average_time"):
            AverageTime(-1)
```

また、ファイル先頭の import を以下に差し替える:

```python
import pytest

from backend.domain.value_objects import (
    AverageTime,
    CorrectRate,
    MistakeCount,
    QuestionText,
    TagCollection,
    TotalQuestions,
)
```

- [ ] **Step 2: テストを実行して失敗を確認する**

```bash
uv run --project backend pytest backend/domain/tests/test_value_objects.py -v
```

期待: `ImportError: cannot import name 'TotalQuestions'`

- [ ] **Step 3: 数値 VO を `value_objects.py` に追記する**

`backend/domain/value_objects.py` の末尾に追記する:

```python
@dataclass(frozen=True)
class TotalQuestions:
    value: int

    def __post_init__(self) -> None:
        if self.value < 1:
            raise ValueError(f"total_questions must be >= 1, got {self.value}")


@dataclass(frozen=True)
class CorrectRate:
    value: int

    def __post_init__(self) -> None:
        if not (0 <= self.value <= 100):
            raise ValueError(f"correct_rate must be between 0 and 100, got {self.value}")


@dataclass(frozen=True)
class MistakeCount:
    value: int

    def __post_init__(self) -> None:
        if self.value < 0:
            raise ValueError(f"mistakes must be >= 0, got {self.value}")


@dataclass(frozen=True)
class AverageTime:
    value: int

    def __post_init__(self) -> None:
        if self.value < 0:
            raise ValueError(f"average_time must be >= 0, got {self.value}")
```

- [ ] **Step 4: テストを実行して全件成功を確認する**

```bash
uv run --project backend pytest backend/domain/tests/test_value_objects.py -v
```

期待: `26 passed`

- [ ] **Step 5: コミットする**

```bash
git add backend/domain/value_objects.py backend/domain/tests/test_value_objects.py
git commit -m "feat: add TotalQuestions, CorrectRate, MistakeCount, AverageTime value objects (#92)"
```

---

### Task 3: エンティティと全呼び出し側を VO に対応させる

このタスクは `entities.py` の型変更が連鎖的にすべての呼び出し側を壊すため、1 つのタスクとして一括対応してから最後にコミットする。

**Files:**
- Modify: `backend/domain/entities.py`
- Modify: `backend/application/usecases.py`
- Modify: `backend/application/tests/fakes.py`
- Modify: `backend/application/tests/test_question_usecases.py`
- Modify: `backend/infrastructure/sqlmodel/repositories.py`

- [ ] **Step 1: `entities.py` を VO に対応させる**

`backend/domain/entities.py` を以下で上書きする:

```python
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from backend.domain.value_objects import (
    AverageTime,
    CorrectRate,
    MistakeCount,
    QuestionText,
    TagCollection,
    TotalQuestions,
)


class StudyMode(str, Enum):
    LEARN = "learn"  # 通常学習モードを表す
    REVIEW = "review"  # 復習モードを表す


@dataclass(frozen=True)
class Question:
    id: int | None
    english: QuestionText
    japanese: QuestionText
    is_active: bool = True
    tags: TagCollection = field(default_factory=TagCollection)


@dataclass(frozen=True)
class StudyResult:
    mode: StudyMode
    total_questions: TotalQuestions
    correct_rate: CorrectRate
    mistakes: MistakeCount
    average_time: AverageTime
    created_at: datetime  # UTC 正規化は #86 で対応


@dataclass(frozen=True)
class DailyStudySummary:
    date: str
    sessions: int
    solved_problems: int
```

- [ ] **Step 2: `usecases.py` を VO に対応させる**

`backend/application/usecases.py` を以下で上書きする:

```python
from datetime import datetime, timezone

from backend.application.dtos import (
    CreateQuestionCommand,
    DailyStudySummaryDto,
    ListQuestionsQuery,
    QuestionDto,
    RecordStudyResultCommand,
    StudyResultDto,
    UpdateQuestionCommand,
)
from backend.domain.entities import DailyStudySummary, Question, StudyMode, StudyResult
from backend.domain.repositories import QuestionRepository, StudyResultRepository
from backend.domain.tag_rules import normalize_tags
from backend.domain.value_objects import (
    AverageTime,
    CorrectRate,
    MistakeCount,
    QuestionText,
    TagCollection,
    TotalQuestions,
)


def _normalize_created_at(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=timezone.utc)  # タイムゾーン未指定は UTC として扱う

    return value.astimezone(timezone.utc)  # 内部では UTC に正規化して扱う


def _parse_tag_codes(codes: list[str] | None) -> list[str] | None:
    if not codes:
        return None  # 未指定時はフィルタなしとして扱う

    normalized_codes = list(normalize_tags(codes))
    return normalized_codes if normalized_codes else None  # 空配列相当ならフィルタなしとして扱う


def _to_question_dto(question: Question) -> QuestionDto:
    return QuestionDto(
        id=int(question.id),
        english=question.english.value,
        japanese=question.japanese.value,
        isActive=question.is_active,
        tags=list(question.tags.value),
    )  # 管理用 DTO へ詰め替える


def _to_study_result_dto(result: StudyResult) -> StudyResultDto:
    return StudyResultDto(
        mode=result.mode.value,
        total_questions=result.total_questions.value,
        correct_rate=result.correct_rate.value,
        mistakes=result.mistakes.value,
        average_time=result.average_time.value,
        created_at=result.created_at,
    )  # API 返却用 DTO へ詰め替える


def _to_summary_dto(summary: DailyStudySummary) -> DailyStudySummaryDto:
    return DailyStudySummaryDto(
        date=summary.date,
        sessions=summary.sessions,
        solvedProblems=summary.solved_problems,
    )  # 表示用 summary DTO へ詰め替える


def list_questions(repository: QuestionRepository, query: ListQuestionsQuery) -> list[QuestionDto]:
    questions = repository.list_questions(
        tag_codes=_parse_tag_codes(query.tag_codes),
        include_inactive=query.include_inactive,
    )
    return [_to_question_dto(question) for question in questions]  # 管理画面向け DTO 一覧を返す


def create_question(repository: QuestionRepository, command: CreateQuestionCommand) -> QuestionDto:
    saved_question = repository.create(
        Question(
            id=None,
            english=QuestionText(command.english),
            japanese=QuestionText(command.japanese),
            is_active=True,
            tags=TagCollection(command.tags),
        )
    )
    return _to_question_dto(saved_question)  # 保存結果を DTO にして返す


def update_question(
    repository: QuestionRepository,
    question_id: int,
    command: UpdateQuestionCommand,
) -> QuestionDto | None:
    updates: dict[str, object] = {}

    if command.english is not None:
        updates["english"] = QuestionText(command.english).value  # 検証・正規化してから格納する
    if command.japanese is not None:
        updates["japanese"] = QuestionText(command.japanese).value  # 検証・正規化してから格納する
    if command.is_active is not None:
        updates["is_active"] = command.is_active  # 有効フラグ変更を詰める
    if command.tags is not None:
        updates["tags"] = TagCollection(command.tags).value  # 正規化済みタプルを格納する

    saved_question = repository.update(question_id, updates)
    return _to_question_dto(saved_question) if saved_question is not None else None  # 対象があれば DTO を返す


def deactivate_question(repository: QuestionRepository, question_id: int) -> bool:
    return repository.deactivate(question_id)  # 論理削除を委譲する


def list_tags(repository: QuestionRepository) -> list[str]:
    return repository.list_tags()  # 登録済みタグコードをアルファベット順・重複なしで返す


def record_study_result(
    repository: StudyResultRepository,
    command: RecordStudyResultCommand,
) -> StudyResultDto:
    normalized_created_at = _normalize_created_at(command.created_at)
    saved_result = repository.save(
        StudyResult(
            mode=StudyMode(command.mode),
            total_questions=TotalQuestions(command.total_questions),
            correct_rate=CorrectRate(command.correct_rate),
            mistakes=MistakeCount(command.mistakes),
            average_time=AverageTime(command.average_time),
            created_at=normalized_created_at,
        )
    )
    return _to_study_result_dto(saved_result)  # 保存結果を返す


def get_latest_study_result(repository: StudyResultRepository) -> StudyResultDto | None:
    latest_result = repository.get_latest()
    return _to_study_result_dto(latest_result) if latest_result is not None else None  # 最新結果があれば返す


def get_today_study_summary(
    repository: StudyResultRepository,
    target_date: str,
) -> DailyStudySummaryDto:
    return _to_summary_dto(repository.get_today_summary(target_date))  # 集計結果を DTO に変換して返す
```

- [ ] **Step 3: `fakes.py` を VO に対応させる**

`backend/application/tests/fakes.py` を以下で上書きする:

```python
from backend.domain.entities import DailyStudySummary, Question, StudyResult
from backend.domain.value_objects import QuestionText, TagCollection


class FakeQuestionRepository:
    def __init__(self, questions: list[Question]) -> None:
        self.questions = list(questions)
        self._next_id = max((q.id for q in questions if q.id is not None), default=0) + 1

    def list_questions(
        self,
        *,
        tag_codes: list[str] | None = None,
        include_inactive: bool = True,
    ) -> list[Question]:
        filtered = self.questions

        if not include_inactive:
            filtered = [question for question in filtered if question.is_active]  # 有効問題だけに絞る

        if tag_codes:
            normalized_codes = {code.lower() for code in tag_codes}
            filtered = [
                question for question in filtered if normalized_codes.intersection(question.tags.value)
            ]  # タグ一致が 1 件以上ある問題だけを残す

        return filtered

    def create(self, question: Question) -> Question:
        saved = Question(
            id=self._next_id,
            english=question.english,
            japanese=question.japanese,
            is_active=question.is_active,
            tags=question.tags,
        )
        self._next_id += 1
        self.questions.append(saved)
        return saved  # DB の自動採番をエミュレートするため連番 ID を割り当てて返す

    def update(self, question_id: int, updates: dict) -> Question | None:
        for i, q in enumerate(self.questions):
            if q.id == question_id:
                english_raw = updates.get("english")
                japanese_raw = updates.get("japanese")
                tags_raw = updates.get("tags")
                updated = Question(
                    id=q.id,
                    english=QuestionText(english_raw) if english_raw is not None else q.english,
                    japanese=QuestionText(japanese_raw) if japanese_raw is not None else q.japanese,
                    is_active=updates.get("is_active", q.is_active),
                    tags=TagCollection(tags_raw) if tags_raw is not None else q.tags,
                )
                self.questions[i] = updated
                return updated  # リポジトリの実装と同じ戻り値の契約を再現するため更新後のエンティティを返す
        return None  # リポジトリの実装と同じ振る舞いを再現するため存在しない ID は None を返す

    def deactivate(self, question_id: int) -> bool:
        return self.update(question_id, {"is_active": False}) is not None  # is_active フラグによる論理削除をエミュレートする

    def list_tags(self) -> list[str]:
        unique_tags = {tag for question in self.questions for tag in question.tags.value}
        return sorted(unique_tags)  # API と同じ契約でアルファベット順・重複なしのタグ一覧を返す


class FakeStudyResultRepository:
    def __init__(self) -> None:
        self.saved_results: list[StudyResult] = []

    def save(self, result: StudyResult) -> StudyResult:
        self.saved_results.append(result)  # 保存された結果をそのまま記録する
        return result

    def get_latest(self) -> StudyResult | None:
        return self.saved_results[-1] if self.saved_results else None  # 最後の要素を最新として返す

    def get_today_summary(self, target_date: str) -> DailyStudySummary:
        solved_problems = sum(
            result.total_questions.value
            for result in self.saved_results
            if result.created_at.date().isoformat() == target_date
        )
        sessions = sum(
            1 for result in self.saved_results if result.created_at.date().isoformat() == target_date
        )
        return DailyStudySummary(
            date=target_date,
            sessions=sessions,
            solved_problems=solved_problems,
        )  # 当日分だけを集計して返す
```

- [ ] **Step 4: `test_question_usecases.py` を VO に対応させる**

`backend/application/tests/test_question_usecases.py` を以下で上書きする:

```python
from backend.application.dtos import (
    CreateQuestionCommand,
    ListQuestionsQuery,
    UpdateQuestionCommand,
)
from backend.application.usecases import create_question, list_questions, update_question
from backend.domain.entities import Question
from backend.domain.value_objects import QuestionText, TagCollection
from backend.application.tests.fakes import FakeQuestionRepository


def test_list_questions_use_case_includes_inactive_by_default() -> None:
    repository = FakeQuestionRepository(
        [
            Question(id=1, english=QuestionText("cat"), japanese=QuestionText("猫"), is_active=True),
            Question(id=2, english=QuestionText("dog"), japanese=QuestionText("犬"), is_active=False),
        ]
    )

    result = list_questions(repository, ListQuestionsQuery(include_inactive=True))

    assert len(result) == 2  # include_inactive=True の仕様通り、無効問題も含めて返却されることを検証


def test_list_questions_use_case_with_tag_filter() -> None:
    repository = FakeQuestionRepository(
        [
            Question(
                id=1,
                english=QuestionText("debate"),
                japanese=QuestionText("討論"),
                is_active=True,
                tags=TagCollection(("eiken", "writing")),
            ),
            Question(
                id=2,
                english=QuestionText("We discussed climate policy."),
                japanese=QuestionText("私たちは気候政策を議論した。"),
                is_active=True,
                tags=TagCollection(("environment",)),
            ),
        ]
    )

    result = list_questions(
        repository,
        ListQuestionsQuery(tag_codes=["WRITING"]),
    )

    assert len(result) == 1
    assert result[0].english == "debate"
    assert result[0].tags == ["eiken", "writing"]  # タグ条件は正規化された値で照合し、レスポンスにもタグ一覧を含めることを検証


def test_create_question_use_case() -> None:
    repository = FakeQuestionRepository([])

    result = create_question(
        repository,
        CreateQuestionCommand(
            english="I have been studying English for three years.",
            japanese="私は3年間英語を勉強し続けている。",
        ),
    )

    assert result.english == "I have been studying English for three years."
    assert result.isActive is True  # ビジネスルールとして新規作成時は必ず有効状態で保存されることを検証
    assert not hasattr(result, "eikenLevel")  # 公開 DTO から英検級が除去されることを検証


def test_create_question_use_case_normalizes_tags() -> None:
    repository = FakeQuestionRepository([])

    result = create_question(
        repository,
        CreateQuestionCommand(
            english="Perspective",
            japanese="視点",
            tags=[" Essay ", "essay", "EIKEN "],
        ),
    )

    assert result.tags == ["essay", "eiken"]  # 前後空白除去と大小文字の揺れ吸収、重複排除が保存前に行われることを検証


def test_update_question_use_case_updates_fields() -> None:
    repository = FakeQuestionRepository(
        [
            Question(id=10, english=QuestionText("river"), japanese=QuestionText("川"), is_active=True),
        ]
    )

    result = update_question(
        repository,
        10,
        UpdateQuestionCommand(english="sea", japanese="海"),
    )

    assert result is not None
    assert result.english == "sea"
    assert result.japanese == "海"
    assert not hasattr(result, "eikenLevel")  # 公開 DTO から英検級が除去されることを検証


def test_update_question_use_case_replaces_tags() -> None:
    repository = FakeQuestionRepository(
        [
            Question(
                id=10,
                english=QuestionText("river"),
                japanese=QuestionText("川"),
                is_active=True,
                tags=TagCollection(("nature",)),
            ),
        ]
    )

    result = update_question(
        repository,
        10,
        UpdateQuestionCommand(tags=[" Business ", "business", "news"]),
    )

    assert result is not None
    assert result.tags == ["business", "news"]  # 更新時もタグの正規化と重複排除を行い、全置換することを検証


def test_update_question_use_case_returns_none_for_unknown_id() -> None:
    repository = FakeQuestionRepository([])

    result = update_question(repository, 999, UpdateQuestionCommand(english="ghost"))

    assert result is None  # エラー処理の仕様通り、存在しない ID に対しては None を返すことを検証
```

- [ ] **Step 5: `repositories.py` を VO に対応させる**

`backend/infrastructure/sqlmodel/repositories.py` を以下で上書きする:

```python
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import delete, func
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from backend.database import get_session
from backend.domain.entities import DailyStudySummary, Question, StudyMode, StudyResult
from backend.domain.tag_rules import normalize_tags
from backend.domain.value_objects import (
    AverageTime,
    CorrectRate,
    MistakeCount,
    QuestionText,
    TagCollection,
    TotalQuestions,
)
from backend.infrastructure.sqlmodel.models import (
    TagRecord,
    StudyModeRecord,
    StudyResultRecord,
    TypingQuestionRecord,
    TypingQuestionTagRecord,
)


class SqlModelQuestionRepository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url

    def _resolve_tag_ids(self, session, tags: tuple[str, ...]) -> list[int]:
        tag_ids: list[int] = []

        for tag in tags:
            record = session.exec(select(TagRecord).where(TagRecord.code == tag)).first()

            if record is None:
                try:
                    with session.begin_nested():
                        record = TagRecord(code=tag)
                        session.add(record)
                        session.flush()  # unique 制約競合があれば savepoint 単位で巻き戻す
                except IntegrityError:
                    record = session.exec(select(TagRecord).where(TagRecord.code == tag)).first()

                if record is None:
                    raise ValueError(f"Failed to resolve tag code: {tag}")  # 取得不能な場合は不整合として扱う

            tag_ids.append(int(record.id))

        return tag_ids

    def _replace_question_tags(self, session, question_id: int, tags: tuple[str, ...]) -> None:
        normalized_tags = normalize_tags(tags)
        session.exec(
            delete(TypingQuestionTagRecord).where(TypingQuestionTagRecord.question_id == question_id)
        )  # 既存タグ関連を一度外してから現在値へ全置換する

        for tag_id in self._resolve_tag_ids(session, normalized_tags):
            session.add(TypingQuestionTagRecord(question_id=question_id, tag_id=tag_id))

    def _load_tags_by_question_id(self, session, question_ids: list[int]) -> dict[int, tuple[str, ...]]:
        if not question_ids:
            return {}

        rows = session.exec(
            select(TypingQuestionTagRecord.question_id, TagRecord.code)
            .join(TagRecord, TypingQuestionTagRecord.tag_id == TagRecord.id)
            .where(TypingQuestionTagRecord.question_id.in_(question_ids))
            .order_by(TypingQuestionTagRecord.question_id, TypingQuestionTagRecord.tag_id)
        ).all()

        tags_by_question_id: dict[int, list[str]] = {question_id: [] for question_id in question_ids}

        for question_id, tag_code in rows:
            tags_by_question_id[int(question_id)].append(str(tag_code))

        return {
            question_id: tuple(tag_codes) for question_id, tag_codes in tags_by_question_id.items()
        }  # 問題ごとのタグ一覧を組み立てて返す

    def _build_question(
        self,
        record: TypingQuestionRecord,
        tags: tuple[str, ...],
    ) -> Question:
        return Question(
            id=int(record.id),
            english=QuestionText(record.english_text),
            japanese=QuestionText(record.japanese_text),
            is_active=record.is_active,
            tags=TagCollection(tags),
        )  # ORM レコードをドメインエンティティへ変換する

    def list_questions(
        self,
        *,
        tag_codes: list[str] | None = None,
        include_inactive: bool = True,
    ) -> list[Question]:
        with get_session(self.database_url) as session:
            statement = (
                select(TypingQuestionRecord)
                .order_by(TypingQuestionRecord.id)
            )

            if not include_inactive:
                statement = statement.where(TypingQuestionRecord.is_active.is_(True))  # 無効問題を除外する

            if tag_codes:
                normalized_tag_codes = list(normalize_tags(tag_codes))
                tagged_question_ids = (
                    select(TypingQuestionTagRecord.question_id)
                    .join(TagRecord, TypingQuestionTagRecord.tag_id == TagRecord.id)
                    .where(TagRecord.code.in_(normalized_tag_codes))
                )
                statement = statement.where(TypingQuestionRecord.id.in_(tagged_question_ids))  # タグを 1 件以上持つ問題だけに絞る

            rows = session.exec(statement).all()
            question_ids = [int(record.id) for record in rows]
            tags_by_question_id = self._load_tags_by_question_id(session, question_ids)

        return [
            self._build_question(
                record,
                tags_by_question_id.get(int(record.id), ()),
            )
            for record in rows
        ]  # レコード一覧をエンティティ一覧へ変換する

    def create(self, question: Question) -> Question:
        with get_session(self.database_url) as session:
            record = TypingQuestionRecord(
                english_text=question.english.value,
                japanese_text=question.japanese.value,
                is_active=question.is_active,
            )
            session.add(record)
            session.flush()  # 中間テーブル作成前に question_id を確定させる
            self._replace_question_tags(session, int(record.id), question.tags.value)
            session.commit()
            session.refresh(record)

            tags_by_question_id = self._load_tags_by_question_id(session, [int(record.id)])

        return self._build_question(
            record,
            tags_by_question_id.get(int(record.id), ()),
        )  # 保存済みエンティティを返す

    def update(self, question_id: int, updates: dict[str, object]) -> Question | None:
        with get_session(self.database_url) as session:
            record = session.get(TypingQuestionRecord, question_id)

            if record is None:
                return None  # 対象がなければ何もしない

            if "english" in updates:
                record.english_text = str(updates["english"])  # 英文変更を反映する

            if "japanese" in updates:
                record.japanese_text = str(updates["japanese"])  # 日本語訳変更を反映する

            if "is_active" in updates:
                record.is_active = bool(updates["is_active"])  # 有効フラグ変更を反映する

            if "tags" in updates:
                self._replace_question_tags(session, question_id, tuple(updates["tags"]))  # タグ変更を反映する

            record.updated_at = datetime.now(timezone.utc)
            session.add(record)
            session.commit()
            session.refresh(record)

            tags_by_question_id = self._load_tags_by_question_id(session, [int(record.id)])

        return self._build_question(
            record,
            tags_by_question_id.get(int(record.id), ()),
        )  # 更新済みエンティティを返す

    def deactivate(self, question_id: int) -> bool:
        return self.update(question_id, {"is_active": False}) is not None  # 論理削除として無効化する

    def list_tags(self) -> list[str]:
        with get_session(self.database_url) as session:
            codes = session.exec(
                select(TagRecord.code).order_by(TagRecord.code)
            ).all()

        return [str(code) for code in codes]  # タグコード一覧をアルファベット順で返す


class SqlModelStudyResultRepository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url

    def _normalize_created_at(self, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            return value.replace(tzinfo=timezone.utc)  # タイムゾーン未指定は UTC として扱う

        return value.astimezone(timezone.utc)  # 永続化前に UTC へ正規化する

    def _build_study_result(self, record: StudyResultRecord) -> StudyResult:
        return StudyResult(
            mode=StudyMode(record.mode.value),
            total_questions=TotalQuestions(record.total_questions),
            correct_rate=CorrectRate(record.correct_rate),
            mistakes=MistakeCount(record.mistakes),
            average_time=AverageTime(record.average_time),
            created_at=self._normalize_created_at(record.created_at),
        )  # ORM レコードをドメインエンティティへ変換する

    def save(self, result: StudyResult) -> StudyResult:
        normalized_created_at = self._normalize_created_at(result.created_at)
        with get_session(self.database_url) as session:
            record = StudyResultRecord(
                mode=StudyModeRecord(result.mode.value),
                total_questions=result.total_questions.value,
                correct_rate=result.correct_rate.value,
                mistakes=result.mistakes.value,
                average_time=result.average_time.value,
                created_at=normalized_created_at,
            )
            session.add(record)
            session.commit()
            session.refresh(record)

        return self._build_study_result(record)  # 保存済み学習結果を返す

    def get_latest(self) -> StudyResult | None:
        with get_session(self.database_url) as session:
            latest_result = session.exec(
                select(StudyResultRecord)
                .order_by(StudyResultRecord.created_at.desc(), StudyResultRecord.id.desc())
                .limit(1)
            ).first()

        return self._build_study_result(latest_result) if latest_result is not None else None  # 最新結果があれば返す

    def get_today_summary(self, target_date: str) -> DailyStudySummary:
        parsed_date = date.fromisoformat(target_date)
        start_of_day = datetime.combine(parsed_date, time.min, tzinfo=timezone.utc)
        end_of_day = start_of_day + timedelta(days=1)

        with get_session(self.database_url) as session:
            sessions, solved_problems = session.exec(
                select(
                    func.count(StudyResultRecord.id),
                    func.coalesce(func.sum(StudyResultRecord.total_questions), 0),
                ).where(
                    StudyResultRecord.created_at >= start_of_day,
                    StudyResultRecord.created_at < end_of_day,
                )
            ).one()

        return DailyStudySummary(
            date=target_date,
            sessions=int(sessions),
            solved_problems=int(solved_problems),
        )  # 当日集計結果をドメインエンティティとして返す
```

- [ ] **Step 6: すべてのテストを実行して成功を確認する**

```bash
uv run --project backend pytest backend -q
```

期待: すべて passed、failed 0

- [ ] **Step 7: コミットする**

```bash
git add backend/domain/entities.py backend/application/usecases.py backend/application/tests/fakes.py backend/application/tests/test_question_usecases.py backend/infrastructure/sqlmodel/repositories.py
git commit -m "feat: wire value objects into entities and all callers (#92)"
```

---

### Task 4: domain-model.md を値オブジェクトで更新する

**Files:**
- Modify: `backend/docs/domain-model.md`

- [ ] **Step 1: `domain-model.md` を更新する**

`backend/docs/domain-model.md` を以下で上書きする:

```markdown
# Backend Domain Model

以下は、`backend/domain/entities.py`、`backend/domain/value_objects.py`、`backend/domain/repositories.py` を元にしたドメインモデル図です。

​```mermaid
classDiagram
    direction LR

    class StudyMode {
        <<enumeration>>
        LEARN
        REVIEW
    }

    class QuestionText {
        <<value object>>
        +value: str
        __post_init__: strip後に非空白を保証
    }

    class TagCollection {
        <<value object>>
        +value: tuple~str~
        __post_init__: normalize_tagsで正規化・重複排除
    }

    class TotalQuestions {
        <<value object>>
        +value: int
        __post_init__: >= 1 を保証
    }

    class CorrectRate {
        <<value object>>
        +value: int
        __post_init__: 0 <= x <= 100 を保証
    }

    class MistakeCount {
        <<value object>>
        +value: int
        __post_init__: >= 0 を保証
    }

    class AverageTime {
        <<value object>>
        +value: int
        __post_init__: >= 0 を保証
    }

    class Question {
        <<entity>>
        +id: int | None
        +english: QuestionText
        +japanese: QuestionText
        +is_active: bool
        +tags: TagCollection
    }

    class StudyResult {
        <<entity>>
        +mode: StudyMode
        +total_questions: TotalQuestions
        +correct_rate: CorrectRate
        +mistakes: MistakeCount
        +average_time: AverageTime
        +created_at: datetime
    }

    class DailyStudySummary {
        <<entity>>
        +date: str
        +sessions: int
        +solved_problems: int
    }

    class QuestionRepository {
        <<interface>>
        +list_questions(tag_codes, include_inactive) list~Question~
        +create(question) Question
        +update(question_id, updates) Question | None
        +deactivate(question_id) bool
        +list_tags() list~str~
    }

    class StudyResultRepository {
        <<interface>>
        +save(result) StudyResult
        +get_latest() StudyResult | None
        +get_today_summary(target_date) DailyStudySummary
    }

    Question --> QuestionText : uses
    Question --> TagCollection : uses
    StudyResult --> StudyMode : uses
    StudyResult --> TotalQuestions : uses
    StudyResult --> CorrectRate : uses
    StudyResult --> MistakeCount : uses
    StudyResult --> AverageTime : uses
    QuestionRepository ..> Question : manages
    StudyResultRepository ..> StudyResult : persists
    StudyResultRepository ..> DailyStudySummary : builds
​```

補足:
- `Question` と `StudyResult` は値オブジェクトによって生成時の不変条件を自己保証する。不正な状態は `__post_init__` が `ValueError` を送出することで防ぐ。
- `Question` は自由タグを 0 件以上保持し、学習者が自分の目的に合わせて分類できます。
- タグは学習者が自由に作成・付与でき、出題条件と教材分類の両方に利用されます。
- `StudyResult` は `StudyMode` を保持し、学習モードごとの結果を表現します。
- `QuestionRepository` は `Question` の検索・作成・更新・無効化を担当し、タグ条件で検索できます。
- `QuestionRepository.list_tags()` は登録済みの全タグを返し、UI でのタグ選択に利用されます。
- `StudyResultRepository` は `StudyResult` の保存と、日次集計 `DailyStudySummary` の取得を担当します。
- 出題用の独立した `Quiz` エンティティは持たず、学習導線も `Question` を単一ソースとして扱います。
```

- [ ] **Step 2: コミットする**

```bash
git add backend/docs/domain-model.md
git commit -m "docs: update domain-model.md with value objects (#92)"
```

---

### 完了確認

- [ ] **最終テスト実行**

```bash
uv run --project backend pytest backend -q
```

期待: すべて passed、failed 0
