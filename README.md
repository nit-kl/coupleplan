# coupleplan

カップル向けWebアプリ「CouplePlan」の開発リポジトリです。  
企画書とプロトタイプを起点に、本番実装へ移行するための土台を管理します。

## 現在の状態

- 企画: `docs/カップルプラン_企画書.md`
- 開発計画: `docs/開発計画書.md`
- UIプロトタイプ: `prototype/index.html`

## ディレクトリ方針（Phase 0）

- `apps/web` - フロントエンドアプリ
- `apps/api` - APIアプリ
- `packages/shared` - 共有モジュール
- `infra` - インフラ/デプロイ関連
- `scripts` - 補助スクリプト
- `tests/e2e` - E2Eテスト
- `docs` - 企画・計画・ADR
- `prototype` - 本番前のUIプロトタイプ

## 開発

- フロント: `npm run web:dev`（Vite, `VITE_API_BASE` で API ベースURL、例 `http://127.0.0.1:8787`）
- API（ローカル）: `npm run api:dev`（Node + インメモリ DB）
- API（D1/Worker）: `npm run api:dev:worker`（`apps/api/wrangler.toml` でローカル D1。初回に `migrations/0001_initial.sql` を D1 へ `wrangler d1 migrations apply`）
- 本番/Staging: Resend 利用時 `RESEND_API_KEY` / `RESEND_FROM`、CORS は `ALLOWED_ORIGINS`（カンマ区切り）を Cloudflare/ローカルで設定
- 品質ゲート: `npm run ci:pr`

## 開発ルール（抜粋）

- 設計判断は `docs/adr/` に ADR として記録する。
- 実装前に関連 ADR を確認する。
- 進捗の正本は `docs/開発計画書.md` とする。
