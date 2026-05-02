-- P1-2 / P1-3: デートルーレット用テーブル（ADR 0011）
-- セッションはカップルあたり常に1件 active を保持し、status は collecting/ready/decided/archived。
-- 投票は (session_id, user_id, plan_id) で UNIQUE。結果は 1 セッション 1 件。
-- plan_id はアプリ層の静的カタログ参照のため FK は張らない（ADR 0011 参照）。

CREATE TABLE roulette_sessions (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  archived_at TEXT,
  FOREIGN KEY (couple_id) REFERENCES couples (id) ON DELETE CASCADE
);

CREATE INDEX idx_roulette_sessions_couple_active
  ON roulette_sessions (couple_id)
  WHERE archived_at IS NULL;

CREATE TABLE roulette_votes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  vote TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (session_id, user_id, plan_id),
  FOREIGN KEY (session_id) REFERENCES roulette_sessions (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_roulette_votes_session_user
  ON roulette_votes (session_id, user_id);

CREATE TABLE roulette_results (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  selected_plan_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES roulette_sessions (id) ON DELETE CASCADE
);
