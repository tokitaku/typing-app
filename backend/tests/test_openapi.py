import json

from backend.openapi import build_openapi_schema, write_openapi_schema


def test_build_openapi_schema_includes_core_metadata() -> None:
    schema = build_openapi_schema()

    assert schema["openapi"].startswith("3.")  # OpenAPI 3 系で出力されることを確認する
    assert schema["info"]["title"] == "Typing App API"  # 既存 API タイトルが spec に反映されることを確認する
    assert "/quizzes" in schema["paths"]  # 主要エンドポイントが spec に含まれることを確認する
    assert "/study-results" in schema["paths"]  # POST エンドポイントも含まれることを確認する


def test_write_openapi_schema_persists_json_file(tmp_path) -> None:
    output_path = tmp_path / "openapi.json"

    write_openapi_schema(output_path)

    saved_schema = json.loads(output_path.read_text())  # 保存した JSON を読み直して整合性を確認する
    assert saved_schema["info"]["title"] == "Typing App API"  # 保存内容にも同じ metadata が入ることを確認する
    assert "/study-results/latest" in saved_schema["paths"]  # 既存の GET エンドポイントが保存対象に含まれることを確認する
