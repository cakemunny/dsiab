/* =============================================================================
   dist-decisions.node-check.ts — THE LEDGER IS CLEAN AT ITS SOURCE
   -----------------------------------------------------------------------------
   `dist/DECISIONS.md` is the consumer copy of `docs/DECISIONS.md`, built by
   `scripts/dist-decisions.mjs`. The shipped documents cite the ledger's rulings
   by name constantly, so the package ships it.

   THE INVARIANT MOVED ON 2026-09-24. The projection
   used to redact at pack time: private paths, pointers into the maintainer's
   working documents, reviewers that do not ship, internal commit references and
   plan clauses. The public repository carries `docs/DECISIONS.md` verbatim, so a
   pack-time redaction protected the tarball and left the same text public in
   the repository. The scrub moved to the source. This guard now asserts that the
   SOURCE carries no banned term, which covers the repository, the Storybook
   Decisions page (it imports the raw file) and the tarball at once.

   THE FIVE ARMS, because they fail differently:

     SOURCE CLEAN — `docs/DECISIONS.md` carries no term in `BANNED`. Catches a new
       sentence that names a private path, a working document, a reviewer that
       does not ship or an internal commit. The fix is always in the ledger,
       with the ruling's substance kept, never a redaction record.
     REVERSE — the scan can still go red. Each banned term is planted in an
       in-memory copy of the source and the scan must report it. Without this
       arm a regex that stopped matching would pass SOURCE CLEAN vacuously. It
       also pins the boundaries the list draws on purpose: `dist-docs/` is a
       real generated directory and is not a pointer, the upstream commit pins
       that [[catalog-as-specification]] mandates are public attribution
       ([[package-licence]]), and the public documents under `docs/` are real
       paths since [[agent-files-and-docs-layout]] moved the private folder out
       of it.
     DECLARED — the rewrite table still consumes exactly the sites it claims.
       `buildDistDecisions` throws with the record named when a count drifts.
     ENTRY-COMPLETE — the projection drops no `### name` entry heading, because
       every `[name](#name)` link in the ledger resolves inside this same
       document.
     EVIDENCE OUT — the package copy carries no Evidence part
       ([[ruling-shape]]). A planted ruling proves the strip removes its
       Evidence part and keeps every other part and the ruling after it, so a
       pattern that stopped matching fails here and not silently in the
       tarball.

   NO WRITE ON IMPORT. `scripts/dist-decisions.mjs` writes only when it is the
   process entry point, so importing it here cannot regenerate the artifact this
   file reasons about.
   ============================================================================= */
import { readFileSync } from "node:fs";
import { test, expect } from "vitest";
import { buildDistDecisions, bannedIn, stripEvidence, BANNED, PRIVATE_BANNED, SOURCE_PATH } from "../../scripts/dist-decisions.mjs";

const source: string = readFileSync(SOURCE_PATH, "utf8");

type Leak = { term: string; count: number };

/* SOURCE CLEAN. The scrub-at-source invariant. */
test("the source ledger carries no banned term", () => {
  const leaks: Leak[] = bannedIn(source);
  expect(
    leaks,
    leaks.length
      ? `docs/DECISIONS.md carries ${leaks.map((l) => `${l.term} ×${l.count}`).join(", ")}. The public repository ` +
          `carries this file verbatim, so rewrite the sentence in the ledger and keep the ruling's ` +
          `substance. Do not narrow BANNED: the term list is the specification, not the escape hatch.`
      : undefined,
  ).toEqual([]);
});

/* REVERSE. One planted sample per banned term, keyed by the term's label. The
   arm fails when a term has no sample, so BANNED cannot grow a term this arm
   never proves. The generic samples live here. The private rows come from
   `.private-terms.json` with their own samples, so this arm proves every row
   when the file is present and the generic rows alone in a clone without it. */
const PLANTED: Record<string, string> = {
  "docs/ (path the public repository lacks)": "See `docs/plans/2026-01-01-example.md` for the wave.",
  "~/ (private home path)": "Kept in `~/Notes/example.md`.",
  "/Users/": "Measured at /Users/example/project.",
  "/Volumes/": "Measured at /Volumes/Data/project.",
  "worktree-": "the .worktree-port file",
  ...Object.fromEntries(
    PRIVATE_BANNED.map((row: { term: string; planted: string }) => [row.term, row.planted]),
  ),
};

test("the scan reports every banned term planted in a copy of the source", () => {
  const unproven = BANNED.map((b: { term: string }) => b.term).filter((term: string) => !(term in PLANTED));
  expect(unproven, `BANNED has term(s) with no planted sample in this file: ${unproven.join(", ")}`).toEqual([]);

  const missed = Object.entries(PLANTED)
    .filter(([term, sample]) => {
      const copy = `${source}\n\n### planted-sample\n\n**Planted.** ${sample}\n`;
      return !bannedIn(copy).some((l: Leak) => l.term === term);
    })
    .map(([term]) => term);
  expect(missed, `the scan no longer reports: ${missed.join(", ")}`).toEqual([]);
});

test("the scan leaves the generated docs directory, the public docs, a URL and the upstream pin alone", () => {
  const sample =
    "**Planted.** Built into `dist-docs/`, lifted @ `88c95e4`. " +
    "The public folder `docs/` holds " +
    "`docs/GUIDELINES.md`, `docs/DECISIONS.md`, `docs/REFERENCES.md` and `docs/AGENT-SETUP.md`. " +
    "Source: https://code.claude.com/docs/en/memory#agents-md.";
  expect(bannedIn(sample)).toEqual([]);
});

test("the scan reports a docs path that only shares a prefix with a public document", () => {
  const sample = "**Planted.** Drafted in `docs/GUIDELINES.md.draft` and `docs/DECISIONS-old.md`.";
  expect(bannedIn(sample)).toEqual([{ term: "docs/ (path the public repository lacks)", count: 2 }]);
});

/* DECLARED. A clean call IS the assertion: `buildDistDecisions` throws when the
   source is dirty or a record's site count drifts, and the message names both. */
test("the ledger projection still matches the source it was written against", () => {
  expect(() => buildDistDecisions(source)).not.toThrow();
});

/* ENTRY-COMPLETE. Rewrite within an entry, never drop one. Every `[name](#name)`
   link in the ledger resolves to a `### name` heading in this same document, so
   a dropped heading breaks every link that points at it. */
test("every ledger entry survives the projection", () => {
  const ENTRY = /^### ([a-z0-9]+(?:-[a-z0-9]+)*)$/gm;
  const before = [...source.matchAll(ENTRY)].map((m) => m[1]);
  const { text } = buildDistDecisions(source);
  const after = new Set([...text.matchAll(ENTRY)].map((m) => m[1]));
  const dropped = before.filter((name) => !after.has(name));

  expect(before.length, "no `### name` entry headings were found in the source, so the entry pattern has drifted").toBeGreaterThan(100);
  expect(
    dropped,
    `the projection dropped ${dropped.length} entr(ies): ${dropped.join(", ")}. Rewrite WITHIN an ` +
      `entry and never remove one, because every [name](#name) link to it resolves inside this same document.`,
  ).toEqual([]);
});

/* EVIDENCE OUT. The Evidence part of a ruling in the [[ruling-shape]] form stays in
   the repository and leaves the package copy. The planted ruling has a part on
   each side of it, so the arm fails both when the strip misses the quote and when
   it eats too much. */
test("the package copy carries no Evidence part, and the strip removes exactly that part", () => {
  const planted = [
    "### planted-ruling",
    "",
    "**Tags.** `DOCUMENTATION`. **Ruled.** 2026-10-01.",
    "",
    "**A planted ruling.**",
    "",
    "**Status.** Ruled 2026-10-01.",
    "",
    "**Evidence.** The entry as first written:",
    "",
    "> **A planted ruling (2026-10-01).** Its first line.",
    "> Its second line.",
    "",
    "### next-ruling",
    "",
    "**Tags.** `DOCUMENTATION`. **Ruled.** 2026-10-01.",
    "",
    "**The next ruling.** It stays.",
    "",
  ].join("\n");
  const { text, parts } = stripEvidence(planted);
  expect(parts).toBe(1);
  expect(text).toBe(
    [
      "### planted-ruling",
      "",
      "**Tags.** `DOCUMENTATION`. **Ruled.** 2026-10-01.",
      "",
      "**A planted ruling.**",
      "",
      "**Status.** Ruled 2026-10-01.",
      "",
      "### next-ruling",
      "",
      "**Tags.** `DOCUMENTATION`. **Ruled.** 2026-10-01.",
      "",
      "**The next ruling.** It stays.",
      "",
    ].join("\n"),
  );

  const shipped = buildDistDecisions(source).text;
  expect(shipped, "an Evidence part reached dist/DECISIONS.md").not.toMatch(/^\*\*Evidence\.\*\*/m);
  expect(shipped, "a quoted first version reached dist/DECISIONS.md").not.toMatch(/^> /m);
});
