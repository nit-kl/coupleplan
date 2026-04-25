# P1-1 会員・ペア連携 API 仕様

最終更新: 2026-04-25

## 目的

`P1-1` の範囲（会員、カップル作成、招待、ペア成立）を先にAPI契約として固定し、UI実装とバックエンド実装の並行作業を可能にする。

## 参照

- OpenAPI: [../apps/api/openapi.yaml](../apps/api/openapi.yaml)
- ADR:
  - [0002-authentication-email-otp.md](./adr/0002-authentication-email-otp.md)
  - [0003-core-entities-couple-invite.md](./adr/0003-core-entities-couple-invite.md)

## 対象エンドポイント

- `POST /auth/otp/request`
- `POST /auth/otp/verify`
- `GET /users/me`
- `PATCH /users/me`
- `POST /couples`
- `GET /couples/me`
- `POST /couples/invites`
- `POST /couples/invites/{code}/accept`

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
