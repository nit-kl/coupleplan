import * as crypto from "node:crypto";
import { Couple, Invite, OtpRequestRecord, User } from "../domain/types";

export class InMemoryRepository {
  private users = new Map<string, User>();
  private couples = new Map<string, Couple>();
  private invites = new Map<string, Invite>();
  private sessions = new Map<string, string>();
  private otpRequests = new Map<string, OtpRequestRecord>();

  nowIso(): string {
    return new Date().toISOString();
  }

  newId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(4).toString("hex")}`;
  }

  newCode(length = 6): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  putOtpRequest(id: string, record: OtpRequestRecord): void {
    this.otpRequests.set(id, record);
  }

  findOtp(email: string, code: string): OtpRequestRecord | null {
    return Array.from(this.otpRequests.values()).find((item) => item.email === email && item.code === code) ?? null;
  }

  findUserByEmail(email: string): User | null {
    return Array.from(this.users.values()).find((u) => u.email === email) ?? null;
  }

  getUserById(id: string): User | null {
    return this.users.get(id) ?? null;
  }

  saveUser(user: User): void {
    this.users.set(user.id, user);
  }

  issueSession(userId: string): string {
    const token = `tok_${crypto.randomBytes(16).toString("hex")}`;
    this.sessions.set(token, userId);
    return token;
  }

  resolveUserIdFromToken(token: string): string | null {
    return this.sessions.get(token) ?? null;
  }

  saveCouple(couple: Couple): void {
    this.couples.set(couple.id, couple);
  }

  getCoupleById(id: string): Couple | null {
    return this.couples.get(id) ?? null;
  }

  findCoupleByUserId(userId: string): Couple | null {
    for (const couple of this.couples.values()) {
      if (couple.memberIds.includes(userId)) return couple;
    }
    return null;
  }

  saveInvite(invite: Invite): void {
    this.invites.set(invite.code, invite);
  }

  getInviteByCode(code: string): Invite | null {
    return this.invites.get(code) ?? null;
  }
}
