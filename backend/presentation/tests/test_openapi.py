import json

from backend.presentation.openapi import build_openapi_schema, write_openapi_schema


def test_build_openapi_schema_includes_core_metadata() -> None:
    schema = build_openapi_schema()
    question_parameters = schema["paths"]["/questions"]["get"].get("parameters", [])
    question_response_properties = schema["components"]["schemas"]["QuestionResponse"]["properties"]
    study_result_properties = schema["components"]["schemas"]["StudyResultRequest"]["properties"]

    assert schema["openapi"].startswith("3.")  # OpenAPI 3 系で出力されることを確認する
    assert schema["info"]["title"] == "Typing App API"  # 既存 API タイトルが spec に反映されることを確認する
    assert "/quizzes" not in schema["paths"]  # issue #60 の完了条件として quizzes API が spec から除去されることを確認する
    assert "/study-results" in schema["paths"]  # POST エンドポイントも含まれることを確認する
    assert all(parameter["name"] != "eiken_levels" for parameter in question_parameters)  # 一覧 query から英検級フィルタが除去されることを確認する
    assert "eikenLevel" not in question_response_properties  # レスポンス契約から英検級が除去されることを確認する
    assert study_result_properties["created_at"]["format"] == "date-time"  # StudyResult の日時項目が OpenAPI 上も date-time として公開されることを確認する


def test_write_openapi_schema_persists_json_file(tmp_path) -> None:
    output_path = tmp_path / "openapi.json"

    write_openapi_schema(output_path)

    saved_schema = json.loads(output_path.read_text())  # 保存した JSON を読み直して整合性を確認する
    assert saved_schema["info"]["title"] == "Typing App API"  # 保存内容にも同じ metadata が入ることを確認する
    assert "/study-results/latest" in saved_schema["paths"]  # 既存の GET エンドポイントが保存対象に含まれることを確認する
