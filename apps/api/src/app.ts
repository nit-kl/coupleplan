import { Hono } from "hono";
import { cors } from "hono/cors";
import { AppError } from "./domain/errors";
import { InMemoryRepository } from "./infra/inMemoryRepository";
import { AuthUsecase } from "./usecases/authUsecase";
import { CoupleUsecase } from "./usecases/coupleUsecase";

const repo = new InMemoryRepository();
const authUsecase = new AuthUsecase(repo);
const coupleUsecase = new CoupleUsecase(repo);

export const app = new Hono();
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173"],
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.post("/auth/otp/request", async (c) => {
  try {
    const body = await c.req.json();
    return c.json(authUsecase.requestOtp(body.email), 202);
  } catch (err) {
    return handleError(c, err);
  }
});

app.post("/auth/otp/verify", async (c) => {
  try {
    const body = await c.req.json();
    return c.json(authUsecase.verifyOtp(body.email, body.code), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

app.get("/users/me", (c) => {
  try {
    const user = authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
    return c.json(user, 200);
  } catch (err) {
    return handleError(c, err);
  }
});

app.patch("/users/me", async (c) => {
  try {
    const user = authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
    const body = await c.req.json();
    return c.json(coupleUsecase.updateProfile(user, body.displayName), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

app.post("/couples", (c) => {
  try {
    const user = authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
    return c.json(coupleUsecase.createCouple(user), 201);
  } catch (err) {
    return handleError(c, err);
  }
});

app.get("/couples/me", (c) => {
  try {
    const user = authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
    return c.json(coupleUsecase.getMyCouple(user), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

app.post("/couples/invites", (c) => {
  try {
    const user = authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
    return c.json(coupleUsecase.issueInvite(user), 201);
  } catch (err) {
    return handleError(c, err);
  }
});

app.post("/couples/invites/:code/accept", (c) => {
  try {
    const user = authUsecase.resolveUserFromAuthHeader(c.req.header("authorization"));
    return c.json(coupleUsecase.acceptInvite(user, c.req.param("code")), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

app.notFound((c) => c.json({ error: "not found", code: "not_found" }, 404));

function handleError(c: any, err: unknown) {
  if (err instanceof AppError) {
    return c.json({ error: err.message, code: err.code }, err.status as 400 | 401 | 404 | 409 | 410);
  }
  const message = err instanceof Error ? err.message : String(err);
  return c.json({ error: "internal error", detail: message, code: "internal_error" }, 500);
}
