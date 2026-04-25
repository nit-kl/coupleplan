# 0001. デプロイ基盤に Cloudflare を採用する

## ステータス

承認済み

## コンテキスト

- `P0-3` で MVP のデプロイ先とステージング運用を確定する必要がある。
- 候補は以下の3案で比較した。
  - A: Vercel + Supabase
  - B: Cloudflare Pages/Workers + D1/Queues
  - C: Render/Fly.io + Neon
- CouplePlan は MVP でスピードを重視しつつ、継続運用コストを低く保ちたい。

## 決定

- MVP のデプロイ基盤は **案B（Cloudflareベース）** を採用する。
- 環境は `Staging / Production` の2段階を運用する。
- デプロイの反映トリガーは、`develop` へのマージで Staging、`main` へのマージで Production とする。

## 結果

### メリット

- エッジ配信で体感速度を出しやすい。
- Pages/Workers/D1/Queues で MVP 構成を統一しやすい。
- 初期コストを抑えやすい。

### トレードオフ

- Workers/D1 前提の設計制約を受ける。
- 週次集計ジョブ（ニンジャ）は冪等性を前提に設計が必要。
- チーム内で `wrangler` ベースの開発手順を統一する必要がある。

## 関連

- [開発計画書.md](../開発計画書.md)
- [デプロイ・ステージング方針案.md](../デプロイ・ステージング方針案.md)
