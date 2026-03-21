.PHONY: setup dev down test test-frontend test-backend lint build openapi

setup:
	cd frontend && npm ci
	uv sync --project backend

dev:
	docker compose up --build

down:
	docker compose down

test: test-frontend test-backend

test-frontend:
	cd frontend && npm test

test-backend:
	uv run --project backend pytest backend/tests

lint:
	cd frontend && npm run lint

build:
	cd frontend && npm run build

openapi:
	uv run --project backend python -m backend.openapi --output backend/openapi.json
