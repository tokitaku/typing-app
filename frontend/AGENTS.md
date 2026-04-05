# frontend/AGENTS.md

## 基本方針

- ルートの `AGENTS.md` を前提に、ここではフロントエンド固有の判断だけを補足する。
- ルーティング入口は `src/app`、実装本体は `src/features/*` に置く。
- `src/shared` には再利用が明確なものだけを置く。
- `src/components/ui/` は shadcn/ui が管理する共有 UI プリミティブ（Button, Card など）の置き場所で、原則として手動編集しない。
- `src/lib/` は shadcn が生成する `utils.ts`（`cn` ヘルパーなど）を置く場所。

## 設計方針

- UI コンポーネントは表示責務に寄せ、業務判断、永続化判断、API 呼び出しを直接持ち込まない。
- 状態遷移やユースケースは feature 内の `application` / `hooks`、API は `api`、保存処理は `storage` に分ける。
- feature 固有のドメインモデルは `model/`、タイピングロジックのような複雑な入力処理は `typing/` に分けることができる（study-session が参考実装）。
- 曖昧な `utils` や巨大な hooks を避け、責務を feature 内で閉じる。

## テストと確認

- フロントエンド変更時は少なくとも `npm run test` を基準にし、必要に応じて `npm run lint` と `npm run build` まで実行する。
