/* =============================================================================
   dsiab-rules.node-check.ts — THE DSIAB RULES IN `ds-check` ([[ds-check-dsiab-rules]])
   -----------------------------------------------------------------------------
   `unknown-token`, `bare-scale-step`, `important-flag`, `radix-duplicate` and
   `radix-stylesheet` live in `dsiabRules.mjs`, and their facts in `checkFacts.mjs`. This file holds
   one red proof per rule, the green controls that keep each one precise, the
   allowance cases a rule that did not run must not turn stale, both places the
   facts load from (a checkout and an installed `dist/`), and the drift arm on
   `dist/check-facts.json`.

   EVERY FIXTURE IS A CALL ARGUMENT, never an object property value. `ds-check`
   reads a quoted string only when it is a style value (a property value or a
   `style` / `className` attribute), so the violations planted here stay
   invisible to `npx ds-check src`, which is CI's first step.
   ============================================================================= */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkSource, checkTree, RULE_IDS, formatReport } from "./consumerRules.mjs";
import { DSIAB_RULE_IDS, prepareTree, suggestForStep } from "./dsiabRules.mjs";
import { buildCheckFacts, loadFacts, FACTS_PATH } from "./checkFacts.mjs";

const ROOT = process.cwd();
const facts = buildCheckFacts(ROOT);
const tree = (loaded: object = { facts, source: "test" }, sources: { src: string }[] = []) =>
  prepareTree(sources, loaded);

type Finding = { rule: string; line: number; detail: string };
/** Run one fixture as a consumer file and return its findings as `rule@line: detail`. */
function run(rel: string, src: string, ctx: object = { tree: tree() }) {
  return (checkSource(rel, src, ctx)!.findings as Finding[]).map((f) => `${f.rule}@${f.line}: ${f.detail}`);
}
const rules = (rel: string, src: string, ctx?: object) => run(rel, src, ctx).map((f) => f.split(":")[0]);
const USES = 'import { Button } from "dsiab";\n';

describe("unknown-token", () => {
  it("RED: an invented name in CSS, a style object and a className, with the real name suggested", () => {
    expect(run("a.css", ".x {\n  color: var(--ds-text-danger);\n}\n")).toEqual([
      "unknown-token@2: `--ds-text-danger` is not a dsiab token. Did you mean `--ds-text-error`?",
    ]);
    expect(run("a.tsx", 'export const s = { color: "var(--ds-text-danger)" };\n')).toEqual([
      "unknown-token@1: `--ds-text-danger` is not a dsiab token. Did you mean `--ds-text-error`?",
    ]);
    expect(run("a.tsx", 'export const X = () => <div className="bg-[var(--ds-fill-danger)]" />;\n')).toEqual([
      "unknown-token@1: `--ds-fill-danger` is not a dsiab token. Did you mean `--ds-fill-error`?",
    ]);
  });

  it("RED: the alias families other systems use open the gate", () => {
    expect(run("a.css", ".x { color: var(--ds-color-primary); }")).toEqual([
      "unknown-token@1: `--ds-color-primary` is not a dsiab token. Did you mean `--ds-fill-accent` or `--ds-stroke-accent`?",
    ]);
    expect(run("a.css", ".x { gap: var(--ds-spacing-4); }")).toEqual([
      "unknown-token@1: `--ds-spacing-4` is not a dsiab token. Did you mean `--ds-space-4`?",
    ]);
    expect(run("a.css", ".x { gap: var(--ds-space-3); }")[0]).toContain("The `--ds-space-*` steps are 0 2 4 8 12 16");
    expect(run("a.css", ".x { color: var(--ds-text-muted); }")[0]).toContain("Did you mean `--ds-text-weak`?");
  });

  it("GREEN: real names, documented knobs, foreign families, tree declarations, runtime names, comments", () => {
    expect(run("a.css", ".x { color: var(--ds-text-error); width: var(--ds-layout-panel-width); }")).toEqual([]);
    expect(run("a.css", ".x { top: var(--ds-appshell-header-height); gap: var(--ds-mything-gap); }")).toEqual([]);
    expect(run("a.css", "/* var(--ds-text-danger) */\n.x { color: red; }")).toEqual([]);
    expect(run("a.tsx", 'const c = (t: string) => ({ color: `var(--ds-text-${t})` });\n')).toEqual([]);
    expect(run("a.tsx", 'log("var(--ds-text-danger) is a fixture, not a style");\n')).toEqual([]);
    const declared = tree(undefined, [{ src: ":root { --ds-text-brandname: red; }" }]);
    expect(run("a.css", ".x { color: var(--ds-text-brandname); }", { tree: declared })).toEqual([]);
  });
});

describe("bare-scale-step and important-flag: dsiab files only", () => {
  const MARKERS: [string, string][] = [
    ["from dsiab", 'import { Button } from "dsiab";'],
    ["from dsiab/…", 'import roster from "dsiab/registry.json";'],
    ["side-effect import", 'import "dsiab/styles.css";'],
    ["require", 'const ds = require("dsiab");'],
    ["a --ds- var", 'const s = { color: "var(--ds-text-error)" };'],
    ["the theme root", 'const sel = ".radix-themes .x";'],
  ];
  const STEP = 'export const s = { color: "var(--accent-9)" };\n';

  it.each(MARKERS)("RED: %s makes a file a dsiab file", (_label, marker) => {
    expect(rules("a.tsx", `${marker}\n${STEP}`)).toEqual(["bare-scale-step@2"]);
  });

  it("RED: a CSS @import of dsiab, oxblood, the brand ramps, and the suggestion each step gets", () => {
    const css = '@import "dsiab/styles.css";\n.x { color: var(--oxblood-9); fill: var(--ds-custom-9); }\n';
    expect(rules("a.css", css)).toEqual(["bare-scale-step@2", "bare-scale-step@2"]);
    expect(run("a.css", `${USES}.x { border-color: var(--gray-a6); }`)).toEqual([
      "bare-scale-step@2: `--gray-a6` is a raw scale step. The token layer maps this step to `--ds-stroke-disabled` or `--ds-stroke-weak`.",
    ]);
    expect(suggestForStep("gray", "", "11", facts)).toContain("`--ds-text-weak`");
    expect(suggestForStep("gray", "", "12", facts)).toContain("`--ds-text-strong`");
    expect(suggestForStep("red", "", "11", facts)).toContain("`--ds-text-error`");
    expect(suggestForStep("accent", "", "9", facts)).toContain("`--ds-fill-selected`");
  });

  it("GREEN: the same step and flag in a file with no marker, including a name that only looks like one", () => {
    expect(rules("a.tsx", `import x from "dsiab-ish";\n${STEP}`)).toEqual([]);
    expect(rules("plain.css", ".q { color: var(--accent-9) !important; }")).toEqual([]);
  });

  it("RED: !important in a dsiab file; GREEN: the same rule in a plain file", () => {
    expect(run("a.css", ".radix-themes .x { color: red !important; }")).toEqual([
      "important-flag@1: `!important` in a dsiab file",
    ]);
    expect(run("b.css", ".x { color: red !important; }")).toEqual([]);
  });

  it("SELF: the token layer and the stories skip bare-scale-step; important-flag still runs", () => {
    const self = { tree: tree(), file: { selfSrc: true, selfLayer: true } };
    expect(rules("t.css", ".radix-themes { --ds-x: var(--gray-a6); color: red !important; }", self)).toEqual([
      "important-flag@1",
    ]);
  });
});

describe("hex-colour: dsiab files only", () => {
  it("RED: a hex in CSS, in a style object, in a className and in a template, each in a dsiab file", () => {
    expect(run("a.css", `${USES}.x { color: #fff; border: 1px solid #1A2B3C80; }`)).toEqual([
      "hex-colour@2: `#fff` is a fixed colour. Use the `--ds-*` role for what it means.",
      "hex-colour@2: `#1A2B3C80` is a fixed colour. Use the `--ds-*` role for what it means.",
    ]);
    expect(rules("a.tsx", `${USES}export const s = { background: "#0a0a0a" };\n`)).toEqual(["hex-colour@2"]);
    expect(rules("a.tsx", `${USES}export const A = () => <div className="bg-[#ff0066] p-2" />;\n`)).toEqual(["hex-colour@2"]);
  });

  it("GREEN: a selector, url(#…), an entity, a non-colour string, and a file with no marker", () => {
    expect(rules("a.css", `${USES}#fade, #abc:hover { color: var(--ds-text-strong); }`)).toEqual([]);
    expect(rules("a.css", `${USES}.x { mask: url(#fade); fill: url('#bad'); }`)).toEqual([]);
    expect(rules("a.tsx", `${USES}export const n = "&#123;";\nlog("#fff is a fixture");\n`)).toEqual([]);
    expect(rules("plain.css", ".x { color: #fff; }")).toEqual([]);
  });

  it("SELF: the token layer and the stories skip it, like bare-scale-step", () => {
    const self = { tree: tree(), file: { selfSrc: true, selfLayer: true } };
    expect(rules("t.css", ".radix-themes { --ds-x: #fff; }", self)).toEqual([]);
  });
});

describe("radix-duplicate", () => {
  const IMPORT = 'import { Button, Flex, Grid, Theme, type ButtonProps } from "@radix-ui/themes";\n';

  it("RED: exactly the component dsiab ships under the same name, with the import to write", () => {
    expect(run("a.tsx", IMPORT)).toEqual([
      'radix-duplicate@1: dsiab ships `Button`, which wraps this one. Write `import { Button } from "dsiab"`',
    ]);
    expect(rules("a.tsx", 'import {\n  Card,\n  Dialog as D,\n} from "@radix-ui/themes";\n')).toEqual([
      "radix-duplicate@2",
      "radix-duplicate@3",
    ]);
  });

  it("GREEN: passthroughs, type imports, a string that only quotes an import, and the package's own source", () => {
    expect(facts.passthrough).toEqual(["AspectRatio", "Box", "Flex", "Grid", "Section", "Skeleton", "VisuallyHidden"]);
    expect(rules("a.tsx", 'import { Grid, Section, Skeleton } from "@radix-ui/themes";\n')).toEqual([]);
    expect(rules("a.tsx", 'import type { ButtonProps } from "@radix-ui/themes";\n')).toEqual([]);
    expect(rules("a.tsx", 'say(\'import { Button } from "@radix-ui/themes"\');\n')).toEqual([]);
    expect(rules("a.tsx", IMPORT, { tree: tree(), file: { selfSrc: true } })).toEqual([]);
  });
});

describe("radix-stylesheet: a tree that imports dsiab", () => {
  const SHEET = "@radix-ui/themes/styles.css";
  /** checkTree over a temp tree of `files`, as `rule@file:line`. */
  function treeRun(files: Record<string, string>) {
    const dir = mkdtempSync(join(tmpdir(), "dsiab-sheet-"));
    try {
      for (const [f, text] of Object.entries(files)) writeFileSync(join(dir, f), text);
      const report = checkTree(dir);
      return {
        found: report.results.flatMap((r: { findings: Finding[]; file: string }) => r.findings.map((x) => `${x.rule}@${r.file}:${x.line}`)),
        reach: formatReport(report),
      };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it("RED: the sheet in a global CSS file with no marker, because another file imports dsiab", () => {
    const { found, reach } = treeRun({ "main.tsx": USES, "globals.css": `@import "${SHEET}";\n.x { color: red; }\n` });
    expect(found).toEqual(["radix-stylesheet@globals.css:1"]);
    expect(reach).toContain("radix-stylesheet ran, because a file here imports dsiab");
  });

  it("RED: every import shape, any Radix sheet, with the line and the sheet named", () => {
    expect(run("a.tsx", `${USES}import "${SHEET}";\n`)).toEqual([
      `radix-stylesheet@2: \`${SHEET}\` is already inside \`dsiab/styles.css\`, so this loads a second copy of it`,
    ]);
    const js = `${USES}require("${SHEET}");\nawait import("@radix-ui/themes/tokens.css");\nimport s from "@radix-ui/themes/layout/components.css";\n`;
    expect(rules("a.ts", js)).toEqual(["radix-stylesheet@2", "radix-stylesheet@3", "radix-stylesheet@4"]);
    const css = `@import "dsiab/styles.css";\n@import url("~${SHEET}");\n@import '../node_modules/@radix-ui/themes/tokens/colors/red.css';\n`;
    expect(rules("a.css", css)).toEqual(["radix-stylesheet@2", "radix-stylesheet@3"]);
  });

  it("GREEN: a Radix Themes project without dsiab, even one that writes `.radix-themes` and a `--ds-` prefix", () => {
    const { found, reach } = treeRun({
      "main.tsx": `import "${SHEET}";\nimport { Theme } from "@radix-ui/themes";\nexport const T = Theme;\n`,
      "app.css": `@import "${SHEET}";\n.radix-themes .x { color: var(--ds-mine); }\n:root { --ds-mine: red; }\n`,
    });
    expect(found).toEqual([]);
    expect(reach).toContain("NOT RUN: radix-stylesheet, because no file here imports dsiab");
  });

  it("GREEN: a comment, a quoted string, Radix's JS entry, an import only named in a comment, the package's own source", () => {
    expect(rules("a.tsx", `${USES}// import "${SHEET}";\nsay('import "${SHEET}"');\nimport { Grid } from "@radix-ui/themes";\n`)).toEqual([]);
    expect(rules("a.css", `/* @import "dsiab/styles.css"; */\n@import "${SHEET}";\n`)).toEqual([]);
    const self = { tree: tree(), file: { selfSrc: true } };
    expect(rules("index.css", `@import "dsiab/x.css";\n@import "${SHEET}";\n`, self)).toEqual([]);
  });

  it("an allowance for it in a tree that does not import dsiab is not evaluated, never stale", () => {
    const allow = "/* ds-allow radix-stylesheet — this app does not load dsiab's stylesheet */\n";
    const r = checkSource("a.css", `${allow}@import "${SHEET}";\n`, { tree: tree() })!;
    expect([r.findings.length, r.stale.length, r.notEvaluated.length]).toEqual([0, 0, 1]);
  });
});

describe("allowances", () => {
  const ALLOW = "/* ds-allow important-flag — overrides a vendor flag to honour reduced motion */\n";

  it("an allowed line is ALLOWED, and a stale allowance fails", () => {
    const ok = checkSource("a.css", `${ALLOW}.radix-themes .x { animation: none !important; }\n`, { tree: tree() })!;
    expect([ok.findings.length, ok.allowed.length, ok.stale.length]).toEqual([0, 1, 0]);
    const stale = checkSource("a.css", `${ALLOW}.radix-themes .x { animation: none; }\n`, { tree: tree() })!;
    expect(stale.stale.map((s: { rule: string }) => s.rule)).toEqual(["important-flag"]);
  });

  it("an allowance for a rule that did not run on the file is not evaluated, never stale", () => {
    const plain = checkSource("a.css", `${ALLOW}.x { animation: none; }\n`, { tree: tree() })!;
    expect([plain.stale.length, plain.notEvaluated.length]).toEqual([0, 1]);
    const noFacts = tree({ facts: null, source: "x", error: "dist/check-facts.json is missing" });
    const allow = "/* ds-allow unknown-token — a token our own theme package declares */\n";
    const r = checkSource("a.css", `${allow}.x { color: var(--ds-text-brandname); }\n`, { tree: noFacts })!;
    expect([r.findings.length, r.stale.length, r.notEvaluated.length]).toEqual([0, 0, 1]);
  });
});

describe("facts", () => {
  it("the checkout facts carry the knobs, oxblood, and Radix's own scales", () => {
    expect(facts.known).toEqual(expect.arrayContaining(["--ds-layout-panel-width", "--ds-appshell-header-height"]));
    expect(facts.known).not.toContain("--ds-space");
    expect(facts.suggest.length).toBeGreaterThan(100);
    expect(facts.scales).toEqual(expect.arrayContaining(["oxblood", "purple", "error", "accent", "gray"]));
    expect(facts.scales).not.toContain("space");
  });

  it("INSTALLED: a package root with only dist/check-facts.json loads it and finds the planted token", () => {
    const pkg = mkdtempSync(join(tmpdir(), "dsiab-installed-"));
    try {
      mkdirSync(join(pkg, "dist"));
      writeFileSync(join(pkg, FACTS_PATH), JSON.stringify(facts));
      const loaded = loadFacts(pkg);
      expect(loaded.source).toBe(join(pkg, FACTS_PATH));
      expect(run("a.css", ".x { color: var(--ds-text-danger); }", { tree: tree(loaded) })[0]).toContain("`--ds-text-error`");
    } finally {
      rmSync(pkg, { recursive: true, force: true });
    }
  });

  it("NOT RUN: a missing or corrupt facts file names the reason, and the run is decided by the other rules", () => {
    const pkg = mkdtempSync(join(tmpdir(), "dsiab-nofacts-"));
    try {
      expect(loadFacts(pkg).error).toContain("is missing");
      mkdirSync(join(pkg, "dist"));
      writeFileSync(join(pkg, FACTS_PATH), "{ not json");
      const corrupt = loadFacts(pkg);
      expect([corrupt.facts, corrupt.error?.includes("could not be read")]).toEqual([null, true]);
      expect(rules("a.css", ".radix-themes .x { color: var(--ds-text-danger) !important; }", { tree: tree(corrupt) }))
        .toEqual(["important-flag@1"]);
    } finally {
      rmSync(pkg, { recursive: true, force: true });
    }
  });

  it("DRIFT: dist/check-facts.json equals what the sources build ([[ds-check-dsiab-rules]])", () => {
    const path = join(ROOT, FACTS_PATH);
    if (!existsSync(path)) {
      expect(process.env.CI, "CI builds before this lane, so dist/check-facts.json must exist there").toBeFalsy();
      return; // locally, before a build, there is nothing to compare
    }
    const text = readFileSync(path, "utf8");
    expect(JSON.parse(text), "dist/check-facts.json is stale. Run `npm run build`").toEqual(facts);
    expect(text, "the shipped facts name no repository path").not.toMatch(/"(?:docs|src)\//);
  });
});

describe("the repository and the CLI", () => {
  it("`npx ds-check src` passes with exactly one allowed !important, and says what it did not run", () => {
    const report = checkTree(join(ROOT, "src"));
    expect(report.counts.failures).toBe(0);
    expect(report.results.flatMap((r: { allowed: Finding[] }) => r.allowed.map((a) => a.rule))).toEqual(["important-flag"]);
    expect(formatReport(report)).toContain("radix-duplicate and radix-stylesheet skipped all of src/");
  });

  it("the CLI fails a planted token with the real name, and --rules lists every rule", () => {
    const dir = mkdtempSync(join(tmpdir(), "dsiab-cli-"));
    try {
      writeFileSync(join(dir, "a.css"), ".x { color: var(--ds-text-danger); }\n");
      let out = "";
      let status = 0;
      try {
        execFileSync("node", [join(ROOT, "bin/ds-check.mjs"), dir], { encoding: "utf8" });
      } catch (err) {
        ({ stdout: out, status } = err as { stdout: string; status: number });
      }
      expect([status, out.includes("`--ds-text-error`")]).toEqual([1, true]);
      const listed = execFileSync("node", [join(ROOT, "bin/ds-check.mjs"), "--rules"], { encoding: "utf8" });
      for (const id of RULE_IDS) expect(listed).toContain(`  ${id}\n`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("several paths are ONE run: a dsiab import in one makes a Radix sheet in another a finding", () => {
    const dir = mkdtempSync(join(tmpdir(), "dsiab-paths-"));
    const run = (...paths: string[]) => {
      try {
        return { status: 0, out: execFileSync("node", [join(ROOT, "bin/ds-check.mjs"), ...paths], { encoding: "utf8" }) };
      } catch (err) {
        const { stdout, status } = err as { stdout: string; status: number };
        return { status, out: stdout };
      }
    };
    try {
      mkdirSync(join(dir, "app"));
      mkdirSync(join(dir, "styles"));
      writeFileSync(join(dir, "app", "App.tsx"), 'import { Button } from "dsiab";\nexport const App = () => <Button>Go</Button>;\n');
      writeFileSync(join(dir, "styles", "global.css"), '@import "@radix-ui/themes/styles.css";\n');
      // RED: the sheet alone is not a dsiab project, so it passes; with the app beside it, it fails.
      expect(run(join(dir, "styles")).status).toBe(0);
      const both = run(join(dir, "app"), join(dir, "styles"));
      expect([both.status, both.out.includes("styles/global.css:1  [radix-stylesheet]")]).toEqual([1, true]);
      // A path inside another is read once, and an --init takes one directory only.
      const once = checkTree([dir, join(dir, "styles")]);
      expect([...once.reach.scannedByExt.values()].reduce((n: number, c: number) => n + c, 0)).toBe(2);
      expect(run("--init", join(dir, "app"), join(dir, "styles")).status).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("the dsiab skill lists no rule ids and no rule count, and every id it allows is real", () => {
    // The skill points at `npx ds-check --rules`, so a list or a count there goes stale with each new rule.
    const problems = (text: string) => [
      ...[...text.matchAll(/ds-allow ([a-z0-9-]+)/g)].filter((m) => !RULE_IDS.includes(m[1])).map((m) => `unknown id ${m[1]}`),
      ...RULE_IDS.filter((id) => text.includes(`\`${id}\``)).map((id) => `lists \`${id}\``),
      ...[...text.matchAll(/\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve) (?:dsiab )?rules\b/gi)].map((m) => `count "${m[0]}"`),
    ];
    const skill = readFileSync(join(ROOT, "skills/dsiab/SKILL.md"), "utf8");
    expect(problems(skill)).toEqual([]);
    // RED: the list and count this skill used to carry, and an allowance for a rule that does not exist.
    expect(problems("It enforces five rules: `transition-all`.\nds-allow no-such-rule — x")).toEqual([
      "unknown id no-such-rule",
      "lists `transition-all`",
      'count "five rules"',
    ]);
  });

  it("rules.md names every dsiab rule it says ds-check enforces", () => {
    const rulesMd = readFileSync(join(ROOT, "skills/dsiab/references/rules.md"), "utf8");
    for (const id of DSIAB_RULE_IDS) expect(rulesMd, `rules.md does not name \`${id}\``).toContain(`\`${id}\``);
  });
});
