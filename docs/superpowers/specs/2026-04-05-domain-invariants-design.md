# Domain Invariants Design — Issue #92

## 概要

`Question` / `StudyResult` の不変条件を domain object に閉じ込め、`backend/domain/tests` で直接検証できる形にする。値オブジェクト（Value Object）パターンを用いて、ドメイン概念ごとに意味を持つ型を定義する。

## スコープ

- `Question` / `StudyResult` の生成時不変条件を domain 層へ移動する
- `DailyStudySummary` は変更しない
- `StudyResult.created_at` の UTC 正規化は #86 に委ねる（スコープ外）

## ファイル構成

```
backend/domain/
  value_objects.py    # 新設
  entities.py         # 既存（フィールド型を値オブジェクトへ変更）
  tag_rules.py        # 変更なし
  tests/
    test_value_objects.py  # 新設
    test_tag_rules.py      # 既存（変更なし）
backend/docs/
  domain-model.md     # 既存（値オブジェクトを追記）
```

## 値オブジェクト（`backend/domain/value_objects.py`）

すべて `@dataclass(frozen=True)` + `__post_init__` で不変条件を検証する。

| 値オブジェクト | フィールド | 不変条件 | 用途 |
|---|---|---|---|
| `QuestionText` | `value: str` | strip 後に非空白 | `Question.english` / `japanese` |
| `TagCollection` | `value: tuple[str, ...]` | `normalize_tags` で正規化・重複排除 | `Question.tags` |
| `TotalQuestions` | `value: int` | `>= 1` | `StudyResult.total_questions` |
| `CorrectRate` | `value: int` | `0 <= x <= 100` | `StudyResult.correct_rate` |
| `MistakeCount` | `value: int` | `>= 0` | `StudyResult.mistakes` |
| `AverageTime` | `value: int` | `>= 0` | `StudyResult.average_time` |

```python
@dataclass(frozen=True)
class QuestionText:
    value: str
    def __post_init__(self) -> None:
        stripped = self.value.strip()
        if not stripped:
            raise ValueError("must not be blank")
        object.__setattr__(self, "value", stripped)

@dataclass(frozen=True)
class TagCollection:
    _tags: InitVar[Iterable[str]] = ()
    value: tuple[str, ...] = field(init=False)
    def __post_init__(self, tags: Iterable[str]) -> None:
        object.__setattr__(self, "value", normalize_tags(tags))

@dataclass(frozen=True)
class TotalQuestions:
    value: int
    def __post_init__(self) -> None:
        if self.value < 1:
            raise ValueError("total_questions must be >= 1")

@dataclass(frozen=True)
class CorrectRate:
    value: int
    def __post_init__(self) -> None:
        if not (0 <= self.value <= 100):
            raise ValueError("correct_rate must be between 0 and 100")

@dataclass(frozen=True)
class MistakeCount:
    value: int
    def __post_init__(self) -> None:
        if self.value < 0:
            raise ValueError("mistakes must be >= 0")

@dataclass(frozen=True)
class AverageTime:
    value: int
    def __post_init__(self) -> None:
        if self.value < 0:
            raise ValueError("average_time must be >= 0")
```

## エンティティの変更（`backend/domain/entities.py`）

```python
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
```

`DailyStudySummary` は変更しない。

## 呼び出し側の変更

### `backend/application/usecases.py`

`create_question`:
```python
# Before
Question(id=None, english=command.english, tags=normalize_tags(command.tags), ...)
# After
Question(id=None, english=QuestionText(command.english), tags=TagCollection(command.tags), ...)
```
`TagCollection` が正規化を担うため、`normalize_tags()` の直接呼び出しは削除する。

`_to_question_dto` / `_to_study_result_dto`:
```python
# Before
QuestionDto(english=question.english, japanese=question.japanese, tags=list(question.tags), ...)
StudyResultDto(total_questions=result.total_questions, correct_rate=result.correct_rate, ...)
# After
QuestionDto(english=question.english.value, japanese=question.japanese.value, tags=list(question.tags.value), ...)
StudyResultDto(total_questions=result.total_questions.value, correct_rate=result.correct_rate.value, mistakes=result.mistakes.value, average_time=result.average_time.value, ...)
```

`update_question`:
```python
# Before
updates["english"] = command.english
updates["tags"] = normalize_tags(command.tags)
# After
updates["english"] = QuestionText(command.english).value
updates["tags"] = TagCollection(command.tags).value
```
`updates` dict はプリミティブのまま維持し、repository の変更を最小化する。

`record_study_result`:
```python
# Before
StudyResult(total_questions=command.total_questions, correct_rate=command.correct_rate, ...)
# After
StudyResult(total_questions=TotalQuestions(command.total_questions), correct_rate=CorrectRate(command.correct_rate), ...)
```

### `backend/infrastructure/sqlmodel/repositories.py`

**読み込み時（DBレコード → ドメインエンティティ）**: 値オブジェクトでラップする。

```python
# _build_question
Question(
    english=QuestionText(record.english_text),
    japanese=QuestionText(record.japanese_text),
    tags=TagCollection(tags),
    ...
)

# _build_study_result
StudyResult(
    total_questions=TotalQuestions(record.total_questions),
    correct_rate=CorrectRate(record.correct_rate),
    mistakes=MistakeCount(record.mistakes),
    average_time=AverageTime(record.average_time),
    ...
)
```

**書き込み時（ドメインエンティティ → DB）**: `.value` でアンラップする。

```python
# create()
TypingQuestionRecord(
    english_text=question.english.value,
    japanese_text=question.japanese.value,
)
self._replace_question_tags(..., question.tags.value)

# save()
StudyResultRecord(
    total_questions=result.total_questions.value,
    correct_rate=result.correct_rate.value,
    mistakes=result.mistakes.value,
    average_time=result.average_time.value,
)
```

`update()` メソッドは `updates` dict を直接使うため変更不要。

## テスト（`backend/domain/tests/test_value_objects.py`）

```python
class TestQuestionText:
    def test_strips_whitespace(self): ...      # " hello " → "hello"
    def test_blank_raises(self): ...           # "   " → ValueError
    def test_empty_raises(self): ...           # "" → ValueError

class TestTagCollection:
    def test_normalizes_via_tag_rules(self): ... # normalize_tags への委譲確認
    def test_empty_tuple_is_valid(self): ...     # () → TagCollection(())
    def test_deduplication(self): ...            # ["a", "A"] → ("a",)

class TestTotalQuestions:
    def test_positive_int_is_valid(self): ...    # 1 → ok
    def test_zero_raises(self): ...              # 0 → ValueError

class TestCorrectRate:
    def test_boundary_values(self): ...          # 0, 100 → ok
    def test_over_100_raises(self): ...          # 101 → ValueError
    def test_negative_raises(self): ...          # -1 → ValueError

class TestMistakeCount:
    def test_zero_is_valid(self): ...            # 0 → ok
    def test_negative_raises(self): ...          # -1 → ValueError

class TestAverageTime:
    def test_zero_is_valid(self): ...            # 0 → ok
    def test_negative_raises(self): ...          # -1 → ValueError
```

エンティティの構築テストは値オブジェクトに委譲するため最小限。

## ドキュメント更新

`backend/docs/domain-model.md` の mermaid 図に値オブジェクトを追記する。

## 受け入れ条件

- `Question` が不正な文面や不正なタグ状態で生成できない
- `StudyResult` が不正な数値状態で生成できない
- domain object の妥当性が HTTP schema や usecase helper に依存していない
- `backend/domain/tests` に値オブジェクトの単体テストが追加されている
- `uv run --project backend pytest backend -q` が成功する
