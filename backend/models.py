from datetime import datetime, timezone  # 問題の作成日時と更新日時に使う
from enum import Enum  # 列挙値の定義に使う

from sqlmodel import Field, SQLModel  # SQLModel ベースのテーブル定義に使う


class StudyMode(str, Enum):
    LEARN = "learn"  # 通常学習モード
    REVIEW = "review"  # 復習モード


class QuestionTypeCode(str, Enum):
    WORD = "word"  # 英単語タイピング
    SENTENCE = "sentence"  # 英文章タイピング


class EikenLevelRecord(SQLModel, table=True):
    __tablename__ = "eiken_levels"  # 英検級マスタのテーブル名を固定する

    id: int | None = Field(default=None, primary_key=True)  # 主キー
    code: str = Field(index=True)  # 例: "5", "3", "pre2"
    name: str  # 例: "英検3級"
    sort_order: int = Field(index=True)  # UI の表示順に使う


class QuestionTypeRecord(SQLModel, table=True):
    __tablename__ = "question_types"  # 問題種別マスタのテーブル名を固定する

    id: int | None = Field(default=None, primary_key=True)  # 主キー
    code: QuestionTypeCode = Field(index=True)  # word / sentence
    name: str  # 表示名


class TypingQuestionRecord(SQLModel, table=True):
    __tablename__ = "typing_questions"  # 問題本体テーブル

    id: int | None = Field(default=None, primary_key=True)  # 主キー
    eiken_level_id: int = Field(foreign_key="eiken_levels.id", index=True)  # 英検級マスタ参照
    question_type_id: int = Field(foreign_key="question_types.id", index=True)  # 種別マスタ参照
    english_text: str = Field(index=True)  # タイピングする英文
    japanese_text: str  # 日本語訳
    is_active: bool = Field(default=True, index=True)  # 論理削除用の有効フラグ
    created_at: datetime = Field(  # 作成日時
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(  # 更新日時
        default_factory=lambda: datetime.now(timezone.utc)
    )


class StudyResultRecord(SQLModel, table=True):
    __tablename__ = "study_results"  # 学習結果テーブル

    id: int | None = Field(default=None, primary_key=True)  # 主キー
    mode: StudyMode  # learn / review
    total_questions: int  # 出題数
    correct_rate: int  # 正答率
    mistakes: int  # ミス数
    average_time: int  # 平均入力時間
    created_at: str  # 既存互換のため文字列のまま保持する
