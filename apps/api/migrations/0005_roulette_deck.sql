-- ADR 0014: ルーレットセッション単位の6枚デッキを保存する
ALTER TABLE roulette_sessions ADD COLUMN plan_ids TEXT;
