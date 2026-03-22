from backend.application.dtos import (
    CreateQuestionCommand,
    ListQuestionsQuery,
    UpdateQuestionCommand,
)
from backend.application.usecases import create_question, list_questions, update_question
from backend.domain.entities import Question, QuestionType
from backend.application.tests.fakes import FakeQuestionRepository

def test_list_questions_use_case_includes_inactive_by_default() -> None:
    repository = FakeQuestionRepository(
        [
            Question(id=1, question_type=QuestionType.WORD, english="cat", japanese="猫", is_active=True),
            Question(id=2, question_type=QuestionType.WORD, english="dog", japanese="犬", is_active=False),
        ]
    )

    result = list_questions(repository, ListQuestionsQuery(include_inactive=True))

    assert len(result) == 2  # include_inactive=True の仕様通り、無効問題も含めて返却されることを検証


def test_list_questions_use_case_with_type_filter() -> None:
    repository = FakeQuestionRepository(
        [
            Question(id=1, question_type=QuestionType.WORD, english="forest", japanese="森", is_active=True),
            Question(id=2, question_type=QuestionType.SENTENCE, english="The forest is quiet.", japanese="森は静かだ。", is_active=True),
            Question(id=3, question_type=QuestionType.WORD, english="acquire", japanese="習得する", is_active=True),
        ]
    )

    result = list_questions(
        repository,
        ListQuestionsQuery(question_type_codes=["word"]),
    )

    assert len(result) == 2
    assert all(question.type == "word" for question in result)  # 種別フィルタだけで公開 DTO を絞り込めることを検証
    assert all(not hasattr(question, "eikenLevel") for question in result)  # 公開 DTO に英検級が露出しないことを検証


def test_list_questions_use_case_with_tag_filter() -> None:
    repository = FakeQuestionRepository(
        [
            Question(
                id=1,
                question_type=QuestionType.WORD,
                english="debate",
                japanese="討論",
                is_active=True,
                tags=("eiken", "writing"),
            ),
            Question(
                id=2,
                question_type=QuestionType.SENTENCE,
                english="We discussed climate policy.",
                japanese="私たちは気候政策を議論した。",
                is_active=True,
                tags=("environment",),
            ),
        ]
    )

    result = list_questions(
        repository,
        ListQuestionsQuery(tag_codes=["WRITING"]),
    )

    assert len(result) == 1
    assert result[0].english == "debate"
    assert result[0].tags == ["eiken", "writing"]  # タグ条件は正規化された値で照合し、レスポンスにもタグ一覧を含めることを検証


def test_create_question_use_case() -> None:
    repository = FakeQuestionRepository([])

    result = create_question(
        repository,
        CreateQuestionCommand(
            question_type="sentence",
            english="I have been studying English for three years.",
            japanese="私は3年間英語を勉強し続けている。",
        ),
    )

    assert result.type == "sentence"
    assert result.english == "I have been studying English for three years."
    assert result.isActive is True  # ビジネスルールとして新規作成時は必ず有効状態で保存されることを検証
    assert not hasattr(result, "eikenLevel")  # 公開 DTO から英検級が除去されることを検証


def test_create_question_use_case_normalizes_tags() -> None:
    repository = FakeQuestionRepository([])

    result = create_question(
        repository,
        CreateQuestionCommand(
            question_type="word",
            english="Perspective",
            japanese="視点",
            tags=[" Essay ", "essay", "EIKEN "],
        ),
    )

    assert result.tags == ["essay", "eiken"]  # 前後空白除去と大小文字の揺れ吸収、重複排除が保存前に行われることを検証


def test_update_question_use_case_updates_fields() -> None:
    repository = FakeQuestionRepository(
        [
            Question(id=10, question_type=QuestionType.WORD, english="river", japanese="川", is_active=True),
        ]
    )

    result = update_question(
        repository,
        10,
        UpdateQuestionCommand(english="sea", japanese="海"),
    )

    assert result is not None
    assert result.english == "sea"
    assert result.japanese == "海"
    assert not hasattr(result, "eikenLevel")  # 公開 DTO から英検級が除去されることを検証


def test_update_question_use_case_replaces_tags() -> None:
    repository = FakeQuestionRepository(
        [
            Question(
                id=10,
                question_type=QuestionType.WORD,
                english="river",
                japanese="川",
                is_active=True,
                tags=("nature",),
            ),
        ]
    )

    result = update_question(
        repository,
        10,
        UpdateQuestionCommand(tags=[" Business ", "business", "news"]),
    )

    assert result is not None
    assert result.tags == ["business", "news"]  # 更新時もタグの正規化と重複排除を行い、全置換することを検証


def test_update_question_use_case_returns_none_for_unknown_id() -> None:
    repository = FakeQuestionRepository([])

    result = update_question(repository, 999, UpdateQuestionCommand(english="ghost"))

    assert result is None  # エラー処理の仕様通り、存在しない ID に対しては None を返すことを検証
