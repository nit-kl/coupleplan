# 0004. F/EにVite、B/EにHonoを採用する

## ステータス

承認済み

## コンテキスト

- Cloudflare基盤（[0001](./0001-deployment-platform-cloudflare.md)）で `Staging / Production` 運用を行う。
- MVP後にバズ・機能拡張を見据え、開発速度と拡張性の両立が必要。
- `P1-1` は会員・ペア連携を中心にAPI/UIを継続開発中。

## 決定

- フロントエンド開発基盤は **Vite + TypeScript** を採用する。
- バックエンドHTTP層は **Hono + TypeScript** を採用する。
- API実装は **route -> usecase -> repository** の依存方向を維持する。
- `prototype/index.html` は要件確認専用とし、本実装は `apps/web` で進める。

## 結果

### メリット

- Viteでフロント開発サイクルを高速化できる。
- HonoはCloudflareとの親和性が高く、将来の本番移行が滑らか。
- レイヤ分割により、機能拡張時の変更影響を局所化できる。

### トレードオフ

- 初期にフォルダ構成と責務分離を徹底する必要がある。
- 小規模段階では抽象化コストが先行する。
- D1/Queue等との統合時にインフラ設計を追加で詰める必要がある。

## 関連

- [開発計画書.md](../開発計画書.md)
- [P1-1_会員・ペア連携API仕様.md](../P1-1_会員・ペア連携API仕様.md)
