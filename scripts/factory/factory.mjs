#!/usr/bin/env node
// Local software-factory runner. Replaces Ona automations: each automation's
// prompt lives in .agents/automations/<slug>.md and runs inside a Docker
// Sandbox (`sbx`) microVM. See `node scripts/factory/factory.mjs help`.
import { spawn, execFile, execFileSync } from "node:child_process";
import { createServer } from "node:http";
import {
  appendFileSync, createWriteStream, existsSync, mkdirSync, openSync, readSync, closeSync,
  readdirSync, readFileSync, statSync, writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const AUTOMATIONS_DIR = join(ROOT, ".agents/automations");
const STATE_DIR = join(ROOT, ".factory");
const LOG_DIR = join(STATE_DIR, "logs");
const STATE_FILE = join(STATE_DIR, "state.json");
const RUNS_FILE = join(STATE_DIR, "runs.jsonl");
// The sandbox loses its Devin login when it stops and restarts, so the credentials live on the
// host (log in once with XDG_DATA_HOME=$FACTORY_DEVIN_HOME/data) and are copied in before each run.
const CRED_FILE = join(process.env.FACTORY_DEVIN_HOME ?? join(homedir(), ".factory-devin"), "data/devin/credentials.toml");
const CRED_DEST = "/home/agent/.local/share/devin/credentials.toml";
const PORT = Number(process.env.FACTORY_PORT ?? 4600);
const CONCURRENCY = Number(process.env.FACTORY_CONCURRENCY ?? 1);
// One persistent `shell` sandbox (created by `sbx create shell . --clone`) that
// holds the Devin login. We call `devin-cli` directly: the `devin` wrapper that
// sbx ships replaces the key with a proxy placeholder and deletes it otherwise.
// Concurrency must stay 1 because every run shares the sandbox.
// GitHub repo the factory works on (issues, PRs). Must match the sandbox's origin.
const REPO = process.env.FACTORY_REPO ?? "levrado/memo";
const SANDBOX = process.env.FACTORY_SANDBOX ?? "factory-shell";

function loadAutomations() {
  return readdirSync(AUTOMATIONS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const text = readFileSync(join(AUTOMATIONS_DIR, file), "utf8");
      const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
      if (!match) throw new Error(`${file}: missing frontmatter`);
      const meta = {};
      for (const line of match[1].split("\n")) {
        const i = line.indexOf(":");
        meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      }
      return {
        slug: file.replace(/\.md$/, ""),
        name: meta.name,
        crons: JSON.parse(meta.cron || "[]"),
        prEvents: meta.pr_events.replace(/[[\]\s]/g, "").split(",").filter(Boolean),
        prompt: match[2].trim(),
      };
    });
}

// --- minimal 5-field cron matcher (*, */n, a-b, a-b/n, lists) ---
function fieldMatches(field, value) {
  return field.split(",").some((part) => {
    const [range, stepStr] = part.split("/");
    const step = stepStr ? Number(stepStr) : 1;
    let lo = 0;
    let hi = 59;
    if (range !== "*") {
      const [a, b] = range.split("-").map(Number);
      lo = a;
      hi = b ?? (stepStr ? 59 : a);
    }
    return value >= lo && value <= hi && (value - lo) % step === 0;
  });
}
export function cronMatches(expr, d) {
  const [min, hour, dom, mon, dow] = expr.trim().split(/\s+/);
  return (
    fieldMatches(min, d.getMinutes()) &&
    fieldMatches(hour, d.getHours()) &&
    fieldMatches(dom, d.getDate()) &&
    fieldMatches(mon, d.getMonth() + 1) &&
    fieldMatches(dow, d.getDay())
  );
}

// --- queue: one run per automation at a time, CONCURRENCY overall ---
const queued = [];
const running = new Set();
const current = new Map(); // slug -> { startedAt, log }

function recordRun(entry) {
  mkdirSync(STATE_DIR, { recursive: true });
  appendFileSync(RUNS_FILE, `${JSON.stringify(entry)}\n`);
}

// Brings the sandbox's private clone to a clean, current main with dependencies in place.
// Everything heavy (node_modules, pnpm store, browser image, Devin login) already lives in the
// persistent sandbox, so this is a few seconds. `git clean` without -x keeps ignored node_modules.
const SYNC_SCRIPT = [
  `git remote set-url origin https://github.com/${REPO}`,
  "git fetch -q origin",
  "git checkout -qf main",
  "git reset -q --hard origin/main",
  "git clean -fdq",
  "pnpm install --frozen-lockfile --prefer-offline --silent",
].join(" && ");

function prepare() {
  const t0 = Date.now();
  const step = (label, script) => {
    const t = Date.now();
    execFileSync("sbx", ["exec", "-w", ROOT, "-e", `GH_REPO=${REPO}`, SANDBOX, "sh", "-c", script],
      { stdio: ["ignore", "inherit", "inherit"] });
    console.log(`[factory] ${label}: ${((Date.now() - t) / 1000).toFixed(1)}s`);
  };
  step("sync repo + deps", SYNC_SCRIPT);
  step("devin login", "devin-cli auth status | head -3");
  step("tools", "node -v && pnpm -v && gh --version | head -1 && docker images --format '{{.Repository}}:{{.Tag}} {{.Size}}'");
  console.log(`[factory] sandbox ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

let pausedReason = null; // set on an auth failure so we stop burning runs until fixed

function installCredentials() {
  if (!existsSync(CRED_FILE)) throw new Error(`no Devin credentials at ${CRED_FILE}`);
  const sh = (user, script) => execFileSync("sbx", ["exec", ...(user ? ["-u", user] : []), SANDBOX, "sh", "-c", script],
    { stdio: ["ignore", "pipe", "pipe"] });
  sh(null, "mkdir -p /home/agent/.local/share/devin");
  execFileSync("sbx", ["cp", CRED_FILE, `${SANDBOX}:${CRED_DEST}`], { stdio: ["ignore", "pipe", "pipe"] });
  sh("root", `chown agent:agent ${CRED_DEST} && chmod 600 ${CRED_DEST}`);
}

function runInSandbox(automation, context) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync(LOG_DIR, { recursive: true });
  const logPath = join(LOG_DIR, `${automation.slug}-${stamp}.log`);
  const log = createWriteStream(logPath);
  const prompt = context ? `${context}\n\n${automation.prompt}` : automation.prompt;
  // The sandbox resets git config on restart, so pin origin to the fork on every
  // run and set GH_REPO so `gh` can never fall back to the upstream repository.
  const script = `${SYNC_SCRIPT} && exec devin-cli "$@"`;
  const args = [
    "exec", "-w", ROOT, "-e", `GH_REPO=${REPO}`, SANDBOX,
    "sh", "-c", script, "devin-cli",
    "--respect-workspace-trust", "false",
    "-p", prompt, "--permission-mode", "dangerous",
  ];
  const startedAt = new Date().toISOString();
  try {
    installCredentials();
  } catch (err) {
    pausedReason = `Devin credentials unavailable: ${err.message.split("\n")[0]}`;
    log.end(`${pausedReason}\n`);
    recordRun({ slug: automation.slug, startedAt, endedAt: startedAt, exitCode: 1, log: basename(logPath) });
    console.error(`[factory] PAUSED: ${pausedReason}`);
    return Promise.resolve();
  }
  current.set(automation.slug, { startedAt, log: basename(logPath) });
  const finish = (exitCode) => {
    current.delete(automation.slug);
    recordRun({ slug: automation.slug, startedAt, endedAt: new Date().toISOString(),
      exitCode, log: basename(logPath) });
  };
  console.log(`[factory] start ${automation.slug} -> ${logPath}`);
  return new Promise((done) => {
    const child = spawn("sbx", args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    child.on("close", (code) => {
      log.end();
      finish(code);
      if (code !== 0 && /Not logged in/.test(readTail(logPath, 4000))) {
        pausedReason = "Devin reports 'Not logged in' — refresh the host credentials, then POST /api/resume";
        console.error(`[factory] PAUSED: ${pausedReason}`);
      }
      console.log(`[factory] done ${automation.slug} exit=${code}`);
      done();
    });
    child.on("error", (err) => {
      log.end(`spawn failed: ${err.message}\n`);
      finish(-1);
      console.error(`[factory] ${automation.slug}: ${err.message}`);
      done();
    });
  });
}

function enqueue(automation, context) {
  if (pausedReason) {
    console.log(`[factory] skip ${automation.slug} (paused: ${pausedReason})`);
    return;
  }
  if (running.has(automation.slug) || queued.some((q) => q.automation.slug === automation.slug)) {
    console.log(`[factory] skip ${automation.slug} (already queued/running)`);
    return;
  }
  queued.push({ automation, context });
  pump();
}

function pump() {
  while (running.size < CONCURRENCY) {
    const next = queued.find((q) => !running.has(q.automation.slug));
    if (!next) return;
    queued.splice(queued.indexOf(next), 1);
    running.add(next.automation.slug);
    runInSandbox(next.automation, next.context).then(() => {
      running.delete(next.automation.slug);
      pump();
    });
  }
}

// --- PR event polling via gh (replaces Ona PR webhooks) ---
function loadState() {
  return existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : null;
}
function saveState(state) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function pollPullRequests(automations) {
  let prs;
  try {
    prs = JSON.parse(
      execFileSync("gh", ["pr", "list", "-R", REPO, "--state", "all", "--limit", "30",
        "--json", "number,state,isDraft,headRefOid"], { cwd: ROOT, encoding: "utf8" }),
    );
  } catch (err) {
    console.error(`[factory] gh pr list failed: ${err.message}`);
    return;
  }
  const first = loadState();
  const state = first ?? { merged: [], heads: {} };
  const events = [];
  for (const pr of prs) {
    if (pr.state === "MERGED" && !state.merged.includes(pr.number)) {
      state.merged.push(pr.number);
      events.push({ type: "merged", pr });
    } else if (pr.state === "OPEN" && !pr.isDraft && state.heads[pr.number] !== pr.headRefOid) {
      const type = pr.number in state.heads ? "updated" : "opened";
      state.heads[pr.number] = pr.headRefOid;
      events.push({ type, pr });
    }
  }
  saveState(state);
  if (!first) {
    console.log("[factory] first run: recorded existing PRs, no events fired");
    return;
  }
  for (const { type, pr } of events) {
    for (const a of automations.filter((x) => x.prEvents.includes(type) ||
      (type === "updated" && x.prEvents.includes("opened")))) {
      enqueue(a, `Trigger context: pull request #${pr.number} was ${type}.`);
    }
  }
}

// --- dashboard (daemon only): http://127.0.0.1:PORT ---
function nextRun(automation, from) {
  const t = new Date(from);
  t.setSeconds(0, 0);
  for (let i = 0; i < 7 * 24 * 60; i += 1) {
    t.setMinutes(t.getMinutes() + 1);
    if (automation.crons.some((c) => cronMatches(c, t))) return t.toISOString();
  }
  return null;
}

function readTail(file, bytes) {
  const fd = openSync(file, "r");
  try {
    const size = statSync(file).size;
    const len = Math.min(size, bytes);
    const buf = Buffer.alloc(len);
    readSync(fd, buf, 0, len, size - len);
    return buf.toString("utf8");
  } finally {
    closeSync(fd);
  }
}

const ghCache = new Map();
function ghJson(args) {
  const key = args.join(" ");
  const hit = ghCache.get(key);
  if (hit && Date.now() - hit.at < 30_000) return Promise.resolve(hit.value);
  return new Promise((done) => {
    execFile("gh", args, { cwd: ROOT, maxBuffer: 8 << 20 }, (err, out) => {
      const value = err ? { error: err.message.split("\n")[0] } : JSON.parse(out);
      ghCache.set(key, { at: Date.now(), value });
      done(value);
    });
  });
}

function recentRuns(limit) {
  if (!existsSync(RUNS_FILE)) return [];
  return readFileSync(RUNS_FILE, "utf8").trim().split("\n").filter(Boolean)
    .slice(-limit).reverse().map((l) => JSON.parse(l));
}

function startDashboard(automations) {
  const page = join(dirname(fileURLToPath(import.meta.url)), "dashboard.html");
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const send = (code, type, body) => { res.writeHead(code, { "content-type": type }); res.end(body); };
    if (url.pathname === "/") return send(200, "text/html; charset=utf-8", readFileSync(page));
    if (url.pathname === "/api/log") {
      const name = basename(url.searchParams.get("name") ?? "");
      const file = join(LOG_DIR, name);
      if (!name.endsWith(".log") || !existsSync(file)) return send(404, "text/plain", "not found");
      return send(200, "text/plain; charset=utf-8", readTail(file, 12_000));
    }
    if (url.pathname === "/api/run" && req.method === "POST") {
      // Custom header forces a CORS preflight, so other websites can't trigger runs.
      if (req.headers["x-factory"] !== "1") return send(403, "text/plain", "forbidden");
      const target = automations.find((a) => a.slug === url.searchParams.get("slug"));
      if (!target) return send(404, "text/plain", "unknown automation");
      enqueue(target, "");
      return send(200, "application/json", JSON.stringify({ queued: target.slug }));
    }
    if (url.pathname === "/api/resume" && req.method === "POST") {
      if (req.headers["x-factory"] !== "1") return send(403, "text/plain", "forbidden");
      pausedReason = null;
      return send(200, "application/json", JSON.stringify({ paused: null }));
    }
    if (url.pathname === "/api/status") {
      const [issues, prs] = await Promise.all([
        ghJson(["issue", "list", "-R", REPO, "--state", "open", "--limit", "100",
          "--json", "number,title,labels,url,updatedAt"]),
        ghJson(["pr", "list", "-R", REPO, "--state", "open", "--limit", "50",
          "--json", "number,title,isDraft,url,updatedAt,statusCheckRollup"]),
      ]);
      const now = new Date();
      return send(200, "application/json", JSON.stringify({
        repo: REPO, sandbox: SANDBOX, paused: pausedReason, now: now.toISOString(),
        running: [...current].map(([slug, v]) => ({ slug, ...v })),
        queued: queued.map((q) => q.automation.slug),
        automations: automations.map((a) => ({
          slug: a.slug, name: a.name, crons: a.crons, prEvents: a.prEvents,
          next: nextRun(a, now),
        })),
        runs: recentRuns(30), issues, prs,
      }));
    }
    return send(404, "text/plain", "not found");
  });
  server.listen(PORT, "127.0.0.1", () => console.log(`[factory] dashboard http://127.0.0.1:${PORT}`));
}

function daemon() {
  const automations = loadAutomations();
  console.log(`[factory] daemon up: ${automations.length} automations, concurrency ${CONCURRENCY}`);
  startDashboard(automations);
  let lastMinute = -1;
  const tick = () => {
    const now = new Date();
    const minuteKey = Math.floor(now.getTime() / 60000);
    if (minuteKey !== lastMinute) {
      lastMinute = minuteKey;
      for (const a of automations) {
        if (a.crons.some((c) => cronMatches(c, now))) enqueue(a, "");
      }
    }
    pollPullRequests(automations);
  };
  tick();
  setInterval(tick, 60_000);
}

const [cmd, arg, ...rest] = process.argv.slice(2);
if (import.meta.url === `file://${process.argv[1]}`) {
  const automations = loadAutomations();
  if (cmd === "list") {
    for (const a of automations) {
      console.log(`${a.slug.padEnd(22)} cron=${JSON.stringify(a.crons)} pr=${a.prEvents.join(",")}`);
    }
  } else if (cmd === "run" && arg) {
    const a = automations.find((x) => x.slug === arg);
    if (!a) {
      console.error(`unknown automation: ${arg}`);
      process.exit(1);
    }
    const pr = rest[0] === "--pr" ? rest[1] : null;
    runInSandbox(a, pr ? `Trigger context: pull request #${pr} was merged.` : "").then(() => process.exit(0));
  } else if (cmd === "prepare") {
    prepare();
  } else if (cmd === "dashboard") {
    startDashboard(automations); // read-only view, no scheduling
  } else if (cmd === "daemon") {
    daemon();
  } else {
    console.log(`Usage: node scripts/factory/factory.mjs <command>
  list                     show automations and triggers
  run <slug> [--pr N]      run one automation once in a sandbox
  daemon                   cron + PR-event scheduler + dashboard (keep running)
  prepare                  sync the sandbox repo/deps and time it
  dashboard                dashboard only, nothing is scheduled`);
  }
}
