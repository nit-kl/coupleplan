# P1-1 会員・ペア連携 API 仕様

最終更新: 2026-04-25

## 目的

`P1-1` の範囲（会員、カップル作成、招待、ペア成立）を先にAPI契約として固定し、UI実装とバックエンド実装の並行作業を可能にする。

## 参照

- OpenAPI: [../apps/api/openapi.yaml](../apps/api/openapi.yaml)
- 手動テスト: [P1-1_手動テスト.md](./P1-1_手動テスト.md)
- ADR:
  - [0002-authentication-email-otp.md](./adr/0002-authentication-email-otp.md)
  - [0003-core-entities-couple-invite.md](./adr/0003-core-entities-couple-invite.md)
  - [0004-vite-hono-architecture.md](./adr/0004-vite-hono-architecture.md)

## 対象エンドポイント

- `POST /auth/otp/request`
- `POST /auth/otp/verify`
- `GET /users/me`
- `PATCH /users/me`
- `POST /couples`
- `GET /couples/me`
- `POST /couples/invites`
- `POST /couples/invites/{code}/accept`

## 実装状況（2026-04-25）

- API契約: `apps/api/openapi.yaml`
- Honoサーバー（TypeScript）: `apps/api/src/server.ts`
- 実行コマンド: `npm run api:dev`
- TypeScript設定: `apps/api/tsconfig.json`
- 型チェック: `npm run api:typecheck`
- スモークテスト: `npm run api:smoke`（2ユーザー分のOTP〜`accept` まで。**カップル `active`・メンバー2人**を検証）
- スモークテスト実装: `scripts/api-smoke-test.mjs`
- UI本実装（Vite + TypeScript）: `apps/web/index.html` + `apps/web/src/main.ts`（オンボーディングは `apps/web/src/features/onboarding/*`）
- UI開発サーバー: `npm run web:dev`
- UI型チェック: `npm run web:typecheck`

## UI: 招待まわりの受け入れ

- 起動画面で **招待者**（コード発行）と **被招待者**（コード入力）を明示的に分岐する
- 被招待者フローでは、カップル新規作成・自前の `CP-` 表示は**不要**（API上も `POST /couples` なし → `POST .../accept`）
- 招待者は、相手が参加するまで **「完了」扱いに飛ばさず**、必要なら `GET /couples/me` による**確認**で `active` を待つ

## プロトタイプの扱い

- `prototype/index.html` は **要件を固める目的のアーティファクト** として扱う。
- API動作確認は `apps/api` 側で行い、プロトタイプHTMLは本格実装の検証手段に使わない。

## 最低ユースケース

1. メールOTPでログイン
2. 表示名を登録
3. カップルを作成（`pending`）
4. 招待コードを発行
5. 相手が招待コードを受諾
6. カップル状態が `active` になる

## API設計ルール（MVP）

- 認証が必要なAPIは Bearer token 必須
- 失敗時はHTTPステータスとエラーコードを返す
- ログにOTP値や秘密情報は出力しない
- ステージング/本番で同一契約を維持する

## 未決事項

- トークン方式（JWT固定か、セッションID方式か）
- OTP送信プロバイダ
- レート制限の閾値

## P1-1 完了条件（改定）

以下を満たすまで `P1-1` は完了にしない。

1. API: `openapi` と実装が一致し、`api:typecheck` / `api:smoke` が通る
2. UI: 要件確認用プロトタイプとは別に、`apps/web` 側で会員・招待・受諾の本実装が存在する（実装済み）
3. アーキテクチャ: API実装がレイヤ分割（route/usecase/repository相当）で整理される
4. 受け入れ: 手動テストまたは同等のE2Eで、会員→ペア成立が再現可能
