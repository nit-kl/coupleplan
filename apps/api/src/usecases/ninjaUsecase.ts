import { findNinjaMissionById, getNinjaMissionCatalog } from "../data/ninjaMissions";
import { AppError } from "../domain/errors";
import type { AppRepository } from "../domain/repository";
import type {
  NinjaLog,
  NinjaLogItemView,
  NinjaMissionCard,
  NinjaWeekView,
  NinjaWeeklySummary,
  User,
} from "../domain/types";
import { jstDayOfWeekMon0, jstSundayYmdAfterMonday, jstWeekRangeContaining } from "../lib/jstWeek";

type CouplePair = { coupleId: string };
const CUSTOM_MISSION_ALLOWED_POINTS = new Set<number>([5, 10]);
const CUSTOM_MISSION_WEEKLY_CREATE_LIMIT = 3;

type JobEnv = {
  NINJA_PUBLISH_SECRET?: string;
  NODE_ENV?: string;
  ENVIRONMENT?: string;
};

function isProductionEnv(env: JobEnv | undefined): boolean {
  if (!env) return false;
  if (env.NODE_ENV === "production" || env.ENVIRONMENT === "production") return true;
  return false;
}

function parseBearer(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const t = authHeader.slice(7).trim();
  return t.length > 0 ? t : null;
}

function assertNinjaJobAuthorized(
  appEnv: JobEnv | undefined,
  authHeader: string | undefined,
): void {
  const secret = appEnv?.NINJA_PUBLISH_SECRET;
  const prod = isProductionEnv(appEnv);
  if (!secret) {
    if (prod) {
      throw new AppError(503, "job_not_configured", "NINJA_PUBLISH_SECRET is required in production");
    }
    return;
  }
  const token = parseBearer(authHeader);
  if (token !== secret) {
    throw new AppError(401, "unauthorized", "invalid job authorization");
  }
}

function parseWeekStartFromBody(rawBody: unknown): string {
  if (
    typeof rawBody === "object" &&
    rawBody !== null &&
    "weekStart" in rawBody &&
    typeof (rawBody as { weekStart: unknown }).weekStart === "string"
  ) {
    const weekStart = (rawBody as { weekStart: string }).weekStart.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      throw new AppError(400, "invalid_week_start", "weekStart must be YYYY-MM-DD");
    }
    const anchor = new Date(`${weekStart}T12:00:00+09:00`);
    if (jstDayOfWeekMon0(anchor) !== 0) {
      throw new AppError(400, "invalid_week_start", "weekStart must be a Monday (Asia/Tokyo)");
    }
    return weekStart;
  }
  return jstWeekRangeContaining(new Date()).weekStart;
}

export class NinjaUsecase {
  constructor(private readonly repo: AppRepository) {}

  private async ensureActiveCouple(user: User): Promise<CouplePair> {
    const couple = await this.repo.findCoupleByUserId(user.id);
    if (!couple || couple.status !== "active" || couple.memberIds.length !== 2) {
      throw new AppError(412, "couple_required", "active couple is required");
    }
    return { coupleId: couple.id };
  }

  async listMissions(user: User): Promise<NinjaMissionCard[]> {
    const { coupleId } = await this.ensureActiveCouple(user);
    const catalog = getNinjaMissionCatalog();
    const custom = await this.repo.listNinjaCustomMissions(coupleId);
    const customCards: NinjaMissionCard[] = custom.map((m) => ({
      id: m.id,
      emoji: m.emoji,
      title: m.title,
      description: m.description,
      point: m.point,
    }));
    return [...catalog, ...customCards];
  }

  async createCustomMission(
    user: User,
    raw: unknown,
  ): Promise<{ mission: NinjaMissionCard; weeklyCreatedCount: number; weeklyCreateLimit: number }> {
    const { coupleId } = await this.ensureActiveCouple(user);
    const title =
      typeof raw === "object" && raw !== null && "title" in raw ? (raw as { title: unknown }).title : undefined;
    const point =
      typeof raw === "object" && raw !== null && "point" in raw ? (raw as { point: unknown }).point : undefined;
    const descriptionRaw =
      typeof raw === "object" && raw !== null && "description" in raw
        ? (raw as { description: unknown }).description
        : undefined;
    const emojiRaw =
      typeof raw === "object" && raw !== null && "emoji" in raw ? (raw as { emoji: unknown }).emoji : undefined;

    if (typeof title !== "string" || title.trim().length === 0) {
      throw new AppError(400, "invalid_payload", "title is required");
    }
    if (typeof point !== "number" || !Number.isInteger(point)) {
      throw new AppError(400, "invalid_payload", "point must be an integer");
    }
    if (!CUSTOM_MISSION_ALLOWED_POINTS.has(point)) {
      throw new AppError(400, "invalid_point", "point must be one of allowed values");
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length > 40) {
      throw new AppError(400, "invalid_payload", "title is too long");
    }
    const description =
      typeof descriptionRaw === "string" && descriptionRaw.trim().length > 0
        ? descriptionRaw.trim().slice(0, 120)
        : "ふたり用のカスタム任務";
    const emoji =
      typeof emojiRaw === "string" && emojiRaw.trim().length > 0 ? emojiRaw.trim().slice(0, 8) : "🥷";

    const { startIso, endIso } = jstWeekRangeContaining(new Date());
    const weeklyCreatedCount = await this.repo.countNinjaCustomMissionsInRange(coupleId, startIso, endIso);
    if (weeklyCreatedCount >= CUSTOM_MISSION_WEEKLY_CREATE_LIMIT) {
      throw new AppError(409, "custom_mission_limit_reached", "weekly custom mission limit reached");
    }

    const mission = {
      id: this.repo.newId("njc"),
      coupleId,
      title: trimmedTitle,
      description,
      emoji,
      point,
      createdByUserId: user.id,
      createdAt: this.repo.nowIso(),
    };
    await this.repo.insertNinjaCustomMission(mission);
    return {
      mission: {
        id: mission.id,
        emoji: mission.emoji,
        title: mission.title,
        description: mission.description,
        point: mission.point,
      },
      weeklyCreatedCount: weeklyCreatedCount + 1,
      weeklyCreateLimit: CUSTOM_MISSION_WEEKLY_CREATE_LIMIT,
    };
  }

  async declare(user: User, raw: unknown): Promise<{ log: NinjaLogItemView }> {
    const { coupleId } = await this.ensureActiveCouple(user);
    const missionId =
      typeof raw === "object" && raw !== null && "missionId" in raw
        ? (raw as { missionId: unknown }).missionId
        : undefined;
    if (typeof missionId !== "string" || missionId.length === 0) {
      throw new AppError(400, "invalid_payload", "missionId is required");
    }
    const staticMission = findNinjaMissionById(missionId);
    const customMission = staticMission
      ? null
      : await this.repo.getNinjaCustomMissionById(coupleId, missionId);
    const mission = staticMission ?? customMission;
    if (!mission) {
      throw new AppError(400, "unknown_mission", "unknown mission");
    }
    const log: NinjaLog = {
      id: this.repo.newId("njl"),
      coupleId,
      userId: user.id,
      missionId: mission.id,
      point: mission.point,
      createdAt: this.repo.nowIso(),
    };
    await this.repo.insertNinjaLog(log);
    return {
      log: {
        id: log.id,
        missionId: log.missionId,
        title: mission.title,
        point: log.point,
        createdAt: log.createdAt,
      },
    };
  }

  private async publishOneCoupleWeek(
    coupleId: string,
    weekStart: string,
    publishedAt: string,
  ): Promise<void> {
    const couple = await this.repo.getCoupleById(coupleId);
    if (!couple || couple.memberIds.length !== 2) return;
    const anchor = new Date(`${weekStart}T12:00:00+09:00`);
    const { startIso, endIso } = jstWeekRangeContaining(anchor);
    const ownerUserId = couple.memberIds[0]!;
    const partnerUserId = couple.memberIds[1]!;
    const logs = await this.repo.listNinjaLogsInRange(coupleId, startIso, endIso);
    let ownerPoints = 0;
    let partnerPoints = 0;
    for (const l of logs) {
      if (l.userId === ownerUserId) ownerPoints += l.point;
      else if (l.userId === partnerUserId) partnerPoints += l.point;
    }
    const existing = await this.repo.getNinjaWeeklySummary(coupleId, weekStart);
    const summary: NinjaWeeklySummary = {
      id: existing?.id ?? this.repo.newId("nws"),
      coupleId,
      weekStart,
      ownerUserId,
      partnerUserId,
      ownerPoints,
      partnerPoints,
      publishedAt,
    };
    await this.repo.upsertNinjaWeeklySummary(summary);
  }

  /** ログインユーザーのカップルについて、週の合計を確定して双方に公開する（タイミングはカップル任せ） */
  async publishMyWeek(user: User, rawBody: unknown): Promise<NinjaWeekView> {
    const { coupleId } = await this.ensureActiveCouple(user);
    const weekStart = parseWeekStartFromBody(rawBody);
    const now = this.repo.nowIso();
    await this.publishOneCoupleWeek(coupleId, weekStart, now);
    return this.getWeek(user);
  }

  /** ログは残したまま、週次の公開状態のみ解除する */
  async resetMyWeek(user: User, rawBody: unknown): Promise<NinjaWeekView> {
    const { coupleId } = await this.ensureActiveCouple(user);
    const weekStart = parseWeekStartFromBody(rawBody);
    await this.repo.deleteNinjaWeeklySummary(coupleId, weekStart);
    return this.getWeek(user);
  }

  async getWeek(user: User): Promise<NinjaWeekView> {
    const { coupleId } = await this.ensureActiveCouple(user);
    const { weekStart, startIso, endIso } = jstWeekRangeContaining(new Date());
    const weekEnd = jstSundayYmdAfterMonday(weekStart);
    const allLogs = await this.repo.listNinjaLogsInRange(coupleId, startIso, endIso);
    const myLogsRaw = allLogs.filter((l) => l.userId === user.id);
    const myPoints = myLogsRaw.reduce((sum, l) => sum + l.point, 0);
    const catalog = getNinjaMissionCatalog();
    const custom = await this.repo.listNinjaCustomMissions(coupleId);
    const titleById = new Map(
      [...catalog, ...custom.map((m) => ({ id: m.id, title: m.title }))].map((m) => [m.id, m.title] as const),
    );
    const myLogs: NinjaLogItemView[] = myLogsRaw.map((l) => ({
      id: l.id,
      missionId: l.missionId,
      title: titleById.get(l.missionId) ?? l.missionId,
      point: l.point,
      createdAt: l.createdAt,
    }));
    const summary = await this.repo.getNinjaWeeklySummary(coupleId, weekStart);
    let partnerPoints: number | null = null;
    let publishedAt: string | null = null;
    if (summary) {
      publishedAt = summary.publishedAt;
      partnerPoints =
        user.id === summary.ownerUserId ? summary.partnerPoints : summary.ownerPoints;
    }
    return {
      weekStart,
      weekEnd,
      myUserId: user.id,
      myPoints,
      partnerPoints,
      publishedAt,
      myLogs,
    };
  }

  /** 全 active カップル一括。運用・バックフィル用。本番はシークレット必須。 */
  async publishWeek(
    appEnv: JobEnv | undefined,
    authHeader: string | undefined,
    rawBody: unknown,
  ): Promise<{ weekStart: string; couplesPublished: number }> {
    assertNinjaJobAuthorized(appEnv, authHeader);
    const weekStart = parseWeekStartFromBody(rawBody);
    const coupleIds = await this.repo.listActiveCoupleIds();
    const now = this.repo.nowIso();
    for (const cid of coupleIds) {
      await this.publishOneCoupleWeek(cid, weekStart, now);
    }
    return { weekStart, couplesPublished: coupleIds.length };
  }
}
