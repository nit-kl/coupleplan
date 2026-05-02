/// <reference types="@cloudflare/workers-types" />

import type { D1Database } from "@cloudflare/workers-types";
import { createHonoApp, type AppEnv } from "./app";
import { createOtpEmailFromEnv } from "./infra/email/otpEmail";
import { D1Repository } from "./infra/d1Repository";

export interface Env extends AppEnv {
  DB: D1Database;
}

let appInstance: { key: string; hono: ReturnType<typeof createHonoApp> } | null = null;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const key = `${env.RESEND_API_KEY ?? ""}|${env.ALLOWED_ORIGINS ?? ""}|${env.NINJA_PUBLISH_SECRET ?? ""}`;
    if (!appInstance || appInstance.key !== key) {
      const repo = new D1Repository(env.DB);
      const email = createOtpEmailFromEnv(env);
      const hono = createHonoApp({ repo, email, appEnv: env });
      appInstance = { key, hono };
    }
    return appInstance.hono.fetch(request, env, ctx);
  },
};
