# backend/tests

バックエンドのテストは本体コード配下へ分散させず、このディレクトリへ集約する。

- `application`: use case 単位のテスト
- `presentation`: FastAPI の API 契約、OpenAPI、HTTP 入出力補助のテスト
- `integration`: アプリ起動、bootstrap、migration など複数層をまたぐテスト
- `support`: テスト専用の fake repository など補助コード

新しいテストを追加するときは、最初に「どの責務を検証しているか」を基準に置き場所を決める。

