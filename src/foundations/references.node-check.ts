/* =============================================================================
   references.node-check.ts — A SOURCE IS RECORDED WHERE IT CAN BE CHECKED
   -----------------------------------------------------------------------------
   Two rules meet here and this guard is the join between them.

   The documentation does not cite. A page explains its own component in terms of
   what that component does, and never sends a reader to another system to
   understand it. Deferring is the failure that rule prevents: a baseline meant
   to be read, configured and owned by whoever installs it cannot rely on a
   reader following a link to a product they do not use.

   Research still has to happen ([[prior-art-required]]) and it has to be verifiable. So sources
   live in `REFERENCES.md`, as a lookup, and each one is attached to the
   component it informed through the `priorArt` field on that registry entry.

   WITHOUT THIS GUARD THE TWO HALVES DRIFT, and they drift silently in both
   directions. A component records a URL in `priorArt` that never reaches the
   references file, so a reader auditing the sources sees an incomplete list. Or
   the references file keeps a URL for a component that has been rewritten since,
   so the list claims a lineage the code no longer has. Neither shows up in a
   type check, a story or a render.

   THREE ARMS:

     FORWARD  — every URL in any `priorArt` appears in `REFERENCES.md`.
     REVERSE  — every URL in `REFERENCES.md` appears in some `priorArt`, so the
       file stays a record of what was actually used rather than a reading list.
     SHAPE    — the references file still holds entries and still says, for each,
       what was adopted or rejected. A list of bare links records that somebody
       looked, not what they concluded, and the conclusion is the part worth
       keeping.
   ============================================================================= */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const REFERENCES = join(ROOT, "docs/REFERENCES.md");

/** Sample content and infrastructure, which are not sources anybody consulted. */
const NOT_A_SOURCE = /(example\.(com|org|internal)|localhost|127\.0\.0\.1|w3\.org\/2000\/svg)/;

function urlsIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.match(/https?:\/\/[^\s)\]",;`]+/g) ?? []) {
    const u = raw.replace(/[.,;]+$/, "");
    if (!NOT_A_SOURCE.test(u)) out.add(u);
  }
  return out;
}

function priorArtUrls(): Map<string, string[]> {
  const reg = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8")) as {
    name: string;
    priorArt?: string;
  }[];
  const out = new Map<string, string[]>();
  for (const e of reg) {
    if (!e.priorArt) continue;
    for (const u of urlsIn(e.priorArt)) {
      out.set(u, [...(out.get(u) ?? []), e.name]);
    }
  }
  return out;
}

const references = () => (existsSync(REFERENCES) ? readFileSync(REFERENCES, "utf8") : "");

test("every source a component records is listed in REFERENCES.md", () => {
  const text = references();
  const missing = [...priorArtUrls().entries()]
    .filter(([u]) => !text.includes(u))
    .map(([u, names]) => `${u}\n    recorded by ${names.join(", ")} but absent from REFERENCES.md`);
  expect(
    missing,
    missing.length === 0
      ? ""
      : `a source is cited as prior art and cannot be looked up:\n\n${missing.join("\n\n")}\n\n` +
          `REFERENCES.md is the one place a reader can verify what this system was built against, ` +
          `because the documentation itself deliberately does not cite. Add the source there with ` +
          `what was adopted or rejected.`,
  ).toEqual([]);
});

test("REFERENCES.md lists no source that nothing uses", () => {
  const recorded = priorArtUrls();
  const ledger = readFileSync(join(ROOT, "docs/DECISIONS.md"), "utf8");
  const entries = new Set([...ledger.matchAll(/^### (\S+)$/gm)].map((m) => m[1]));
  // A source can attach to a COMPONENT through its priorArt, or to a RULING when it informed the
  // token layer or a policy rather than any one component. The row has to cite that ruling as
  // [[name]], and the name has to head a `### name` entry, so the attachment is checkable either way.
  const rulingOnRow = (url: string): string | null => {
    const row = references()
      .split("\n")
      .find((l) => l.includes(url));
    for (const m of row?.matchAll(/\[\[([a-z0-9]+(?:-[a-z0-9]+)+)\]\]/g) ?? []) {
      if (entries.has(m[1])) return m[1];
    }
    return null;
  };
  const orphans = [...urlsIn(references())].filter((u) => !recorded.has(u) && !rulingOnRow(u));
  expect(
    orphans,
    `REFERENCES.md lists sources that nothing attaches to: ${orphans.join(", ")}. Attach each to ` +
      `the component that used it, through that entry's priorArt, or cite the ruling it informed ` +
      `in the row itself as [[name]]. The file is a record of what was used, not a reading list`,
  ).toEqual([]);
});

test("REFERENCES.md still records conclusions, not just links", () => {
  // Without this the arms above pass over a file that has decayed into a bare list of URLs, which
  // records that somebody looked rather than what they concluded.
  const text = references();
  expect(existsSync(REFERENCES), "REFERENCES.md does not exist").toBe(true);
  expect(urlsIn(text).size, "REFERENCES.md lists no sources at all").toBeGreaterThan(5);
  const verdicts = (text.match(/\b(ADOPTED|REJECTED)\b/g) ?? []).length;
  expect(
    verdicts,
    "REFERENCES.md no longer says what was adopted or rejected for its sources, so it has become a " +
      "reading list rather than a record of decisions",
  ).toBeGreaterThan(5);
});
