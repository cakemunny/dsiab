#!/usr/bin/env node
/**
 * eval.mjs — run the eval set against an agent, and report pass rates ([[eval-measures-not-gates]]).
 *
 * A measurement, not a gate: it exits 0 whatever the rates, and 2 only when the environment or the
 * runner broke. Each run gets its own workspace under the OS temp directory, outside this repository,
 * because Node, TypeScript and agent tools all walk up for files, and a real copy of the scaffold, so
 * no run inherits what an earlier one installed. The agent is any shell template; nothing here
 * branches on which harness it is. A timeout kills the template's whole process group.
 */
import { spawn, spawnSync } from "node:child_process";
import { closeSync, cpSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { ROOT, SOLUTIONS, formatGrade, gradeWorkspace, loadTasks, snapshot } from "./eval-grade.mjs";

/** Superset of `scripts/acceptance.mjs`'s install list; eval-grader.node-check.ts holds it so. */
export const INSTALL_DEPS = ["react", "react-dom", "@radix-ui/themes", "vite", "@vitejs/plugin-react", "typescript", "@types/react", "@types/react-dom"];

const HELP = `Usage:
  npm run pack    # the tarball under test; pack HEAD and a branch to compare two
  node scripts/eval.mjs --agent '<template>' --tarball <tgz> [--tarball <tgz>] --label <text>
                        [--runs 3] [--tasks a,b] [--timeout-min 15] [--keep]
  node scripts/eval.mjs --check-only <dir> --task <id> [--manifest <json>]

The template runs through /bin/sh in the workspace. Placeholders, each single-quoted for the shell:
  {prompt_file} (required)  {cwd}  {task}  {solutions}
An example, for one harness among many:
  --agent 'claude -p "$(cat {prompt_file})" --permission-mode acceptEdits'
The oracle must score N/N, and a template that does nothing 0/N:
  --agent ': {prompt_file}; cp -R {solutions}/{task}/. .'      --agent ': {prompt_file}'
The agent runs with your own permissions. Do not point it at a directory that holds credentials.`;

const die = (msg) => { process.stderr.write(`eval: ${msg}\n`); process.exit(2); };
const quote = (s) => `'${String(s).replace(/'/g, "'\\''")}'`;

export function expandTemplate(tpl, vars) {
  if (!tpl.includes("{prompt_file}")) throw new Error("the template must contain {prompt_file}");
  return tpl.replace(/\{(\w+)\}/g, (m, k) => {
    if (!(k in vars)) throw new Error(`unknown placeholder ${m}`);
    return quote(vars[k]);
  });
}

export function wilson(k, n, z = 1.96) {
  if (!n) return [0, 1];
  const p = k / n, d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d, h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

/** Two-sided sign test: `up` of `moved` tasks went up. */
export function signTest(up, moved) {
  const choose = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
  let tail = 0;
  for (let i = 0; i <= Math.min(up, moved - up); i++) tail += choose(moved, i) / 2 ** moved;
  return moved ? Math.min(1, 2 * tail) : 1;
}

/** B − A with Newcombe's interval, built from the two Wilson intervals. */
export function pooledDiff(ka, na, kb, nb) {
  const [la, ua] = wilson(ka, na), [lb, ub] = wilson(kb, nb), pa = ka / na, pb = kb / nb;
  return [pb - pa, pb - pa - Math.hypot(pb - lb, ua - pa), pb - pa + Math.hypot(ub - pb, pa - la)];
}

function parseArgs(argv) {
  const o = { tarball: [], runs: 3, timeoutMin: 15, keep: false };
  const val = (i) => argv[i + 1] ?? die(`${argv[i]} needs a value`);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") { process.stdout.write(`${HELP}\n`); process.exit(0); }
    else if (a === "--keep") o.keep = true;
    else if (a === "--tarball") o.tarball.push(resolve(val(i++)));
    else if (["--agent", "--label", "--tasks", "--check-only", "--task", "--manifest"].includes(a)) o[a.slice(2).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = val(i++);
    else if (a === "--runs" || a === "--timeout-min") o[a === "--runs" ? "runs" : "timeoutMin"] = Number(val(i++));
    else die(`unknown option ${a}. Run with --help.`);
  }
  return o;
}

const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} exited ${r.status}\n${(r.stderr || r.stdout || "").slice(-1500)}`);
  return r.stdout;
};

const SCAFFOLD = {
  "package.json": JSON.stringify({ name: "dsiab-eval-app", private: true, version: "0.0.0", type: "module" }, null, 2),
  "index.html": `<!doctype html>\n<html lang="en"><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n`,
  "vite.config.ts": `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nexport default defineConfig({ plugins: [react()] });\n`,
  "tsconfig.json": JSON.stringify({ compilerOptions: { target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "Bundler", jsx: "react-jsx", strict: true, noEmit: true, skipLibCheck: true, allowJs: true, checkJs: false, types: ["vite/client"] }, include: ["src"] }, null, 2),
  "src/main.tsx": `import { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\n\ncreateRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);\n`,
  "src/App.tsx": `import { Provider, Text } from "dsiab";\n\nexport default function App() {\n  return <Provider><Text>Hello</Text></Provider>;\n}\n`,
};

/** One scaffold per tarball, through the documented consumer path, pinned to this repo's lockfile. */
async function buildScaffold(tarball) {
  const base = mkdtempSync(join(tmpdir(), "dsiab-eval-base-"));
  for (const [f, text] of Object.entries(SCAFFOLD)) { mkdirSync(join(base, f, ".."), { recursive: true }); writeFileSync(join(base, f), text); }
  const lock = JSON.parse(readFileSync(join(ROOT, "package-lock.json"), "utf8")).packages;
  const pinned = INSTALL_DEPS.map((d) => `${d}@${lock[`node_modules/${d}`]?.version ?? die(`${d} is not in package-lock.json`)}`);
  try { run("npm", ["install", "--prefer-offline", "--no-audit", "--no-fund", "--save-exact", tarball, ...pinned], base); }
  catch (e) { die(`INSTALL FAILED, an environment problem, not an agent failure:\n${e.message}`); }
  run(process.execPath, [join(base, "node_modules/dsiab/bin/dsiab.mjs"), "init", "--write", "--yes"], base);
  if (!existsSync(join(base, "AGENTS.md"))) die("dsiab init wrote no AGENTS.md");
  const sanity = await gradeWorkspace(base, { id: "scaffold", uses: [] });
  const broken = sanity.checks.filter((c) => ["ds-check", "tsc", "imports", "invented-token"].includes(c.id) && c.status !== "pass");
  if (broken.length) die(`the scaffold is broken; not an agent failure:\n${formatGrade({ ...sanity, checks: broken })}`);
  const versions = Object.fromEntries(["dsiab", ...INSTALL_DEPS].map((d) => [d, JSON.parse(readFileSync(join(base, "node_modules", d, "package.json"), "utf8")).version]));
  return { tarball, base, manifest: snapshot(base), versions };
}

/** Run the template detached, so a timeout can kill its whole process group. */
function runAgent(cmd, cwd, env, ms, log) {
  return new Promise((done) => {
    const fd = openSync(log, "w"), t0 = Date.now();
    let timedOut = false;
    const child = spawn("/bin/sh", ["-c", cmd], { cwd, env, detached: true, stdio: ["ignore", fd, fd] });
    const kill = (sig) => { try { process.kill(-child.pid, sig); } catch { /* already gone */ } };
    const timer = setTimeout(() => { timedOut = true; kill("SIGTERM"); setTimeout(() => kill("SIGKILL"), 10_000).unref(); }, ms);
    const finish = (agentExit) => { clearTimeout(timer); kill("SIGKILL"); closeSync(fd); done({ agentExit, timedOut, durationMs: Date.now() - t0 }); };
    child.on("error", (e) => finish(`spawn failed: ${e.message}`));
    child.on("exit", (code, signal) => finish(code ?? signal));
  });
}

const pct = (x) => `${Math.round(x * 100)}`;
const rate = (k, n) => { const [lo, hi] = wilson(k, n); return `${k}/${n} [${pct(lo)}–${pct(hi)}%]`; };

function summarize(res) {
  const out = [`# dsiab eval: ${res.agent.label}`, "",
    `${res.startedAt.slice(0, 10)} · ${res.runsPerTask} run(s) per task · timeout ${res.timeoutMin} min · repo ${res.gitHead.slice(0, 7)}${res.dirty ? " (dirty)" : ""}`,
    "", "The metric is compliant completion: the task's outcome is present and every check passes. It says nothing of visual quality or runtime accessibility. Per-task rates are descriptive; intervals are Wilson 95%.", ""];
  res.arms.forEach((a, i) => out.push(`- Arm ${"AB"[i]}: \`${basename(a.tarball)}\` (dsiab ${a.versions.dsiab}), ${rate(a.overall.passes, a.overall.runs)} overall, ${a.overall.violationsPerRun.toFixed(2)} violations per run, ${a.overall.skipped} skipped check(s)`));
  out.push("", `| task | ${res.arms.map((_, i) => `arm ${"AB"[i]} | most failed`).join(" | ")} |`, `|---|${res.arms.map(() => "---|---").join("|")}|`);
  for (const id of res.tasks) {
    out.push(`| ${id} | ${res.arms.map((a) => { const t = a.tasks[id]; return `${rate(t.passes, t.runs.length)} | ${t.mostFailed ?? "none"}`; }).join(" | ")} |`);
  }
  if (res.arms.length === 2) {
    const [A, B] = res.arms;
    const [d, lo, hi] = pooledDiff(A.overall.passes, A.overall.runs, B.overall.passes, B.overall.runs);
    const deltas = res.tasks.map((id) => B.tasks[id].passes - A.tasks[id].passes).filter((x) => x !== 0);
    const up = deltas.filter((x) => x > 0).length;
    out.push("", `**B − A.** Pooled difference ${pct(d)} points [${pct(lo)}, ${pct(hi)}]. Sign test over tasks: ${up} of ${deltas.length} moved up, p = ${signTest(up, deltas.length).toFixed(2)}.`);
  }
  out.push("", `**ds-check rule tally.** ${res.arms.map((a, i) => `${"AB"[i]}: ${Object.entries(a.tally).map(([r, n]) => `${r} ${n}`).join(", ") || "none"}`).join(" · ")}`);
  return `${out.join("\n")}\n`;
}

function aggregate(arm, runs) {
  arm.tasks = {}; arm.tally = {};
  for (const r of runs) {
    const t = (arm.tasks[r.task] ??= { passes: 0, runs: [], failed: {} });
    t.runs.push(r); if (r.pass) t.passes++;
    for (const c of r.checks) if (c.status === "fail") t.failed[c.id] = (t.failed[c.id] ?? 0) + 1;
    for (const [k, n] of Object.entries(r.tally)) arm.tally[k] = (arm.tally[k] ?? 0) + n;
  }
  for (const t of Object.values(arm.tasks)) t.mostFailed = Object.entries(t.failed).sort((a, b) => b[1] - a[1])[0]?.[0];
  arm.overall = { runs: runs.length, passes: runs.filter((r) => r.pass).length,
    violationsPerRun: runs.reduce((n, r) => n + r.violations, 0) / (runs.length || 1),
    skipped: runs.reduce((n, r) => n + r.checks.filter((c) => c.status === "skipped").length, 0) };
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const all = loadTasks();
  if (o.checkOnly) {
    const task = all.tasks.find((t) => t.id === o.task) ?? die(`--check-only needs --task, one of: ${all.tasks.map((t) => t.id).join(", ")}`);
    const g = await gradeWorkspace(resolve(o.checkOnly), task, { manifest: o.manifest ? JSON.parse(readFileSync(o.manifest, "utf8")) : null });
    process.stdout.write(`${formatGrade(g)}\n`);
    process.exit(g.pass ? 0 : 1);
  }
  if (!o.agent || !o.label || !o.tarball.length || o.tarball.length > 2) die("needs --agent, --label and one or two --tarball. Run with --help.");
  for (const t of o.tarball) if (!existsSync(t)) die(`no tarball at ${t}; build one with npm run pack`);
  try { expandTemplate(o.agent, { prompt_file: "", cwd: "", task: "", solutions: "" }); } catch (e) { die(e.message); }
  const tasks = o.tasks ? o.tasks.split(",").map((id) => all.tasks.find((t) => t.id === id) ?? die(`unknown task ${id}`)) : all.tasks;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = join(ROOT, ".evals", stamp);
  const total = tasks.length * o.runs * o.tarball.length;
  process.stdout.write(`eval: ${total} run(s), worst case ${Math.round((total * o.timeoutMin) / 60 * 10) / 10} h. Results in ${outDir}\n`);
  const arms = [];
  for (const t of o.tarball) arms.push(await buildScaffold(t));
  const runs = arms.map(() => []);
  const startedAt = new Date().toISOString();
  for (let n = 1; n <= o.runs; n++) for (const task of tasks) for (const [i, arm] of arms.entries()) {
    const dir = join(outDir, "AB"[i], task.id, String(n));
    mkdirSync(dir, { recursive: true });
    const ws = mkdtempSync(join(tmpdir(), `dsiab-eval-${task.id}-`));
    cpSync(arm.base, ws, { recursive: true, verbatimSymlinks: true });
    writeFileSync(join(dir, "prompt.md"), `${task.prompt}\n\n${all.suffix}\n`);
    const cmd = expandTemplate(o.agent, { prompt_file: join(dir, "prompt.md"), cwd: ws, task: task.id, solutions: SOLUTIONS });
    const env = { ...process.env, DSIAB_EVAL_TASK: task.id, DSIAB_EVAL_RUN: String(n) };
    const agent = await runAgent(cmd, ws, env, o.timeoutMin * 60_000, join(dir, "agent.log"));
    const grade = await gradeWorkspace(ws, task, { manifest: arm.manifest });
    const record = { n, ...agent, ...grade, workspace: o.keep ? ws : null };
    writeFileSync(join(dir, "grade.json"), JSON.stringify(record, null, 2));
    if (o.keep) writeFileSync(join(dir, "manifest.json"), JSON.stringify(arm.manifest));
    else rmSync(ws, { recursive: true, force: true });
    runs[i].push(record);
    process.stdout.write(`  ${"AB"[i]} ${task.id} #${n}: ${grade.pass ? "pass" : `fail (${grade.checks.filter((c) => c.status === "fail").map((c) => c.id).join(", ")})`}\n`);
  }
  arms.forEach((a, i) => aggregate(a, runs[i]));
  const git = (args) => spawnSync("git", args, { cwd: ROOT, encoding: "utf8" }).stdout?.trim() ?? "";
  const res = { schema: 1, startedAt, finishedAt: new Date().toISOString(), gitHead: git(["rev-parse", "HEAD"]), dirty: git(["status", "--porcelain"]) !== "",
    agent: { template: o.agent, label: o.label }, runsPerTask: o.runs, timeoutMin: o.timeoutMin, tasks: tasks.map((t) => t.id),
    arms: arms.map(({ tarball, versions, tasks: t, tally, overall }) => ({ tarball, versions, tasks: t, tally, overall })) };
  writeFileSync(join(outDir, "results.json"), JSON.stringify(res, null, 2));
  writeFileSync(join(outDir, "summary.md"), summarize(res));
  for (const a of arms) rmSync(a.base, { recursive: true, force: true });
  process.stdout.write(`\n${summarize(res)}`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  main().catch((e) => die(`the runner itself failed: ${e.stack ?? e}`));
}
