# 0005. 永続化に Cloudflare D1（SQLite）を採用する

## ステータス

承認済み

## コンテキスト

- 開発計画書 §2.2・`T3` および P0-7 により、MVP 以前は API がインメモリのため本番想定のデータ保持ができない。
- デプロイ基盤は Cloudflare（[0001](./0001-deployment-platform-cloudflare.md)）を採用済み。

## 決定

- トランザクションデータの一次ストアに **Cloudflare D1**（SQLite 互換）を採用する。
- スキーマは [データモデル設計メモ](../データモデル設計メモ.md) および [0003](./0003-core-entities-couple-invite.md) のコアエンティティに合わせ、会員・ペア・招待・セッション・OTP 依頼を同じ D1 上に置く（ルーレット/ニンジャ用テーブルは後続 P1 以降で拡張する）。
- リポジトリ層（`AppRepository`）の背后実装は **D1 実装**と **インメモリ実装**の2系統とし、ローカル `api:dev` は従来どおり Node + インメモリを正とし、本番/Staging は Hono on Workers + D1 を正とする。

## 結果

### メリット

- 既存の Cloudflare 採用方針と一貫し、ワーカー上から同一バインディングで参照しやすい。
- マイグレーション（SQL）をリポジトリ管理し、レビュー可能な形でスキーマを進化できる。

### トレードオフ

- ローカルと本番で実装分岐（インメモリ / D1）のテスト負債が出る。受け入れに `api:smoke`（HTTP 経路）を置く。

## 関連

- [開発計画書.md](../開発計画書.md)
- [データモデル設計メモ.md](../データモデル設計メモ.md)
- [0001-deployment-platform-cloudflare.md](./0001-deployment-platform-cloudflare.md)
- [0004-vite-hono-architecture.md](./0004-vite-hono-architecture.md)
