from backend.domain.entities import DailyStudySummary, Question, StudyResult


class FakeQuestionRepository:
    def __init__(self, questions: list[Question]) -> None:
        self.questions = list(questions)
        self._next_id = max((q.id for q in questions if q.id is not None), default=0) + 1

    def list_questions(
        self,
        *,
        tag_codes: list[str] | None = None,
        include_inactive: bool = True,
    ) -> list[Question]:
        filtered = self.questions

        if not include_inactive:
            filtered = [question for question in filtered if question.is_active]  # 有効問題だけに絞る

        if tag_codes:
            normalized_codes = {code.lower() for code in tag_codes}
            filtered = [
                question for question in filtered if normalized_codes.intersection(question.tags)
            ]  # タグ一致が 1 件以上ある問題だけを残す

        return filtered

    def create(self, question: Question) -> Question:
        saved = Question(
            id=self._next_id,
            english=question.english,
            japanese=question.japanese,
            is_active=question.is_active,
            tags=question.tags,
        )
        self._next_id += 1
        self.questions.append(saved)
        return saved  # DB の自動採番をエミュレートするため連番 ID を割り当てて返す

    def update(self, question_id: int, updates: dict) -> Question | None:
        for i, q in enumerate(self.questions):
            if q.id == question_id:
                updated = Question(
                    id=q.id,
                    english=updates.get("english", q.english),
                    japanese=updates.get("japanese", q.japanese),
                    is_active=updates.get("is_active", q.is_active),
                    tags=updates.get("tags", q.tags),
                )
                self.questions[i] = updated
                return updated  # リポジトリの実装と同じ戻り値の契約を再現するため更新後のエンティティを返す
        return None  # リポジトリの実装と同じ振る舞いを再現するため存在しない ID は None を返す

    def deactivate(self, question_id: int) -> bool:
        return self.update(question_id, {"is_active": False}) is not None  # is_active フラグによる論理削除をエミュレートする


class FakeStudyResultRepository:
    def __init__(self) -> None:
        self.saved_results: list[StudyResult] = []

    def save(self, result: StudyResult) -> StudyResult:
        self.saved_results.append(result)  # 保存された結果をそのまま記録する
        return result

    def get_latest(self) -> StudyResult | None:
        return self.saved_results[-1] if self.saved_results else None  # 最後の要素を最新として返す

    def get_today_summary(self, target_date: str) -> DailyStudySummary:
        solved_problems = sum(
            result.total_questions
            for result in self.saved_results
            if result.created_at.date().isoformat() == target_date
        )
        sessions = sum(
            1 for result in self.saved_results if result.created_at.date().isoformat() == target_date
        )
        return DailyStudySummary(
            date=target_date,
            sessions=sessions,
            solved_problems=solved_problems,
        )  # 当日分だけを集計して返す
