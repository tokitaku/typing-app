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
