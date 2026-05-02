-- P1-4 / P1-5: ニンジャ申告・週次集計（ADR 0012 / 0013）
-- mission_id は静的カタログ参照のため FK は張らない。

CREATE TABLE ninja_logs (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  point INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (couple_id) REFERENCES couples (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_ninja_logs_couple_time
  ON ninja_logs (couple_id, created_at);

CREATE TABLE ninja_weekly_summaries (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL,
  week_start TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  partner_user_id TEXT NOT NULL,
  owner_points INTEGER NOT NULL,
  partner_points INTEGER NOT NULL,
  published_at TEXT NOT NULL,
  UNIQUE (couple_id, week_start),
  FOREIGN KEY (couple_id) REFERENCES couples (id) ON DELETE CASCADE
);
