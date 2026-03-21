from __future__ import annotations

from pathlib import Path
import sys

from alembic import context
from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel


PROJECT_ROOT = Path(__file__).resolve().parents[2]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))  # backend パッケージを import できるようにする

from backend.infrastructure.sqlmodel import models  # noqa: F401  # メタデータ登録のためモデル import が必要


config = context.config

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()  # DB 接続なしで SQL を生成する


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()  # DB に対して revision を適用する


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
