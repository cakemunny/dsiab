/* =============================================================================
   sparse-glyph-weight.node-check.ts — A SPARSE GLYPH CARRIES ITS WEIGHT
   -----------------------------------------------------------------------------
   Phosphor's `regular` is one STROKE weight, not one PERCEIVED weight. A glyph
   built from small disconnected marks carries far less ink than one built from
   continuous strokes, so in a row of icon-only buttons the sparse one reads as
   disabled, or as nothing at all.

   Review found this on the assistant recreation: a three-dots kebab beside a
   share icon, reported as imperceptible, with a request for an icon variant
   that is more prominent and similarly weighted to the other
   icons. `MoreMenu` already had the answer — it ships
   `DotsThreeVertical weight="bold"` — and the page had hand-rolled an
   `IconButton` around the same glyph, losing that compensation. Ruled in [[optical-icon-weight]],
   with the general rule in `GUIDELINES.md` §4.

   WHAT THIS GUARD DOES. It reads source rather than pixels: optical weight is
   not measurable from a bounding box, and rendering every icon in every row to
   compare ink would be a far more expensive check than the defect warrants. So
   it asserts the mechanical half of the rule — a sparse glyph is not left at the
   default weight — and leaves "does this row read evenly" to review, which is
   where a judgement belongs.

   THE THREE ARMS:

     WEIGHTED  — every sparse glyph in `src/` carries an explicit `weight`.
       `<DotsThreeVertical />` fails; `<DotsThreeVertical weight="bold" />` passes.
     REVERSE   — the sparse list still matches real glyphs in the codebase. A
       list that matches nothing passes vacuously forever, which is the failure
       mode `dist-decisions.node-check.ts` documents at length.
     ANCHOR    — `MoreMenu` still ships its bold default. That default is the
       reason an overflow menu is exempt from thinking about this at all, so if
       it silently reverts, every `MoreMenu` in the system goes light at once and
       nothing else here would notice.

   ADDING A GLYPH. Put it in `SPARSE_GLYPHS` when it is built from small
   disconnected marks. The list is deliberately short: this is not a ban on
   `regular`, it is a named set of glyphs where `regular` is measurably too
   light beside its neighbours.
   ============================================================================= */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test, expect } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const SRC = join(ROOT, "src");

/** Glyphs built from small disconnected marks, which read lighter than a stroked
 *  neighbour at the same Phosphor weight. */
const SPARSE_GLYPHS = [
  "DotsThreeVertical",
  "DotsThree",
  "DotsThreeCircle",
  "DotsSix",
  "DotsSixVertical",
  "DotsNine",
  "Minus",
] as const;

/** Every `.ts`/`.tsx` under `src/`, repo-relative. Hand-rolled rather than
 *  `fs.globSync`, which is still experimental and warns on every guard-lane run. */
function sourceFiles(dir = SRC): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(e)) out.push(relative(ROOT, full));
  }
  return out;
}

/** Source with comments AND string literals blanked, line count preserved. Two kinds of text name
 *  a glyph without rendering it: a docblock that says `pass icon={<DotsThree/>}`, and a props-table
 *  row carrying `def: "<DotsThreeVertical/>"` as documentation. Flagging either would teach the
 *  next reader that this guard cannot tell a render from a description of one. */
function stripNonCode(src: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, " ");
  return src
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1: string) => p1 + " ".repeat(m.length - p1.length))
    .replace(/"(?:[^"\\\n]|\\.)*"/g, blank)
    .replace(/'(?:[^'\\\n]|\\.)*'/g, blank);
}

/** Every JSX use of a sparse glyph, with whether it declares a `weight`. */
function sparseUses(): { file: string; line: number; glyph: string; weighted: boolean }[] {
  const found: { file: string; line: number; glyph: string; weighted: boolean }[] = [];
  const self = "src/foundations/sparse-glyph-weight.node-check.ts";
  for (const file of sourceFiles()) {
    if (file === self) continue; // this file names the glyphs in prose
    const src = stripNonCode(readFileSync(join(ROOT, file), "utf8"));
    src.split("\n").forEach((line, i) => {
      for (const glyph of SPARSE_GLYPHS) {
        // `<Glyph` followed by a non-word char, so `DotsThree` does not match `DotsThreeVertical`.
        const re = new RegExp(`<${glyph}(?![A-Za-z])([^>]*)>`, "g");
        for (const m of line.matchAll(re)) {
          found.push({ file, line: i + 1, glyph, weighted: /\bweight\s*=/.test(m[1]) });
        }
      }
    });
  }
  return found;
}
test("a sparse glyph declares its weight", () => {
  const bare = sparseUses()
    .filter((u) => !u.weighted)
    .map(
      (u) =>
        `${u.file}:${u.line} renders <${u.glyph} /> at the default weight. Beside a stroked glyph it ` +
        `reads as imperceptible — give it weight="bold" (GUIDELINES §4, [[optical-icon-weight]]). For an overflow menu, ` +
        `use MoreMenu, which already does this`,
    );
  expect(bare, bare.join("\n")).toEqual([]);
});

test("the sparse-glyph list still matches real code", () => {
  // Without this the arm above passes over an empty set the moment the glyphs are renamed or the
  // regex stops matching, and a guard that cannot fail is worse than no guard.
  const uses = sparseUses();
  expect(
    uses.length,
    "no sparse glyph was found anywhere in src/. Either the list is stale or the JSX match broke",
  ).toBeGreaterThan(0);
});

test("MoreMenu still ships its bold default", () => {
  // The reason an overflow menu never has to think about this. If it reverts, every MoreMenu in the
  // system goes light at once and the arm above would not see it, because the default lives here.
  const src = readFileSync(join(ROOT, "src/components/ui/MoreMenu.tsx"), "utf8");
  expect(
    /<DotsThreeVertical\s+weight="bold"\s*\/>/.test(src),
    'MoreMenu no longer renders <DotsThreeVertical weight="bold" /> as its default trigger glyph',
  ).toBe(true);
});
