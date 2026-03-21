# Backend ER Diagram

以下は、バックエンドの `SQLModel` 定義と migration を元にした ER 図です。

```mermaid
erDiagram
    EIKEN_LEVELS ||--o{ TYPING_QUESTIONS : has
    QUESTION_TYPES ||--o{ TYPING_QUESTIONS : classifies

    EIKEN_LEVELS {
        int id PK
        string code
        string name
        int sort_order
    }

    QUESTION_TYPES {
        int id PK
        string code
        string name
    }

    TYPING_QUESTIONS {
        int id PK
        int eiken_level_id FK
        int question_type_id FK
        string english_text
        string japanese_text
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    STUDY_RESULTS {
        int id PK
        string mode
        int total_questions
        int correct_rate
        int mistakes
        int average_time
        string created_at
    }
```

補足:
- `EIKEN_LEVELS` 1 件に対して `TYPING_QUESTIONS` が複数紐づきます。
- `QUESTION_TYPES` 1 件に対して `TYPING_QUESTIONS` が複数紐づきます。
- `typing_questions` は `eiken_levels` と `question_types` を参照します。
- `study_results` は現状、他テーブルへの外部キーを持たない独立テーブルです。
