import type { Couple, Invite, OtpRequestRecord, User } from "./types";

export type AuthAuditEvent = "otp_request" | "otp_rate_limited" | "otp_send_fail" | "otp_verify_ok" | "otp_verify_fail";

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
  saveCouple(couple: Couple): Promise<void>;
  getCoupleById(id: string): Promise<Couple | null>;
  findCoupleByUserId(userId: string): Promise<Couple | null>;
  saveInvite(invite: Invite): Promise<void>;
  getInviteByCode(code: string): Promise<Invite | null>;

  appendAuthAudit(
    id: string,
    event: AuthAuditEvent,
    createdAtMs: number,
    email: string | null,
    detail: string | null,
  ): Promise<void>;
}
