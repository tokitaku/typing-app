import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from backend.main import create_app


@pytest.fixture
def client() -> TestClient:
    # DB 初期化をモックして実 DB を使わずにテストする
    with patch("backend.presentation.api.bootstrap_database"):
        # create_app に database_url を渡さず、環境変数の既定値を使う
        # bootstrap_database がモックされているため実際の DB 接続は発生しない
        with TestClient(create_app()) as test_client:
            yield test_client
