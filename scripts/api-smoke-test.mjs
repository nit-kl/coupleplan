import { spawn } from "node:child_process";

const BASE_URL = "http://127.0.0.1:8787";

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

async function waitForServer(maxAttempts = 20) {
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

async function run() {
  const runner = process.platform === "win32" ? "npm run api:dev" : "npm run api:dev";
  const server = spawn(runner, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });

  server.stdout.on("data", (chunk) => process.stdout.write(`[api] ${chunk}`));
  server.stderr.on("data", (chunk) => process.stderr.write(`[api:err] ${chunk}`));

  try {
    const ready = await waitForServer();
    assert(ready, "APIサーバーが起動しませんでした");

    const emailA = "partner-a@example.com";
    const emailB = "partner-b@example.com";

    const otpA = await request("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ email: emailA }),
    });
    assert(otpA.status === 202, "OTP request A failed");
    assert(otpA.data.debugCode, "OTP code A missing");

    const verifyA = await request("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ email: emailA, code: otpA.data.debugCode }),
    });
    assert(verifyA.status === 200, "OTP verify A failed");
    const tokenA = verifyA.data.accessToken;
    assert(tokenA, "token A missing");

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

    console.log("P1-1 smoke test passed.");
  } finally {
    if (!server.killed) {
      if (process.platform === "win32") {
        spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore", shell: true });
      } else {
        server.kill("SIGTERM");
      }
    }
  }
}

run().catch((err) => {
  console.error(`P1-1 smoke test failed: ${err.message}`);
  process.exit(1);
});
