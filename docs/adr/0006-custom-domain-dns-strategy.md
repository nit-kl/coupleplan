# 0006. `coupleplan.com` を親ドメインにした公開ドメイン戦略

## ステータス

承認済み

## コンテキスト

- Route53 で取得した `coupleplan.com` をブランド用の正規ドメインとして利用したい。
- 現在は Cloudflare Pages / Workers でアプリを運用している。
- 過去システム由来の DNS レコードが残っており、誤配信・運用混乱のリスクがある。
- ただし Resend のメール配信に必要な DNS は維持する必要がある。

## 決定

- ブランド親ドメインは `coupleplan.com` に統一する。
- 公開用サブドメインは以下で分離する。
  - Web: `app.coupleplan.com`
  - API: `api.coupleplan.com`
  - Staging Web: `stg-app.coupleplan.com`
  - Staging API: `stg-api.coupleplan.com`
- Apex (`coupleplan.com`) は短期的に既存動作を維持し、最終的には `https://app.coupleplan.com` へ 301 リダイレクトする。
- DNS は「必要最小限」に整理し、メール配信系（Resend で利用中の検証済みレコード）は削除しない。
- CORS は `ALLOWED_ORIGINS` に本番/ステージング Web ドメインのみを許可する。

## 結果

### メリット

- ブランド導線を `coupleplan.com` 配下に統一できる。
- Web/API をサブドメインで分離でき、運用・障害切り分けが容易になる。
- 不要 DNS を削減し、過去システムへの誤ルーティングを防げる。

### トレードオフ

- DNS 整理時に一時的な名前解決揺らぎが出る可能性がある。
- Apex リダイレクト設定と証明書発行タイミングの調整が必要。

## 関連

- [開発計画書.md](../開発計画書.md)
- [0001-deployment-platform-cloudflare.md](./0001-deployment-platform-cloudflare.md)
- [P1-1_手動テスト.md](../P1-1_手動テスト.md)
