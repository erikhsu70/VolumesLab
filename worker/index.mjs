// Cloudflare Worker in front of the static site. Only /api/* and the cron run
// here (assets.run_worker_first); every other request is served straight from
// static assets.
//
// Waitlist signups are written to our own D1 database first. The visitor is
// told "joined" only after that write succeeded. The signup is then synced to
// Momence (lead id stored, personal data erased from D1 once Momence has it).
// A cron retries anything Momence did not accept, so a slow, failing or
// silently rejecting Momence cannot lose a signup.

const COLLECT_URL = "https://api.momence.com/integrations/customer-leads/319187/collect";
// Public values, already present in the page source of the old embed.
const MOMENCE_TOKEN = "KajVVpeQjP";
const MOMENCE_SOURCE_ID = 301458;

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const MAX_ATTEMPTS_BEFORE_ATTENTION = 8;
const PER_IP_PER_MINUTE = 6;
const GLOBAL_PER_HOUR = 400;
const SYNCED_RETENTION_MS = 180 * DAY; // synced rows hold no personal data, only a hash and the lead id

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS signups (
    email_hash TEXT PRIMARY KEY,
    first_name TEXT, last_name TEXT, email TEXT,
    elapsed_ms INTEGER,
    status TEXT NOT NULL,
    lead_id INTEGER,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    next_attempt_at INTEGER NOT NULL,
    last_error TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS signups_status_next ON signups (status, next_attempt_at)`,
  `CREATE TABLE IF NOT EXISTS rate (bucket TEXT PRIMARY KEY, n INTEGER NOT NULL, ts INTEGER NOT NULL)`,
];
let schemaReady;
function ensureSchema(env) {
  schemaReady ??= env.DB.batch(SCHEMA.map((sql) => env.DB.prepare(sql))).catch((error) => {
    schemaReady = undefined;
    throw error;
  });
  return schemaReady;
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const clean = (v, max) =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";

async function sha256(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function bump(env, bucket, now) {
  const row = await env.DB.prepare(
    "INSERT INTO rate (bucket, n, ts) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET n = n + 1 RETURNING n",
  ).bind(bucket, now).first();
  return row?.n ?? 1;
}

// One attempt to hand a stored signup to Momence. Never throws.
async function syncToMomence(env, row) {
  const url = env.MOMENCE_COLLECT_URL || COLLECT_URL;
  const now = Date.now();
  let outcome = "error";
  let leadId = null;
  let detail = "";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      // The visitor's real time on the form goes through unchanged, so
      // Momence's own timing check sees the true value.
      body: JSON.stringify({
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        token: MOMENCE_TOKEN,
        sourceId: MOMENCE_SOURCE_ID,
        _t: row.elapsed_ms > 0 ? row.elapsed_ms : 0,
      }),
    });
    const result = await res.json();
    leadId = result?.status === "success" ? result?.data?.leadId : null;
    if (leadId) outcome = "synced";
    else {
      outcome = "rejected";
      detail = `momence ${res.status} ${result?.status ?? "?"} no lead id`;
    }
  } catch (error) {
    detail = `momence request failed: ${String(error?.message ?? error).slice(0, 120)}`;
  }

  if (outcome === "synced") {
    await env.DB.prepare(
      `UPDATE signups SET status='synced', lead_id=?, attempts=attempts+1, last_error=NULL,
         first_name=NULL, last_name=NULL, email=NULL WHERE email_hash=?`,
    ).bind(leadId, row.email_hash).run();
    return "synced";
  }
  const attempts = (row.attempts ?? 0) + 1;
  const needsAttention = attempts >= MAX_ATTEMPTS_BEFORE_ATTENTION;
  const delay = needsAttention ? 6 * HOUR : Math.min(MIN * 2 ** attempts, HOUR);
  await env.DB.prepare(
    "UPDATE signups SET status=?, attempts=?, next_attempt_at=?, last_error=? WHERE email_hash=?",
  ).bind(needsAttention ? "needs_attention" : "pending", attempts, now + delay, detail, row.email_hash).run();
  console.log(JSON.stringify({ event: "waitlist_sync_failed", outcome, attempts, needsAttention, detail }));
  return outcome;
}

export async function handleWaitlist(request, env) {
  if (request.method !== "POST") return json({ ok: false }, 405);
  const origin = request.headers.get("origin");
  if (origin) {
    let host = "";
    try { host = new URL(origin).hostname; } catch {}
    if (!["volumeslab.com", "www.volumeslab.com", "localhost"].includes(host)) return json({ ok: false }, 403);
  }
  let body;
  try {
    const text = await request.text();
    if (text.length > 4096) return json({ ok: false }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ ok: false }, 400);
  }
  // Our own honeypot: bots fill every field. Pretend success, save nothing.
  if (clean(body.hp, 200)) return json({ ok: true });

  const firstName = clean(body.firstName, 80);
  const lastName = clean(body.lastName, 80);
  const email = clean(body.email, 200).toLowerCase();
  if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, reason: "invalid" }, 422);
  const elapsed = Math.max(0, Math.round(Number(body.elapsed)) || 0);

  try {
    await ensureSchema(env);
    const now = Date.now();
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const [perIp, global] = await Promise.all([
      bump(env, `ip:${(await sha256(ip)).slice(0, 24)}:${Math.floor(now / MIN)}`, now),
      bump(env, `all:${Math.floor(now / HOUR)}`, now),
    ]);
    if (perIp > PER_IP_PER_MINUTE || global > GLOBAL_PER_HOUR) return json({ ok: false, reason: "rate" }, 429);

    const emailHash = await sha256(email);
    const existing = await env.DB.prepare("SELECT status FROM signups WHERE email_hash=?").bind(emailHash).first();
    if (existing?.status === "synced") return json({ ok: true }); // double submit / already on the list

    // Durable write first. Everything after this point cannot lose the signup.
    await env.DB.prepare(
      `INSERT INTO signups (email_hash, first_name, last_name, email, elapsed_ms, status, created_at, next_attempt_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
       ON CONFLICT(email_hash) DO UPDATE SET first_name=excluded.first_name, last_name=excluded.last_name`,
    ).bind(emailHash, firstName, lastName, email, elapsed, now, now).run();

    const row = await env.DB.prepare("SELECT * FROM signups WHERE email_hash=?").bind(emailHash).first();
    await syncToMomence(env, row); // best effort now; the cron finishes the job if this does not stick
    return json({ ok: true });
  } catch (error) {
    console.log(JSON.stringify({ event: "waitlist_store_failed", error: String(error?.message ?? error).slice(0, 200) }));
    return json({ ok: false, reason: "store" }, 503);
  }
}

// Public, deliberately minimal: no counts, no personal data. "attention" means
// a signup has been waiting too long or needs a manual look. A scheduled GitHub
// workflow polls this and fails (GitHub notifies the repo owner) on "attention".
async function health(env) {
  await ensureSchema(env);
  const tables = (await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('signups','rate')").all()).results ?? [];
  const row = await env.DB.prepare(
    "SELECT SUM(status='needs_attention') AS na, MIN(CASE WHEN status!='synced' THEN created_at END) AS oldest FROM signups",
  ).first();
  const stuck = (row?.na ?? 0) > 0 || (row?.oldest && Date.now() - row.oldest > 2 * HOUR);
  return json({ schema: tables.length === 2, status: stuck ? "attention" : "ok" });
}

export async function runQueue(env) {
  await ensureSchema(env);
  const now = Date.now();
  const due = (await env.DB.prepare(
    "SELECT * FROM signups WHERE status IN ('pending','needs_attention') AND next_attempt_at <= ? ORDER BY created_at LIMIT 25",
  ).bind(now).all()).results ?? [];
  const results = [];
  for (const row of due) results.push(await syncToMomence(env, row));
  await env.DB.batch([
    env.DB.prepare("DELETE FROM signups WHERE status='synced' AND created_at < ?").bind(now - SYNCED_RETENTION_MS),
    env.DB.prepare("DELETE FROM rate WHERE ts < ?").bind(now - 2 * HOUR),
  ]);
  const summary = { event: "waitlist_queue_run", due: due.length, synced: results.filter((r) => r === "synced").length };
  console.log(JSON.stringify(summary));
  return summary;
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/waitlist") return handleWaitlist(request, env);
    if (pathname === "/api/waitlist-health" && request.method === "GET") {
      try { return await health(env); } catch { return json({ ok: false }, 503); }
    }
    if (pathname.startsWith("/api/")) return json({ ok: false }, 404);
    return env.ASSETS.fetch(request);
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runQueue(env).catch((error) => console.log(JSON.stringify({ event: "waitlist_queue_failed", error: String(error?.message ?? error).slice(0, 200) }))));
  },
};
