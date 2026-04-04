# CI/CD Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PR (main ブランチ向け) 作成・更新時に GitHub Actions で frontend / backend の CI チェックを並列実行する。

**Architecture:** `.github/workflows/ci.yml` 1ファイルに `frontend-ci` と `backend-ci` の2ジョブを並列定義する。frontend は lint → test → build、backend は pytest のみ。依存パッケージはキャッシュして高速化。

**Tech Stack:** GitHub Actions, Node 20 (npm), Python 3.10 (uv), Vitest, pytest, ESLint, Next.js

---

## File Structure

| 操作 | パス | 役割 |
|------|------|------|
| Create | `.github/workflows/ci.yml` | CI ワークフロー定義 |

---

### Task 1: GitHub Actions ワークフローを作成する

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: `.github/workflows/` ディレクトリを作成する**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: `ci.yml` を作成する**

以下の内容で `.github/workflows/ci.yml` を作成する:

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

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test

      - name: Build
        run: npm run build

  backend-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.10"

      - uses: astral-sh/setup-uv@v5
        with:
          enable-cache: true
          cache-dependency-glob: "backend/uv.lock"

      - name: Install dependencies
        run: uv sync --project backend

      - name: Test
        run: uv run --project backend pytest backend
```

- [ ] **Step 3: YAML の文法を確認する**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 4: コミットする**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for PR testing"
```

---

### Task 2: 動作確認

- [ ] **Step 1: ローカルで frontend の各コマンドが通ることを確認する**

```bash
cd frontend && npm run lint && npm test && npm run build
```

Expected: 3コマンドすべてが 0 exit で完了

- [ ] **Step 2: ローカルで backend のテストが通ることを確認する**

```bash
uv run --project backend pytest backend
```

Expected: `passed` が表示され、エラーなし

- [ ] **Step 3: PR を作成してワークフローが動くことを確認する**

GitHub 上で main ブランチ向けに任意の PR を作成し、Actions タブで `CI` ワークフローが起動し、`frontend-ci` と `backend-ci` が並列実行されることを確認する。

両ジョブが緑 (✓) になれば完了。
