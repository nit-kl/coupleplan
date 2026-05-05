import type { D1Database } from "@cloudflare/workers-types";
import type { AppRepository, AuthAuditEvent, RouletteVoteInput } from "../domain/repository";
import type {
  Couple,
  Invite,
  NinjaCustomMission,
  NinjaLog,
  NinjaWeeklySummary,
  OtpRequestRecord,
  RouletteResult,
  RouletteSession,
  RouletteVote,
  User,
} from "../domain/types";
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

  async issueRefreshSession(userId: string, expiresAtMs: number): Promise<string> {
    const token = newSessionToken();
    const nowMs = Date.now();
    await this.db
      .prepare(
        `INSERT INTO refresh_sessions (token, user_id, expires_at_ms, created_at_ms, last_used_at_ms) VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(token, userId, expiresAtMs, nowMs, nowMs)
      .run();
    return token;
  }

  async resolveUserIdFromRefreshToken(token: string, nowMs: number): Promise<string | null> {
    const row = await this.db
      .prepare(
        `SELECT user_id AS uid, expires_at_ms AS expiresAtMs FROM refresh_sessions WHERE token = ?`,
      )
      .bind(token)
      .first<{ uid: string; expiresAtMs: number }>();
    if (!row) return null;
    if (row.expiresAtMs <= nowMs) {
      await this.revokeRefreshSession(token);
      return null;
    }
    await this.db
      .prepare(`UPDATE refresh_sessions SET last_used_at_ms = ? WHERE token = ?`)
      .bind(nowMs, token)
      .run();
    return row.uid;
  }

  async revokeRefreshSession(token: string): Promise<void> {
    await this.db.prepare(`DELETE FROM refresh_sessions WHERE token = ?`).bind(token).run();
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

  async removePendingSoloCoupleByUserId(userId: string): Promise<boolean> {
    const couple = await this.findCoupleByUserId(userId);
    if (!couple) return false;
    if (couple.status !== "pending") return false;
    if (couple.memberIds.length !== 1 || couple.memberIds[0] !== userId) return false;

    await this.db.prepare(`DELETE FROM invites WHERE couple_id = ?`).bind(couple.id).run();
    await this.db.prepare(`DELETE FROM couple_members WHERE couple_id = ?`).bind(couple.id).run();
    await this.db.prepare(`DELETE FROM couples WHERE id = ?`).bind(couple.id).run();
    return true;
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

  async deleteAccountDataForUser(userId: string): Promise<{
    deletedUserIds: string[];
    deletedCoupleId?: string;
  }> {
    const couple = await this.findCoupleByUserId(userId);
    const deletedUserIds = couple ? [...couple.memberIds] : [userId];
    const placeholders = deletedUserIds.map(() => "?").join(", ");

    await this.db
      .prepare(`DELETE FROM sessions WHERE user_id IN (${placeholders})`)
      .bind(...deletedUserIds)
      .run();
    await this.db
      .prepare(`DELETE FROM refresh_sessions WHERE user_id IN (${placeholders})`)
      .bind(...deletedUserIds)
      .run();

    if (couple) {
      await this.db.prepare(`DELETE FROM ninja_weekly_summaries WHERE couple_id = ?`).bind(couple.id).run();
      await this.db.prepare(`DELETE FROM ninja_logs WHERE couple_id = ?`).bind(couple.id).run();
      await this.db.prepare(`DELETE FROM ninja_custom_missions WHERE couple_id = ?`).bind(couple.id).run();

      // ルーレット関連: results -> votes -> sessions の順で消すと外部キーの依存に沿う
      await this.db
        .prepare(
          `DELETE FROM roulette_results WHERE session_id IN (SELECT id FROM roulette_sessions WHERE couple_id = ?)`,
        )
        .bind(couple.id)
        .run();
      await this.db
        .prepare(
          `DELETE FROM roulette_votes WHERE session_id IN (SELECT id FROM roulette_sessions WHERE couple_id = ?)`,
        )
        .bind(couple.id)
        .run();
      await this.db.prepare(`DELETE FROM roulette_sessions WHERE couple_id = ?`).bind(couple.id).run();
      await this.db.prepare(`DELETE FROM invites WHERE couple_id = ?`).bind(couple.id).run();
      await this.db.prepare(`DELETE FROM couple_members WHERE couple_id = ?`).bind(couple.id).run();
      await this.db.prepare(`DELETE FROM couples WHERE id = ?`).bind(couple.id).run();
    }

    await this.db
      .prepare(`DELETE FROM users WHERE id IN (${placeholders})`)
      .bind(...deletedUserIds)
      .run();

    return {
      deletedUserIds,
      deletedCoupleId: couple?.id,
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

  async getOrCreateActiveRouletteSession(
    coupleId: string,
    deckPlanIds: string[],
  ): Promise<RouletteSession> {
    const existing = await this.db
      .prepare(
        `SELECT id, couple_id AS coupleId, status, plan_ids AS planIds, started_at AS startedAt, finished_at AS finishedAt
           FROM roulette_sessions
          WHERE couple_id = ? AND archived_at IS NULL
          ORDER BY started_at DESC
          LIMIT 1`,
      )
      .bind(coupleId)
      .first<{
        id: string;
        coupleId: string;
        status: RouletteSession["status"];
        planIds: string | null;
        startedAt: string;
        finishedAt: string | null;
      }>();
    if (existing) {
      const parsedPlanIds = JSON.parse(existing.planIds || "[]") as string[];
      if (parsedPlanIds.length === 0) {
        const fallback = [...deckPlanIds];
        await this.db
          .prepare(`UPDATE roulette_sessions SET plan_ids = ? WHERE id = ?`)
          .bind(JSON.stringify(fallback), existing.id)
          .run();
        parsedPlanIds.push(...fallback);
      }
      return {
        id: existing.id,
        coupleId: existing.coupleId,
        status: existing.status,
        planIds: parsedPlanIds,
        startedAt: existing.startedAt,
        finishedAt: existing.finishedAt ?? undefined,
      };
    }
    const session: RouletteSession = {
      id: this.newId("rls"),
      coupleId,
      status: "collecting",
      planIds: [...deckPlanIds],
      startedAt: this.nowIso(),
    };
    await this.db
      .prepare(
        `INSERT INTO roulette_sessions (id, couple_id, status, plan_ids, started_at) VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(
        session.id,
        session.coupleId,
        session.status,
        JSON.stringify(session.planIds),
        session.startedAt,
      )
      .run();
    return session;
  }

  async getRouletteSessionById(sessionId: string): Promise<RouletteSession | null> {
    const row = await this.db
      .prepare(
        `SELECT id, couple_id AS coupleId, status, plan_ids AS planIds, started_at AS startedAt, finished_at AS finishedAt
           FROM roulette_sessions
          WHERE id = ?`,
      )
      .bind(sessionId)
      .first<{
        id: string;
        coupleId: string;
        status: RouletteSession["status"];
        planIds: string | null;
        startedAt: string;
        finishedAt: string | null;
      }>();
    if (!row) return null;
    return {
      id: row.id,
      coupleId: row.coupleId,
      status: row.status,
      planIds: JSON.parse(row.planIds || "[]") as string[],
      startedAt: row.startedAt,
      finishedAt: row.finishedAt ?? undefined,
    };
  }

  async updateRouletteSessionStatus(
    sessionId: string,
    status: RouletteSession["status"],
    finishedAt: string | null,
  ): Promise<void> {
    await this.db
      .prepare(`UPDATE roulette_sessions SET status = ?, finished_at = ? WHERE id = ?`)
      .bind(status, finishedAt, sessionId)
      .run();
  }

  async archiveRouletteSession(sessionId: string, archivedAt: string): Promise<void> {
    await this.db
      .prepare(`UPDATE roulette_sessions SET archived_at = ? WHERE id = ?`)
      .bind(archivedAt, sessionId)
      .run();
  }

  async upsertRouletteVotes(
    sessionId: string,
    userId: string,
    votes: RouletteVoteInput[],
  ): Promise<void> {
    if (votes.length === 0) return;
    const now = this.nowIso();
    for (const v of votes) {
      const id = this.newId("rlv");
      await this.db
        .prepare(
          `INSERT INTO roulette_votes (id, session_id, user_id, plan_id, vote, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(session_id, user_id, plan_id)
             DO UPDATE SET vote = excluded.vote, created_at = excluded.created_at`,
        )
        .bind(id, sessionId, userId, v.planId, v.vote, now)
        .run();
    }
  }

  async listRouletteVotes(sessionId: string): Promise<RouletteVote[]> {
    const res = await this.db
      .prepare(
        `SELECT session_id AS sessionId, user_id AS userId, plan_id AS planId, vote, created_at AS createdAt
           FROM roulette_votes
          WHERE session_id = ?`,
      )
      .bind(sessionId)
      .all<{
        sessionId: string;
        userId: string;
        planId: string;
        vote: RouletteVote["vote"];
        createdAt: string;
      }>();
    const list = (res as { results?: RouletteVote[] }).results ?? [];
    return list.map((r) => ({ ...r }));
  }

  async saveRouletteResult(result: RouletteResult): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO roulette_results (id, session_id, selected_plan_id, created_at)
              VALUES (?, ?, ?, ?)
         ON CONFLICT(session_id) DO NOTHING`,
      )
      .bind(result.id, result.sessionId, result.selectedPlanId, result.createdAt)
      .run();
  }

  async getRouletteResultBySession(sessionId: string): Promise<RouletteResult | null> {
    const row = await this.db
      .prepare(
        `SELECT id, session_id AS sessionId, selected_plan_id AS selectedPlanId, created_at AS createdAt
           FROM roulette_results
          WHERE session_id = ?`,
      )
      .bind(sessionId)
      .first<{ id: string; sessionId: string; selectedPlanId: string; createdAt: string }>();
    return row ?? null;
  }

  async insertNinjaCustomMission(mission: NinjaCustomMission): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO ninja_custom_missions
          (id, couple_id, title, description, emoji, point, created_by_user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        mission.id,
        mission.coupleId,
        mission.title,
        mission.description,
        mission.emoji,
        mission.point,
        mission.createdByUserId,
        mission.createdAt,
      )
      .run();
  }

  async listNinjaCustomMissions(coupleId: string): Promise<NinjaCustomMission[]> {
    const res = await this.db
      .prepare(
        `SELECT id, couple_id AS coupleId, title, description, emoji, point,
                created_by_user_id AS createdByUserId, created_at AS createdAt
           FROM ninja_custom_missions
          WHERE couple_id = ?
          ORDER BY created_at ASC`,
      )
      .bind(coupleId)
      .all<NinjaCustomMission>();
    const list = (res as { results?: NinjaCustomMission[] }).results ?? [];
    return list.map((r) => ({ ...r }));
  }

  async getNinjaCustomMissionById(
    coupleId: string,
    missionId: string,
  ): Promise<NinjaCustomMission | null> {
    const row = await this.db
      .prepare(
        `SELECT id, couple_id AS coupleId, title, description, emoji, point,
                created_by_user_id AS createdByUserId, created_at AS createdAt
           FROM ninja_custom_missions
          WHERE couple_id = ? AND id = ?`,
      )
      .bind(coupleId, missionId)
      .first<NinjaCustomMission>();
    return row ?? null;
  }

  async countNinjaCustomMissionsInRange(
    coupleId: string,
    startIso: string,
    endIso: string,
  ): Promise<number> {
    const row = await this.db
      .prepare(
        `SELECT COUNT(*) AS n
           FROM ninja_custom_missions
          WHERE couple_id = ? AND created_at >= ? AND created_at < ?`,
      )
      .bind(coupleId, startIso, endIso)
      .first<{ n: number }>();
    return row?.n ?? 0;
  }

  async insertNinjaLog(log: NinjaLog): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO ninja_logs (id, couple_id, user_id, mission_id, point, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(log.id, log.coupleId, log.userId, log.missionId, log.point, log.createdAt)
      .run();
  }

  async listNinjaLogsInRange(
    coupleId: string,
    startIso: string,
    endIso: string,
  ): Promise<NinjaLog[]> {
    const res = await this.db
      .prepare(
        `SELECT id, couple_id AS coupleId, user_id AS userId, mission_id AS missionId, point, created_at AS createdAt
           FROM ninja_logs
          WHERE couple_id = ? AND created_at >= ? AND created_at < ?
          ORDER BY created_at ASC`,
      )
      .bind(coupleId, startIso, endIso)
      .all<NinjaLog>();
    const list = (res as { results?: NinjaLog[] }).results ?? [];
    return list.map((r) => ({ ...r }));
  }

  async getNinjaWeeklySummary(
    coupleId: string,
    weekStart: string,
  ): Promise<NinjaWeeklySummary | null> {
    const row = await this.db
      .prepare(
        `SELECT id, couple_id AS coupleId, week_start AS weekStart,
                owner_user_id AS ownerUserId, partner_user_id AS partnerUserId,
                owner_points AS ownerPoints, partner_points AS partnerPoints,
                published_at AS publishedAt
           FROM ninja_weekly_summaries
          WHERE couple_id = ? AND week_start = ?`,
      )
      .bind(coupleId, weekStart)
      .first<NinjaWeeklySummary>();
    return row ?? null;
  }

  async upsertNinjaWeeklySummary(summary: NinjaWeeklySummary): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO ninja_weekly_summaries (
           id, couple_id, week_start, owner_user_id, partner_user_id,
           owner_points, partner_points, published_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(couple_id, week_start) DO UPDATE SET
           owner_user_id = excluded.owner_user_id,
           partner_user_id = excluded.partner_user_id,
           owner_points = excluded.owner_points,
           partner_points = excluded.partner_points,
           published_at = excluded.published_at`,
      )
      .bind(
        summary.id,
        summary.coupleId,
        summary.weekStart,
        summary.ownerUserId,
        summary.partnerUserId,
        summary.ownerPoints,
        summary.partnerPoints,
        summary.publishedAt,
      )
      .run();
  }

  async deleteNinjaWeeklySummary(coupleId: string, weekStart: string): Promise<void> {
    await this.db
      .prepare(`DELETE FROM ninja_weekly_summaries WHERE couple_id = ? AND week_start = ?`)
      .bind(coupleId, weekStart)
      .run();
  }

  async listActiveCoupleIds(): Promise<string[]> {
    const res = await this.db
      .prepare(
        `SELECT c.id AS id FROM couples c
          WHERE c.status = 'active'
            AND (SELECT COUNT(*) FROM couple_members cm WHERE cm.couple_id = c.id) = 2`,
      )
      .all<{ id: string }>();
    const list = (res as { results?: { id: string }[] }).results ?? [];
    return list.map((r) => r.id);
  }
}
