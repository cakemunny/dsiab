/* =============================================================================
   eval-grader.node-check.ts — THE EVAL GRADER IS RIGHT BEFORE ANY RATE IS READ
   -----------------------------------------------------------------------------
   `scripts/eval-grade.mjs` judges agent output ([[eval-measures-not-gates]]).
   A grader that cannot fail measures nothing, and a task nobody has solved
   reads as "agents are bad at X" forever. So, offline and with no install:

     SOLUTIONS  every task's reference answer in evals/solutions/ passes.
     RED        each check fails on that answer plus ONE plant, and only that
                check fails, so a plant proves the check and nothing else.
     NO-OP      the untouched scaffold App fails, so doing nothing cannot pass.
     TASKS      ids, patterns, every accepted name a ported registry export,
                and no prompt that names the component it expects.
     RUNNER     the template quoting survives /bin/sh, the statistics match
                known values, and the install list covers acceptance.mjs's.
   ============================================================================= */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { gradeWorkspace, loadTasks, snapshot, SOLUTIONS, ROOT } from "../../scripts/eval-grade.mjs";
import { INSTALL_DEPS, expandTemplate, pooledDiff, signTest, wilson } from "../../scripts/eval.mjs";

interface Check { id: string; status: string; measured: string }
interface Task { id: string; prompt: string; uses: string[]; require?: { pattern: string }[]; forbid?: { pattern: string }[] }
const { tasks } = loadTasks() as { tasks: Task[] };
const task = (id: string) => tasks.find((t) => t.id === id)!;
const made: string[] = [];
afterAll(() => made.forEach((d) => rmSync(d, { recursive: true, force: true })));

/** A temp copy of a task's solution, with `files` written over it. */
function workspace(id: string | null, files: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "eval-grader-"));
  made.push(dir);
  if (id) cpSync(join(SOLUTIONS, id), dir, { recursive: true });
  for (const [f, text] of Object.entries(files)) {
    mkdirSync(join(dir, f, ".."), { recursive: true });
    writeFileSync(join(dir, f), text);
  }
  return dir;
}
const app = (id: string) => readFileSync(join(SOLUTIONS, id, "src/App.tsx"), "utf8");
const failing = (checks: Check[]) => checks.filter((c) => c.status === "fail").map((c) => c.id);
const byId = (checks: Check[], id: string) => checks.find((c) => c.id === id)!;

describe("SOLUTIONS: every task is passable", () => {
  test.each(tasks.map((t) => t.id))("%s", async (id) => {
    const g = await gradeWorkspace(workspace(id), task(id));
    expect(failing(g.checks), JSON.stringify(g.checks, null, 2)).toEqual([]);
    expect(g.checks.filter((c: Check) => c.status === "skipped").map((c: Check) => c.id).sort()).toEqual(["changed", "scaffold-intact", "tsc"]);
  });
});

// The plants are assembled at runtime, so `ds-check src` does not read them as this file's own violations.
const v = (name: string) => `var(--${name})`;
const IMP = "!" + "important";
const SHELL = `import { Provider, Text } from "dsiab";\nexport default function App() { return <Provider><Text>Hello</Text></Provider>; }\n`;
const PLANTS: [string, string, string, Record<string, string>, string[]][] = [
  ["ds-check", "the dsiab rules", "settings-form", {
    "src/plant.css": `.radix-themes .x { color: ${v("ds-text-danger")}; background: ${v("gray-9")} ${IMP}; }\n`,
    "src/plant.tsx": 'import { Callout } from "@radix-ui/themes";\nexport const C = Callout;\n',
    "src/global.css": '@import "@radix-ui/themes/styles.css";\n',
  }, ["unknown-token@", "bare-scale-step@", "important-flag@", "radix-duplicate@", "radix-stylesheet@"]],
  ["escape-hatch", "an allowance", "settings-form", {
    "src/plant.css": `.radix-themes .x {\n  /* ds-allow important-flag — the vendor sheet wins this one */\n  color: ${v("ds-text-strong")} ${IMP};\n}\n`,
  }, ["ds-allow important-flag@src/plant.css:3"]],
  ["escape-hatch", "a type-check suppression", "settings-form", { "src/plant.ts": "// @ts-nocheck\nexport const x = 1;\n" }, ["@ts-nocheck@src/plant.ts:1"]],
  ["invented-token", "a --ds-* name the tree declares itself", "settings-form", {
    "src/brand.css": ".radix-themes { --ds-brand-purple: purple; }\n.x { color: var(--ds-brand-purple); }\n",
  }, ["--ds-brand-purple@src/brand.css:1"]],
  ["imports", "Radix's theme root and a deep path", "settings-form", {
    "src/plant.ts": 'import { Theme as T } from "@radix-ui/themes";\nimport "dsiab/dist/index.js";\nexport { T };\n',
  }, ["Theme from @radix-ui/themes@src/plant.ts:1", "dsiab/dist/index.js@src/plant.ts:2"]],
  ["uses", "a component imported but only named in a comment", "brand-colours", {
    "src/App.tsx": app("brand-colours").replace('<Button priority="primary">Open workspace</Button>', "{/* <Button> */}<a href=\"#open\">Open workspace</a>"),
  }, ["missing: Button"]],
  ["require", "the outcome left out", "brand-colours", { "src/App.tsx": app("brand-colours").replace(' accentColor="purple"', "") }, ["missing: the accent is set on Provider"]],
  ["forbid", "a hex value in a style", "brand-colours", {
    "src/App.tsx": app("brand-colours").replace('<Card variant="filled">', '<Card variant="filled" style={{ background: "#eeeeee" }}>'),
  }, ["#eeeeee@src/App.tsx:7"]],
];

describe("RED: solution plus one plant fails that check alone", () => {
  test.each(PLANTS)("%s: %s", async (id, _what, taskId, files, expected) => {
    const g = await gradeWorkspace(workspace(taskId, files), task(taskId));
    expect(failing(g.checks)).toEqual([id]);
    for (const e of expected) expect(byId(g.checks, id).measured).toContain(e);
  });

  test("ds-check: the bin's exit agrees with the verdict derived from checkTree", () => {
    const bin = (dir: string) => spawnSync(process.execPath, [join(ROOT, "bin/ds-check.mjs"), dir]).status;
    expect(bin(workspace("settings-form", PLANTS[0][3]))).toBe(1);
    expect(bin(workspace("settings-form"))).toBe(0);
  });

  test("forbid: a hex-shaped anchor outside a style is not a colour", async () => {
    const src = app("brand-colours").replace("Welcome back", '<a href="#feed">Welcome back</a> #123');
    expect(byId((await gradeWorkspace(workspace("brand-colours", { "src/App.tsx": src }), task("brand-colours"))).checks, "forbid").status).toBe("pass");
  });

  test("uses: an aliased and a namespace import both count", async () => {
    const ns = app("brand-colours").replace(/import \{[^}]*\} from "dsiab";/, 'import * as ds from "dsiab";').replace(/<(\/?)(Provider|Flex|Card|Heading|Text|Button)\b/g, "<$1ds.$2");
    const alias = app("brand-colours").replace("{ Button,", "{ Button as Action,").replace(/<(\/?)Button\b/g, "<$1Action");
    for (const src of [ns, alias]) {
      expect(byId((await gradeWorkspace(workspace("brand-colours", { "src/App.tsx": src }), task("brand-colours"))).checks, "uses").status).toBe("pass");
    }
  });

  // Two real compiler processes: about 2.5 s on a laptop, past vitest's 5 s default on a loaded CI
  // runner. The two grades run in parallel and the limit names the cost instead of hiding it.
  test("tsc: a type error fails it and clean code passes, with the repo's binary when the workspace has none", async () => {
    const tsconfig = JSON.stringify({ compilerOptions: { strict: true, noEmit: true }, include: ["src"] });
    const [bad, good] = await Promise.all([
      gradeWorkspace(workspace(null, { "tsconfig.json": tsconfig, "src/bad.ts": 'export const n: number = "x";\n' }), { id: "t", uses: [] }),
      gradeWorkspace(workspace(null, { "tsconfig.json": tsconfig, "src/good.ts": "export const n: number = 1;\n" }), { id: "t", uses: [] }),
    ]);
    expect([byId(bad.checks, "tsc").status, byId(good.checks, "tsc").status]).toEqual(["fail", "pass"]);
    expect(byId(bad.checks, "tsc").measured).toContain("TS2322");
  }, 30_000);

  test("changed and scaffold-intact: read against the baseline manifest", async () => {
    const dir = workspace("settings-form", { "AGENTS.md": "rules\n", "package.json": JSON.stringify({ dependencies: { react: "19.2.7" } }) });
    const manifest = snapshot(dir);
    expect(failing((await gradeWorkspace(dir, task("settings-form"), { manifest })).checks)).toEqual(["changed"]);
    writeFileSync(join(dir, "src/App.tsx"), `${app("settings-form")}\n`);
    expect(failing((await gradeWorkspace(dir, task("settings-form"), { manifest })).checks)).toEqual([]);
    rmSync(join(dir, "AGENTS.md"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ dependencies: { react: "*" } }));
    const g = await gradeWorkspace(dir, task("settings-form"), { manifest });
    expect(failing(g.checks)).toEqual(["scaffold-intact"]);
    expect(byId(g.checks, "scaffold-intact").measured).toBe("AGENTS.md, package.json react");
  });
});

test("NO-OP: the untouched scaffold App fails every task", async () => {
  for (const t of tasks) {
    expect(failing((await gradeWorkspace(workspace(null, { "src/App.tsx": SHELL }), t)).checks)).toContain("uses");
  }
});

describe("TASKS", () => {
  const registry = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8")) as { status: string; exports: string[] }[];
  const published = new Set(registry.filter((e) => e.status === "ported").flatMap((e) => e.exports));

  test("ids are unique and kebab-case, and each has a solution and an outcome", () => {
    const ids = tasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of tasks) {
      expect(t.id).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
      expect(existsSync(join(SOLUTIONS, t.id, "src/App.tsx")), t.id).toBe(true);
      expect(t.require?.length, t.id).toBeGreaterThan(0);
      for (const p of [...(t.require ?? []), ...(t.forbid ?? [])]) expect(() => new RegExp(p.pattern)).not.toThrow();
    }
  });

  test("every accepted name is an export of a ported registry entry, and no prompt names one", () => {
    for (const t of tasks) {
      for (const name of t.uses.flatMap((u) => u.split("|"))) {
        expect(published.has(name), `${t.id}: ${name}`).toBe(true);
        expect(new RegExp(`\\b${name}\\b`).test(t.prompt), `${t.id} names ${name}`).toBe(false);
      }
    }
  });
});

describe("RUNNER", () => {
  test("a template placeholder survives /bin/sh quoting, and a bad template is refused", () => {
    const path = "/tmp/a dir/it's here.md";
    const out = spawnSync("/bin/sh", ["-c", expandTemplate("printf %s {prompt_file}", { prompt_file: path })], { encoding: "utf8" });
    expect(out.stdout).toBe(path);
    expect(() => expandTemplate("run {prompt_file} {model}", { prompt_file: "x" })).toThrow(/unknown placeholder \{model\}/);
    expect(() => expandTemplate("run {task}", { task: "x" })).toThrow(/must contain \{prompt_file\}/);
  });

  test("the statistics match known values", () => {
    expect(wilson(3, 3).map((x) => +x.toFixed(2))).toEqual([0.44, 1]);
    expect(wilson(0, 3).map((x) => +x.toFixed(2))).toEqual([0, 0.56]);
    expect(+signTest(9, 10).toFixed(3)).toBe(0.021);
    expect(+signTest(8, 10).toFixed(3)).toBe(0.109);
    const [d, lo, hi] = pooledDiff(24, 40, 12, 40);
    expect([+d.toFixed(2), lo < d && d < hi && hi < 0]).toEqual([-0.3, true]);
  });

  test("the install list covers every package scripts/acceptance.mjs installs", () => {
    const src = readFileSync(join(ROOT, "scripts/acceptance.mjs"), "utf8");
    const list = /tarball,\s*((?:"[^"]+",?\s*)+)\]/.exec(src);
    expect(list, "the install call in acceptance.mjs moved; update this parse").not.toBeNull();
    const theirs = [...list![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(theirs.length).toBeGreaterThan(3);
    expect(theirs.filter((d) => !INSTALL_DEPS.includes(d))).toEqual([]);
  });
});
