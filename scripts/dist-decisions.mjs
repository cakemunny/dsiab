#!/usr/bin/env node
/**
 * The consumer ledger, `dist/DECISIONS.md`.
 *
 * -----------------------------------------------------------------------------
 * WHAT THIS IS
 * -----------------------------------------------------------------------------
 * `docs/DECISIONS.md` is the ruling ledger: the entries that say why the system
 * is the way it is. The shipped documents cite its rulings by name constantly.
 * `docs/GUIDELINES.md` points at it for the rulings behind its rules, and the
 * consumer rules (`skills/dsiab/references/rules.md`) say to cite a ruling's name
 * rather than restate the entry. So the package ships a copy.
 *
 * THE LEDGER IS CLEAN AT ITS SOURCE, AND THIS FILE NO LONGER REDACTS.
 * Until 2026-09-24 this script removed private paths, pointers into the
 * maintainer's working documents, reviewers that do not ship, internal commit
 * references and plan clauses at pack time. The public repository carries
 * `docs/DECISIONS.md` verbatim, so pack time was the wrong place for that: the same
 * text reached the public through the repository whatever the tarball held. The
 * scrub moved to the source.
 *
 * WHAT IS LEFT is a table of rewrites for passages that are TRUE in the repository
 * and WRONG for a package reader, and today it holds no record. It held four until
 * the [[ruling-shape]] rewrite of 2026-10-01, which wrote each of those passages
 * again at the source for both readers: [[component-registry]] gained an "In the
 * package." part on the projected `registry.json`, [[system-wrapper-layer]] says the
 * wrapper directory is where the wrappers live "in the repository", and the `Text`
 * and `Overlay` rulings name "the package's public entry point" where they named
 * `src/index.ts`. The old wording survives only in Evidence parts, which this
 * script removes, so the four records matched text no package reader ever saw.
 * Everything else is copied unchanged.
 *
 * THE PORTING LINEAGE STAYS. `THIRD-PARTY-NOTICES`
 * ships in `files[]` and names the derived-from library and its copyright holder,
 * because MIT requires the attribution. The upstream commit pins that
 * [[catalog-as-specification]] mandates name public commits, so they stay too. Since
 * [[package-licence]] the per-file headers cite four
 * upstream commits, and section 1 of `THIRD-PARTY-NOTICES` lists all four with
 * their full hashes. `src/` paths stay because they are
 * provenance, and the ledger's own opening paragraph tells a reader to read them
 * that way.
 *
 * THE EVIDENCE PART IS THE ONE BLOCK REMOVED ([[ruling-shape]]). A ruling in that
 * shape ends in an Evidence part: a `**Evidence.**` line and a block quote of
 * every earlier version of the ruling. Contributors read it in the repository. A package
 * reader gets the ruling without it, the same way the Decisions page shows it.
 *
 * -----------------------------------------------------------------------------
 * WHY AN ORDERED TABLE THAT THROWS
 * -----------------------------------------------------------------------------
 * Same posture as `scripts/dist-registry.mjs`. Every record carries the number of
 * sites it MUST consume. A source edit that moves a sentence turns into a failed
 * build with the record named, not a rewrite that silently stops happening.
 *
 * THE RECORDS RUN AFTER THE EVIDENCE PARTS ARE REMOVED. A record that matches only
 * a quoted earlier version changes nothing a reader sees, and the count cannot
 * tell, because the quote still supplies the site. Running on the stripped text
 * makes that record fail the build like any other stale record.
 *
 * The build also throws when the SOURCE carries a banned term. That is the
 * scrub-at-source invariant, and `src/foundations/dist-decisions.node-check.ts`
 * asserts it in the guard lane as well, so the failure names the term in both places.
 *
 * NO WRITE ON IMPORT. The write happens only under `isEntryPoint()`, so the guard
 * that checks this artifact cannot regenerate its own subject.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { readPrivateTerms } from "./private-terms.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const SOURCE_PATH = resolve(ROOT, "docs/DECISIONS.md");
export const OUT_PATH = resolve(ROOT, "dist/DECISIONS.md");

/**
 * Ordered stages. `expect` is the number of sites the record MUST consume. `0` is
 * never valid: a record that matches nothing is stale or mistranscribed, and both
 * should stop the build.
 */
const STAGES = [
  {
    name: "passages that are wrong for a package reader",
    why:
      "A passage that describes a file the package reader holds a DIFFERENT version of, or tells them to " +
      "read one the tarball does not carry. Fix it at the source first, as the 2026-10-01 rewrite did; a " +
      "record here is for a passage that must stay repository-only in docs/DECISIONS.md.",
    records: [],
  },
];

/** Terms the SOURCE ledger must not carry, and so the projection cannot
 *  carry either. The list is the specification: a new site is fixed in
 *  `docs/DECISIONS.md`, never excused here.
 *
 *  Deliberately NOT here: `src/` (provenance the ledger's opening paragraph
 *  licenses), the upstream library's name and its public commit pins, `88c95e4`
 *  among them (THIRD-PARTY-NOTICES ships the attribution and lists every pin, and
 *  [[catalog-as-specification]] mandates the pins), `dist-docs/` (a real generated
 *  directory, which is why `docs/` is anchored to a path-segment start), and a
 *  `/docs/` segment inside a URL or a deeper path, such as
 *  `https://code.claude.com/docs/en/memory`, which names another site's folder
 *  and not this repository's.
 *
 *  THE `docs/` ROW BANS A PATH THE PUBLIC REPOSITORY LACKS, NOT THE FOLDER
 *  ([[agent-files-and-docs-layout]]). Until 2026-10-01 `docs/` held the
 *  maintainer's private working documents, so any `docs/` path pointed somewhere
 *  a reader could not follow. Since [[agent-files-and-docs-layout]] it is the
 *  public documentation folder, and the ledger names it and its files. The
 *  row therefore allows the bare folder and the four documents it holds, and
 *  still reports any other path under it, because no other path under `docs/`
 *  exists in the repository or the package. A new public document in `docs/`
 *  joins `PUBLIC_DOCS` in the same change that adds it.
 *
 *  The generic rows live here. The names of private review tools and internal
 *  commit ids live in `.private-terms.json` (see `scripts/private-terms.mjs`),
 *  because naming them in a public guard would publish them. Its `banned` rows
 *  append after the generic rows when the file is present. */
export const PUBLIC_DOCS = ["GUIDELINES.md", "DECISIONS.md", "REFERENCES.md", "AGENT-SETUP.md"];
const PUBLIC_DOCS_ALT = PUBLIC_DOCS.map((f) => f.replace(/[.-]/g, "\\$&")).join("|");

export const GENERIC_BANNED = [
  {
    term: "docs/ (path the public repository lacks)",
    re: new RegExp(`(?<![A-Za-z0-9/-])docs\\/(?!(?:${PUBLIC_DOCS_ALT})(?![A-Za-z0-9_.-]))(?=[A-Za-z0-9_.-])`, "g"),
  },
  { term: "~/ (private home path)", re: /~\//g },
  { term: "/Users/", re: /\/Users\//g },
  { term: "/Volumes/", re: /\/Volumes\//g },
  { term: "worktree-", re: /worktree-/g },
];

/** The private rows, each with the sample sentence its REVERSE arm plants. */
export const PRIVATE_BANNED = readPrivateTerms().banned.map(({ term, pattern, planted }) => ({
  term,
  re: new RegExp(pattern, "g"),
  planted,
}));

export const BANNED = [...GENERIC_BANNED, ...PRIVATE_BANNED];

/** Every banned term the text carries, with its count. Pure. */
export function bannedIn(text) {
  return BANNED.map(({ term, re }) => ({ term, count: (text.match(re) || []).length })).filter((l) => l.count > 0);
}

/** An Evidence part: its label line, then every blank or block-quote line after it ([[ruling-shape]]). */
export const EVIDENCE_PART = /^\*\*Evidence\.\*\*[^\n]*\n(?:[ \t]*\n|>[^\n]*(?:\n|$))*/gm;

/** The text with every Evidence part removed, and how many there were. Pure. */
export function stripEvidence(text) {
  let parts = 0;
  const stripped = text.replace(EVIDENCE_PART, () => {
    parts += 1;
    return "";
  });
  return { text: stripped, parts };
}

/**
 * Project the ledger onto the consumer copy. Pure: no reads, no writes, no clock.
 *
 * @param {string} source contents of docs/DECISIONS.md
 * @returns {{ text: string, applied: Array<{id: string, sites: number}> }}
 */
export function buildDistDecisions(source) {
  const dirty = bannedIn(source);
  if (dirty.length) {
    throw new Error(
      `dist-decisions: docs/DECISIONS.md carries ${dirty.length} banned term(s): ` +
        `${dirty.map((l) => `${l.term} ×${l.count}`).join(", ")}. The ledger is scrubbed at its source, ` +
        `because the public repository carries it verbatim. Rewrite the sentence in docs/DECISIONS.md, keeping ` +
        `the ruling's substance. Do not add a redaction record here.`,
    );
  }

  const evidence = stripEvidence(source);
  let text = evidence.text;
  const applied = [];

  for (const stage of STAGES) {
    for (const record of stage.records) {
      const { id, pattern, replacement, expect } = record;
      let sites = 0;
      let index = text.indexOf(pattern);
      while (index !== -1) {
        sites += 1;
        text = text.slice(0, index) + replacement + text.slice(index + pattern.length);
        index = text.indexOf(pattern, index + replacement.length);
      }

      if (sites !== expect) {
        throw new Error(
          `dist-decisions: record ${id} (stage "${stage.name}") consumed ${sites} sites outside Evidence ` +
            `parts, expected ${expect}. docs/DECISIONS.md changed in a way this projection does not know ` +
            `about. Re-read the source around that pattern and correct the record. Do not relax the count.`,
        );
      }
      applied.push({ id, sites });
    }
  }

  const leaks = bannedIn(text);
  if (leaks.length) {
    throw new Error(
      `dist-decisions: a rewrite introduced ${leaks.length} banned term(s): ` +
        `${leaks.map((l) => `${l.term} ×${l.count}`).join(", ")}. Fix the record's replacement text.`,
    );
  }

  text = text.replace(/ +$/gm, "");

  return { text, applied, evidenceParts: evidence.parts };
}

/** True when this module is the process entry point rather than an import. */
function isEntryPoint() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isEntryPoint()) {
  const source = readFileSync(SOURCE_PATH, "utf8");
  const { text, applied, evidenceParts } = buildDistDecisions(source);
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, text);
  const sites = applied.reduce((sum, a) => sum + a.sites, 0);
  console.log(
    `dist-decisions: wrote ${text.split("\n").length} lines ` +
      `(${applied.length} records, ${sites} sites rewritten, ${evidenceParts} Evidence parts removed) -> ${OUT_PATH}`,
  );
}
