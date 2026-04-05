# Backend Domain Model

以下は、`backend/domain/entities.py`、`backend/domain/value_objects.py`、`backend/domain/repositories.py` を元にしたドメインモデル図です。

```mermaid
classDiagram
    direction LR

    class StudyMode {
        <<enumeration>>
        LEARN
        REVIEW
    }

    class QuestionId {
        <<value object>>
        +value: int
        __post_init__: >= 1 を保証
    }

    class QuestionText {
        <<value object>>
        +value: str
        __post_init__: strip後に非空白を保証
    }

    class TagCollection {
        <<value object>>
        +value: tuple~str~
        __post_init__: normalize_tagsで正規化・重複排除
    }

    class TotalQuestions {
        <<value object>>
        +value: int
        __post_init__: >= 1 を保証
    }

    class CorrectRate {
        <<value object>>
        +value: int
        __post_init__: 0 <= x <= 100 を保証
    }

    class MistakeCount {
        <<value object>>
        +value: int
        __post_init__: >= 0 を保証
    }

    class AverageTime {
        <<value object>>
        +value: int
        __post_init__: >= 0 を保証
    }

    class Question {
        <<entity>>
        +id: QuestionId | None
        +english: QuestionText
        +japanese: QuestionText
        +is_active: bool
        +tags: TagCollection
    }

    class QuestionPatch {
        <<entity>>
        +english: QuestionText | None
        +japanese: QuestionText | None
        +is_active: bool | None
        +tags: TagCollection | None
    }

    class StudyResult {
        <<entity>>
        +mode: StudyMode
        +total_questions: TotalQuestions
        +correct_rate: CorrectRate
        +mistakes: MistakeCount
        +average_time: AverageTime
        +created_at: datetime
    }

    class DailyStudySummary {
        <<entity>>
        +date: str
        +sessions: int
        +solved_problems: int
    }

    class QuestionRepository {
        <<interface>>
        +list_questions(tag_codes, include_inactive) list~Question~
        +create(question) Question
        +update(question_id: QuestionId, patch: QuestionPatch) Question | None
        +deactivate(question_id: QuestionId) bool
        +list_tags() list~str~
    }

    class StudyResultRepository {
        <<interface>>
        +save(result) StudyResult
        +get_latest() StudyResult | None
        +get_today_summary(target_date) DailyStudySummary
    }

    Question --> QuestionId : uses
    Question --> QuestionText : uses
    Question --> TagCollection : uses
    QuestionPatch --> QuestionText : uses
    QuestionPatch --> TagCollection : uses
    StudyResult --> StudyMode : uses
    StudyResult --> TotalQuestions : uses
    StudyResult --> CorrectRate : uses
    StudyResult --> MistakeCount : uses
    StudyResult --> AverageTime : uses
    QuestionRepository ..> Question : manages
    QuestionRepository ..> QuestionPatch : uses
    QuestionRepository ..> QuestionId : uses
    StudyResultRepository ..> StudyResult : persists
    StudyResultRepository ..> DailyStudySummary : builds
```

補足:
- `Question` と `StudyResult` は値オブジェクトによって生成時の不変条件を自己保証する。不正な状態は `__post_init__` が `ValueError` を送出することで防ぐ。
- `Question.id` は `QuestionId` 値オブジェクトで表現し、永続化前は `None`、永続化後は `>= 1` の整数値を持つ。
- `QuestionPatch` は部分更新用のエンティティで、`None` フィールドは「変更なし」を意味する。
- `Question` は自由タグを 0 件以上保持し、学習者が自分の目的に合わせて分類できます。
- タグは学習者が自由に作成・付与でき、出題条件と教材分類の両方に利用されます。
- `StudyResult` は `StudyMode` を保持し、学習モードごとの結果を表現します。
- `QuestionRepository` は `Question` の検索・作成・更新・無効化を担当し、タグ条件で検索できます。
- `QuestionRepository.list_tags()` は登録済みの全タグを返し、UI でのタグ選択に利用されます。
- `StudyResultRepository` は `StudyResult` の保存と、日次集計 `DailyStudySummary` の取得を担当します。
- 出題用の独立した `Quiz` エンティティは持たず、学習導線も `Question` を単一ソースとして扱います。
