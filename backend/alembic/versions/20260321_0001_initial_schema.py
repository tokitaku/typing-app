"""initial schema

Revision ID: 20260321_0001
Revises:
Create Date: 2026-03-21 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260321_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "eiken_levels",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )  # 英検級マスタを作成する
    op.create_index(op.f("ix_eiken_levels_code"), "eiken_levels", ["code"], unique=False)
    op.create_index(op.f("ix_eiken_levels_sort_order"), "eiken_levels", ["sort_order"], unique=False)

    op.create_table(
        "question_types",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.Enum("WORD", "SENTENCE", name="questiontyperecordcode"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )  # 問題種別マスタを作成する
    op.create_index(op.f("ix_question_types_code"), "question_types", ["code"], unique=False)

    op.create_table(
        "study_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("mode", sa.Enum("LEARN", "REVIEW", name="studymoderecord"), nullable=False),
        sa.Column("total_questions", sa.Integer(), nullable=False),
        sa.Column("correct_rate", sa.Integer(), nullable=False),
        sa.Column("mistakes", sa.Integer(), nullable=False),
        sa.Column("average_time", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )  # 学習結果テーブルを作成する

    op.create_table(
        "typing_questions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("eiken_level_id", sa.Integer(), nullable=False),
        sa.Column("question_type_id", sa.Integer(), nullable=False),
        sa.Column("english_text", sa.String(), nullable=False),
        sa.Column("japanese_text", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["eiken_level_id"], ["eiken_levels.id"]),
        sa.ForeignKeyConstraint(["question_type_id"], ["question_types.id"]),
        sa.PrimaryKeyConstraint("id"),
    )  # 出題テーブルを作成する
    op.create_index(op.f("ix_typing_questions_eiken_level_id"), "typing_questions", ["eiken_level_id"], unique=False)
    op.create_index(op.f("ix_typing_questions_english_text"), "typing_questions", ["english_text"], unique=False)
    op.create_index(op.f("ix_typing_questions_is_active"), "typing_questions", ["is_active"], unique=False)
    op.create_index(op.f("ix_typing_questions_question_type_id"), "typing_questions", ["question_type_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_typing_questions_question_type_id"), table_name="typing_questions")
    op.drop_index(op.f("ix_typing_questions_is_active"), table_name="typing_questions")
    op.drop_index(op.f("ix_typing_questions_english_text"), table_name="typing_questions")
    op.drop_index(op.f("ix_typing_questions_eiken_level_id"), table_name="typing_questions")
    op.drop_table("typing_questions")
    op.drop_table("study_results")
    op.drop_index(op.f("ix_question_types_code"), table_name="question_types")
    op.drop_table("question_types")
    op.drop_index(op.f("ix_eiken_levels_sort_order"), table_name="eiken_levels")
    op.drop_index(op.f("ix_eiken_levels_code"), table_name="eiken_levels")
    op.drop_table("eiken_levels")
