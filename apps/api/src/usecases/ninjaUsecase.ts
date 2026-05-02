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

  listMissions(): NinjaMissionCard[] {
    return getNinjaMissionCatalog();
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
    const mission = findNinjaMissionById(missionId);
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

  async getWeek(user: User): Promise<NinjaWeekView> {
    const { coupleId } = await this.ensureActiveCouple(user);
    const { weekStart, startIso, endIso } = jstWeekRangeContaining(new Date());
    const weekEnd = jstSundayYmdAfterMonday(weekStart);
    const allLogs = await this.repo.listNinjaLogsInRange(coupleId, startIso, endIso);
    const myLogsRaw = allLogs.filter((l) => l.userId === user.id);
    const myPoints = myLogsRaw.reduce((sum, l) => sum + l.point, 0);
    const catalog = getNinjaMissionCatalog();
    const titleById = new Map(catalog.map((m) => [m.id, m.title] as const));
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
