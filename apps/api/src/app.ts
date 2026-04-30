import { Hono } from "hono";
import { cors } from "hono/cors";
import { AppError } from "./domain/errors";
import { createOtpEmailFromEnv, type OtpEmailSender } from "./infra/email/otpEmail";
import { InMemoryRepository } from "./infra/inMemoryRepository";
import type { AppRepository } from "./domain/repository";
import { AuthUsecase } from "./usecases/authUsecase";
import { CoupleUsecase } from "./usecases/coupleUsecase";

export type AppEnv = {
  NODE_ENV?: string;
  ENVIRONMENT?: string;
  ALLOW_DEBUG_OTP?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  ALLOWED_ORIGINS?: string;
};

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

function matchCorsOrigin(origin: string, rules: OriginRule[]): string | null {
  for (const rule of rules) {
    if (rule.kind === "exact") {
      if (origin === rule.value) return origin;
      continue;
    }
    try {
      const parsed = new URL(origin);
      const protocol = parsed.protocol.replace(":", "").toLowerCase();
      const host = parsed.hostname.toLowerCase();
      if (protocol !== rule.protocol) continue;
      if (host === rule.suffix || host.endsWith(`.${rule.suffix}`)) return origin;
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
  const coupleUsecase = new CoupleUsecase(repo);

  const app = new Hono();
  const allowedOrigins = parseCorsOrigins(
    appEnv?.ALLOWED_ORIGINS,
    "http://localhost:5173,http://127.0.0.1:5173,https://*.pages.dev",
  );
  app.use(
    "*",
    cors({
      origin: (origin) => matchCorsOrigin(origin, allowedOrigins) ?? "",
      allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
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
      return c.json(await authUsecase.verifyOtp(body.email, body.code), 200);
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
      err.status as 400 | 401 | 404 | 409 | 410 | 429 | 500 | 503,
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
  };
  const email = createOtpEmailFromEnv({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV,
  });
  return createHonoApp({ repo, email, appEnv });
}
