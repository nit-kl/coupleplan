import { findPlanById, getPlanCatalog } from "../data/plans";
import { AppError } from "../domain/errors";
import type { AppRepository, RouletteVoteInput } from "../domain/repository";
import type {
  PlanCard,
  RouletteResult,
  RouletteSession,
  RouletteSessionView,
  RouletteVote,
  RouletteVoteValue,
  User,
} from "../domain/types";

export const MATCH_THRESHOLD = 3;

type CoupleSummary = { coupleId: string; partnerId: string };

function pickRandomIndex(maxExclusive: number): number {
  if (maxExclusive <= 0) {
    throw new AppError(500, "internal_error", "no candidate to pick");
  }
  // 32bit を切り出して maxExclusive 未満に正規化（少数件なら偏りは無視できる）
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0]! % maxExclusive;
}

function intersectLikedPlans(votes: RouletteVote[], userIds: string[]): string[] {
  if (userIds.length === 0) return [];
  const planUserLikes = new Map<string, Set<string>>();
  for (const v of votes) {
    if (v.vote !== "like") continue;
    if (!userIds.includes(v.userId)) continue;
    if (!planUserLikes.has(v.planId)) planUserLikes.set(v.planId, new Set());
    planUserLikes.get(v.planId)!.add(v.userId);
  }
  const matched: string[] = [];
  for (const [planId, set] of planUserLikes.entries()) {
    if (set.size === userIds.length) matched.push(planId);
  }
  return matched.sort();
}

export class RouletteUsecase {
  constructor(private readonly repo: AppRepository) {}

  /** カップル active を確認し、相手 ID も返す */
  private async ensureCoupleSummary(user: User): Promise<CoupleSummary> {
    const couple = await this.repo.findCoupleByUserId(user.id);
    if (!couple || couple.status !== "active" || couple.memberIds.length < 2) {
      throw new AppError(412, "couple_required", "active couple is required");
    }
    const partnerId = couple.memberIds.find((id) => id !== user.id);
    if (!partnerId) {
      throw new AppError(412, "couple_required", "active couple is required");
    }
    return { coupleId: couple.id, partnerId };
  }

  listPlans(): PlanCard[] {
    return getPlanCatalog();
  }

  async getSessionView(user: User): Promise<RouletteSessionView> {
    const { coupleId, partnerId } = await this.ensureCoupleSummary(user);
    const session = await this.repo.getOrCreateActiveRouletteSession(coupleId);
    return this.buildView(user.id, partnerId, session);
  }

  async submitVotes(
    user: User,
    rawVotes: unknown,
  ): Promise<RouletteSessionView> {
    const { coupleId, partnerId } = await this.ensureCoupleSummary(user);
    const session = await this.repo.getOrCreateActiveRouletteSession(coupleId);

    if (session.status === "decided") {
      throw new AppError(409, "session_decided", "session already decided");
    }

    const items = this.normalizeVotePayload(rawVotes);

    await this.repo.upsertRouletteVotes(session.id, user.id, items);
    await this.evaluateReadyTransition(session.id, partnerId, user.id);
    const refreshed = await this.repo.getRouletteSessionById(session.id);
    return this.buildView(user.id, partnerId, refreshed ?? session);
  }

  async spin(user: User): Promise<RouletteSessionView> {
    const { coupleId, partnerId } = await this.ensureCoupleSummary(user);
    const session = await this.repo.getOrCreateActiveRouletteSession(coupleId);

    if (session.status === "decided") {
      return this.buildView(user.id, partnerId, session);
    }
    if (session.status !== "ready") {
      throw new AppError(409, "session_not_ready", "session is not ready to spin");
    }

    const votes = await this.repo.listRouletteVotes(session.id);
    const candidates = intersectLikedPlans(votes, [user.id, partnerId]);
    if (candidates.length < MATCH_THRESHOLD) {
      throw new AppError(409, "session_not_ready", "session is not ready to spin");
    }

    const idx = pickRandomIndex(candidates.length);
    const result: RouletteResult = {
      id: this.repo.newId("rlr"),
      sessionId: session.id,
      selectedPlanId: candidates[idx]!,
      createdAt: this.repo.nowIso(),
    };
    await this.repo.saveRouletteResult(result);
    await this.repo.updateRouletteSessionStatus(session.id, "decided", this.repo.nowIso());

    const refreshed = await this.repo.getRouletteSessionById(session.id);
    return this.buildView(user.id, partnerId, refreshed ?? { ...session, status: "decided" });
  }

  async restart(user: User): Promise<RouletteSessionView> {
    const { coupleId, partnerId } = await this.ensureCoupleSummary(user);
    const session = await this.repo.getOrCreateActiveRouletteSession(coupleId);
    await this.repo.archiveRouletteSession(session.id, this.repo.nowIso());
    const next = await this.repo.getOrCreateActiveRouletteSession(coupleId);
    return this.buildView(user.id, partnerId, next);
  }

  private normalizeVotePayload(raw: unknown): RouletteVoteInput[] {
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new AppError(400, "bad_request", "votes must be a non-empty array");
    }
    const seen = new Set<string>();
    const items: RouletteVoteInput[] = [];
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") {
        throw new AppError(400, "bad_request", "each vote must be an object");
      }
      const planId = (entry as { planId?: unknown }).planId;
      const vote = (entry as { vote?: unknown }).vote;
      if (typeof planId !== "string" || !planId) {
        throw new AppError(400, "bad_request", "planId must be a string");
      }
      if (vote !== "like" && vote !== "pass") {
        throw new AppError(400, "bad_request", "vote must be like or pass");
      }
      if (!findPlanById(planId)) {
        throw new AppError(400, "unknown_plan", `unknown plan: ${planId}`);
      }
      if (seen.has(planId)) continue;
      seen.add(planId);
      items.push({ planId, vote: vote as RouletteVoteValue });
    }
    return items;
  }

  private async evaluateReadyTransition(
    sessionId: string,
    partnerId: string,
    selfId: string,
  ): Promise<void> {
    const session = await this.repo.getRouletteSessionById(sessionId);
    if (!session || session.status !== "collecting") return;
    const totalPlans = getPlanCatalog().length;
    const votes = await this.repo.listRouletteVotes(sessionId);
    const meDone = votes.filter((v) => v.userId === selfId).length >= totalPlans;
    const partnerDone = votes.filter((v) => v.userId === partnerId).length >= totalPlans;
    if (!meDone || !partnerDone) return;
    const matched = intersectLikedPlans(votes, [selfId, partnerId]);
    if (matched.length >= MATCH_THRESHOLD) {
      await this.repo.updateRouletteSessionStatus(sessionId, "ready", null);
    }
  }

  private async buildView(
    selfId: string,
    partnerId: string,
    session: RouletteSession,
  ): Promise<RouletteSessionView> {
    const totalPlans = getPlanCatalog().length;
    const votes = await this.repo.listRouletteVotes(session.id);
    const myVotes = votes
      .filter((v) => v.userId === selfId)
      .map((v) => ({ planId: v.planId, vote: v.vote }));
    const partnerVotes = votes.filter((v) => v.userId === partnerId);
    const matchedPlanIds =
      session.status === "collecting"
        ? []
        : intersectLikedPlans(votes, [selfId, partnerId]);

    const view: RouletteSessionView = {
      sessionId: session.id,
      status: session.status,
      totalPlans,
      partners: {
        me: {
          userId: selfId,
          voted: myVotes.length,
          completed: myVotes.length >= totalPlans,
        },
        partner: {
          userId: partnerId,
          completed: partnerVotes.length >= totalPlans,
        },
      },
      matchedPlanIds,
      matchThreshold: MATCH_THRESHOLD,
      myVotes,
    };

    if (session.status === "decided") {
      const result = await this.repo.getRouletteResultBySession(session.id);
      if (result) {
        const plan = findPlanById(result.selectedPlanId);
        if (plan) {
          view.result = {
            selectedPlanId: result.selectedPlanId,
            selectedPlan: plan,
            decidedAt: result.createdAt,
          };
        }
      }
    }

    return view;
  }
}
