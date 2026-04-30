import { AppError } from "../domain/errors";
import type { AppRepository } from "../domain/repository";
import { Couple, CoupleView, Invite, User } from "../domain/types";

function toCoupleView(couple: Couple): CoupleView {
  return {
    id: couple.id,
    status: couple.status,
    members: couple.memberIds.map((userId, index) => ({
      userId,
      role: index === 0 ? "owner" : "partner",
      joinedAt: couple.createdAt,
    })),
  };
}

export class CoupleUsecase {
  constructor(private readonly repo: AppRepository) {}

  async updateProfile(user: User, displayNameRaw: unknown): Promise<User> {
    if (typeof displayNameRaw === "string") {
      user.displayName = displayNameRaw.trim() || user.displayName;
    }
    user.updatedAt = this.repo.nowIso();
    await this.repo.saveUser(user);
    return user;
  }

  async createCouple(owner: User): Promise<CoupleView> {
    if (await this.repo.findCoupleByUserId(owner.id)) {
      throw new AppError(409, "already_in_couple", "user already in couple");
    }
    const couple: Couple = {
      id: this.repo.newId("cpl"),
      status: "pending",
      memberIds: [owner.id],
      createdAt: this.repo.nowIso(),
    };
    await this.repo.saveCouple(couple);
    return toCoupleView(couple);
  }

  async getMyCouple(user: User): Promise<CoupleView> {
    const couple = await this.repo.findCoupleByUserId(user.id);
    if (!couple) throw new AppError(404, "couple_not_found", "couple not found");
    return toCoupleView(couple);
  }

  async issueInvite(user: User): Promise<Invite> {
    const couple = await this.repo.findCoupleByUserId(user.id);
    if (!couple) throw new AppError(404, "couple_not_found", "couple not found");
    const invite: Invite = {
      id: this.repo.newId("inv"),
      coupleId: couple.id,
      code: `CP-${this.repo.newCode(4)}`,
      status: "issued",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    await this.repo.saveInvite(invite);
    return invite;
  }

  async acceptInvite(user: User, code: string): Promise<CoupleView> {
    const myCouple = await this.repo.findCoupleByUserId(user.id);
    if (myCouple) {
      const canReplacePendingSolo =
        myCouple.status === "pending" &&
        myCouple.memberIds.length === 1 &&
        myCouple.memberIds[0] === user.id;
      if (!canReplacePendingSolo) {
        throw new AppError(409, "already_in_couple", "user already in couple");
      }
      await this.repo.removePendingSoloCoupleByUserId(user.id);
    }
    const invite = await this.repo.getInviteByCode(code);
    if (!invite) throw new AppError(404, "invite_not_found", "invite not found");
    if (invite.status !== "issued") throw new AppError(409, "invite_not_active", "invite not active");
    if (Date.parse(invite.expiresAt) < Date.now()) {
      invite.status = "expired";
      await this.repo.saveInvite(invite);
      throw new AppError(410, "invite_expired", "invite expired");
    }
    const couple = await this.repo.getCoupleById(invite.coupleId);
    if (!couple) throw new AppError(404, "couple_not_found", "couple not found");
    couple.memberIds.push(user.id);
    couple.status = "active";
    await this.repo.saveCouple(couple);
    invite.status = "used";
    invite.usedAt = this.repo.nowIso();
    await this.repo.saveInvite(invite);
    return toCoupleView(couple);
  }
}
