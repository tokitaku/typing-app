# CI/CD Testing Design

**Date:** 2026-04-05  
**Status:** Approved

## Overview

GitHub Actions を使い、Pull Request (main ブランチ向け) の作成・更新時に frontend / backend の CI チェックを並列実行する。

## Goals

- PR マージ前にテスト・リント・ビルドが通ることを保証する
- frontend と backend を並列実行してフィードバックを高速化する
- 依存パッケージをキャッシュして実行時間を最小化する

## Trigger

```yaml
on:
  pull_request:
    branches: [main]
```

main ブランチへの PR 作成・更新時のみ実行。push トリガーは使用しない。

## Job Structure

`.github/workflows/ci.yml` に 2 ジョブを定義し並列実行する。

```
ci.yml
├── frontend-ci (ubuntu-latest, Node 20)
│   ├── actions/checkout@v4
│   ├── actions/setup-node@v4 (cache: npm)
│   ├── npm ci
│   ├── npm run lint       (next lint)
│   ├── npm test           (vitest run)
│   └── npm run build      (next build)
│
└── backend-ci (ubuntu-latest, Python 3.10)
    ├── actions/checkout@v4
    ├── actions/setup-python@v5
    ├── astral-sh/setup-uv@v5
    ├── uv sync --project backend
    └── uv run --project backend pytest backend
```

片方が失敗してももう片方は最後まで実行され、両方のフィードバックが得られる。

## Caching Strategy

| ジョブ | キャッシュ対象 | キャッシュキー |
|--------|--------------|--------------|
| frontend-ci | `~/.npm` | `frontend/package-lock.json` のハッシュ (setup-node が自動管理) |
| backend-ci | `~/.cache/uv` | `uv.lock` のハッシュ (setup-uv が自動管理) |

## Environment Variables

- **frontend-ci**: ビルド時の環境変数は不要 (NEXT_PUBLIC_* はビルドに影響しないか、デフォルト値で通過。実装時に `next build` が環境変数なしで通過するか確認する)
- **backend-ci**: pytest はテストダブルを使用しており外部 DB への接続不要

## Workflow YAML

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  frontend-ci:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build

  backend-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.10"
      - uses: astral-sh/setup-uv@v5
      - run: uv sync --project backend
      - run: uv run --project backend pytest backend
```

## Out of Scope

- main への push 時のテスト実行 (PR 時のみで十分)
- E2E テスト (Playwright 等) — 現プロジェクトに存在しない
- backend の lint (設定なし)
- デプロイ自動化

## Files to Create

- `.github/workflows/ci.yml`
