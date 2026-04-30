import { spawn } from "node:child_process";

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

async function run() {
  let server = null;

  if (!USE_REMOTE) {
    const runner = "npm run api:dev";
    server = spawn(runner, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });
    server.stdout.on("data", (chunk) => process.stdout.write(`[api] ${chunk}`));
    server.stderr.on("data", (chunk) => process.stderr.write(`[api:err] ${chunk}`));
  }

  const cleanup = () => {
    if (server && !server.killed) {
      if (process.platform === "win32") {
        spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore", shell: true });
      } else {
        server.kill("SIGTERM");
      }
    }
  };

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

    let acceptInvite = await request(`/couples/invites/${encodeURIComponent(inviteCode)}/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    if (acceptInvite.status === 409) {
      acceptInvite = await request("/couples/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${tokenB}` },
      });
    }
    assert(acceptInvite.status === 200, "accept invite failed");
    assert(acceptInvite.data.status === "active", "couple should be active after accept");
    assert(
      Array.isArray(acceptInvite.data.members) && acceptInvite.data.members.length === 2,
      "both partners should be in couple",
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

    console.log("P1-1 smoke test passed.");
  } finally {
    cleanup();
  }
}

run().catch((err) => {
  console.error(`P1-1 smoke test failed: ${err.message}`);
  process.exit(1);
});
