from backend.database import get_database_url
from backend.infrastructure.sqlmodel.bootstrap import bootstrap_database
from backend.infrastructure.sqlmodel.repositories import (
    SqlModelQuestionRepository,
    SqlModelStudyResultRepository,
)
from backend.presentation.api import create_app

_database_url = get_database_url()

app = create_app(
    question_repository=SqlModelQuestionRepository(_database_url),
    study_result_repository=SqlModelStudyResultRepository(_database_url),
    on_startup=lambda: bootstrap_database(_database_url),
)  # Uvicorn から参照するエントリポイントを公開する
