-- P0-7: コアテーブル（会員・カップル・招待・セッション・OTP）
-- ルーレット/ニンジャ用は後続マイグレーションで追加

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE couples (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE couple_members (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  joined_at TEXT NOT NULL,
  FOREIGN KEY (couple_id) REFERENCES couples (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE (couple_id, user_id)
);

CREATE INDEX idx_couple_members_user ON couple_members (user_id);

CREATE TABLE invites (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  FOREIGN KEY (couple_id) REFERENCES couples (id) ON DELETE CASCADE
);

CREATE TABLE otp_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  created_at_ms INTEGER NOT NULL
);

CREATE INDEX idx_otp_email_created ON otp_requests (email, created_at_ms);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE auth_audit (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  email TEXT,
  detail TEXT,
  created_at_ms INTEGER NOT NULL
);

CREATE INDEX idx_auth_audit_created ON auth_audit (created_at_ms);
