import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { AppError } from "./domain/errors";
import { createOtpEmailFromEnv, type OtpEmailSender } from "./infra/email/otpEmail";
import { InMemoryRepository } from "./infra/inMemoryRepository";
import type { AppRepository } from "./domain/repository";
import { AccountUsecase } from "./usecases/accountUsecase";
import { AuthUsecase } from "./usecases/authUsecase";
import { CoupleUsecase } from "./usecases/coupleUsecase";
import { NinjaUsecase } from "./usecases/ninjaUsecase";
import { RouletteUsecase } from "./usecases/rouletteUsecase";

export type AppEnv = {
  NODE_ENV?: string;
  ENVIRONMENT?: string;
  ALLOW_DEBUG_OTP?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  ALLOWED_ORIGINS?: string;
  NINJA_PUBLISH_SECRET?: string;
};
const REFRESH_COOKIE_NAME = "cp_refresh";

type OriginRule =
  | { kind: "exact"; value: string }
  | { kind: "wildcard"; protocol: string; suffix: string };

function parseCorsOrigins(allowed: string | undefined, fallback: string): OriginRule[] {
  const raw = (allowed && allowed.length > 0 ? allowed : fallback)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const list = (raw.length > 0 ? raw : [fallback]).flatMap((item): OriginRule[] => {
    if (item.includes("*")) {
      const matched = item.match(/^(https?):\/\/\*\.([a-z0-9.-]+)$/i);
      if (!matched) return [];
      return [{ kind: "wildcard", protocol: matched[1]!.toLowerCase(), suffix: matched[2]!.toLowerCase() }];
    }
    return [{ kind: "exact", value: item }];
  });
  return list;
}

function normalizeOrigin(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function matchCorsOrigin(origin: string, rules: OriginRule[]): string | null {
  const normalizedOrigin = normalizeOrigin(origin);
  for (const rule of rules) {
    if (rule.kind === "exact") {
      if (normalizedOrigin === normalizeOrigin(rule.value)) return normalizedOrigin;
      continue;
    }
    try {
      const parsed = new URL(normalizedOrigin);
      const protocol = parsed.protocol.replace(":", "").toLowerCase();
      const host = parsed.hostname.toLowerCase();
      if (protocol !== rule.protocol) continue;
      if (host === rule.suffix || host.endsWith(`.${rule.suffix}`)) return normalizedOrigin;
    } catch {
      continue;
    }
  }
  return null;
}

function isProductionEnv(env: AppEnv | undefined): boolean {
  if (!env) return false;
  if (env.NODE_ENV === "production" || env.ENVIRONMENT === "production") return true;
  return false;
}

function setRefreshCookie(
  c: { header: (name: string, value: string, options?: { append?: boolean }) => void },
  refreshToken: string,
  prod: boolean,
): void {
  setCookie(c as never, REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: prod,
    sameSite: "Lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

function clearRefreshCookie(
  c: { header: (name: string, value: string, options?: { append?: boolean }) => void },
): void {
  deleteCookie(c as never, REFRESH_COOKIE_NAME, { path: "/" });
}

export function createHonoApp(options: {
  repo: AppRepository;
  email: OtpEmailSender;
  appEnv: AppEnv | undefined;
}): Hono {
  const { repo, email, appEnv } = options;
  const prod = isProductionEnv(appEnv);
  const allowDebugOtp =
    !prod || (appEnv?.ALLOW_DEBUG_OTP === "1" || appEnv?.ALLOW_DEBUG_OTP === "true");

  const authUsecase = new AuthUsecase(repo, email, allowDebugOtp);
  const accountUsecase = new AccountUsecase(repo);
  const coupleUsecase = new CoupleUsecase(repo);
  const rouletteUsecase = new RouletteUsecase(repo);
  const ninjaUsecase = new NinjaUsecase(repo);

  const app = new Hono();
  const allowedOrigins = parseCorsOrigins(
    appEnv?.ALLOWED_ORIGINS,
    "http://localhost:5173,http://127.0.0.1:5173,https://*.pages.dev",
  );
  app.use(
    "*",
    cors({
      origin: (origin) => matchCorsOrigin(origin, allowedOrigins) ?? "",
      credentials: true,
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.post("/auth/otp/request", async (c) => {
    try {
      const body = await c.req.json();
      return c.json(await authUsecase.requestOtp(body.email), 202);
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.post("/auth/otp/verify", async (c) => {
    try {
      const body = await c.req.json();
      const verified = await authUsecase.verifyOtp(body.email, body.code);
      setRefreshCookie(c, verified.refreshToken, prod);
      return c.json(
        {
          accessToken: verified.accessToken,
          user: verified.user,
          refreshExpiresInSec: verified.refreshExpiresInSec,
        },
        200,
      );
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.post("/auth/refresh", async (c) => {
    try {
      const refreshToken = getCookie(c, REFRESH_COOKIE_NAME);
      const refreshed = await authUsecase.refreshSessionFromToken(refreshToken);
      return c.json(refreshed, 200);
    } catch (err) {
      clearRefreshCookie(c);
      return handleError(c, err);
    }
  });

  app.post("/auth/logout", async (c) => {
    try {
      const refreshToken = getCookie(c, REFRESH_COOKIE_NAME);
      await authUsecase.revokeRefreshSession(refreshToken);
      clearRefreshCookie(c);
      return c.json({ ok: true }, 200);
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.get("/users/me", async (c) => {
    try {
      const user = await authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
      return c.json(user, 200);
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.patch("/users/me", async (c) => {
    try {
      const user = await authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
      const body = await c.req.json();
      return c.json(await coupleUsecase.updateProfile(user, body.displayName), 200);
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.delete("/users/me", async (c) => {
    try {
      const user = await authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
      const result = await accountUsecase.withdraw(user);
      clearRefreshCookie(c);
      return c.json(result, 200);
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.post("/couples", async (c) => {
    try {
      const user = await authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
      return c.json(await coupleUsecase.createCouple(user), 201);
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.get("/couples/me", async (c) => {
    try {
      const user = await authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
      return c.json(await coupleUsecase.getMyCouple(user), 200);
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.post("/couples/invites", async (c) => {
    try {
      const user = await authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
      return c.json(await coupleUsecase.issueInvite(user), 201);
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.post("/couples/invites/:code/accept", async (c) => {
    try {
      const user = await authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
      return c.json(await coupleUsecase.acceptInvite(user, c.req.param("code")), 200);
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.get("/roulette/plans", async (c) => {
    try {
      await authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
      return c.json({ plans: rouletteUsecase.listPlans() }, 200);
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.get("/roulette/sessions/me", async (c) => {
    try {
      const user = await authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
      return c.json(await rouletteUsecase.getSessionView(user), 200);
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.post("/roulette/sessions/me/votes", async (c) => {
    try {
      const user = await authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
      const body = await c.req.json();
      return c.json(await rouletteUsecase.submitVotes(user, body?.votes), 200);
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.post("/roulette/sessions/me/spin", async (c) => {
    try {
      const user = await authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
      return c.json(await rouletteUsecase.spin(user), 200);
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.post("/roulette/sessions/me/restart", async (c) => {
    try {
      const user = await authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
      return c.json(await rouletteUsecase.restart(user), 200);
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.get("/ninja/missions", async (c) => {
    try {
      await authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
      return c.json({ missions: ninjaUsecase.listMissions() }, 200);
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.post("/ninja/logs", async (c) => {
    try {
      const user = await authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
      const body = await c.req.json();
      return c.json(await ninjaUsecase.declare(user, body), 200);
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.get("/ninja/week", async (c) => {
    try {
      const user = await authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
      return c.json(await ninjaUsecase.getWeek(user), 200);
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.post("/ninja/week/publish", async (c) => {
    try {
      const user = await authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
      const body = await c.req.json().catch(() => ({}));
      return c.json(await ninjaUsecase.publishMyWeek(user, body), 200);
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.post("/ninja/jobs/publish-week", async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      return c.json(
        await ninjaUsecase.publishWeek(appEnv, c.req.header("authorization"), body),
        200,
      );
    } catch (err) {
      return handleError(c, err);
    }
  });

  app.notFound((c) => c.json({ error: "not found", code: "not_found" }, 404));

  return app;
}

function handleError(
  c: { json: (b: object, s: number) => Response },
  err: unknown,
) {
  if (err instanceof AppError) {
    return c.json(
      { error: err.message, code: err.code },
      err.status as 400 | 401 | 404 | 409 | 410 | 412 | 429 | 500 | 503,
    );
  }
  const message = err instanceof Error ? err.message : String(err);
  return c.json({ error: "internal error", detail: message, code: "internal_error" }, 500);
}

export function buildDefaultInMemoryApp(): Hono {
  const repo = new InMemoryRepository();
  const appEnv: AppEnv = {
    NODE_ENV: process.env.NODE_ENV,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM: process.env.RESEND_FROM,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    ALLOW_DEBUG_OTP: process.env.ALLOW_DEBUG_OTP,
    NINJA_PUBLISH_SECRET: process.env.NINJA_PUBLISH_SECRET,
  };
  const email = createOtpEmailFromEnv({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV,
  });
  return createHonoApp({ repo, email, appEnv });
}
