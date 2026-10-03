#!/usr/bin/env node
/**
 * agents: the contributor's agent files for working IN this repository, generated from `skills/`.
 *
 * `skills/` holds the four Agent Skills as the one source: `dsiab`, `design-system-steward`,
 * `docs-steward` and `pattern-steward`. Agents read them from tool folders, so this script writes
 * the untracked copies a contributor's tools load ([[agent-files-and-docs-layout]]):
 *
 *   .agents/skills/<all four>/   every file of each skill, for agents that read .agents/skills
 *   .claude/skills/<all four>/   the same files, for Claude Code
 *   .claude/agents/<three>.md    the reviewers as Claude Code agents, built by `claudeAgentFrom`
 *                                from the table in `bin/ds-check.mjs`. docs-steward and
 *                                pattern-steward get `readonly: true` and no Write or Edit.
 *
 * A skill file carries the `dsiab-managed` marker in its frontmatter. A file without frontmatter,
 * such as `references/rules.md`, gets the marker line on top, the same as `--init` writes it. The
 * ownership rule is the one `--init` uses with `--force`: a copy that carries the marker is
 * replaced, and a file without it is the contributor's and stays as it is. Both folders are
 * git-ignored. The root `AGENTS.md`, the rules for contributors, is never touched.
 *
 * Usage:  npm run agents
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";
import { CLAUDE_AGENTS, claudeAgentFrom, isDsiabManaged, ownershipOf, withMarkerHeader } from "../bin/ds-check.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(ROOT, "skills");
const SKILL_NAMES = ["dsiab", "design-system-steward", "docs-steward", "pattern-steward"];

/** Every file of one skill, as paths relative to the skill folder. */
function filesOf(skillDir) {
  return readdirSync(skillDir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => relative(skillDir, join(e.parentPath, e.name)).split("\\").join("/"))
    .sort();
}

/** [destination relative to the repository root, bytes] for every file this script owns. */
function plan() {
  const out = [];
  for (const name of SKILL_NAMES) {
    const dir = join(SKILLS, name);
    for (const file of filesOf(dir)) {
      const text = readFileSync(join(dir, ...file.split("/")), "utf8");
      const content = isDsiabManaged(text) || !file.endsWith(".md") ? text : withMarkerHeader(text);
      for (const tool of [".agents", ".claude"]) out.push([`${tool}/skills/${name}/${file}`, content]);
    }
  }
  for (const name of Object.keys(CLAUDE_AGENTS)) {
    const skill = readFileSync(join(SKILLS, name, "SKILL.md"), "utf8");
    out.push([`.claude/agents/${name}.md`, claudeAgentFrom(skill, name)]);
  }
  return out;
}

const counts = { WROTE: 0, "ALREADY CURRENT": 0, YOURS: [] };
for (const [to, content] of plan()) {
  const dest = join(ROOT, ...to.split("/"));
  const state = ownershipOf(dest, content, true);
  if (state === "WROTE") {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, content);
    counts.WROTE++;
  } else if (state === "YOURS") counts.YOURS.push(to);
  else counts[state]++;
}

process.stdout.write(
  `agents: ${counts.WROTE} written, ${counts["ALREADY CURRENT"]} already current, ` +
    `${counts.YOURS.length} left alone because they carry no dsiab-managed marker\n`,
);
for (const to of counts.YOURS) process.stdout.write(`  YOURS  ${to}\n`);
