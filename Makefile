.PHONY: setup dev down test test-frontend test-backend lint build openapi migrate-backend revision-backend

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
	uv run --project backend pytest backend

migrate-backend:
	uv run --project backend alembic -c backend/alembic.ini upgrade head

revision-backend:
	uv run --project backend alembic -c backend/alembic.ini revision --autogenerate -m "$(message)"

lint:
	cd frontend && npm run lint

build:
	cd frontend && npm run build

openapi:
	uv run --project backend python -m backend.commands.export_openapi --output backend/docs/openapi.json
