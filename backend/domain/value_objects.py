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
