-- ADR 0016: サイレント・ニンジャの制約付きカスタム任務

CREATE TABLE ninja_custom_missions (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL,
  point INTEGER NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (couple_id) REFERENCES couples (id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_ninja_custom_missions_couple_created
  ON ninja_custom_missions (couple_id, created_at);
