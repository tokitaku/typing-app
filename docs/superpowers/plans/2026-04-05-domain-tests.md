# domain/tests Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `backend/domain/tests/` as a pytest package and add direct unit tests for `normalize_tag` / `normalize_tags` in `tag_rules.py`.

**Architecture:** Two files only — an empty `__init__.py` to make the directory a package, and `test_tag_rules.py` with nine focused unit tests. No conftest.py. No changes to existing tests in application or presentation layers.

**Tech Stack:** Python, pytest, `uv run --project backend pytest backend -q`

---

### Task 1: Create the test package and test file

**Files:**
- Create: `backend/domain/tests/__init__.py`
- Create: `backend/domain/tests/test_tag_rules.py`

- [ ] **Step 1: Create the package marker**

Create `backend/domain/tests/__init__.py` with this exact content:

```python
"""Domain layer test package."""
```

- [ ] **Step 2: Create the test file**

Create `backend/domain/tests/test_tag_rules.py` with this exact content:

```python
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
```

- [ ] **Step 3: Run the domain tests in isolation**

```bash
uv run --project backend pytest backend/domain -q
```

Expected output (all 9 pass, 0 failures):
```
.........
9 passed in 0.XXs
```

- [ ] **Step 4: Run the full backend test suite**

```bash
uv run --project backend pytest backend -q
```

Expected: all tests pass (the new 9 plus all existing tests). No failures or errors.

- [ ] **Step 5: Commit**

```bash
git add backend/domain/tests/__init__.py backend/domain/tests/test_tag_rules.py
git commit -m "test: add domain/tests package with tag_rules unit tests (#105)"
```
