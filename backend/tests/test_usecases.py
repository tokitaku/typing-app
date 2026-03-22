from backend.application.dtos import (
    CreateQuestionCommand,
    DailyStudySummaryDto,
    ListQuestionsQuery,
    ListQuizzesQuery,
    QuizDto,
    RecordStudyResultCommand,
    StudyResultDto,
    UpdateQuestionCommand,
)
from backend.application.usecases import (
    create_question,
    get_latest_study_result,
    get_today_study_summary,
    list_questions,
    list_quizzes,
    record_study_result,
    update_question,
)
from backend.domain.entities import DailyStudySummary, Question, QuestionType, StudyMode


class FakeQuestionRepository:
    def __init__(self, questions: list[Question]) -> None:
        self.questions = list(questions)
        self._next_id = max((q.id for q in questions if q.id is not None), default=0) + 1

    def list_questions(
        self,
        *,
        eiken_level_codes: list[str] | None = None,
        question_type_codes: list[QuestionType] | None = None,
        include_inactive: bool = True,
    ) -> list[Question]:
        filtered = self.questions

        if not include_inactive:
            filtered = [question for question in filtered if question.is_active]  # 有効問題だけに絞る

        if eiken_level_codes:
            filtered = [
                question for question in filtered if question.eiken_level_code in eiken_level_codes
            ]  # 英検級で絞る

        if question_type_codes:
            filtered = [
                question for question in filtered if question.question_type in question_type_codes
            ]  # 問題種別で絞る

        return filtered

    def create(self, question: Question) -> Question:
        saved = Question(
            id=self._next_id,
            eiken_level_code=question.eiken_level_code,
            question_type=question.question_type,
            english=question.english,
            japanese=question.japanese,
            is_active=question.is_active,
        )
        self._next_id += 1
        self.questions.append(saved)
        return saved  # DB の自動採番をエミュレートするため連番 ID を割り当てて返す

    def update(self, question_id: int, updates: dict) -> Question | None:
        for i, q in enumerate(self.questions):
            if q.id == question_id:
                updated = Question(
                    id=q.id,
                    eiken_level_code=updates.get("eiken_level_code", q.eiken_level_code),
                    question_type=updates.get("question_type", q.question_type),
                    english=updates.get("english", q.english),
                    japanese=updates.get("japanese", q.japanese),
                    is_active=updates.get("is_active", q.is_active),
                )
                self.questions[i] = updated
                return updated  # リポジトリの実装と同じ戻り値の契約を再現するため更新後のエンティティを返す
        return None  # リポジトリの実装と同じ振る舞いを再現するため存在しない ID は None を返す

    def deactivate(self, question_id: int) -> bool:
        return self.update(question_id, {"is_active": False}) is not None  # is_active フラグによる論理削除をエミュレートする


class FakeStudyResultRepository:
    def __init__(self) -> None:
        self.saved_results: list[StudyResultDto] = []

    def save(self, result: StudyResultDto) -> StudyResultDto:
        self.saved_results.append(result)  # 保存された結果をそのまま記録する
        return result

    def get_latest(self) -> StudyResultDto | None:
        return self.saved_results[-1] if self.saved_results else None  # 最後の要素を最新として返す

    def get_today_summary(self, target_date: str) -> DailyStudySummary:
        solved_problems = sum(
            result.total_questions
            for result in self.saved_results
            if result.created_at.startswith(target_date)
        )
        sessions = sum(
            1 for result in self.saved_results if result.created_at.startswith(target_date)
        )
        return DailyStudySummary(
            date=target_date,
            sessions=sessions,
            solved_problems=solved_problems,
        )  # 当日分だけを集計して返す


def test_list_quizzes_use_case_excludes_inactive_questions() -> None:
    repository = FakeQuestionRepository(
        [
            Question(
                id=1,
                eiken_level_code="5",
                question_type=QuestionType.WORD,
                english="apple",
                japanese="りんご",
                is_active=True,
            ),
            Question(
                id=2,
                eiken_level_code="5",
                question_type=QuestionType.SENTENCE,
                english="I read every day.",
                japanese="私は毎日読書します。",
                is_active=False,
            ),
        ]
    )

    quizzes = list_quizzes(
        repository,
        ListQuizzesQuery(eiken_level_codes=["5"], question_type_codes=["word", "sentence"]),
    )

    assert quizzes == [QuizDto(id=1, type="word", eikenLevel="5", english="apple", japanese="りんご")]


def test_study_result_use_cases_record_and_summarize_results() -> None:
    repository = FakeStudyResultRepository()
    command = RecordStudyResultCommand(
        mode="learn",
        total_questions=10,
        correct_rate=90,
        mistakes=1,
        average_time=1200,
        created_at="2026-03-21T08:00:00+00:00",
    )

    saved = record_study_result(repository, command)
    summary = get_today_study_summary(repository, "2026-03-21")

    assert saved == StudyResultDto(
        mode=StudyMode.LEARN.value,
        total_questions=10,
        correct_rate=90,
        mistakes=1,
        average_time=1200,
        created_at="2026-03-21T08:00:00+00:00",
    )
    assert summary == DailyStudySummaryDto(
        date="2026-03-21",
        sessions=1,
        solvedProblems=10,
    )


# list_questions ユースケースのテスト


def test_list_questions_use_case_includes_inactive_by_default() -> None:
    repository = FakeQuestionRepository(
        [
            Question(id=1, eiken_level_code="5", question_type=QuestionType.WORD, english="cat", japanese="猫", is_active=True),
            Question(id=2, eiken_level_code="5", question_type=QuestionType.WORD, english="dog", japanese="犬", is_active=False),
        ]
    )

    result = list_questions(repository, ListQuestionsQuery(include_inactive=True))

    assert len(result) == 2  # include_inactive=True の仕様通り、無効問題も含めて返却されることを検証


def test_list_questions_use_case_with_eiken_and_type_filter() -> None:
    repository = FakeQuestionRepository(
        [
            Question(id=1, eiken_level_code="3", question_type=QuestionType.WORD, english="forest", japanese="森", is_active=True),
            Question(id=2, eiken_level_code="3", question_type=QuestionType.SENTENCE, english="The forest is quiet.", japanese="森は静かだ。", is_active=True),
            Question(id=3, eiken_level_code="2", question_type=QuestionType.WORD, english="acquire", japanese="習得する", is_active=True),
        ]
    )

    result = list_questions(
        repository,
        ListQuestionsQuery(eiken_level_codes=["3"], question_type_codes=["word"]),
    )

    assert len(result) == 1
    assert result[0].eikenLevel == "3"
    assert result[0].type == "word"  # 複合フィルタの仕様通り、両条件を満たす問題のみが抽出されることを検証


# create_question ユースケースのテスト


def test_create_question_use_case() -> None:
    repository = FakeQuestionRepository([])

    result = create_question(
        repository,
        CreateQuestionCommand(
            eiken_level_code="pre2",
            question_type="sentence",
            english="I have been studying English for three years.",
            japanese="私は3年間英語を勉強し続けている。",
        ),
    )

    assert result.eikenLevel == "pre2"
    assert result.type == "sentence"
    assert result.english == "I have been studying English for three years."
    assert result.isActive is True  # ビジネスルールとして新規作成時は必ず有効状態で保存されることを検証


# update_question ユースケースのテスト


def test_update_question_use_case_updates_fields() -> None:
    repository = FakeQuestionRepository(
        [
            Question(id=10, eiken_level_code="4", question_type=QuestionType.WORD, english="river", japanese="川", is_active=True),
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
    assert result.eikenLevel == "4"  # 部分更新の仕様通り、指定されていないフィールドは既存値を保持することを検証


def test_update_question_use_case_returns_none_for_unknown_id() -> None:
    repository = FakeQuestionRepository([])

    result = update_question(repository, 999, UpdateQuestionCommand(english="ghost"))

    assert result is None  # エラー処理の仕様通り、存在しない ID に対しては None を返すことを検証


# get_latest_study_result ユースケースのテスト


def test_get_latest_study_result_returns_none_when_empty() -> None:
    repository = FakeStudyResultRepository()

    result = get_latest_study_result(repository)

    assert result is None  # 空データ時の仕様通り、学習履歴が存在しない場合は None を返すことを検証
