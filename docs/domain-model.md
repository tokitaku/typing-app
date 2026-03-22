# Backend Domain Model

以下は、`backend/domain/entities.py` と `backend/domain/repositories.py` を元にしたドメインモデル図です。

```mermaid
classDiagram
    direction LR

    class StudyMode {
        <<enumeration>>
        LEARN
        REVIEW
    }

    class QuestionType {
        <<enumeration>>
        WORD
        SENTENCE
    }

    class Question {
        <<entity>>
        +id: int | None
        +eiken_level_code: str
        +question_type: QuestionType
        +english: str
        +japanese: str
        +is_active: bool
    }

    class StudyResult {
        <<entity>>
        +mode: StudyMode
        +total_questions: int
        +correct_rate: int
        +mistakes: int
        +average_time: int
        +created_at: str
    }

    class DailyStudySummary {
        <<entity>>
        +date: str
        +sessions: int
        +solved_problems: int
    }

    class QuestionRepository {
        <<interface>>
        +list_questions(eiken_level_codes, question_type_codes, include_inactive) list~Question~
        +create(question) Question
        +update(question_id, updates) Question | None
        +deactivate(question_id) bool
    }

    class StudyResultRepository {
        <<interface>>
        +save(result) StudyResult
        +get_latest() StudyResult | None
        +get_today_summary(target_date) DailyStudySummary
    }

    Question --> QuestionType : uses
    StudyResult --> StudyMode : uses
    QuestionRepository ..> Question : manages
    QuestionRepository ..> QuestionType : filters by
    StudyResultRepository ..> StudyResult : persists
    StudyResultRepository ..> DailyStudySummary : builds
```

補足:
- `Question` は `QuestionType` を保持し、出題種別を表現します。
- `StudyResult` は `StudyMode` を保持し、学習モードごとの結果を表現します。
- `QuestionRepository` は `Question` の検索・作成・更新・無効化を担当します。
- `StudyResultRepository` は `StudyResult` の保存と、日次集計 `DailyStudySummary` の取得を担当します。
