from contextlib import asynccontextmanager  # FastAPI lifespan に使う
from datetime import datetime, timezone  # 日時検証と日次集計に使う
from typing import Literal  # Pydantic の制約型に使う

from fastapi import FastAPI, HTTPException, Query, Response, status  # API 本体に使う
from fastapi.middleware.cors import CORSMiddleware  # CORS 設定に使う
from pydantic import BaseModel, Field, field_validator  # リクエスト/レスポンス検証に使う

from backend.database import get_database_url, init_database  # DB 初期化に使う
from backend.repository import (
    create_question,  # 問題作成に使う
    deactivate_question,  # 問題の論理削除に使う
    get_latest_study_result,  # 最新の学習結果取得に使う
    get_today_study_summary,  # 日次集計取得に使う
    insert_study_result,  # 学習結果保存に使う
    list_questions,  # 管理用問題一覧に使う
    list_quizzes,  # 出題一覧に使う
    migrate_legacy_words,  # 旧 words テーブルの移行に使う
    seed_eiken_levels,  # 英検級マスタ投入に使う
    seed_question_types,  # 種別マスタ投入に使う
    seed_typing_questions,  # 初期問題投入に使う
    update_question,  # 問題更新に使う
)


class QuizResponse(BaseModel):
    id: int  # 問題ID
    type: Literal["word", "sentence"]  # 問題種別
    eikenLevel: str  # 英検級コード
    english: str  # タイピング対象
    japanese: str  # 日本語訳


class QuizListResponse(BaseModel):
    quizzes: list[QuizResponse]  # 出題候補一覧


class QuestionBase(BaseModel):
    eiken_level_code: str = Field(min_length=1)  # 英検級コードを受ける
    question_type: Literal["word", "sentence"]  # 問題種別を受ける
    english: str = Field(min_length=1)  # 英文を受ける
    japanese: str = Field(min_length=1)  # 日本語訳を受ける

    @field_validator("eiken_level_code", "english", "japanese")
    @classmethod
    def validate_non_empty_text(cls, value: str) -> str:
        normalized_value = value.strip()  # 前後空白を除去する

        if normalized_value == "":
            raise ValueError("must not be blank")  # 空白のみを禁止する

        return normalized_value  # 正常値を返す


class QuestionCreate(QuestionBase):
    pass  # 新規作成では必須項目をそのまま使う


class QuestionUpdate(BaseModel):
    eiken_level_code: str | None = Field(default=None, min_length=1)  # 英検級の部分更新を許可する
    question_type: Literal["word", "sentence"] | None = None  # 種別の部分更新を許可する
    english: str | None = Field(default=None, min_length=1)  # 英文の部分更新を許可する
    japanese: str | None = Field(default=None, min_length=1)  # 日本語訳の部分更新を許可する
    is_active: bool | None = None  # 有効フラグの部分更新を許可する

    @field_validator("eiken_level_code", "english", "japanese")
    @classmethod
    def validate_optional_non_empty_text(cls, value: str | None) -> str | None:
        if value is None:
            return None  # 未指定はそのまま許可する

        normalized_value = value.strip()  # 前後空白を除去する

        if normalized_value == "":
            raise ValueError("must not be blank")  # 空白のみを禁止する

        return normalized_value  # 正常値を返す


class QuestionResponse(BaseModel):
    id: int  # 問題ID
    type: Literal["word", "sentence"]  # 問題種別
    eikenLevel: str  # 英検級コード
    english: str  # タイピング対象
    japanese: str  # 日本語訳
    isActive: bool  # 有効フラグ


class QuestionListResponse(BaseModel):
    questions: list[QuestionResponse]  # 管理用の問題一覧


class StudyResult(BaseModel):
    mode: Literal["learn", "review"]  # 学習モード
    total_questions: int = Field(ge=1)  # 出題数
    correct_rate: int = Field(ge=0, le=100)  # 正答率
    mistakes: int = Field(ge=0)  # ミス数
    average_time: int = Field(ge=0)  # 平均入力時間
    created_at: str  # ISO 日時文字列

    @field_validator("created_at")
    @classmethod
    def validate_created_at(cls, value: str) -> str:
        datetime.fromisoformat(value.replace("Z", "+00:00"))  # ISO 形式か確認する
        return value  # 正常値を返す


class DailyStudySummary(BaseModel):
    date: str  # 対象日
    sessions: int  # セッション数
    solvedProblems: int  # 解いた問題数


EIKEN_LEVELS = [
    {"code": "5", "name": "英検5級", "sort_order": 1},  # 初級
    {"code": "4", "name": "英検4級", "sort_order": 2},  # 初級
    {"code": "3", "name": "英検3級", "sort_order": 3},  # 中級
    {"code": "pre2", "name": "英検準2級", "sort_order": 4},  # 中級
    {"code": "2", "name": "英検2級", "sort_order": 5},  # 中上級
    {"code": "pre1", "name": "英検準1級", "sort_order": 6},  # 上級
    {"code": "1", "name": "英検1級", "sort_order": 7},  # 最上級
]

QUESTION_TYPES = [
    {"code": "word", "name": "英単語"},  # 単語タイピング
    {"code": "sentence", "name": "英文章"},  # 文章タイピング
]

INITIAL_QUESTIONS = [
    {"eiken_level_code": "5", "question_type": "word", "english": "apple", "japanese": "りんご"},  # 初期単語
    {"eiken_level_code": "5", "question_type": "word", "english": "library", "japanese": "図書館"},  # 初期単語
    {"eiken_level_code": "4", "question_type": "word", "english": "beautiful", "japanese": "美しい"},  # 初期単語
    {"eiken_level_code": "4", "question_type": "word", "english": "schedule", "japanese": "予定"},  # 初期単語
    {"eiken_level_code": "3", "question_type": "word", "english": "environment", "japanese": "環境"},  # 初期単語
    {"eiken_level_code": "2", "question_type": "word", "english": "confidence", "japanese": "自信"},  # 初期単語
    {"eiken_level_code": "5", "question_type": "sentence", "english": "I drink coffee every morning.", "japanese": "私は毎朝コーヒーを飲みます。"},  # 初期短文
    {"eiken_level_code": "4", "question_type": "sentence", "english": "She studies English after dinner.", "japanese": "彼女は夕食後に英語を勉強します。"},  # 初期短文
    {"eiken_level_code": "3", "question_type": "sentence", "english": "We need to finish this report today.", "japanese": "私たちは今日このレポートを終える必要があります。"},  # 初期短文
    {"eiken_level_code": "pre2", "question_type": "sentence", "english": "The train was delayed because of the rain.", "japanese": "雨のため電車が遅れました。"},  # 初期短文
    {"eiken_level_code": "2", "question_type": "sentence", "english": "Learning a language takes patience and repetition.", "japanese": "言語学習には忍耐と反復が必要です。"},  # 初期短文
]


def _parse_csv_query(value: str | None) -> list[str] | None:
    if value is None:
        return None  # 未指定ならフィルタを掛けない

    parsed_values = [item.strip() for item in value.split(",") if item.strip()]  # CSV を配列へ変換する
    return parsed_values if parsed_values else None  # 空ならフィルタなしにする


def _handle_invalid_master_code(error: ValueError) -> None:
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error  # 不正マスタ指定は 422 に変換する


def create_app(database_url: str | None = None) -> FastAPI:
    resolved_database_url = get_database_url(database_url)  # 実行時の DB URL を決める

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        init_database(resolved_database_url)  # テーブルを初期化する
        seed_eiken_levels(resolved_database_url, EIKEN_LEVELS)  # 英検級マスタを投入する
        seed_question_types(resolved_database_url, QUESTION_TYPES)  # 問題種別マスタを投入する
        migrate_legacy_words(resolved_database_url)  # 旧 words テーブルの単語を新構造へ移行する
        seed_typing_questions(resolved_database_url, INITIAL_QUESTIONS)  # 初期問題を投入する
        yield  # 起動後の処理へ進む

    app = FastAPI(title="Typing App API", lifespan=lifespan)  # アプリ本体を作成する

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],  # フロント開発環境からのアクセスを許可する
        allow_credentials=True,  # 認証付きリクエストも許可する
        allow_methods=["GET", "POST", "PATCH", "DELETE"],  # 使用メソッドを限定する
        allow_headers=["*"],  # 必要ヘッダを許可する
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}  # ヘルスチェック結果を返す

    @app.get("/quizzes", response_model=QuizListResponse)
    def get_quizzes(
        eiken_levels: str | None = Query(default=None),  # 出題対象の英検級を受ける
        question_types: str | None = Query(default=None),  # 出題対象の種別を受ける
    ) -> QuizListResponse:
        try:
            quizzes = list_quizzes(
                resolved_database_url,
                eiken_level_codes=_parse_csv_query(eiken_levels),  # 英検級フィルタを渡す
                question_type_codes=_parse_csv_query(question_types),  # 種別フィルタを渡す
            )
        except ValueError as error:
            _handle_invalid_master_code(error)  # 不正なコードを 422 に変換する

        return QuizListResponse(quizzes=[QuizResponse(**quiz) for quiz in quizzes])  # レスポンス型へ詰める

    @app.get("/questions", response_model=QuestionListResponse)
    def get_questions(
        eiken_levels: str | None = Query(default=None),  # 管理用の英検級フィルタ
        question_types: str | None = Query(default=None),  # 管理用の種別フィルタ
        include_inactive: bool = Query(default=True),  # 無効問題も含めるかを受ける
    ) -> QuestionListResponse:
        try:
            questions = list_questions(
                resolved_database_url,
                eiken_level_codes=_parse_csv_query(eiken_levels),  # 英検級フィルタを渡す
                question_type_codes=_parse_csv_query(question_types),  # 種別フィルタを渡す
                include_inactive=include_inactive,  # 無効問題の含有を制御する
            )
        except ValueError as error:
            _handle_invalid_master_code(error)  # 不正なコードを 422 に変換する

        return QuestionListResponse(
            questions=[QuestionResponse(**question) for question in questions]
        )  # 管理用レスポンスへ詰める

    @app.post("/questions", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
    def post_question(question: QuestionCreate) -> QuestionResponse:
        try:
            saved_question = create_question(
                resolved_database_url,
                question.model_dump(),  # リクエスト内容をそのまま保存する
            )
        except ValueError as error:
            _handle_invalid_master_code(error)  # 不正なコードを 422 に変換する

        return QuestionResponse(**saved_question)  # 保存結果を返す

    @app.patch("/questions/{question_id}", response_model=QuestionResponse)
    def patch_question(question_id: int, question: QuestionUpdate) -> QuestionResponse:
        try:
            saved_question = update_question(
                resolved_database_url,
                question_id,
                question.model_dump(exclude_unset=True, exclude_none=True),  # 指定項目だけ更新する
            )
        except ValueError as error:
            _handle_invalid_master_code(error)  # 不正なコードを 422 に変換する

        if saved_question is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)  # 対象が無ければ 404 を返す

        return QuestionResponse(**saved_question)  # 更新結果を返す

    @app.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_question(question_id: int) -> Response:
        if not deactivate_question(resolved_database_url, question_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)  # 対象が無ければ 404 を返す

        return Response(status_code=status.HTTP_204_NO_CONTENT)  # 論理削除成功を返す

    @app.post("/study-results", response_model=StudyResult, status_code=status.HTTP_201_CREATED)
    def post_study_result(study_result: StudyResult) -> StudyResult:
        saved_result = insert_study_result(
            resolved_database_url,
            study_result.model_dump(),  # 学習結果を保存する
        )
        return StudyResult(**saved_result)  # 保存結果を返す

    @app.get("/study-results/latest", response_model=StudyResult)
    def get_latest_result() -> StudyResult:
        latest_result = get_latest_study_result(resolved_database_url)  # 最新結果を取得する

        if latest_result is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)  # 結果が無ければ 404 を返す

        return StudyResult(**latest_result)  # 最新結果を返す

    @app.get("/study-results/summary/today", response_model=DailyStudySummary)
    def get_today_summary() -> DailyStudySummary:
        today = datetime.now(timezone.utc).date().isoformat()  # UTC 基準の当日を求める
        summary = get_today_study_summary(resolved_database_url, today)  # 日次集計を取得する
        return DailyStudySummary(**summary)  # 集計結果を返す

    return app  # 構成済みアプリを返す


app = create_app()  # Uvicorn の `backend.main:app` 参照用にアプリを公開する
