import type { D1Database } from "@cloudflare/workers-types";
import type { AppRepository, AuthAuditEvent } from "../domain/repository";
import type { Couple, Invite, OtpRequestRecord, User } from "../domain/types";
import { newId as genId, newOtpCode, newSessionToken } from "../lib/ids";

export class D1Repository implements AppRepository {
  constructor(private readonly db: D1Database) {}

  nowIso(): string {
    return new Date().toISOString();
  }

  newId(prefix: string): string {
    return genId(prefix);
  }

  newCode(length: number): string {
    return newOtpCode(length);
  }

  newOtpCode(length: number): string {
    return newOtpCode(length);
  }

  async putOtpRequest(id: string, record: OtpRequestRecord, createdAtMs: number): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO otp_requests (id, email, code, expires_at_ms, created_at_ms) VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(id, record.email, record.code, record.expiresAt, createdAtMs)
      .run();
  }

  async findOtp(
    email: string,
    code: string,
  ): Promise<(OtpRequestRecord & { id: string }) | null> {
    const row = await this.db
      .prepare(`SELECT id, email, code, expires_at_ms AS exp FROM otp_requests WHERE email = ? AND code = ?`)
      .bind(email, code)
      .first<{ id: string; email: string; code: string; exp: number }>();
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      code: row.code,
      expiresAt: row.exp,
    };
  }

  async deleteOtpRequest(id: string): Promise<void> {
    await this.db.prepare(`DELETE FROM otp_requests WHERE id = ?`).bind(id).run();
  }

  async countOtpInWindowForEmail(email: string, sinceMs: number): Promise<number> {
    const row = await this.db
      .prepare(
        `SELECT COUNT(*) AS n FROM otp_requests WHERE email = ? AND created_at_ms >= ?`,
      )
      .bind(email, sinceMs)
      .first<{ n: number }>();
    return row?.n ?? 0;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const row = await this.db
      .prepare(
        `SELECT id, email, display_name AS displayName, created_at AS createdAt, updated_at AS updatedAt FROM users WHERE email = ?`,
      )
      .bind(email)
      .first<{
        id: string;
        email: string;
        displayName: string;
        createdAt: string;
        updatedAt: string;
      }>();
    return row ?? null;
  }

  async getUserById(id: string): Promise<User | null> {
    const row = await this.db
      .prepare(
        `SELECT id, email, display_name AS displayName, created_at AS createdAt, updated_at AS updatedAt FROM users WHERE id = ?`,
      )
      .bind(id)
      .first<{
        id: string;
        email: string;
        displayName: string;
        createdAt: string;
        updatedAt: string;
      }>();
    return row ?? null;
  }

  async saveUser(user: User): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO users (id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
         email = excluded.email, display_name = excluded.display_name, updated_at = excluded.updated_at`,
      )
      .bind(user.id, user.email, user.displayName, user.createdAt, user.updatedAt)
      .run();
  }

  async issueSession(userId: string): Promise<string> {
    const token = newSessionToken();
    const created = this.nowIso();
    await this.db
      .prepare(`INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)`)
      .bind(token, userId, created)
      .run();
    return token;
  }

  async resolveUserIdFromToken(token: string): Promise<string | null> {
    const row = await this.db
      .prepare(`SELECT user_id AS uid FROM sessions WHERE token = ?`)
      .bind(token)
      .first<{ uid: string }>();
    return row?.uid ?? null;
  }

  async saveCouple(couple: Couple): Promise<void> {
    const u = this.nowIso();
    await this.db
      .prepare(
        `INSERT INTO couples (id, status, created_at, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
      )
      .bind(couple.id, couple.status, couple.createdAt, u)
      .run();
    await this.db.prepare(`DELETE FROM couple_members WHERE couple_id = ?`).bind(couple.id).run();
    for (let i = 0; i < couple.memberIds.length; i += 1) {
      const memId = genId("cmb");
      await this.db
        .prepare(
          `INSERT INTO couple_members (id, couple_id, user_id, position, joined_at) VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(memId, couple.id, couple.memberIds[i]!, i, couple.createdAt)
        .run();
    }
  }

  async getCoupleById(id: string): Promise<Couple | null> {
    const c = await this.db
      .prepare(`SELECT id, status, created_at AS createdAt FROM couples WHERE id = ?`)
      .bind(id)
      .first<{ id: string; status: Couple["status"]; createdAt: string }>();
    if (!c) return null;
    const res = await this.db
      .prepare(
        `SELECT user_id AS uid FROM couple_members WHERE couple_id = ? ORDER BY position ASC`,
      )
      .bind(id)
      .all<{ uid: string }>();
    const list = (res as { results?: { uid: string }[] }).results ?? [];
    return {
      id: c.id,
      status: c.status,
      createdAt: c.createdAt,
      memberIds: list.map((r) => r.uid),
    };
  }

  async findCoupleByUserId(userId: string): Promise<Couple | null> {
    const row = await this.db
      .prepare(`SELECT couple_id AS cid FROM couple_members WHERE user_id = ? LIMIT 1`)
      .bind(userId)
      .first<{ cid: string }>();
    if (!row) return null;
    return this.getCoupleById(row.cid);
  }

  async saveInvite(invite: Invite): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO invites (id, couple_id, code, status, expires_at, used_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
         status = excluded.status, used_at = excluded.used_at`,
      )
      .bind(
        invite.id,
        invite.coupleId,
        invite.code,
        invite.status,
        invite.expiresAt,
        invite.usedAt ?? null,
      )
      .run();
  }

  async getInviteByCode(code: string): Promise<Invite | null> {
    const row = await this.db
      .prepare(
        `SELECT id, couple_id AS coupleId, code, status, expires_at AS expiresAt, used_at AS usedAt FROM invites WHERE code = ?`,
      )
      .bind(code)
      .first<{
        id: string;
        coupleId: string;
        code: string;
        status: Invite["status"];
        expiresAt: string;
        usedAt: string | null;
      }>();
    if (!row) return null;
    return {
      id: row.id,
      coupleId: row.coupleId,
      code: row.code,
      status: row.status,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt ?? undefined,
    };
  }

  async appendAuthAudit(
    id: string,
    event: AuthAuditEvent,
    createdAtMs: number,
    email: string | null,
    detail: string | null,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO auth_audit (id, event_type, email, detail, created_at_ms) VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(id, event, email, detail, createdAtMs)
      .run();
  }
}
