-- P1-x: Refresh token sessions for HttpOnly cookie based relogin

CREATE TABLE refresh_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  created_at_ms INTEGER NOT NULL,
  last_used_at_ms INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_sessions_user ON refresh_sessions (user_id);
CREATE INDEX idx_refresh_sessions_expires ON refresh_sessions (expires_at_ms);
