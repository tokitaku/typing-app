import pytest
from fastapi.testclient import TestClient

from backend.main import create_app


@pytest.fixture
def client(tmp_path) -> TestClient:
    # テストでは SQLite を使用してテストを高速化・簡素化する
    database_url = f"sqlite:///{tmp_path / 'test.db'}"

    with TestClient(create_app(database_url)) as test_client:
        yield test_client
