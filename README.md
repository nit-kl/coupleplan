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

- フロント: `npm run web:dev`（Vite。`VITE_API_BASE_URL`、例: `http://127.0.0.1:8787`。[apps/web/.env.example](apps/web/.env.example) 参照）
- API（ローカル）: `npm run api:dev`（Node + インメモリ DB）
- API（D1/Worker）: 初回または `migrations/` 追加後は **`npm run d1:migrate:local`** でローカル D1 に SQL を当ててから `npm run api:dev:worker`（[apps/api/wrangler.toml](apps/api/wrangler.toml)。`.dev.vars` の例: [apps/api/.dev.vars.example](apps/api/.dev.vars.example)）
- D1 ローカル: `npm run d1:migrate:local`（`--local`。ルーレット等の新テーブル未適用だと `/roulette/sessions/me` が 500 になる）
- D1 リモートにマイグレーション: `npm run d1:migrate:staging` / `d1:migrate:production`（`CLOUDFLARE_API_TOKEN` 等で Wrangler 認証が必要）。[apps/api/wrangler.toml](apps/api/wrangler.toml) の各 `database_id` は `wrangler d1 create` の UUID に差し替え
- Staging/本番（Cloudflare）: **推奨** [ダッシュボードの Git 連携](https://developers.cloudflare.com/workers/ci-cd/builds/)で Worker / Pages を接続。Resend: Worker の Secrets に `RESEND_API_KEY`、Variables に `ALLOWED_ORIGINS`（`https://…pages.dev` 等）。**手動受け入れ**は [docs/P1-1_手動テスト.md](docs/P1-1_手動テスト.md) の「Cloudflare」節
- リモート API 向けスモーク（平文 `debugCode` がある Staging 想定）: `set API_BASE_URL=https://…workers.dev&& npm run api:smoke`（Windows: `$env:API_BASE_URL=...; npm run api:smoke`）
- 品質ゲート: `npm run ci:pr`

## 開発ルール（抜粋）

- 設計判断は `docs/adr/` に ADR として記録する。
- 実装前に関連 ADR を確認する。
- 進捗の正本は `docs/開発計画書.md` とする。
