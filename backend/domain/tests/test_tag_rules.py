import pytest

from backend.domain.tag_rules import normalize_tag, normalize_tags


class TestNormalizeTag:
    def test_strips_and_lowercases(self) -> None:
        assert normalize_tag(" Essay ") == "essay"

    def test_already_lowercase_unchanged(self) -> None:
        assert normalize_tag("eiken") == "eiken"

    def test_blank_string_raises(self) -> None:
        with pytest.raises(ValueError, match="blank"):
            normalize_tag("")

    def test_whitespace_only_raises(self) -> None:
        with pytest.raises(ValueError, match="blank"):
            normalize_tag("   ")


class TestNormalizeTags:
    def test_none_returns_empty_tuple(self) -> None:
        assert normalize_tags(None) == ()

    def test_empty_iterable_returns_empty_tuple(self) -> None:
        assert normalize_tags([]) == ()

    def test_deduplicates_after_normalization(self) -> None:
        assert normalize_tags([" Essay ", "essay"]) == ("essay",)

    def test_normalizes_mixed_case_and_whitespace(self) -> None:
        assert normalize_tags([" Essay ", "EIKEN "]) == ("essay", "eiken")

    def test_preserves_insertion_order(self) -> None:
        assert normalize_tags(["b", "a"]) == ("b", "a")

    def test_blank_tag_in_list_raises(self) -> None:
        with pytest.raises(ValueError, match="blank"):
            normalize_tags(["valid", ""])
