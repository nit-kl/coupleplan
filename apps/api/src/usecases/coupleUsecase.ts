import { AppError } from "../domain/errors";
import { Couple, CoupleView, Invite, User } from "../domain/types";
import { InMemoryRepository } from "../infra/inMemoryRepository";

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
  constructor(private repo: InMemoryRepository) {}

  updateProfile(user: User, displayNameRaw: unknown): User {
    if (typeof displayNameRaw === "string") {
      user.displayName = displayNameRaw.trim() || user.displayName;
    }
    user.updatedAt = this.repo.nowIso();
    this.repo.saveUser(user);
    return user;
  }

  createCouple(owner: User): CoupleView {
    if (this.repo.findCoupleByUserId(owner.id)) {
      throw new AppError(409, "already_in_couple", "user already in couple");
    }
    const couple: Couple = {
      id: this.repo.newId("cpl"),
      status: "pending",
      memberIds: [owner.id],
      createdAt: this.repo.nowIso(),
    };
    this.repo.saveCouple(couple);
    return toCoupleView(couple);
  }

  getMyCouple(user: User): CoupleView {
    const couple = this.repo.findCoupleByUserId(user.id);
    if (!couple) throw new AppError(404, "couple_not_found", "couple not found");
    return toCoupleView(couple);
  }

  issueInvite(user: User): Invite {
    const couple = this.repo.findCoupleByUserId(user.id);
    if (!couple) throw new AppError(404, "couple_not_found", "couple not found");
    const invite: Invite = {
      id: this.repo.newId("inv"),
      coupleId: couple.id,
      code: `CP-${this.repo.newCode(4)}`,
      status: "issued",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    this.repo.saveInvite(invite);
    return invite;
  }

  acceptInvite(user: User, code: string): CoupleView {
    if (this.repo.findCoupleByUserId(user.id)) {
      throw new AppError(409, "already_in_couple", "user already in couple");
    }
    const invite = this.repo.getInviteByCode(code);
    if (!invite) throw new AppError(404, "invite_not_found", "invite not found");
    if (invite.status !== "issued") throw new AppError(409, "invite_not_active", "invite not active");
    if (Date.parse(invite.expiresAt) < Date.now()) {
      invite.status = "expired";
      this.repo.saveInvite(invite);
      throw new AppError(410, "invite_expired", "invite expired");
    }
    const couple = this.repo.getCoupleById(invite.coupleId);
    if (!couple) throw new AppError(404, "couple_not_found", "couple not found");
    couple.memberIds.push(user.id);
    couple.status = "active";
    this.repo.saveCouple(couple);
    invite.status = "used";
    invite.usedAt = this.repo.nowIso();
    this.repo.saveInvite(invite);
    return toCoupleView(couple);
  }
}
