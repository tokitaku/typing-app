"""drop question_type_id and question_types table

Revision ID: 20260322_0004
Revises: 20260322_0003
Create Date: 2026-03-22 13:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260322_0004"
down_revision = "20260322_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    if "typing_questions" in table_names:
        column_names = {column["name"] for column in inspector.get_columns("typing_questions")}
        if "question_type_id" in column_names:
            index_names = {index["name"] for index in inspector.get_indexes("typing_questions")}
            with op.batch_alter_table("typing_questions") as batch_op:
                if "ix_typing_questions_question_type_id" in index_names:
                    batch_op.drop_index("ix_typing_questions_question_type_id")
                batch_op.drop_column("question_type_id")  # 問題種別 FK を除去する（タグで代替済み）

    if "question_types" in table_names:
        index_names = {index["name"] for index in inspector.get_indexes("question_types")}
        if "ix_question_types_code" in index_names:
            op.drop_index("ix_question_types_code", table_name="question_types")
        op.drop_table("question_types")  # 問題種別マスタテーブルを除去する


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    if "question_types" not in table_names:
        op.create_table(
            "question_types",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("code", sa.String(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_question_types_code", "question_types", ["code"], unique=False)
        op.bulk_insert(
            sa.table(
                "question_types",
                sa.column("id", sa.Integer()),
                sa.column("code", sa.String()),
                sa.column("name", sa.String()),
            ),
            [
                {"id": 1, "code": "word", "name": "英単語"},
                {"id": 2, "code": "sentence", "name": "英文章"},
            ],
        )  # downgrade 用の最小データを戻す

    if "typing_questions" in table_names:
        column_names = {column["name"] for column in inspector.get_columns("typing_questions")}
        if "question_type_id" not in column_names:
            with op.batch_alter_table("typing_questions") as batch_op:
                batch_op.add_column(sa.Column("question_type_id", sa.Integer(), nullable=True))
                batch_op.create_index("ix_typing_questions_question_type_id", ["question_type_id"], unique=False)
            op.execute("UPDATE typing_questions SET question_type_id = 1 WHERE question_type_id IS NULL")
