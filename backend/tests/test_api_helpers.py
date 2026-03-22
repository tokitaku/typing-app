from backend.presentation.api import _parse_csv_query


def test_parse_csv_query_returns_none_for_none() -> None:
    assert _parse_csv_query(None) is None  # クエリパラメータ未指定時はフィルタを適用しないため None を返すことを検証


def test_parse_csv_query_returns_none_for_empty_string() -> None:
    assert _parse_csv_query("") is None  # 空文字は有効な値ではないためフィルタなしと同等に扱う仕様を検証


def test_parse_csv_query_returns_none_for_only_commas() -> None:
    assert _parse_csv_query(",,") is None  # 区切り文字のみで有効な値がない場合はフィルタなしとして扱う仕様を検証


def test_parse_csv_query_strips_whitespace() -> None:
    assert _parse_csv_query(" 3 , 4 ") == ["3", "4"]  # ユーザー入力の利便性のため前後の空白を除去して正規化することを検証


def test_parse_csv_query_ignores_trailing_comma() -> None:
    assert _parse_csv_query("word,") == ["word"]  # 入力ミスによる末尾カンマを許容し空要素は無視する仕様を検証
