"""drop eiken level internals

Revision ID: 20260322_0003
Revises: 20260322_0002
Create Date: 2026-03-22 12:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260322_0003"
down_revision = "20260322_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    if "typing_questions" in table_names:
        column_names = {column["name"] for column in inspector.get_columns("typing_questions")}
        if "eiken_level_id" in column_names:
            index_names = {index["name"] for index in inspector.get_indexes("typing_questions")}
            with op.batch_alter_table("typing_questions") as batch_op:
                if "ix_typing_questions_eiken_level_id" in index_names:
                    batch_op.drop_index("ix_typing_questions_eiken_level_id")
                batch_op.drop_column("eiken_level_id")  # 問題テーブルから英検級 FK を除去する

    if "eiken_levels" in table_names:
        index_names = {index["name"] for index in inspector.get_indexes("eiken_levels")}
        if "ix_eiken_levels_sort_order" in index_names:
            op.drop_index("ix_eiken_levels_sort_order", table_name="eiken_levels")
        if "ix_eiken_levels_code" in index_names:
            op.drop_index("ix_eiken_levels_code", table_name="eiken_levels")
        op.drop_table("eiken_levels")  # 英検級マスタ自体を除去する


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    if "eiken_levels" not in table_names:
        op.create_table(
            "eiken_levels",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("code", sa.String(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_eiken_levels_code", "eiken_levels", ["code"], unique=False)
        op.create_index("ix_eiken_levels_sort_order", "eiken_levels", ["sort_order"], unique=False)
        op.bulk_insert(
            sa.table(
                "eiken_levels",
                sa.column("id", sa.Integer()),
                sa.column("code", sa.String()),
                sa.column("name", sa.String()),
                sa.column("sort_order", sa.Integer()),
            ),
            [{"id": 1, "code": "3", "name": "英検3級", "sort_order": 1}],
        )  # downgrade 用の最小データを戻す

    if "typing_questions" in table_names:
        column_names = {column["name"] for column in inspector.get_columns("typing_questions")}
        if "eiken_level_id" not in column_names:
            with op.batch_alter_table("typing_questions") as batch_op:
                batch_op.add_column(sa.Column("eiken_level_id", sa.Integer(), nullable=True))
                batch_op.create_index("ix_typing_questions_eiken_level_id", ["eiken_level_id"], unique=False)
                batch_op.create_foreign_key(
                    "fk_typing_questions_eiken_level_id_eiken_levels",
                    "eiken_levels",
                    ["eiken_level_id"],
                    ["id"],
                )
            op.execute("UPDATE typing_questions SET eiken_level_id = 1 WHERE eiken_level_id IS NULL")
