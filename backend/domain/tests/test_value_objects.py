import pytest

from backend.domain.value_objects import (
    AverageTime,
    CorrectRate,
    MistakeCount,
    QuestionText,
    TagCollection,
    TotalQuestions,
)


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


class TestQuestionId:
    def test_positive_integer_is_stored(self) -> None:
        from backend.domain.value_objects import QuestionId
        assert QuestionId(1).value == 1

    def test_large_integer_is_valid(self) -> None:
        from backend.domain.value_objects import QuestionId
        assert QuestionId(9999).value == 9999

    def test_zero_raises(self) -> None:
        import pytest
        from backend.domain.value_objects import QuestionId
        with pytest.raises(ValueError, match="QuestionId"):
            QuestionId(0)

    def test_negative_raises(self) -> None:
        import pytest
        from backend.domain.value_objects import QuestionId
        with pytest.raises(ValueError, match="QuestionId"):
            QuestionId(-1)
