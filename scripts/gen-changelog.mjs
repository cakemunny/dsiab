#!/usr/bin/env node
/**
 * Changelog generator — the "mechanism that writes a clearer changelog file".
 *
 * A Storybook story cannot run `git` at render time, so this prebuild step turns the commit
 * history into a committed, reviewable data file that the Foundations/Changelog story imports
 * (the same self-syncing pattern the Decisions page uses with DECISIONS.md?raw).
 *
 * Curation (per review): a changelog answers "what changed that a CONSUMER of the system can
 * perceive or act on?" — not "what commits happened." So we keep only consumer-facing
 * conventional-commit types (feat, fix) plus anything breaking, drop internal churn
 * (docs/chore/refactor/test/build/ci/style/perf-noise), and strip the machine `type(scope):`
 * prefix from each summary. The generated file is the human gate: it lands in a PR and is
 * reviewed like any other source.
 *
 * TWO OUTPUTS, ONE PASS, BECAUSE THEY ANSWER THE SAME QUESTION FOR DIFFERENT READERS:
 *   - src/foundations/changelog.generated.ts — the typed module the Foundations/Changelog story
 *     imports. Stays in the repo; a consumer who installed the package never sees it.
 *   - CHANGELOG.md — the file a consumer reads. It ships in the tarball, so `what changed
 *     between the version I had and the version I just installed` has an answer that does not
 *     require cloning the repo. Without it, version N to N+1 is invisible to them.
 *
 * SECTIONS COME FROM RELEASE TAGS, AND NOTHING ELSE. A tag whose name is version-shaped
 * (`1.2.3`, `1.2.3-rc.1`, or the same with a leading `v`) opens a section, and every commit newer
 * than it and older than the next such tag lands under it. Commits newer than every release tag
 * land under `Unreleased`. Release tags are the bare version with no `v`, for example `0.9.0-rc.1`.
 * A tag that is not version-shaped, such as the `pre-rebase-8afa67c` safety marker, opens no
 * section, and the version pattern excludes it by construction rather than by a name list.
 *
 * SUMMARIES PASS THROUGH A PUBLIC TERM MAP (`PUBLIC_TERMS` below). Commit subjects were written
 * for the maintainer and name private review tools and a private review step. Both outputs are
 * public, so each summary gets a fixed, ordered set of literal rewrites before it is written: the
 * design-review agent and the code-review service become "design review" and "code review", and
 * the review-round phrases in the rows below become plain review rounds. The rows that name the private review
 * tools live in `.private-terms.json` (see `scripts/private-terms.mjs`), because naming them here
 * would publish them. They run first, before the generic rows. The map is deliberately small. A
 * new private term in a commit subject needs a new row in that file.
 *
 * Usage:  node scripts/gen-changelog.mjs [<git-ref>]   (default ref: main)
 * Output: src/foundations/changelog.generated.ts  (typed module — no tsconfig JSON flag needed)
 *         CHANGELOG.md                            (ships to consumers via package.json files[])
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readPrivateTerms } from "./private-terms.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REF = process.argv[2] || "main";
const OUT = resolve(ROOT, "src/foundations/changelog.generated.ts");
const OUT_MD = resolve(ROOT, "CHANGELOG.md");

// A commit summary cites a ruling as [[name]]. Only a name with a `### name` entry in the ledger
// becomes a cross-link, so a mistyped or retired name in a commit subject stays plain text.
const DECISION_NAMES = new Set(
  [...readFileSync(resolve(ROOT, "docs/DECISIONS.md"), "utf8").matchAll(/^### ([a-z0-9]+(?:-[a-z0-9]+)+)$/gm)].map(
    (m) => m[1],
  ),
);

/* The public term map. Each row is [pattern, replacement], applied in order to every summary.
   The private rows come first, from `.private-terms.json`, compiled with the `gi` flags. Order
   matters: in that file the "X review" rows run before the bare "X" rows, so the tool name
   followed by "review" becomes "design review" and not "design review review". Every pattern is
   a literal phrase, so the output is deterministic and a reader can predict it from the subject. */
const PUBLIC_TERMS = [
  ...readPrivateTerms().changelogTerms.map(([pattern, replacement]) => [new RegExp(pattern, "gi"), replacement]),
  [/\bowner's pre-polish list\b/g, "pre-polish review list"],
  [/\bowner review\b/g, "review"],
  [/\bowner round\b/g, "review round"],
  [/\bowner rulings\b/g, "rulings"],
  [/\(owner\)/g, "(review)"],
];

function publicSummary(summary) {
  return PUBLIC_TERMS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), summary);
}

// Consumer-facing types survive; everything else is internal churn and is dropped.
const KEEP = new Set(["feat", "fix"]);
const US = "\x1f"; // field separator
const RS = "\x1e"; // record separator (survives multi-line bodies)

const raw = execFileSync(
  "git",
  ["log", REF, "--no-merges", "--date=short", `--format=%H${US}%ad${US}%s${US}%b${RS}`],
  { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
);

const CONVENTIONAL = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;

const entries = [];
/* Every commit hash in log order (newest first), kept or dropped. Release-tag placement needs
   the full walk: a tag can sit on a `chore:` commit the curation filter throws away, and a
   sparse index built only from kept entries would put the section boundary in the wrong place. */
const order = [];
for (const record of raw.split(RS)) {
  const line = record.trim();
  if (!line) continue;
  const [hash, date, subject, body = ""] = line.split(US);
  order.push(hash);
  const m = subject.match(CONVENTIONAL);
  if (!m) continue; // non-conventional subject → not a changelog entry
  const [, type, scope, bang, summary] = m;
  const breaking = Boolean(bang) || /BREAKING[ -]CHANGE/.test(body);
  if (!KEEP.has(type) && !breaking) continue;
  // Rulings cited in the summary as [[name]] become cross-links to the Decisions page.
  const refs = [...summary.matchAll(/\[\[([a-z0-9]+(?:-[a-z0-9]+)+)\]\]/g)]
    .map((r) => r[1])
    .filter((name) => DECISION_NAMES.has(name));
  entries.push({
    date,
    type: breaking ? "breaking" : type,
    scope: scope ?? null,
    summary: publicSummary(summary.trim()),
    hash: hash.slice(0, 7),
    refs: [...new Set(refs)],
    index: order.length - 1,
  });
}

// git log is already newest-first; keep that order (a changelog reads newest → oldest).

/* ---------------------------------------------------------------------------
   OUTPUT 1 — the typed module the Foundations/Changelog story imports.
   `index` is a grouping aid for the markdown pass below and is deliberately NOT
   part of the published shape: the story renders a flat newest-first list, and a
   field it never reads would be one more thing to keep true.
   --------------------------------------------------------------------------- */
const published = entries.map(({ index: _index, ...entry }) => entry);

const module = `// AUTO-GENERATED by scripts/gen-changelog.mjs — do not edit by hand.
// Refresh with: npm run changelog
// A changelog keeps only consumer-facing changes (feat/fix/breaking); internal churn is filtered out.
export type ChangelogEntry = {
  date: string;
  type: "feat" | "fix" | "breaking";
  scope: string | null;
  summary: string;
  hash: string;
  refs: string[];
};

export const CHANGELOG: { generatedFrom: string; kept: number; entries: ChangelogEntry[] } = ${JSON.stringify(
  { generatedFrom: REF, kept: published.length, entries: published },
  null,
  2,
)};
`;

writeFileSync(OUT, module);
console.log(`changelog: wrote ${published.length} entries from ${REF} -> ${OUT}`);

/* ---------------------------------------------------------------------------
   OUTPUT 2 — CHANGELOG.md, the file a consumer reads.

   Release tags are the ONLY thing that opens a section. A tag counts as a release
   when its name is version-shaped. A safety marker such as `pre-rebase-8afa67c` is
   excluded by that pattern rather than by a name blocklist, so a second safety
   marker tomorrow is excluded too without anybody remembering to.

   Placement, stated once because the off-by-one is easy: `order` is newest-first,
   so a LARGER index is an OLDER commit. A commit at index i shipped in the release
   whose tag sits at the largest index t where t <= i. Nothing satisfies that for a
   commit newer than every release, which is exactly the Unreleased set.
   --------------------------------------------------------------------------- */
const RELEASE_TAG = /^v?\d+\.\d+\.\d+/;

function releaseTags() {
  // `*objectname` is the dereferenced commit of an ANNOTATED tag and is empty for a
  // lightweight one, so the fallback covers both kinds.
  const listed = execFileSync(
    "git",
    ["tag", "--list", "--format=%(refname:short)" + US + "%(objectname)" + US + "%(*objectname)"],
    { encoding: "utf8" },
  );
  const position = new Map(order.map((hash, i) => [hash, i]));
  return listed
    .split("\n")
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const [name, objectName, derefName = ""] = row.split(US);
      return { name, hash: derefName || objectName };
    })
    .filter((tag) => RELEASE_TAG.test(tag.name))
    // A tag on a commit that is not an ancestor of REF has no position in this walk.
    // Dropping it is correct: it did not ship on this line of history.
    .filter((tag) => position.has(tag.hash))
    .map((tag) => ({ ...tag, index: position.get(tag.hash) }))
    // Oldest release first, so the "largest t where t <= i" scan below can take the
    // first match it finds.
    .sort((a, b) => b.index - a.index);
}

const TYPE_LABEL = { breaking: "Breaking", feat: "Added", fix: "Fixed" };
const SECTION_ORDER = ["breaking", "feat", "fix"];

function sectionFor(tags, entryIndex) {
  return tags.find((tag) => tag.index <= entryIndex) ?? null;
}

function renderEntry(entry) {
  const scope = entry.scope ? `**${entry.scope}:** ` : "";
  const refs = entry.refs.length ? ` (${entry.refs.map((name) => `[[${name}]]`).join(", ")})` : "";
  return `- ${scope}${entry.summary}${refs} — \`${entry.hash}\``;
}

function renderGroup(groupEntries) {
  const lines = [];
  for (const type of SECTION_ORDER) {
    const ofType = groupEntries.filter((entry) => entry.type === type);
    if (ofType.length === 0) continue;
    lines.push(`### ${TYPE_LABEL[type]}`, "");
    for (const entry of ofType) lines.push(renderEntry(entry));
    lines.push("");
  }
  return lines;
}

const tags = releaseTags();
const grouped = new Map([["Unreleased", []]]);
for (const tag of tags) grouped.set(tag.name, []);
for (const entry of entries) {
  const tag = sectionFor(tags, entry.index);
  grouped.get(tag ? tag.name : "Unreleased").push(entry);
}

const md = [
  "# Changelog",
  "",
  "Consumer-facing changes only — features, fixes and breaking changes. Internal churn",
  "(docs, chores, refactors, tests, build and CI work) is filtered out deliberately, so this",
  "file is shorter than the commit history and answers a different question.",
  "",
  "Generated by `npm run changelog` from commit history. Do not edit by hand.",
  "",
  "A name in double square brackets is a ruling in `DECISIONS.md`, which records why a change was made.",
  "",
];

// Newest section first: Unreleased, then releases newest -> oldest.
const sectionsNewestFirst = ["Unreleased", ...[...tags].reverse().map((tag) => tag.name)];
for (const name of sectionsNewestFirst) {
  const groupEntries = grouped.get(name) ?? [];
  if (name === "Unreleased" && groupEntries.length === 0) continue;
  md.push(`## ${name}`, "");
  if (groupEntries.length === 0) {
    md.push("No consumer-facing changes.", "");
    continue;
  }
  md.push(...renderGroup(groupEntries));
}

if (tags.length === 0) {
  md.push(
    "---",
    "",
    "This package has no release tags yet, so every change above is unreleased. Once releases",
    "are tagged, each tag opens its own section here and `Unreleased` holds only what has landed",
    "since the newest one.",
    "",
  );
}

writeFileSync(OUT_MD, md.join("\n"));
console.log(
  `changelog: wrote ${entries.length} entries across ${sectionsNewestFirst.length} section(s) -> ${OUT_MD}`,
);
