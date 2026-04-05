import json
from pathlib import Path
from typing import Any

from backend.main import app


def build_openapi_schema() -> dict[str, Any]:
    return app.openapi()  # composition root が組み立てた app から schema を取得する


def write_openapi_schema(output_path: str | Path) -> Path:
    path = Path(output_path)
    schema = build_openapi_schema()

    path.parent.mkdir(parents=True, exist_ok=True)  # 出力先ディレクトリがなければ先に作成する
    path.write_text(
        json.dumps(schema, ensure_ascii=False, indent=2) + "\n",  # 読みやすい整形 JSON で保存する
        encoding="utf-8",
    )
    return path
