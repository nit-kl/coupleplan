# ADR（Architecture Decision Records）

[AGENTS.md](../../AGENTS.md) に従い、重要な設計判断はこのディレクトリに記録する。

## 命名規則

- ファイル名: `NNNN-short-title.md`（4桁ゼロ埋め + 英小文字・ハイフン）
- 例: `0001-authentication.md`

## テンプレート（新規作成時）

```markdown
# NNNN. タイトル

## ステータス

提案 | 承認済み | 廃止 | 置換

## コンテキスト

（判断が必要になった背景）

## 決定

（採用した方針）

## 結果

（影響・トレードオフ）

## 関連

- [開発計画書.md](../開発計画書.md)
```

## 開発計画書との対応

[開発計画書.md](../開発計画書.md) の「§6 ADR 候補」に列挙したトピック（認証、カップル/招待、デートルーレット状態、ニンジャ、週次集計）は、**意思決定が固まったタイミング**で番号付きファイルを追加し、計画書の進捗表「関連ADR」列にファイル名を書き込む。

現時点の作成済みADR:

- [0001-deployment-platform-cloudflare.md](./0001-deployment-platform-cloudflare.md)
- [0002-authentication-email-otp.md](./0002-authentication-email-otp.md)
- [0003-core-entities-couple-invite.md](./0003-core-entities-couple-invite.md)
- [0004-vite-hono-architecture.md](./0004-vite-hono-architecture.md)
- [0005-database-d1.md](./0005-database-d1.md)
- [0006-custom-domain-dns-strategy.md](./0006-custom-domain-dns-strategy.md)
- [0007-account-withdrawal-deletion.md](./0007-account-withdrawal-deletion.md)
- [0008-relogin-30days-local-session.md](./0008-relogin-30days-local-session.md)
- [0009-httpOnly-refresh-token-auth.md](./0009-httpOnly-refresh-token-auth.md)
- [0010-accept-invite-from-pending-solo-member.md](./0010-accept-invite-from-pending-solo-member.md)
- [0011-date-roulette-state.md](./0011-date-roulette-state.md)
- [0012-silent-ninja-declarations.md](./0012-silent-ninja-declarations.md)
- [0013-ninja-weekly-aggregation.md](./0013-ninja-weekly-aggregation.md)
- [0014-date-roulette-6deck-auto-redraw.md](./0014-date-roulette-6deck-auto-redraw.md)
- [0015-ninja-weekly-unpublish-reset.md](./0015-ninja-weekly-unpublish-reset.md)
- [0016-ninja-custom-missions-with-guardrails.md](./0016-ninja-custom-missions-with-guardrails.md)

引き続き、判断前に実装しないこと。
