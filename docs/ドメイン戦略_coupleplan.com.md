# `coupleplan.com` ドメイン戦略（Resend 維持版）

最終更新: 2026-04-30

## 目的

- ブランドドメインを `coupleplan.com` に統一する。
- 過去システム由来の不要 DNS を整理する。
- Resend のメール配信に必要な DNS は維持し、OTP 配信を止めない。

## 前提

- ドメイン取得元は Route53 だが、権威 DNS は Cloudflare ネームサーバーを利用する。
- Web は Cloudflare Pages、API は Cloudflare Workers。
- 設計判断は [ADR 0006](./adr/0006-custom-domain-dns-strategy.md) に従う。

## 採用する公開ドメイン

| 用途 | ドメイン |
|------|----------|
| 本番 Web | `app.coupleplan.com` |
| 本番 API | `api.coupleplan.com` |
| Staging Web | `stg-app.coupleplan.com` |
| Staging API | `stg-api.coupleplan.com` |
| ルート | `coupleplan.com`（最終的に `app` へ 301） |

## DNS 整理方針（重要）

1. **残すもの**
   - Cloudflare Pages / Workers の接続に必要なレコード
   - Resend ダッシュボードで「Verified」に必要なレコード
     - 例: `resend._domainkey`（DKIM）
     - 例: `send` サブドメインの SPF / MX（現在の構成で利用中なら維持）
2. **削除候補**
   - 旧システム向けで、現行運用（Pages / Workers / Resend）と無関係な A / AAAA / CNAME / TXT
3. **削除しない条件**
   - レコード用途が不明な場合は即削除しない
   - 先に Resend 側の Domain Status が `Verified` を維持していることを確認する

## 具体的な作業手順

### 0. 事前バックアップ（必須）

1. Cloudflare の `DNS > Records` 画面で現行レコードをエクスポートする（CSV）。
2. 変更作業は `stg-*` の接続確認を先に行い、本番 (`app` / `api`) は後段で実施する。
3. `RESEND_FROM` に使っているドメイン（例: `send.coupleplan.com` か apex か）を先に確定する。

### 1. DNS レコードを「残す/削除候補」に仕分け

以下を基準に、現在レコードをマーキングする。

| 区分 | レコード例 | 扱い |
|------|------------|------|
| 維持（メール） | `resend._domainkey` TXT, `send` の MX/TXT(SPF) | **削除しない** |
| 維持（新規公開） | `app`, `api`, `stg-app`, `stg-api`（後で追加） | **追加する** |
| 削除候補（旧システム） | apex の旧 A/AAAA 複数本、用途不明 TXT | 新環境稼働後に段階削除 |

### 2. Staging 用サブドメインを先に作る

1. Cloudflare Pages（staging 用プロジェクト）で `stg-app.coupleplan.com` を Custom domain に追加。
2. Cloudflare Workers（staging API）で `stg-api.coupleplan.com/*` の Route を追加。
3. SSL が `Active` になるまで待つ（数分〜）。

### 3. Staging の環境変数を切り替え

1. Workers（staging）:
   - `ALLOWED_ORIGINS=https://stg-app.coupleplan.com,http://localhost:5173`
2. Pages（staging）:
   - `VITE_API_BASE_URL=https://stg-api.coupleplan.com`
3. 両方再デプロイする（Git 連携デプロイ or 手動再デプロイ）。

### 4. Staging の受け入れ確認

1. `https://stg-app.coupleplan.com` でオンボーディングを実施。
2. Network で `POST /auth/otp/request` が `202` になることを確認。
3. 招待受諾まで通ることを確認（`accept` 成功）。
4. OTP メールが受信できることを確認（Resend 側ステータスも確認）。

### 5. 本番サブドメインを接続

1. Pages（本番）に `app.coupleplan.com` を追加。
2. Workers（本番API）に `api.coupleplan.com/*` を追加。
3. SSL が `Active` になったら環境変数を更新。
   - `ALLOWED_ORIGINS=https://app.coupleplan.com,https://stg-app.coupleplan.com,http://localhost:5173`
   - `VITE_API_BASE_URL=https://api.coupleplan.com`

### 6. apex (`coupleplan.com`) の最終整理

1. まず `https://app.coupleplan.com` が正常動作することを確認。
2. `coupleplan.com` / `www.coupleplan.com` は Cloudflare Redirect Rules で `https://app.coupleplan.com` へ 301。
3. その後、apex に残る旧 A/AAAA（過去システム向け）を削除。
   - 1回で全削除しない。削除ごとにアクセス確認する。

### 7. 不要 DNS の段階削除（本番）

1. 削除候補を 1〜2 件ずつ削除。
2. 各回で以下を確認。
   - `app.coupleplan.com` 表示
   - `api.coupleplan.com/auth/otp/request` の応答
   - OTP メール受信
3. 問題が出たらその回の変更だけ戻す。

### 8. 完了条件

- `app` / `api` / `stg-app` / `stg-api` がすべて有効
- `ALLOWED_ORIGINS` と `VITE_API_BASE_URL` が新ドメインへ更新済み
- Resend の Domain Status が `Verified` を維持
- 不要 DNS（旧システム向け）が整理済み

## 変更チェックリスト

- [ ] Pages に `app.coupleplan.com` を割り当て
- [ ] Workers に `api.coupleplan.com` を割り当て
- [ ] Staging 用サブドメインを割り当て
- [ ] `ALLOWED_ORIGINS` を新ドメインに更新
- [ ] `VITE_API_BASE_URL` を新 API ドメインに更新
- [ ] Resend Domain Status が `Verified` のまま
- [ ] OTP 送信（実メール）を確認
- [ ] 不要 DNS を削除
- [ ] Apex の 301 リダイレクトを有効化

## ロールバック方針

- 問題発生時は、まず `VITE_API_BASE_URL` と `ALLOWED_ORIGINS` を直前値へ戻す。
- DNS は削除より「無効化/戻せる順」で実施する。
- Resend 関連レコードはロールバック対象から除外し、常時維持する。
