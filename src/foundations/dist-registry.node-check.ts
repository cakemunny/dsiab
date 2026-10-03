/* =============================================================================
   dist-registry.node-check.ts — THE CONSUMER ROSTER CARRIES NO BUILD LOG
   -----------------------------------------------------------------------------
   `dist/registry.json` is a PROJECTION of the maintainer's `registry.json`, built
   by `scripts/dist-registry.mjs`. It exists so a consumer can ask "does this
   already exist, and what do I import?" — a question `dist/index.d.ts` cannot
   answer, because a name absent from the types could equally mean "not built" or
   "deliberately excluded".

   The projection drops the fields that are a build log. That decision is written
   out field by field in the generator's header; this file is what keeps it TRUE,
   and the difference matters. The dropped-field list is a policy statement, and a
   policy cannot stop a `buildingBlock` string from acquiring a sentence about
   where a behaviour was lifted from. One already had: Calendar's names the
   upstream project, and it is the reason BUILDING_BLOCK_OVERRIDES exists.

   So the load-bearing arm here is not "are the right fields present". It is a
   scan of the WHOLE SERIALIZED OUTPUT for two things a consumer must never
   receive:

     1. porting vocabulary, using the same `lineageTerms` module the story guard
        uses, so the two can never disagree about what the banned words are;
     2. any `docs/` path, because `docs/` is excluded from the package and every
        such path would be a link to a file the consumer does not have.

   A free-text field that leaks tomorrow turns this red and forces a decision:
   reword the source, or add an override. It cannot pass quietly.

   ONE SUBTLETY WORTH STATING, because it looks like a bug. `lineageTerms`
   includes the bare word "ported", and the root registry's own status value IS
   "ported". The projection renames it to "available" — for the consumer's sake
   first, since "ported" is internal vocabulary that presumes a port the reader
   knows nothing about, but it also means this scan can read the whole document
   rather than picking fields, which is the stronger gate.

   NO WRITE ON IMPORT. `scripts/dist-registry.mjs` only writes when it is the
   process entry point, so importing `buildDistRegistry` here cannot regenerate
   the artifact this file is about to check. A drift guard that rebuilds its own
   subject passes unconditionally.
   ============================================================================= */
import { readFileSync } from "node:fs";
import { test, expect } from "vitest";
import { findLineageMatches } from "./lineageTerms";
import { buildDistRegistry, SOURCE_PATH, OUT_OF_SCOPE_REASONS } from "../../scripts/dist-registry.mjs";

interface SourceEntry {
  name: string;
  status: string;
  tier: string;
  exports: string[];
  buildingBlock?: string;
  module?: string;
  storyPath?: string;
  controlBox?: string;
  wave?: number;
  astryxName?: string;
  internalExports?: string[];
}

interface ProjectedEntry {
  name: string;
  status: string;
  tier: string;
  wraps: string | null;
  exports: string[];
  reason?: string;
}

const source: SourceEntry[] = JSON.parse(readFileSync(SOURCE_PATH, "utf8"));
const projection = buildDistRegistry(source) as {
  counts: { total: number; available: number; unavailable: number };
  components: ProjectedEntry[];
};

/** Fields that are a maintainer's build log and must never reach a consumer. */
const DROPPED = [
  "module",
  "storyPath",
  "controlBox",
  "wave",
  "astryxName",
  "internalExports",
  "buildingBlock",
  "note",
] as const;

test("the consumer roster carries no porting vocabulary", () => {
  const serialized = JSON.stringify(projection, null, 2);
  const matches = findLineageMatches(serialized);
  const detail = matches
    .slice(0, 10)
    .map((m) => `${m.term} — ${serialized.slice(Math.max(0, m.index - 60), m.index + 60).replace(/\s+/g, " ")}`)
    .join("\n  ");
  expect(
    matches.length,
    matches.length === 0
      ? ""
      : `dist/registry.json would ship porting vocabulary to consumers:\n  ${detail}\n` +
          `Fix the field in registry.json, or add an entry to BUILDING_BLOCK_OVERRIDES in ` +
          `scripts/dist-registry.mjs. Do not widen this guard.`,
  ).toBe(0);
});

test("the consumer roster cites no path the consumer does not have", () => {
  const serialized = JSON.stringify(projection, null, 2);
  // `docs/` is excluded from the package, and `src/` is not shipped either, so a
  // path into either is a link to nothing from where the consumer is standing.
  const deadPaths = [...serialized.matchAll(/(?:docs|src)\/[A-Za-z0-9/._-]*/g)].map((m) => m[0]);
  expect(
    [...new Set(deadPaths)],
    "these resolve to nothing in an installed package — drop the field or reword it",
  ).toEqual([]);
});

test("every component in the registry reaches the consumer roster", () => {
  expect(projection.components.map((c) => c.name).sort()).toEqual(source.map((e) => e.name).sort());
  expect(projection.counts.total).toBe(source.length);
});

test("the exported names are carried through EXACTLY, in order", () => {
  // This is the field a consumer acts on directly. A projection that reordered or
  // silently deduplicated it would be worse than one that dropped it.
  for (const entry of source) {
    const projected = projection.components.find((c) => c.name === entry.name);
    expect(projected, `${entry.name} missing from the projection`).toBeDefined();
    expect(projected!.exports, `${entry.name} exports diverged`).toEqual(entry.exports);
  }
});

test("no build-log field survives into the consumer roster", () => {
  const leaked: string[] = [];
  for (const component of projection.components) {
    for (const field of DROPPED) {
      if (field in component) leaked.push(`${component.name}.${field}`);
    }
  }
  expect(leaked, "these fields are a maintainer's, not a consumer's").toEqual([]);
});

test("every unavailable component tells the consumer why", () => {
  const unavailable = projection.components.filter((c) => c.status !== "available");
  expect(unavailable.length).toBeGreaterThan(0);
  for (const component of unavailable) {
    expect(component.reason, `${component.name} is unavailable with no reason`).toBeTruthy();
  }
});

test("`wraps` is a bare identifier or null — never prose", () => {
  // The structural arm, and the reason this field is derived rather than copied.
  // The root `buildingBlock` is free text and six entries would have shipped an
  // internal rule code, the phrase "lifted use…", a src/ path, or the upstream
  // project's name. A value that can only ever be one identifier cannot carry a
  // sentence, so the leak is closed by shape rather than by a list of exceptions
  // somebody has to keep extending.
  const bad = projection.components
    .filter((c) => c.wraps !== null && !/^[A-Za-z][A-Za-z0-9]*$/.test(c.wraps))
    .map((c) => `${c.name}.wraps = ${JSON.stringify(c.wraps)}`);
  expect(bad, "a wraps value that is not a single identifier means prose got through").toEqual([]);

  // And the derivation is not vacuous: if this ever reached zero, every component
  // would be reporting "custom composition" and the field would be dead weight
  // that still looked informative.
  const wrapped = projection.components.filter((c) => c.wraps !== null).length;
  expect(wrapped, "no component resolves to a Radix wrap — the derivation has stopped working").toBeGreaterThan(0);
});

test("no out-of-scope reason outlives the entry it describes", () => {
  // The anti-rot arm. A reason for a component that has since been built is dead
  // weight that still reads as current — the same failure as the comment in the
  // Overlay stories that asserted a carve-out somebody had already deleted.
  const byName = new Map(source.map((e) => [e.name, e]));

  for (const name of Object.keys(OUT_OF_SCOPE_REASONS)) {
    const entry = byName.get(name);
    expect(entry, `OUT_OF_SCOPE_REASONS names ${name}, which is not in registry.json`).toBeDefined();
    expect(
      entry!.status,
      `${name} is available now — remove its entry from OUT_OF_SCOPE_REASONS`,
    ).not.toBe("ported");
  }
});
