# P1-1 会員・ペア連携 API 仕様

最終更新: 2026-04-26

## 目的

`P1-1` の範囲（会員、カップル作成、招待、ペア成立）を先にAPI契約として固定し、UI実装とバックエンド実装の並行作業を可能にする。

## 参照

- OpenAPI: [../apps/api/openapi.yaml](../apps/api/openapi.yaml)
- 手動テスト: [P1-1_手動テスト.md](./P1-1_手動テスト.md)
- 品質ゲート: ルート `package.json` の `npm run ci:pr`（lint + typecheck + `web:build` + `api:smoke`）
- ADR:
  - [0002-authentication-email-otp.md](./adr/0002-authentication-email-otp.md)
  - [0003-core-entities-couple-invite.md](./adr/0003-core-entities-couple-invite.md)
  - [0004-vite-hono-architecture.md](./adr/0004-vite-hono-architecture.md)
  - 永続化: [0005-database-d1.md](./adr/0005-database-d1.md)（本番/Staging は D1 ＋ Worker。`npm run api:dev` は引き続き Node ＋インメモリを正とする）

## 対象エンドポイント

- `POST /auth/otp/request`
- `POST /auth/otp/verify`
- `GET /users/me`
- `PATCH /users/me`
- `POST /couples`
- `GET /couples/me`
- `POST /couples/invites`
- `POST /couples/invites/{code}/accept`

## 実装メモ（2026-04-26 時点）

- API 契約: [apps/api/openapi.yaml](../apps/api/openapi.yaml)
- エントリ: ローカル [apps/api/src/server.ts](../apps/api/src/server.ts)（[apps/api/src/app.ts](../apps/api/src/app.ts) で `AppRepository` 注入）。本番/検証: [apps/api/src/worker.ts](../apps/api/src/worker.ts) ＋ [apps/api/wrangler.toml](../apps/api/wrangler.toml)
- 実行: `npm run api:dev`（`PORT` 省略時 8787）。D1/Worker: `npm run api:dev:worker`（`apps/api` 前提の wrangler 設定）
- 型チェック: `npm run api:typecheck`
- スモーク: `npm run api:smoke`（2ユーザー分の OTP〜`accept`。**`active`・メンバー2人**を検証）
- スモーク実装: [scripts/api-smoke-test.mjs](../scripts/api-smoke-test.mjs)（`debugCode` 利用のため、スモーク実行時は Resend 未設定または dev 挙動が前提）
- UI（Vite + TypeScript）: [apps/web/src/main.ts](../apps/web/src/main.ts)、オンボーディングは `apps/web/src/features/onboarding/*`
- 開発: `npm run web:dev` / `npm run web:typecheck`

## UI: 招待まわりの受け入れ

- 起動画面で **招待者**（コード発行）と **被招待者**（コード入力）を明示的に分岐する
- 被招待者フローでは、カップル新規作成・自前の `CP-` 表示は**不要**（API上も `POST /couples` なし → `POST .../accept`）
- 招待者は、相手が参加するまで **「完了」扱いに飛ばさず**、必要なら `GET /couples/me` による**確認**で `active` を待つ

## プロトタイプの扱い

- [prototype/index.html](../prototype/index.html) は **要件を固める目的のアーティファクト** として扱う。
- API 動作確認は `apps/api` 側で行い、プロトタイプ HTML は本格実装の検証手段に使わない。

## 最低ユースケース

1. メール OTP でログイン
2. 表示名を登録
3. カップルを作成（`pending`）
4. 招待コードを発行
5. 相手が招待コードを受諾
6. カップル状態が `active` になる

## API 設計ルール（MVP）

- 認証が必要な API は `Authorization: Bearer <accessToken>` 必須
- トークンはサーバー発行の不連続 ID（`sessions` テーブル。JWT ではない）
- 失敗時は HTTP ステータスと `code` フィールドを返す
- ログに OTP 値や秘密情報を出さない
- ステージング/本番で同一 OpenAPI 契約を維持する。CORS は `ALLOWED_ORIGINS`（カンマ区切り）で制御

## 認証の補足（本番以降の前提）

- **メール**: `RESEND_API_KEY` 等が設定されれば Resend 経由で送信。未設定時はレスポンスの `debugCode` で受け入れ可能（本番＋再送有効化時は平文 `debugCode` を返さない。検証用に `ALLOW_DEBUG_OTP` を併用可）
- **レート**: メールあたり 15 分窓で 5 回超は `429`（実装基準。文言・閾値の製品合意は任意）
- **監査**: D1 利用時 `auth_audit` テーブルに主要イベント

## 未決・任意

- 再送制限の文言・国際化
- 将来 JWT 化の要否

## P1-1 完了条件（改定）

以下を満たすまで `P1-1` は完了にしない。

1. API: `openapi` と実装が一致し、`api:typecheck` / `api:smoke` が通る
2. UI: 要件確認用プロトタイプとは別に、`apps/web` 側で会員・招待・受諾の本実装が存在する（実装済み）
3. アーキテクチャ: API 実装がレイヤ分割（route / usecase / repository）で整理される
4. 受け入れ: 手動テストまたは同等の E2E で、会員→ペア成立が再現可能
