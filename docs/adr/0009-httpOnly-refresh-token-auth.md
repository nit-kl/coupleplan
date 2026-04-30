# 0009. 再ログインはHttpOnly Cookie + Refresh Token方式を採用する

## ステータス

承認済み

## コンテキスト

- `localStorage` に長期トークンを保持する方式は、XSS時の漏えいリスクが残る。
- 30日以内の再ログイン省略UXを維持しつつ、認証情報の保持をより安全にしたい。

## 決定

- OTP検証成功時に、30日有効の `refresh token` を発行し、`HttpOnly` Cookie で返す。
- フロント起動時は `POST /auth/refresh` でCookieを使って新しい `accessToken` を取得する。
- API利用は従来どおり短命用途の `accessToken`（Bearer）を使用する。
- `POST /auth/logout` で refresh token を失効し、Cookieを削除する。
- 退会時は関連refresh tokenも削除対象に含める。

## 結果

### メリット

- JSからrefresh tokenへ直接アクセスできず、漏えい耐性が向上する。
- UXは「30日以内はOTP省略」を維持できる。

### トレードオフ

- CORSで `credentials` 許可、Cookie属性（`SameSite`/`Secure`）の環境調整が必要になる。
- D1にrefresh token管理テーブルのマイグレーションが追加で必要になる。

## 関連

- [開発計画書.md](../開発計画書.md)
- [0002-authentication-email-otp.md](./0002-authentication-email-otp.md)
- [0005-database-d1.md](./0005-database-d1.md)
- [0008-relogin-30days-local-session.md](./0008-relogin-30days-local-session.md)
