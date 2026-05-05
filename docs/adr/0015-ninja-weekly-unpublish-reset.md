# 0015. ニンジャ週次公開の手動リセット（公開解除）

## ステータス

承認済み

## コンテキスト

- MVP では `POST /ninja/week/publish` により、カップル主導で週次合計を公開できる（[0013](./0013-ninja-weekly-aggregation.md)）。
- 公開後に「もう少し記録してから見せたい」「誤って早く公開してしまった」を、ユーザー自身で戻せない。
- サイレントニンジャの主目的は日常ストレスの軽減であり、操作ミス時に管理者対応が必要な体験は重い。

## 決定

### リセットの意味

- リセットは **公開解除（unpublish）** と定義する。
- 対象は `ninja_weekly_summaries` の当該週行のみで、`published_at` を消すのではなく **行自体を削除**する。
- `ninja_logs`（申告履歴）は削除しない。したがって再公開時はログから再集計され、最新合計が公開される。

### API

- 認証済みユーザー向けに `POST /ninja/week/reset` を追加する。
- `weekStart`（`YYYY-MM-DD` の月曜）を任意で受け付ける。省略時は現在週。
- レスポンスは `GET /ninja/week` と同じ `NinjaWeekView` を返す。

### 権限と公開範囲

- 対象は呼び出しユーザーの active カップルのみ（既存の `412 couple_required` を踏襲）。
- 公開解除後は双方とも `partnerPoints = null` となる（個票非公開ポリシーは維持）。

## 結果

### メリット

- 誤操作からの自己回復ができ、運用問い合わせを減らせる。
- ログを残したまま公開状態だけ戻せるため、監査性と再集計の整合が保てる。

### トレードオフ

- 「一度公開した事実」をAPI上で隠せるため、時系列の厳密性は弱まる。
- 将来、公開履歴が必要になった場合は別途イベントログ設計が必要。

## 関連

- [開発計画書.md](../開発計画書.md)
- [0012-silent-ninja-declarations.md](./0012-silent-ninja-declarations.md)
- [0013-ninja-weekly-aggregation.md](./0013-ninja-weekly-aggregation.md)
