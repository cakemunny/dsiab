#!/usr/bin/env node
/**
 * ds-check — the rule check a CONSUMER of this design system runs over their OWN product code.
 *
 * It exists because the system is now something other teams install, and a rule nothing enforces is
 * a suggestion. A colleague — or the agent writing code for them — should get told, at the moment
 * they write it, that a line breaks a rule, in their own repo, without cloning ours.
 *
 * WHAT IT DELIBERATELY IS NOT: our authoring gate. That is the vitest suite, and a fork of this
 * system already has it (`npm test`). This ships only the rules that would be defects in a codebase
 * that had never heard of this design system — see the header of `consumerRules.mjs` for the test
 * each rule had to pass, and the reasoning for the ones left out.
 *
 * WHAT IT REFUSES TO DO: imply coverage it does not have. Every run prints its reach — the
 * extensions it read, the extensions present that it could not read, and the limits inside the
 * files it did read. A clean exit means "nothing wrong in what I read", never "your code is clean".
 *
 * IT ALSO CARRIES THE AGENT LAYER. `--init` writes the rules, the `dsiab` skill and its review agent
 * into the consumer's OWN project, because that is where their agent writes code. Unpacked in a folder
 * nobody opens, a rule the agent never reads is the same as no rule. See the ownership note above
 * `CONSUMER_FILES` for who owns which file afterwards. It installs no gate and creates or edits no
 * settings file ([[agent-files-and-docs-layout]]). `docs/AGENT-SETUP.md` in this package lists the suggested gates, and each
 * user adds them with their own agent and harness.
 *
 * Plain ESM. No dependency, no TypeScript, no vitest. It runs with nothing installed but this
 * package. It also exports the ownership marker and the Claude Code agent table, which
 * `scripts/agents.mjs` reuses, and it runs as a command only when invoked directly.
 *
 * Usage:  npx ds-check [path]          (default: the current directory)
 *         npx ds-check --init [dir]    write the agent files into a project (default: here)
 *         npx ds-check --init --force  also replace the package's copies that differ
 *         npx ds-check --help
 *         npx ds-check --rules
 *
 * Exit:   0  nothing to fix in what was read, and, for --init, the files are in place
 *         1  problems found (a violation, a rejected allowance, or a stale one)
 *         2  the command could not do its job (bad path, unknown option, a file it could not
 *            read from the package or write into the project)
 */
import { existsSync, statSync, readFileSync, writeFileSync, mkdirSync, realpathSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const RULES_MODULE = join(PACKAGE_ROOT, "src", "foundations", "consumerRules.mjs");

/** The rules document, inside this package. `--init` writes it into a consumer's project as
 *  `AGENTS.md` and beside each copy of the skill. Declared up here because `--help` names it too,
 *  and the path a reader is told to open must have exactly one definition. */
export const RULES_SOURCE = "skills/dsiab/references/rules.md";
/** The same document as a consumer reaches it once the package is installed. */
const RULES_INSTALLED = `node_modules/dsiab/${RULES_SOURCE}`;
/** The guide a consumer's agent reads once, to fit the installed files to its own tool. */
const GUIDE_INSTALLED = "node_modules/dsiab/docs/AGENT-SETUP.md";

let lib;
try {
  lib = await import(pathToFileURL(RULES_MODULE).href);
} catch (err) {
  process.stderr.write(
    `ds-check could not load its rule module.\n` +
      `  expected: ${RULES_MODULE}\n` +
      `  ${err && err.message ? err.message : err}\n` +
      `If this package was installed from a tarball, its "files" list must carry both\n` +
      `"bin" and "src/foundations/consumerRules.mjs". Report this — it is a packaging bug, not yours.\n`,
  );
  process.exit(2);
}

const { RULE_IDS, ALLOW_GRAMMAR, SCANNED_EXT, checkTree, formatReport, formatRules } = lib;

/* ---- ownership: the marker, and the Claude Code agent table --------------------------------------- */

/* WHO OWNS WHICH FILE AFTERWARDS, and the answer to "what if I edited it".
 *
 * Ownership comes from a MARKER inside the file, never from its path. Every file `--init` writes
 * carries the string `dsiab-managed`: a skill or a generated agent as `dsiab-managed: "true"` under
 * `metadata:` in its frontmatter, and a rules copy as a one-line HTML comment on its first line. Four
 * states follow, and the report names every file under one of them:
 *
 *   WROTE            the file was missing, or it was ours and differed and `--force` was given
 *   ALREADY CURRENT  the file is byte-identical to this package's copy, so nothing was written
 *   KEPT             the file carries the marker and differs. It is ours, and only `--force`
 *                    replaces it, so an edit or an older version is never lost silently
 *   YOURS            the file exists without the marker. It belongs to the consumer, and nothing
 *                    replaces it, `--force` included
 *
 * The marker is the consumer's switch: delete it from a copy and the copy is theirs from then on.
 * That is why the rules land in a file of their own rather than being APPENDED to a file the
 * consumer already has. Appended text has no owner, and one owner per file makes an upgrade one
 * write. */

/** The string that marks a file as this package's copy. */
export const MARKER = "dsiab-managed";

/** The first line of every rules copy. A skill and a generated agent carry the marker in their
 *  frontmatter instead, which has to be the first bytes of the file. */
export const MARKER_HEADER =
  `<!-- ${MARKER}: a copy of the rules in the dsiab package. \`npx ds-check --init --force\` replaces ` +
  "it. Remove this line to make the file yours, and --init never replaces it again. -->\n\n";

/** True when the file carries the marker where `--init` puts it: an HTML comment on the first line,
 *  or `dsiab-managed: "true"` inside the frontmatter. A mention anywhere else does not count, so a
 *  consumer's own file that happens to name the marker stays theirs. */
export function isDsiabManaged(text) {
  const lines = text.split(/\r?\n/);
  if (/^<!--.*\bdsiab-managed\b.*-->\s*$/.test(lines[0])) return true;
  if (lines[0] !== "---") return false;
  for (let i = 1; i < lines.length && lines[i] !== "---"; i++) {
    if (/^\s+dsiab-managed:\s*(["']?)true\1\s*$/.test(lines[i])) return true;
  }
  return false;
}

/** A rules copy: the marker line, then the document byte for byte. */
export const withMarkerHeader = (text) => MARKER_HEADER + text;

/** What `--init` does with one destination, given the bytes this package would write there. */
export function ownershipOf(dest, content, force) {
  if (!existsSync(dest)) return "WROTE";
  const current = readFileSync(dest, "utf8");
  if (current === content) return "ALREADY CURRENT";
  if (!isDsiabManaged(current)) return "YOURS";
  return force ? "WROTE" : "KEPT";
}

/** The Claude Code fields of each review agent. An Agent Skill has no `tools` or `model`, so they
 *  live here, and `claudeAgentFrom` adds them when it writes `.claude/agents/<name>.md`. The two
 *  contributor reviewers read and report, so they get no Write or Edit and `readonly: true`. */
export const CLAUDE_AGENTS = {
  "design-system-steward": { tools: "Read, Write, Edit, Grep, Glob, Bash, Skill", model: "inherit" },
  "docs-steward": { tools: "Read, Grep, Glob, Bash, Skill", model: "inherit", readonly: true },
  "pattern-steward": { tools: "Read, Grep, Glob, Bash, Skill", model: "inherit", readonly: true },
};

/** The Claude Code agent file for one skill: the skill's `name` and `description`, the Claude fields
 *  from `CLAUDE_AGENTS`, the skill's `metadata` (which carries the marker), and then the skill body
 *  byte for byte. Throws on a skill shape it does not know rather than guess. */
export function claudeAgentFrom(skillText, name) {
  const fields = CLAUDE_AGENTS[name];
  if (!fields) throw new Error(`no Claude Code fields for the agent "${name}" in CLAUDE_AGENTS`);
  const match = /^---\n([\s\S]*?)\n---\n/.exec(skillText);
  if (!match) throw new Error(`${name}: the skill has no frontmatter`);
  const blocks = new Map();
  let key = null;
  for (const line of match[1].split("\n")) {
    const top = /^([A-Za-z][\w-]*):/.exec(line);
    if (top) blocks.set((key = top[1]), [line]);
    else if (key) blocks.get(key).push(line);
  }
  for (const k of ["name", "description", "metadata"]) {
    if (!blocks.has(k)) throw new Error(`${name}: the skill frontmatter has no \`${k}\``);
  }
  if (blocks.get("name")[0] !== `name: ${name}`) throw new Error(`${name}: the skill's \`name\` is not "${name}"`);
  const out = [...blocks.get("name"), ...blocks.get("description"), `tools: ${fields.tools}`, `model: ${fields.model}`];
  if (fields.readonly) out.push("readonly: true");
  out.push(...blocks.get("metadata"));
  return `---\n${out.join("\n")}\n---\n${skillText.slice(match[0].length)}`;
}

/* ---- --init ------------------------------------------------------------------------------------ */

const SKILL_SOURCE = "skills/dsiab/SKILL.md";
const STEWARD_SOURCE = "skills/design-system-steward/SKILL.md";

/** The seven files `--init` writes, and no others. from: path inside this package. to: path inside
 *  the consumer's project. make: the bytes from the source, when they are not the source as is.
 *  what: one line, because a filename is a pointer and not an explanation.
 *
 *  `AGENTS.md` is the cross-tool standard. Codex, Cursor, GitHub Copilot, Zed, Aider, Windsurf, Devin
 *  and Jules read it natively, and Claude Code reads it from v2.1.277 when the project has no
 *  CLAUDE.md. So the rules land there once and every tool reads the same copy.
 *
 *  NOT written, and the reason stated so nobody adds it back on a hunch: CLAUDE.md, GEMINI.md,
 *  `.github/`, `.codex/` and `.gemini/` are the consumer's own files, and each tool that needs one
 *  of them is covered in `docs/AGENT-SETUP.md`. No settings file, hook or gate is written either
 *  ([[agent-files-and-docs-layout]]), because any of them would change how the consumer's tools behave. */
const CONSUMER_FILES = [
  { from: RULES_SOURCE, to: "AGENTS.md", make: withMarkerHeader,
    what: "the rules your code is held to, read natively by most agents" },
  { from: SKILL_SOURCE, to: ".agents/skills/dsiab/SKILL.md",
    what: "how to build on the system, for agents that read .agents/skills" },
  { from: RULES_SOURCE, to: ".agents/skills/dsiab/references/rules.md", make: withMarkerHeader,
    what: "the rules, beside the skill that cites them" },
  { from: STEWARD_SOURCE, to: ".agents/skills/design-system-steward/SKILL.md",
    what: "the review agent, as a skill" },
  { from: SKILL_SOURCE, to: ".claude/skills/dsiab/SKILL.md",
    what: "the same skill, for Claude Code" },
  { from: RULES_SOURCE, to: ".claude/skills/dsiab/references/rules.md", make: withMarkerHeader,
    what: "the rules, beside it" },
  { from: STEWARD_SOURCE, to: ".claude/agents/design-system-steward.md",
    make: (text) => claudeAgentFrom(text, "design-system-steward"),
    what: "the review agent, for Claude Code" },
];

function fail(message) {
  process.stderr.write(message);
  process.exit(2);
}

function initProject(dir, force) {
  const states = { WROTE: [], "ALREADY CURRENT": [], KEPT: [], YOURS: [] };

  for (const f of CONSUMER_FILES) {
    let source;
    try {
      source = readFileSync(join(PACKAGE_ROOT, ...f.from.split("/")), "utf8");
    } catch (err) {
      fail(
        `ds-check --init: could not read this package's \`${f.from}\`.\n` +
          `  ${err && err.message ? err.message : err}\n` +
          `If this package was installed from a tarball, its "files" list must carry "skills/dsiab"\n` +
          `and "skills/design-system-steward". Report this. It is a packaging bug, not yours.\n`,
      );
    }
    let content;
    try {
      content = f.make ? f.make(source) : source;
    } catch (err) {
      fail(`ds-check --init: could not build \`${f.to}\`: ${err && err.message ? err.message : err}\n`);
    }
    const dest = join(dir, ...f.to.split("/"));
    let state;
    try {
      state = ownershipOf(dest, content, force);
      if (state === "WROTE") {
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, content);
      }
    } catch (err) {
      fail(`ds-check --init: could not read or write \`${dest}\`: ${err && err.message ? err.message : err}\n`);
    }
    states[state].push(f);
  }

  /* ---- the report ---- */
  const width = Math.max(...CONSUMER_FILES.map((f) => f.to.length)) + 3;
  const out = [`ds-check --init  ${dir}`, ""];
  if (states.WROTE.length) {
    out.push("WROTE");
    for (const f of states.WROTE) out.push(`  ${f.to.padEnd(width)}${f.what}`);
    out.push("");
  }
  if (states["ALREADY CURRENT"].length) {
    out.push("ALREADY CURRENT: identical to this package's copy, left alone");
    for (const f of states["ALREADY CURRENT"]) out.push(`  ${f.to}`);
    out.push("");
  }
  if (states.KEPT.length) {
    out.push(`KEPT: this package's copy (it carries the ${MARKER} marker), and it differs.`);
    out.push("You edited it, or the package moved on. Nothing was overwritten.");
    for (const f of states.KEPT) out.push(`  ${f.to}`);
    out.push("  `npx ds-check --init --force` replaces these with this package's copies.");
    out.push("");
  }
  if (states.YOURS.length) {
    out.push(`YOURS: no ${MARKER} marker, so --init never replaces these, --force included.`);
    for (const f of states.YOURS) out.push(`  ${f.to}`);
    out.push("");
  }
  if (states.YOURS.some((f) => f.to === "AGENTS.md")) {
    out.push("YOUR AGENTS.md: untouched. To point your agent at the rules, add one of these to it.");
    out.push("  A sentence any tool follows:");
    out.push(`      Before writing UI code, read ${RULES_INSTALLED} and follow it.`);
    out.push("  Or this import line, which Claude Code and other tools that resolve @-imports inline:");
    out.push(`      @${RULES_INSTALLED}`);
    out.push("");
  }
  const claudePath = join(dir, "CLAUDE.md");
  if (existsSync(claudePath) && !readFileSync(claudePath, "utf8").includes("AGENTS.md")) {
    out.push("YOUR CLAUDE.md: untouched. Claude Code reads AGENTS.md only when a project has no");
    out.push("CLAUDE.md, so yours hides the rules from it. Add this line to your CLAUDE.md:");
    out.push("      @AGENTS.md");
    out.push("");
  }
  out.push(`AGENT SETUP  Your agent reads ${GUIDE_INSTALLED} next, to fit these files to its own tool.`);
  out.push("");
  out.push("NEXT  Run `npx ds-check` over your source. It must exit 0 before any done-claim, and it");
  out.push("      prints its own reach, so read that section rather than assuming coverage.");
  process.stdout.write(`${out.join("\n")}\n`);
  process.exit(0);
}

/* ---- the command ------------------------------------------------------------------------------ */

/** True when Node runs this file as the command (directly, through the `.bin` link npx uses, or
 *  spawned by `dsiab`), and false when another module imports it for its exports. */
const invokedDirectly = (() => {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

function main() {
  /* ---- arguments ---- */

  const argv = process.argv.slice(2);
  let target = null;
  let mode = "check";
  let force = false;

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") mode = "help";
    else if (arg === "--rules") mode = "rules";
    else if (arg === "--init") mode = "init";
    else if (arg === "--force") force = true;
    else if (arg.startsWith("-")) {
      process.stderr.write(`ds-check: unknown option \`${arg}\`. Run \`ds-check --help\`.\n`);
      process.exit(2);
    } else if (target === null) target = arg;
    else {
      process.stderr.write(`ds-check: only one path is accepted (got \`${target}\` and \`${arg}\`).\n`);
      process.exit(2);
    }
  }

  if (force && mode !== "init") {
    process.stderr.write("ds-check: `--force` belongs to `--init`; it has no meaning for a check run.\n");
    process.exit(2);
  }

  /* ---- --help / --rules ---- */

  if (mode === "help") {
    process.stdout.write(
      [
        "ds-check: check product code against the rules this design system enforces on everyone.",
        "",
        "USAGE",
        "  npx ds-check [path]          check a directory (default: .) or a single file",
        "  npx ds-check --init [dir]    write the agent files into a project (default: .)",
        "  npx ds-check --init --force  also replace the package's copies that differ",
        "  npx ds-check --rules         print the rules and the allowance grammar",
        "  npx ds-check --help",
        "",
        "EXIT CODES",
        "  0  nothing to fix in what was read, and, after --init, the files are in place",
        "  1  problems found: a violation, a rejected allowance, or a stale one",
        "  2  the command could not do its job (bad path, unknown option, a file it could not",
        "     read from the package or write into your project)",
        "",
        "--init: THE RULES, WHERE YOUR AGENT READS THEM",
        "  The rules, the dsiab skill and its review agent ship inside this package, which is a",
        "  directory nobody opens. --init copies them into the project you work in:",
        "",
        ...CONSUMER_FILES.map((f) => `      ${f.to.padEnd(50)}${f.what}`),
        "",
        "  AGENTS.md is the cross-tool standard. Codex, Cursor, GitHub Copilot, Zed, Aider and",
        "  Windsurf read it natively, and so does Claude Code from v2.1.277 when the project has no",
        "  CLAUDE.md. --init writes no CLAUDE.md, GEMINI.md, settings file, hook or gate, and nothing",
        `  under .github/, .codex/ or .gemini/. The notes for each tool, and a list of suggested`,
        `  gates, are in ${GUIDE_INSTALLED}. Your agent reads that file once.`,
        "",
        `  WHO OWNS A FILE. Every file --init writes carries the marker \`${MARKER}\`. A file with`,
        "  the marker is this package's copy: --init keeps it when it differs, and --force replaces it.",
        "  A file without the marker is yours, and --init never replaces it, --force included. Remove",
        "  the marker from a copy to make it yours. When your own AGENTS.md is in the way, --init",
        "  prints how to point it at the rules.",
        "",
        "RULES",
        formatRules(),
        "",
        `  These ${RULE_IDS.length} are here because each is a defect in ANY codebase. This system's own authoring`,
        "  rules — the 3-weight ramp, no raw hex, spacing steps — are NOT run over your code: they are",
        "  ours, and they would fire on your marketing gradient. If you forked the system, its full",
        "  vitest suite is your authoring gate; `npm test` there covers what this deliberately does not.",
        "",
        "ALLOWING A LINE ON PURPOSE",
        ...ALLOW_GRAMMAR,
        "",
        "REACH",
        `  Extensions read: ${SCANNED_EXT.join(" ")}`,
        "  Every run prints what it read and what it could not. A pass is a statement about the files",
        "  listed there, and about nothing else.",
        "",
      ].join("\n"),
    );
    process.exit(0);
  }

  if (mode === "rules") {
    process.stdout.write(
      [
        "RULES",
        formatRules({ verbose: true }),
        "",
        "ALLOWING A LINE ON PURPOSE",
        ...ALLOW_GRAMMAR,
        "",
        `Rule ids: ${RULE_IDS.join(", ")}`,
        "",
      ].join("\n"),
    );
    process.exit(0);
  }

  /* ---- --init ---- */

  if (mode === "init") {
    const dir = resolve(target ?? ".");
    if (!existsSync(dir)) fail(`ds-check --init: no such directory \`${target ?? "."}\` (resolved to ${dir}).\n`);
    if (!statSync(dir).isDirectory()) fail(`ds-check --init: \`${dir}\` is a file. --init takes the project directory.\n`);
    initProject(dir, force);
  }

  /* ---- check ---- */

  const root = resolve(target ?? ".");
  if (!existsSync(root)) {
    process.stderr.write(`ds-check: no such path \`${target ?? "."}\` (resolved to ${root}).\n`);
    process.exit(2);
  }
  let stat;
  try {
    stat = statSync(root);
  } catch (err) {
    process.stderr.write(`ds-check: cannot read \`${root}\`: ${err && err.message ? err.message : err}\n`);
    process.exit(2);
  }
  if (!stat.isDirectory() && !stat.isFile()) {
    process.stderr.write(`ds-check: \`${root}\` is neither a file nor a directory.\n`);
    process.exit(2);
  }

  let report;
  try {
    report = checkTree(root);
  } catch (err) {
    process.stderr.write(`ds-check: failed while scanning \`${root}\`: ${err && err.stack ? err.stack : err}\n`);
    process.exit(2);
  }

  process.stdout.write(`ds-check  ${root}\n\n`);
  process.stdout.write(`${formatReport(report)}\n`);
  process.exit(report.counts.failures > 0 ? 1 : 0);
}

if (invokedDirectly) main();
