"""add tags to typing questions

Revision ID: 20260322_0002
Revises: 20260321_0001
Create Date: 2026-03-22 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260322_0002"
down_revision = "20260321_0001"
branch_labels = None
depends_on = None


question_types_table = sa.table(
    "question_types",
    sa.column("id", sa.Integer()),
    sa.column("code", sa.String()),
)

typing_questions_table = sa.table(
    "typing_questions",
    sa.column("id", sa.Integer()),
    sa.column("question_type_id", sa.Integer()),
)

tags_table = sa.table(
    "tags",
    sa.column("id", sa.Integer()),
    sa.column("code", sa.String()),
)

typing_question_tags_table = sa.table(
    "typing_question_tags",
    sa.column("question_id", sa.Integer()),
    sa.column("tag_id", sa.Integer()),
)


def _normalize_legacy_tag(code: str) -> str | None:
    normalized_code = code.strip().lower()
    return normalized_code or None  # 空白だけの legacy 値は backfill 対象から除外する


def upgrade() -> None:
    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )  # 自由タグを正規化コードで一意管理する
    op.create_index(op.f("ix_tags_code"), "tags", ["code"], unique=False)

    op.create_table(
        "typing_question_tags",
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["question_id"], ["typing_questions.id"]),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"]),
        sa.PrimaryKeyConstraint("question_id", "tag_id"),
    )  # 問題とタグの多対多関連を保持する
    op.create_index(op.f("ix_typing_question_tags_tag_id"), "typing_question_tags", ["tag_id"], unique=False)

    connection = op.get_bind()
    question_type_rows = connection.execute(
        sa.select(question_types_table.c.id, question_types_table.c.code)
    ).fetchall()
    normalized_tags_by_type_id = {
        int(question_type_id): normalized_code
        for question_type_id, code in question_type_rows
        for normalized_code in [_normalize_legacy_tag(str(code))]
        if normalized_code is not None
    }

    unique_tags = sorted(set(normalized_tags_by_type_id.values()))
    if unique_tags:
        op.bulk_insert(
            tags_table,
            [{"code": tag_code} for tag_code in unique_tags],
        )  # 既存の question_type をタグとして backfill できるよう先にタグを投入する

    tag_rows = connection.execute(sa.select(tags_table.c.id, tags_table.c.code)).fetchall()
    tag_id_by_code = {str(code): int(tag_id) for tag_id, code in tag_rows}

    question_rows = connection.execute(
        sa.select(typing_questions_table.c.id, typing_questions_table.c.question_type_id)
    ).fetchall()
    typing_question_tags = [
        {
            "question_id": int(question_id),
            "tag_id": tag_id_by_code[normalized_tags_by_type_id[int(question_type_id)]],
        }
        for question_id, question_type_id in question_rows
        if int(question_type_id) in normalized_tags_by_type_id
    ]

    if typing_question_tags:
        op.bulk_insert(
            typing_question_tags_table,
            typing_question_tags,
        )  # 既存問題へ legacy question_type タグを関連付ける


def downgrade() -> None:
    op.drop_index(op.f("ix_typing_question_tags_tag_id"), table_name="typing_question_tags")
    op.drop_table("typing_question_tags")
    op.drop_index(op.f("ix_tags_code"), table_name="tags")
    op.drop_table("tags")
