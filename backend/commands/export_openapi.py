import argparse

from backend.presentation.openapi import write_openapi_schema


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="FastAPI の OpenAPI spec を JSON として出力します。")
    parser.add_argument(
        "--output",
        default="backend/openapi.json",
        help="出力先の JSON ファイルパス",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    write_openapi_schema(args.output)  # schema 生成と保存は presentation 側の責務へ委譲する


if __name__ == "__main__":
    main()
