import json
from pathlib import Path
from typing import Any

from backend.main import create_app


def build_openapi_schema() -> dict[str, Any]:
    app = create_app()  # 既存の FastAPI 定義を再利用して schema を組み立てる
    return app.openapi()


def write_openapi_schema(output_path: str | Path) -> Path:
    path = Path(output_path)
    schema = build_openapi_schema()

    path.parent.mkdir(parents=True, exist_ok=True)  # 出力先ディレクトリがなければ先に作成する
    path.write_text(
        json.dumps(schema, ensure_ascii=False, indent=2) + "\n",  # 読みやすい整形 JSON で保存する
        encoding="utf-8",
    )
    return path
