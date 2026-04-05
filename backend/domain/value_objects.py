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
