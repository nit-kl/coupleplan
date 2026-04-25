# 0003. コアエンティティを Couple 中心で定義する

## ステータス

承認済み

## コンテキスト

- `P0-5` でコアER図/エンティティ（`User`, `Couple`, `Invite`）を確定する必要がある。
- 既存のMVP要件は「ペア連携」「ルーレット」「ニンジャ」の縦通し。
- 認証方式は [0002](./0002-authentication-email-otp.md) でメールOTPを採用済み。

## 決定

- `Couple` を中心に次のコアモデルを採用する。
  - `User`
  - `Couple`
  - `CoupleMember`
  - `Invite`
  - `RouletteSession` / `RouletteVote` / `RouletteResult`
  - `NinjaMission` / `NinjaLog` / `WeeklySummary`
- `Couple.status` は `pending` / `active` / `unpaired` を持つ。
- 招待コードは `Invite` で管理し、`issued` / `used` / `expired` / `revoked` を持つ。

## 結果

### メリット

- MVP機能を少ないモデルで横断できる。
- 「ペア成立前後」を状態で表現でき、拡張に耐えやすい。
- 週次集計や履歴の追加にも接続しやすい。

### トレードオフ

- 状態が増えるため、状態遷移の厳密化が必要。
- `Roulette` と `Ninja` の詳細仕様は別ADR（`ADR3`/`ADR5`）で詰める必要がある。

## 参照ドキュメント

- [データモデル設計メモ.md](../データモデル設計メモ.md)

## 関連

- [開発計画書.md](../開発計画書.md)
- [0002-authentication-email-otp.md](./0002-authentication-email-otp.md)
