/**
 * eval-grade.mjs — grade one eval workspace against one task ([[eval-measures-not-gates]]).
 *
 * Mechanical and deterministic, `node:` imports only. It adds no rule `ds-check` owns: it calls
 * `checkTree` once, from the workspace's installed dsiab (this checkout when there is none), and
 * reads the verdict and the rule ids from its findings. Its own checks are the ones ds-check cannot
 * make, and the gaming paths an optimising agent finds: an allowance or a type-check suppression it
 * added, a `--ds-*` name it declared itself (ds-check passes a name the tree declares), a scaffold
 * file it loosened. `skipped` is never a pass, and the summary counts it.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const TASKS_PATH = join(ROOT, "evals/tasks.json");
export const SOLUTIONS = join(ROOT, "evals/solutions");
export const loadTasks = (path = TASKS_PATH) => JSON.parse(readFileSync(path, "utf8"));

const SCRIPT = /\.(?:[cm]?[jt]sx?)$/;
const STYLE_FILE = /\.(?:css|scss|less|pcss|postcss)$/;
const PROTECTED = /^(?:tsconfig\.json|AGENTS\.md|\.agents\/|\.claude\/|node_modules\/dsiab\/)/;
const DS_DECL = /(?<![\w-])(--ds-[A-Za-z0-9-]*[A-Za-z0-9])\s*:|["'](--ds-[A-Za-z0-9-]*[A-Za-z0-9])["']\s*:/g;
const STYLE_SPAN = /style\s*=\s*\{\{[\s\S]*?\}\}|\b(?:color|background\w*|border\w*|fill|stroke|\w*[Ss]hadow)\s*:\s*(["'`])[^"'`\n]*\1/g;

/** Comments to spaces, newlines kept, so line numbers survive. `//` after a `:` is a URL. */
const blank = (src) => src.replace(/\/\*[\s\S]*?\*\/|(?<![:\\])\/\/[^\n]*|<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));
const lineAt = (src, i) => src.slice(0, i).split("\n").length;
const hit = (f, src, i) => `${f.rel}:${lineAt(src, i)}`;
const result = (id, ok, measured, hits = 0) => ({ id, status: ok ? "pass" : "fail", measured, hits });
const skipped = (id, measured) => ({ id, status: "skipped", measured, hits: 0 });

/** sha1 of every file outside node_modules (node_modules/dsiab included), plus the dependency ranges. */
export function snapshot(dir) {
  const files = {};
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      const rel = relative(dir, p).split(sep).join("/");
      if (e.isDirectory()) {
        if (e.name === ".git" || (/^node_modules\/(?!dsiab(?:\/|$))/.test(rel))) continue;
        walk(p);
      } else if (e.isFile()) files[rel] = createHash("sha1").update(readFileSync(p)).digest("hex");
    }
  };
  walk(dir);
  return { files, deps: depsOf(dir) };
}
const depsOf = (dir) => {
  const p = join(dir, "package.json");
  const pkg = existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {};
  return { ...pkg.dependencies, ...pkg.devDependencies };
};

function checkDsCheck(report) {
  const all = report.results.flatMap((r) => [...r.findings, ...r.allowIssues, ...r.stale]);
  const factsError = report.reach.dsiab?.facts ? null : report.reach.dsiab?.error ?? "facts did not load";
  const measured = factsError ? `NOT RUN: ${factsError}` : all.map((f) => `${f.rule}@${f.file}:${f.line}`).join(", ") || "clean";
  return result("ds-check", !factsError && report.counts.failures === 0, measured, all.length);
}

function checkEscapeHatch(report, files) {
  const found = report.results.flatMap((r) => r.allowed.map((a) => `ds-allow ${a.rule}@${a.file}:${a.line}`));
  for (const f of files.filter((x) => SCRIPT.test(x.rel))) {
    for (const m of f.src.matchAll(/@ts-(?:nocheck|ignore|expect-error)\b/g)) found.push(`${m[0]}@${hit(f, f.src, m.index)}`);
  }
  return result("escape-hatch", found.length === 0, found.join(", ") || "none", found.length);
}

function checkInventedToken(files, loaded) {
  if (!loaded.facts) return result("invented-token", false, `NOT RUN: ${loaded.error}`);
  const known = new Set(loaded.facts.known);
  const found = files.flatMap((f) => [...f.code.matchAll(DS_DECL)]
    .filter((m) => !known.has(m[1] ?? m[2])).map((m) => `${m[1] ?? m[2]}@${hit(f, f.code, m.index)}`));
  return result("invented-token", found.length === 0, found.join(", ") || "none", found.length);
}

function checkTsc(dir, repoRoot) {
  if (!existsSync(join(dir, "tsconfig.json"))) return skipped("tsc", "no tsconfig.json in the workspace");
  const own = join(dir, "node_modules/.bin/tsc");
  const bin = existsSync(own) ? own : join(repoRoot, "node_modules/.bin/tsc");
  const r = spawnSync(bin, ["--noEmit", "-p", dir], { cwd: dir, encoding: "utf8" });
  const errors = (r.stdout || "").split("\n").filter((l) => /error TS\d+/.test(l));
  const measured = r.error ? `could not run ${bin}: ${r.error.message}` : errors.slice(0, 5).join(" | ") || `exit ${r.status}`;
  return result("tsc", r.status === 0, measured, errors.length);
}

/** What tsc cannot see: Radix's unexported theme root, a deep path, a second Radix stylesheet. */
function checkImports(files) {
  const found = [];
  for (const f of files.filter((x) => SCRIPT.test(x.rel))) {
    for (const m of f.code.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']@radix-ui\/themes["']/g)) {
      const bad = m[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0]).filter((n) => /^(?:Theme|ThemePanel|ThemeContext)$/.test(n));
      if (bad.length) found.push(`${bad.join(",")} from @radix-ui/themes@${hit(f, f.code, m.index)}`);
    }
    for (const m of f.code.matchAll(/(?:from|import|import\s*\()\s*["']([^"']+)["']/g)) {
      if (/node_modules\/dsiab|^dsiab\/(?:src|dist)\/|^@radix-ui\/themes\/styles\.css$/.test(m[1])) found.push(`${m[1]}@${hit(f, f.code, m.index)}`);
    }
  }
  return result("imports", found.length === 0, found.join(", ") || "none", found.length);
}

/** Local bindings for each dsiab export, from named (`as` included) and namespace imports. */
function bindings(code) {
  const out = new Map();
  for (const m of code.matchAll(/import\s+(?:type\s+)?(?:[\w$]+\s*,\s*)?(?:\{([^}]*)\}|\*\s*as\s+([\w$]+))\s*from\s*["']dsiab["']/g)) {
    if (m[2]) { out.set("*", m[2]); continue; }
    for (const part of m[1].split(",").map((s) => s.trim()).filter((s) => s && !s.startsWith("type "))) {
      const [name, local = name] = part.split(/\s+as\s+/);
      out.set(name, local);
    }
  }
  return out;
}

function checkUses(files, task) {
  const usedIn = (name) => files.some((f) => {
    const b = bindings(f.code);
    const local = b.get(name) ?? (b.has("*") ? `${b.get("*")}.${name}` : null);
    if (!local) return false;
    const esc = local.replace(/[.$]/g, "\\$&");
    return new RegExp(`<${esc}[\\s/>.]|(?<![\\w$.])${esc}\\(`).test(f.code);
  });
  const found = [], missing = [];
  for (const entry of task.uses) {
    const name = entry.split("|").find(usedIn);
    (name ? found : missing).push(name ?? entry);
  }
  return result("uses", missing.length === 0, `found: ${found.join(", ") || "none"}; missing: ${missing.join(", ") || "none"}`, missing.length);
}

function checkPatterns(files, task) {
  const missing = (task.require ?? []).filter((r) => !files.some((f) => new RegExp(r.pattern).test(f.code)));
  const req = result("require", missing.length === 0, missing.map((r) => `missing: ${r.why}`).join("; ") || "all present", missing.length);
  const found = [];
  for (const rule of task.forbid ?? []) {
    for (const f of files) {
      const spans = rule.scope !== "style" || STYLE_FILE.test(f.rel)
        ? [[f.code, 0]] : [...f.code.matchAll(STYLE_SPAN)].map((m) => [m[0], m.index]);
      for (const [text, off] of spans) {
        for (const m of text.matchAll(new RegExp(rule.pattern, "g"))) found.push(`${rule.why}: ${m[0]}@${hit(f, f.code, off + m.index)}`);
      }
    }
  }
  return [req, result("forbid", found.length === 0, found.join(", ") || "none", found.length)];
}

function checkManifest(dir, manifest) {
  if (!manifest) return [skipped("changed", "no baseline manifest"), skipped("scaffold-intact", "no baseline manifest")];
  const now = snapshot(dir);
  const keys = new Set([...Object.keys(manifest.files), ...Object.keys(now.files)]);
  const differ = [...keys].filter((k) => manifest.files[k] !== now.files[k]);
  const work = differ.filter((k) => !k.startsWith("node_modules/") && !k.split("/").some((p) => p.startsWith(".")));
  const tampered = differ.filter((k) => PROTECTED.test(k) && k in manifest.files)
    .concat(Object.entries(manifest.deps).filter(([n, v]) => now.deps[n] !== v).map(([n]) => `package.json ${n}`));
  return [
    result("changed", work.length > 0, work.join(", ") || "nothing outside node_modules and the dot folders changed"),
    result("scaffold-intact", tampered.length === 0, tampered.slice(0, 8).join(", ") || "intact", tampered.length),
  ];
}

/** Grade `dir` against `task`. `manifest` is the scaffold's `snapshot()`; without it two checks skip. */
export async function gradeWorkspace(dir, task, { manifest = null, repoRoot = ROOT } = {}) {
  const installed = join(dir, "node_modules/dsiab");
  const pkg = existsSync(join(installed, "package.json")) ? installed : repoRoot;
  const rules = await import(pathToFileURL(join(pkg, "src/foundations/consumerRules.mjs")).href);
  const { loadFacts } = await import(pathToFileURL(join(pkg, "src/foundations/checkFacts.mjs")).href);
  const report = rules.checkTree(dir);
  const files = rules.collectFiles(dir).files.map((p) => {
    const src = readFileSync(p, "utf8");
    return { rel: relative(dir, p).split(sep).join("/"), src, code: blank(src) };
  });
  const checks = [
    checkDsCheck(report), checkEscapeHatch(report, files), checkInventedToken(files, loadFacts(pkg)),
    checkTsc(dir, repoRoot), checkImports(files), checkUses(files, task), ...checkPatterns(files, task),
    ...checkManifest(dir, manifest),
  ];
  const tally = {};
  for (const r of report.results) for (const f of [...r.findings, ...r.allowed]) tally[f.rule] = (tally[f.rule] ?? 0) + 1;
  const violations = checks.filter((c) => !["uses", "require", "changed", "tsc"].includes(c.id)).reduce((n, c) => n + c.hits, 0);
  return { task: task.id, pass: checks.every((c) => c.status !== "fail"), checks, tally, violations, gradedWith: pkg };
}

export const formatGrade = (g) => [
  `${g.pass ? "PASS" : "FAIL"}  ${g.task}`,
  ...g.checks.map((c) => `  ${c.status.padEnd(7)} ${c.id.padEnd(15)} ${c.measured}`),
].join("\n");
