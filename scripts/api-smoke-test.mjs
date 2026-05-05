import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TSX_CLI = join(REPO_ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const API_ENTRY = join(REPO_ROOT, "apps", "api", "src", "server.ts");

const BASE_URL = (process.env.API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");
const USE_REMOTE = Boolean(process.env.API_BASE_URL);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForLocalServer(maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const resp = await fetch(`${BASE_URL}/couples/me`);
      if (resp.status === 401 || resp.status === 404) return true;
    } catch (_) {
      // continue retry
    }
    await sleep(300);
  }
  return false;
}

async function pingRemote() {
  try {
    const resp = await fetch(`${BASE_URL}/couples/me`);
    return resp.status === 401 || resp.status === 404;
  } catch {
    return false;
  }
}

/** CI（Linux）で `npm` / シェル子プロセスだけ終了し API が残るとジョブがハングするため、tsx を直接起動して PID で確実に止める */
async function stopLocalServer(proc) {
  if (!proc) return;
  await new Promise((resolve) => {
    let settled = false;
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let forceKillTimer;
    const done = () => {
      if (settled) return;
      settled = true;
      if (forceKillTimer !== undefined) clearTimeout(forceKillTimer);
      resolve();
    };
    proc.once("exit", done);
    forceKillTimer = setTimeout(() => {
      try {
        if (process.platform === "win32") {
          spawn("taskkill", ["/PID", String(proc.pid), "/T", "/F"], { stdio: "ignore", shell: true });
        } else {
          process.kill(proc.pid, "SIGKILL");
        }
      } catch {
        // ignore
      }
      done();
    }, 5000);

    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/PID", String(proc.pid), "/T", "/F"], { stdio: "ignore", shell: true });
      } else {
        proc.kill("SIGTERM");
      }
    } catch {
      done();
    }
  });
}

async function run() {
  let server = null;

  if (!USE_REMOTE) {
    server = spawn(process.execPath, [TSX_CLI, API_ENTRY], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    server.stdout.on("data", (chunk) => process.stdout.write(`[api] ${chunk}`));
    server.stderr.on("data", (chunk) => process.stderr.write(`[api:err] ${chunk}`));
  }

  try {
    if (USE_REMOTE) {
      const ok = await pingRemote();
      assert(ok, `リモート API に到達できません: ${BASE_URL}（CORS/URL/稼働を確認）`);
      console.log(`P1-1 smoke (remote) → ${BASE_URL}`);
    } else {
      const ready = await waitForLocalServer();
      assert(ready, "APIサーバーが起動しませんでした");
    }

    const emailA = "partner-a@example.com";
    const emailB = "partner-b@example.com";

    const otpA = await request("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ email: emailA }),
    });
    assert(otpA.status === 202, "OTP request A failed");
    assert(otpA.data.debugCode, "OTP code A missing（Staging なら平文 debugCode あり。本番+Resend では自動スモーク不可）");

    const verifyARaw = await fetch(`${BASE_URL}/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailA, code: otpA.data.debugCode }),
    });
    const verifyA = await verifyARaw.json().catch(() => ({}));
    assert(verifyARaw.status === 200, "OTP verify A failed");
    const tokenA = verifyA.accessToken;
    assert(tokenA, "token A missing");
    const refreshCookie = verifyARaw.headers.get("set-cookie");
    assert(refreshCookie, "refresh cookie missing");
    const refresh = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { Cookie: refreshCookie },
    });
    assert(refresh.status === 200, "refresh session failed");

    let coupleA = await request("/couples/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (coupleA.status === 404) {
      coupleA = await request("/couples", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert(coupleA.status === 201, "create couple failed");
      assert(coupleA.data.status === "pending", "couple should be pending");
    }

    const issueInvite = await request("/couples/invites", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(issueInvite.status === 201, "issue invite failed");
    const inviteCode = issueInvite.data.code;
    assert(inviteCode && inviteCode.startsWith("CP-"), "invite code invalid");

    const otpB = await request("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ email: emailB }),
    });
    assert(otpB.status === 202, "OTP request B failed");
    assert(otpB.data.debugCode, "OTP code B missing");

    const verifyB = await request("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ email: emailB, code: otpB.data.debugCode }),
    });
    assert(verifyB.status === 200, "OTP verify B failed");
    const tokenB = verifyB.data.accessToken;
    assert(tokenB, "token B missing");

    const preCreateCoupleB = await request("/couples", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(preCreateCoupleB.status === 201, "pre-create pending couple for B failed");

    const acceptInvite = await request(`/couples/invites/${encodeURIComponent(inviteCode)}/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(acceptInvite.status === 200, "accept invite failed");
    assert(acceptInvite.data.status === "active", "couple should be active after accept");
    assert(
      Array.isArray(acceptInvite.data.members) && acceptInvite.data.members.length === 2,
      "both partners should be in couple",
    );

    // ---- ルーレット (P1-2 / P1-3) ----
    const plans = await request("/roulette/plans", {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(plans.status === 200, "list plans failed");
    assert(
      Array.isArray(plans.data.plans) && plans.data.plans.length >= 3,
      "plan catalog should have at least 3 entries",
    );
    const planList = plans.data.plans;
    const allLikes = planList.map((p) => ({ planId: p.id, vote: "like" }));

    const sessionA0 = await request("/roulette/sessions/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(sessionA0.status === 200, "session view A failed");
    assert(sessionA0.data.status === "collecting", "session should start as collecting");
    assert(
      sessionA0.data.totalPlans === planList.length,
      "session totalPlans should equal catalog length",
    );

    const voteA = await request("/roulette/sessions/me/votes", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ votes: allLikes }),
    });
    assert(voteA.status === 200, "submit votes A failed");
    assert(voteA.data.partners.me.completed === true, "A should be completed after voting");
    assert(voteA.data.partners.partner.completed === false, "partner should not be completed yet");
    assert(voteA.data.status === "collecting", "session should remain collecting before B votes");

    const voteB = await request("/roulette/sessions/me/votes", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ votes: allLikes }),
    });
    assert(voteB.status === 200, "submit votes B failed");
    assert(voteB.data.status === "ready", "session should become ready after both vote");
    assert(
      Array.isArray(voteB.data.matchedPlanIds) && voteB.data.matchedPlanIds.length >= 3,
      "matched plans should be >= 3",
    );

    const spin1 = await request("/roulette/sessions/me/spin", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(spin1.status === 200, "spin failed");
    assert(spin1.data.status === "decided", "session should be decided after spin");
    assert(spin1.data.result, "spin should return a result");
    assert(
      spin1.data.matchedPlanIds.includes(spin1.data.result.selectedPlanId),
      "selected plan must be among matched plans",
    );

    const spin2 = await request("/roulette/sessions/me/spin", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(spin2.status === 200, "second spin should be idempotent");
    assert(
      spin2.data.result?.selectedPlanId === spin1.data.result.selectedPlanId,
      "second spin must return the same selected plan",
    );

    const restart = await request("/roulette/sessions/me/restart", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(restart.status === 200, "restart failed");
    assert(restart.data.status === "collecting", "restart should produce a fresh collecting session");
    assert(
      restart.data.sessionId !== spin1.data.sessionId,
      "restart must create a new session id",
    );

    const badVote = await request("/roulette/sessions/me/votes", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ votes: [{ planId: "plan_does_not_exist", vote: "like" }] }),
    });
    assert(badVote.status === 400, "unknown plan should be rejected with 400");

    // ---- ニンジャ (P1-4 / P1-5) ----
    const ninjaMissions = await request("/ninja/missions", {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(ninjaMissions.status === 200, "ninja missions failed");
    const missionId = ninjaMissions.data.missions?.[0]?.id;
    assert(missionId, "ninja mission id missing");

    const logA = await request("/ninja/logs", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ missionId }),
    });
    assert(logA.status === 200, "ninja log A failed");
    const declaredPoint = logA.data.log?.point;
    assert(typeof declaredPoint === "number", "ninja log point missing");

    const weekBBefore = await request("/ninja/week", {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(weekBBefore.status === 200, "ninja week B failed");
    assert(
      weekBBefore.data.partnerPoints === null,
      "partner total should be hidden before publish",
    );

    const publishWeek = await request("/ninja/week/publish", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({}),
    });
    assert(publishWeek.status === 200, "ninja week publish failed");
    assert(typeof publishWeek.data.myPoints === "number", "publish should return week view");

    const weekBAfter = await request("/ninja/week", {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(weekBAfter.status === 200, "ninja week B after publish failed");
    assert(
      weekBAfter.data.partnerPoints === declaredPoint,
      "B should see A's total after publish",
    );

    const resetWeek = await request("/ninja/week/reset", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({}),
    });
    assert(resetWeek.status === 200, "ninja week reset failed");
    assert(resetWeek.data.partnerPoints === null, "reset should hide partner points again");

    const weekBAfterReset = await request("/ninja/week", {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(weekBAfterReset.status === 200, "ninja week B after reset failed");
    assert(
      weekBAfterReset.data.partnerPoints === null,
      "B should not see partner total after reset",
    );

    const deleteAccount = await request("/users/me", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(deleteAccount.status === 200, "delete account failed");
    assert(deleteAccount.data.deleted === true, "delete response should be marked deleted");
    assert(
      Array.isArray(deleteAccount.data.deletedUserIds) &&
        deleteAccount.data.deletedUserIds.length === 2,
      "couple withdrawal should delete both users",
    );

    const meAfterDeleteA = await request("/users/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(meAfterDeleteA.status === 401, "deleted user A token should be unauthorized");

    const meAfterDeleteB = await request("/users/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(meAfterDeleteB.status === 401, "deleted partner B token should be unauthorized");

    console.log("P1-1/P1-2/P1-3/P1-4/P1-5 smoke test passed.");
  } finally {
    await stopLocalServer(server);
  }
}

run().catch((err) => {
  console.error(`smoke test failed: ${err.message}`);
  process.exit(1);
});
