import type { AppRepository, AuthAuditEvent } from "../domain/repository";
import { Couple, Invite, OtpRequestRecord, User } from "../domain/types";
import { newId as genId, newOtpCode, newSessionToken } from "../lib/ids";

type OtpRow = OtpRequestRecord & { id: string; createdAtMs: number };

export class InMemoryRepository implements AppRepository {
  private users = new Map<string, User>();
  private couples = new Map<string, Couple>();
  private invites = new Map<string, Invite>();
  private sessions = new Map<string, string>();
  private refreshSessions = new Map<string, { userId: string; expiresAtMs: number }>();
  private otpRequests = new Map<string, OtpRow>();

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
    this.otpRequests.set(id, { ...record, id, createdAtMs });
  }

  async findOtp(
    email: string,
    code: string,
  ): Promise<(OtpRequestRecord & { id: string }) | null> {
    for (const row of this.otpRequests.values()) {
      if (row.email === email && row.code === code) {
        return { id: row.id, email: row.email, code: row.code, expiresAt: row.expiresAt };
      }
    }
    return null;
  }

  async deleteOtpRequest(id: string): Promise<void> {
    this.otpRequests.delete(id);
  }

  async countOtpInWindowForEmail(email: string, sinceMs: number): Promise<number> {
    return Array.from(this.otpRequests.values()).filter(
      (r) => r.email === email && r.createdAtMs >= sinceMs,
    ).length;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return Array.from(this.users.values()).find((u) => u.email === email) ?? null;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async saveUser(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async issueSession(userId: string): Promise<string> {
    const token = newSessionToken();
    this.sessions.set(token, userId);
    return token;
  }

  async resolveUserIdFromToken(token: string): Promise<string | null> {
    return this.sessions.get(token) ?? null;
  }

  async issueRefreshSession(userId: string, expiresAtMs: number): Promise<string> {
    const token = newSessionToken();
    this.refreshSessions.set(token, { userId, expiresAtMs });
    return token;
  }

  async resolveUserIdFromRefreshToken(token: string, nowMs: number): Promise<string | null> {
    const row = this.refreshSessions.get(token);
    if (!row) return null;
    if (row.expiresAtMs <= nowMs) {
      this.refreshSessions.delete(token);
      return null;
    }
    return row.userId;
  }

  async revokeRefreshSession(token: string): Promise<void> {
    this.refreshSessions.delete(token);
  }

  async saveCouple(couple: Couple): Promise<void> {
    this.couples.set(couple.id, { ...couple, memberIds: [...couple.memberIds] });
  }

  async getCoupleById(id: string): Promise<Couple | null> {
    const c = this.couples.get(id);
    return c ? { ...c, memberIds: [...c.memberIds] } : null;
  }

  async findCoupleByUserId(userId: string): Promise<Couple | null> {
    for (const couple of this.couples.values()) {
      if (couple.memberIds.includes(userId)) {
        return { ...couple, memberIds: [...couple.memberIds] };
      }
    }
    return null;
  }

  async removePendingSoloCoupleByUserId(userId: string): Promise<boolean> {
    const couple = await this.findCoupleByUserId(userId);
    if (!couple) return false;
    if (couple.status !== "pending") return false;
    if (couple.memberIds.length !== 1 || couple.memberIds[0] !== userId) return false;

    for (const [code, invite] of Array.from(this.invites.entries())) {
      if (invite.coupleId === couple.id) {
        this.invites.delete(code);
      }
    }
    this.couples.delete(couple.id);
    return true;
  }

  async saveInvite(invite: Invite): Promise<void> {
    this.invites.set(invite.code, { ...invite });
  }

  async getInviteByCode(code: string): Promise<Invite | null> {
    return this.invites.get(code) ? { ...this.invites.get(code)! } : null;
  }

  async deleteAccountDataForUser(userId: string): Promise<{
    deletedUserIds: string[];
    deletedCoupleId?: string;
  }> {
    const couple = await this.findCoupleByUserId(userId);
    const deletedUserIds = couple ? [...couple.memberIds] : [userId];

    for (const token of Array.from(this.sessions.keys())) {
      const sessionUserId = this.sessions.get(token);
      if (sessionUserId && deletedUserIds.includes(sessionUserId)) {
        this.sessions.delete(token);
      }
    }
    for (const token of Array.from(this.refreshSessions.keys())) {
      const session = this.refreshSessions.get(token);
      if (session && deletedUserIds.includes(session.userId)) {
        this.refreshSessions.delete(token);
      }
    }

    if (couple) {
      for (const [code, invite] of Array.from(this.invites.entries())) {
        if (invite.coupleId === couple.id) {
          this.invites.delete(code);
        }
      }
      this.couples.delete(couple.id);
    }

    for (const deletedUserId of deletedUserIds) {
      this.users.delete(deletedUserId);
    }

    return {
      deletedUserIds,
      deletedCoupleId: couple?.id,
    };
  }

  async appendAuthAudit(
    _id: string,
    _event: AuthAuditEvent,
    _createdAtMs: number,
    _email: string | null,
    _detail: string | null,
  ): Promise<void> {
    // ローカルではログ過多を避けスキップ（必要なら console に出す）
  }
}
