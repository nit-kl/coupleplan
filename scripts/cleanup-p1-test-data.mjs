import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

function parseArgs(argv) {
  const args = [...argv];
  let targetEnv = "staging";
  const emails = [];

  while (args.length > 0) {
    const token = args.shift();
    if (!token) break;
    if (token === "--env") {
      const value = args.shift();
      if (!value) throw new Error("--env には staging または production を指定してください");
      targetEnv = value;
      continue;
    }
    emails.push(token);
  }

  if (!["staging", "production"].includes(targetEnv)) {
    throw new Error(`未対応の環境です: ${targetEnv}（staging / production のみ対応）`);
  }
  if (emails.length !== 2) {
    throw new Error("メールアドレスを2つ指定してください。例: npm run p1:cleanup:testdata:staging -- a@example.com b@example.com");
  }
  return {
    targetEnv,
    emails: emails.map((e) => e.trim().toLowerCase()),
  };
}

function sqlQuote(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function buildCleanupSql(emailA, emailB) {
  const e1 = sqlQuote(emailA);
  const e2 = sqlQuote(emailB);
  return `
DELETE FROM invites
WHERE couple_id IN (
  SELECT DISTINCT cm.couple_id
  FROM couple_members cm
  JOIN users u ON u.id = cm.user_id
  WHERE u.email IN (${e1}, ${e2})
);
DELETE FROM couples
WHERE id IN (
  SELECT DISTINCT cm.couple_id
  FROM couple_members cm
  JOIN users u ON u.id = cm.user_id
  WHERE u.email IN (${e1}, ${e2})
);
DELETE FROM couple_members
WHERE user_id IN (SELECT id FROM users WHERE email IN (${e1}, ${e2}));
DELETE FROM sessions
WHERE user_id IN (SELECT id FROM users WHERE email IN (${e1}, ${e2}));
DELETE FROM otp_requests
WHERE email IN (${e1}, ${e2});
DELETE FROM auth_audit
WHERE email IN (${e1}, ${e2});
DELETE FROM users
WHERE email IN (${e1}, ${e2});
`.trim();
}

function run() {
  const { targetEnv, emails } = parseArgs(process.argv.slice(2));
  const [emailA, emailB] = emails;
  const sql = buildCleanupSql(emailA, emailB);

  const commandArgs = [
    "d1",
    "execute",
    targetEnv === "production" ? "coupleplan" : "coupleplan-staging",
    "--remote",
    "--config",
    "apps/api/wrangler.toml",
    "--env",
    targetEnv,
    "--command",
    sql,
  ];

  const wranglerJs = resolve(
    process.cwd(),
    "node_modules",
    "wrangler",
    "bin",
    "wrangler.js",
  );
  const runArgs = [
    "d1",
    "execute",
    ...commandArgs.slice(2),
  ];

  console.log(`[cleanup] env=${targetEnv}, emails=${emailA}, ${emailB}`);
  const result = spawnSync(process.execPath, [wranglerJs, ...runArgs], {
    stdio: "pipe",
    encoding: "utf8",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  console.log("[cleanup] 完了しました");
}

try {
  run();
} catch (error) {
  console.error(`[cleanup] 失敗: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
