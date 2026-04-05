# Design: backend/domain/tests — domain layer unit test infrastructure

**Date:** 2026-04-05
**Issue:** #105
**Status:** Approved

## Overview

Create `backend/domain/tests/` as a proper pytest package and add direct unit tests
for `tag_rules.py`. No conftest.py is added; domain entities are pure Python with no
shared fixtures needed at this stage.

## Files

| Path | Action |
|------|--------|
| `backend/domain/tests/__init__.py` | Create — empty package marker |
| `backend/domain/tests/test_tag_rules.py` | Create — unit tests for `normalize_tag` / `normalize_tags` |

Nothing else is created, moved, or deleted.

## Existing tests: no changes

`backend/application/tests/test_question_usecases.py` contains tests that exercise
tag normalization through use cases (`test_create_question_use_case_normalizes_tags`,
`test_update_question_use_case_replaces_tags`). These are legitimate application-layer
tests of use case contract and remain where they are.

The `presentation/tests/conftest.py` uses `normalize_tags` for seed data setup — that
is fixture wiring, not a test of domain behavior, and it stays as-is.

## Test cases: `test_tag_rules.py`

### `normalize_tag`

| Case | Input | Expected |
|------|-------|----------|
| valid tag | `" Essay "` | `"essay"` |
| already lowercase | `"eiken"` | `"eiken"` |
| blank string | `""` | raises `ValueError` |
| whitespace-only | `"   "` | raises `ValueError` |

### `normalize_tags`

| Case | Input | Expected |
|------|-------|----------|
| None | `None` | `()` |
| empty iterable | `[]` | `()` |
| duplicates after normalization | `[" Essay ", "essay"]` | `("essay",)` |
| mixed case + whitespace | `[" Essay ", "EIKEN "]` | `("essay", "eiken")` |
| order preserved | `["b", "a"]` | `("b", "a")` |

## Acceptance criteria

- `backend/domain/tests/` exists and is recognized by pytest
- `tag_rules.py` has dedicated unit tests in `domain/tests/`
- `uv run --project backend pytest backend -q` passes
