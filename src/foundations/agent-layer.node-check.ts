/* =============================================================================
   agent-layer.node-check.ts: THE AGENT-LAYER GUARD ([[agent-files-and-docs-layout]])
   -----------------------------------------------------------------------------
   Node-mode guard, in the same harness as registry.node-check.ts. It runs with
   vitest.node.config.ts, `npm run test:tokens` and the pretest hook.

   The package ships the rules, the `dsiab` skill, one reviewer and a setup
   guide, and `npx ds-check --init` copies them into a consumer's project.
   Ownership comes from the `dsiab-managed` marker inside a file, never from
   its path. Holds:
     1. `package.json` `files` is exactly the shipped list, and every entry
        exists: no gate code, no root AGENTS.md, no eject command and no
        contributor skill ships;
     2. `--init` in an empty folder writes exactly the seven files below, each
        with the marker, and no CLAUDE.md, GEMINI.md, hook, settings file,
        `.github/`, `.codex/` or `.gemini/`, and it names the guide;
     3. the skill copies are byte-identical to the package's skills, the rules
        copies are the marker line plus rules.md, and the generated Claude Code
        agent carries the skill body byte for byte;
     4. an existing `.claude/settings.json` is left byte-identical;
     G1. an unmarked AGENTS.md stays byte-identical after `--init --force`;
     G2. a marked but edited AGENTS.md is kept without `--force` and replaced
         with it;
     G3. the AGENTS.md that `--init` writes, rules.md plus the marker line,
         stays under 24,000 bytes, the size above which Antigravity CLI
         truncates a rule file.

   DS_CHECK_UNDER_TEST points the guard at another copy of ds-check.mjs. It
   exists for one job: proving G1 and G2 go red against a deliberately broken
   temp copy, without editing the real file.
   ============================================================================= */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { test, expect } from "vitest";

const ROOT = process.cwd();
const DS_CHECK = process.env.DS_CHECK_UNDER_TEST ?? join(ROOT, "bin", "ds-check.mjs");
const RULES = "skills/dsiab/references/rules.md";
const ANTIGRAVITY_LIMIT = 24_000;

const SHIPPED = [
  "dist",
  "LICENSE",
  "THIRD-PARTY-NOTICES",
  "CHANGELOG.md",
  "docs/GUIDELINES.md",
  "docs/AGENT-SETUP.md",
  "docs/REFERENCES.md",
  "src/foundations/consumerRules.mjs",
  "skills/dsiab",
  "skills/design-system-steward",
  "bin/dsiab.mjs",
  "bin/docs-url.mjs",
  "bin/dsiab-init.mjs",
  "bin/ds-check.mjs",
];

/** The seven files of the init contract, and the package file each one copies. */
const SKILL_COPIES: Record<string, string> = {
  ".agents/skills/dsiab/SKILL.md": "skills/dsiab/SKILL.md",
  ".claude/skills/dsiab/SKILL.md": "skills/dsiab/SKILL.md",
  ".agents/skills/design-system-steward/SKILL.md": "skills/design-system-steward/SKILL.md",
};
const RULES_COPIES = ["AGENTS.md", ".agents/skills/dsiab/references/rules.md", ".claude/skills/dsiab/references/rules.md"];
const AGENT = ".claude/agents/design-system-steward.md";
const INIT_FILES = [...Object.keys(SKILL_COPIES), ...RULES_COPIES, AGENT].sort();

function init(dir: string, ...flags: string[]) {
  return execFileSync("node", [DS_CHECK, "--init", dir, ...flags], { encoding: "utf8" });
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => relative(dir, join(e.parentPath, e.name)).split("\\").join("/"))
    .sort();
}

function inTemp(label: string, body: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), `ds-agent-layer-${label}-`));
  try {
    body(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const frontmatterOf = (text: string) => /^---\n([\s\S]*?)\n---\n/.exec(text);

test("package.json files ships exactly the contract list, and every entry exists ([[agent-files-and-docs-layout]])", () => {
  const files: string[] = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).files;
  expect(files, "files[] must be exactly the shipped list in [[agent-files-and-docs-layout]]").toEqual(SHIPPED);
  for (const f of files.filter((f) => f !== "dist")) {
    expect(existsSync(join(ROOT, f)), `files[] ships \`${f}\`, which does not exist`).toBe(true);
  }
});

test("--init writes the seven marked files and no tool file, hook or settings file ([[agent-files-and-docs-layout]])", () => {
  inTemp("empty", (dir) => {
    const out = init(dir);
    expect(filesUnder(dir), "--init writes exactly the seven files of the [[agent-files-and-docs-layout]] contract").toEqual(INIT_FILES);
    for (const f of INIT_FILES) {
      const text = readFileSync(join(dir, f), "utf8");
      const fm = frontmatterOf(text);
      const marked = fm ? /^\s+dsiab-managed: "true"$/m.test(fm[1]) : /^<!--.*dsiab-managed.*-->$/.test(text.split("\n")[0]);
      expect(marked, `${f} carries the dsiab-managed marker where --init puts it ([[agent-files-and-docs-layout]])`).toBe(true);
    }
    for (const absent of ["CLAUDE.md", "GEMINI.md", ".claude/hooks", ".claude/settings.json", ".github", ".codex", ".gemini"]) {
      expect(existsSync(join(dir, absent)), `--init writes no ${absent} ([[agent-files-and-docs-layout]])`).toBe(false);
    }
    expect(out, "the report names the guide the user's agent reads next").toContain("node_modules/dsiab/docs/AGENT-SETUP.md");
  });
});

test("--init copies the skills byte for byte and the rules under the marker line ([[agent-files-and-docs-layout]])", () => {
  inTemp("copies", (dir) => {
    init(dir);
    for (const [copy, source] of Object.entries(SKILL_COPIES)) {
      expect(readFileSync(join(dir, copy)).equals(readFileSync(join(ROOT, source))), `${copy} is byte-identical to ${source}`).toBe(true);
    }
    const rules = readFileSync(join(ROOT, RULES), "utf8");
    for (const copy of RULES_COPIES) {
      const text = readFileSync(join(dir, copy), "utf8");
      const [first, blank, ...rest] = text.split("\n");
      expect(first, `${copy} opens on the marker line`).toMatch(/^<!--.*dsiab-managed.*-->$/);
      expect(blank, `${copy} has one blank line after the marker`).toBe("");
      expect(rest.join("\n"), `${copy} carries ${RULES} byte for byte under the marker line`).toBe(rules);
    }
    const skill = readFileSync(join(ROOT, "skills/design-system-steward/SKILL.md"), "utf8");
    const agent = readFileSync(join(dir, AGENT), "utf8");
    const agentFm = frontmatterOf(agent);
    const skillFm = frontmatterOf(skill);
    expect(agentFm && skillFm, "both the skill and the agent open on frontmatter").toBeTruthy();
    expect(agent.slice(agentFm![0].length), `${AGENT} carries the skill body byte for byte`).toBe(skill.slice(skillFm![0].length));
    expect(agentFm![1], `${AGENT} names the agent`).toMatch(/^name: design-system-steward$/m);
    expect(agentFm![1], `${AGENT} carries the Claude Code tools line`).toMatch(/^tools: .*\bRead\b/m);
    expect(agentFm![1], `${AGENT} runs on the session's model`).toMatch(/^model: inherit$/m);
  });
});

test("--init leaves an existing .claude/settings.json byte-identical ([[agent-files-and-docs-layout]])", () => {
  inTemp("settings", (dir) => {
    mkdirSync(join(dir, ".claude"), { recursive: true });
    const before = `${JSON.stringify({ permissions: { allow: ["Bash(ls:*)"] }, theme: "dark" }, null, 2)}\n`;
    writeFileSync(join(dir, ".claude", "settings.json"), before);
    init(dir);
    expect(readFileSync(join(dir, ".claude", "settings.json"), "utf8"), "--init edits no settings file ([[agent-files-and-docs-layout]])").toBe(before);
    expect(existsSync(join(dir, ".claude", "hooks")), "--init writes no .claude/hooks/ ([[agent-files-and-docs-layout]])").toBe(false);
  });
});

test("G1: an unmarked AGENTS.md stays byte-identical after --init --force ([[agent-files-and-docs-layout]])", () => {
  inTemp("g1", (dir) => {
    const mine = "# Our own agent rules\n\nShip small changes.\n";
    writeFileSync(join(dir, "AGENTS.md"), mine);
    const out = init(dir, "--force");
    expect(readFileSync(join(dir, "AGENTS.md"), "utf8"), "a consumer's AGENTS.md without the marker is YOURS and never replaced, --force included ([[agent-files-and-docs-layout]])").toBe(mine);
    expect(out, "the report lists the consumer's AGENTS.md under YOURS").toMatch(/^YOURS[^\n]*\n {2}AGENTS\.md$/m);
    expect(out, "the report prints the import line that reaches the rules").toContain(`@node_modules/dsiab/${RULES}`);
  });
});

test("G2: a marked but edited AGENTS.md is kept without --force and replaced with it ([[agent-files-and-docs-layout]])", () => {
  inTemp("g2", (dir) => {
    init(dir);
    const fresh = readFileSync(join(dir, "AGENTS.md"), "utf8");
    const edited = `${fresh}\nA local edit.\n`;
    writeFileSync(join(dir, "AGENTS.md"), edited);
    const kept = init(dir);
    expect(readFileSync(join(dir, "AGENTS.md"), "utf8"), "without --force, the package's edited copy is KEPT ([[agent-files-and-docs-layout]])").toBe(edited);
    expect(kept, "the report lists it under KEPT").toMatch(/^KEPT[\s\S]*?\n {2}AGENTS\.md$/m);
    init(dir, "--force");
    expect(readFileSync(join(dir, "AGENTS.md"), "utf8"), "with --force, the package's copy replaces the edited one ([[agent-files-and-docs-layout]])").toBe(fresh);
  });
});

test("G3: the AGENTS.md --init writes stays under Antigravity's 24,000-byte rule limit ([[agent-files-and-docs-layout]])", () => {
  inTemp("g3", (dir) => {
    init(dir);
    const bytes = readFileSync(join(dir, "AGENTS.md")).length;
    expect(bytes, `rules.md plus the marker line is ${bytes} bytes, and Antigravity CLI truncates a rule file above ${ANTIGRAVITY_LIMIT}`).toBeLessThan(ANTIGRAVITY_LIMIT);
  });
});
