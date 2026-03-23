from backend.commands.export_openapi import parse_args


def test_parse_args_defaults_output_to_backend_docs() -> None:
    args = parse_args([])  # 引数未指定時の既定値を確認する

    assert args.output == "backend/docs/openapi.json"  # OpenAPI spec の既定出力先を docs 配下へ固定する
