# 0008. 同一端末の再ログインは30日セッションでOTPを省略する

## ステータス

置換（[0009](./0009-httpOnly-refresh-token-auth.md)）

## コンテキスト

- メールOTPは安全だが、毎回のコード入力は再ログインUXを悪化させる。
- MVPでは認証基盤を大きく変えず、既存 `accessToken` ベースの構成を維持したい。
- まずは「同一端末で最近認証済みなら再入力を減らす」改善を優先する。

## 決定

- Webクライアントは `accessToken` を `localStorage` に保存し、発行時刻から30日間は再利用する。
- アプリ起動時に保存トークンが有効期限内なら `GET /users/me` で自動ログインを試行する。
- 自動ログインに失敗（401等）した場合は保存トークンを破棄し、従来どおりOTPフローへ戻す。
- 退会時はローカル保存トークンを必ず削除する。

## 結果

### メリット

- 30日以内の再訪時はOTP入力を省略でき、再ログイン体験が改善する。
- API追加なしで既存構成に最小差分で導入できる。

### トレードオフ

- `localStorage` 保持のため、共有端末ではブラウザ利用者がそのままアクセスできる可能性がある。
- XSS耐性の観点では、将来は HttpOnly Cookie + Refresh Token 方式に移行する余地を残す。

## 関連

- [開発計画書.md](../開発計画書.md)
- [0002-authentication-email-otp.md](./0002-authentication-email-otp.md)
- [0004-vite-hono-architecture.md](./0004-vite-hono-architecture.md)
