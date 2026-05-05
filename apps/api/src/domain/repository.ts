import type {
  Couple,
  Invite,
  NinjaLog,
  NinjaWeeklySummary,
  OtpRequestRecord,
  RouletteResult,
  RouletteSession,
  RouletteVote,
  RouletteVoteValue,
  User,
} from "./types";

export type AuthAuditEvent = "otp_request" | "otp_rate_limited" | "otp_send_fail" | "otp_verify_ok" | "otp_verify_fail";

export type RouletteVoteInput = { planId: string; vote: RouletteVoteValue };

/**
 * 認証・会員・カップル/招待の永続化。実装はインメモリ（Node ローカル）と D1（Worker）の2系統。
 * メソッドは D1/非同期 I/O 前提の async に統一する。
 */
export interface AppRepository {
  nowIso(): string;
  newId(prefix: string): string;
  newCode(length: number): string;
  newOtpCode(length: number): string;

  putOtpRequest(id: string, record: OtpRequestRecord, createdAtMs: number): Promise<void>;
  findOtp(email: string, code: string): Promise<(OtpRequestRecord & { id: string }) | null>;
  deleteOtpRequest(id: string): Promise<void>;
  countOtpInWindowForEmail(email: string, sinceMs: number): Promise<number>;

  findUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  saveUser(user: User): Promise<void>;
  issueSession(userId: string): Promise<string>;
  resolveUserIdFromToken(token: string): Promise<string | null>;
  issueRefreshSession(userId: string, expiresAtMs: number): Promise<string>;
  resolveUserIdFromRefreshToken(token: string, nowMs: number): Promise<string | null>;
  revokeRefreshSession(token: string): Promise<void>;
  saveCouple(couple: Couple): Promise<void>;
  getCoupleById(id: string): Promise<Couple | null>;
  findCoupleByUserId(userId: string): Promise<Couple | null>;
  removePendingSoloCoupleByUserId(userId: string): Promise<boolean>;
  saveInvite(invite: Invite): Promise<void>;
  getInviteByCode(code: string): Promise<Invite | null>;
  deleteAccountDataForUser(userId: string): Promise<{
    deletedUserIds: string[];
    deletedCoupleId?: string;
  }>;

  appendAuthAudit(
    id: string,
    event: AuthAuditEvent,
    createdAtMs: number,
    email: string | null,
    detail: string | null,
  ): Promise<void>;

  getOrCreateActiveRouletteSession(coupleId: string, deckPlanIds: string[]): Promise<RouletteSession>;
  getRouletteSessionById(sessionId: string): Promise<RouletteSession | null>;
  updateRouletteSessionStatus(
    sessionId: string,
    status: RouletteSession["status"],
    finishedAt: string | null,
  ): Promise<void>;
  archiveRouletteSession(sessionId: string, archivedAt: string): Promise<void>;

  upsertRouletteVotes(sessionId: string, userId: string, votes: RouletteVoteInput[]): Promise<void>;
  listRouletteVotes(sessionId: string): Promise<RouletteVote[]>;

  saveRouletteResult(result: RouletteResult): Promise<void>;
  getRouletteResultBySession(sessionId: string): Promise<RouletteResult | null>;

  insertNinjaLog(log: NinjaLog): Promise<void>;
  listNinjaLogsInRange(coupleId: string, startIso: string, endIso: string): Promise<NinjaLog[]>;
  getNinjaWeeklySummary(coupleId: string, weekStart: string): Promise<NinjaWeeklySummary | null>;
  upsertNinjaWeeklySummary(summary: NinjaWeeklySummary): Promise<void>;
  deleteNinjaWeeklySummary(coupleId: string, weekStart: string): Promise<void>;
  listActiveCoupleIds(): Promise<string[]>;
}
