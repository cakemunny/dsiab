/* =============================================================================
   registry-tier.node-check.ts — THE TIER ↔ STORY-SPINE PARITY GUARD
   -----------------------------------------------------------------------------
   Sibling of registry.node-check.ts (same node lane, same harness). Stops the
   registry `tier` field from drifting out of sync with the story it labels —
   the drift Task [[light-and-dark-token-set]] corrected by hand (Breadcrumbs / Pagination / StatusDot were
   built full but labelled "lite").

   THE INVARIANT — a BICONDITIONAL since the docs-grammar refactor (2026-07-30,
   [[docs-page-spine]] as amended):

     tier:"full"  ⟺  the story exports BOTH `Anatomy` AND `Usage`.
     tier:"lite"  ⟹  the story exports `Usage` and does NOT export `Anatomy`.

   ONE grammar now covers both tiers. `Anatomy` carries the callout diagram and the
   anatomical content that explains the parts (state panels, reference tables) — never
   the token spec — and it belongs to full pages ALONE. `Usage` is the story EVERY page carries:
   guidance, scenarios, do/don'ts, closing on the live token spec that used to sit
   under Anatomy. A lite page is that same page minus the diagram, and its single
   docs story is named `Usage` (it was `Overview` until the refactor). So the tier
   is no longer a label a page can outgrow silently — it names the shape.

   THE ONE-WAY ERA IS OVER. This guard previously asserted `full ⟹ full-spine`
   only, because nine `lite`-tagged entries (Timestamp, Token, Thumbnail,
   Citation, Carousel, OverflowList, TreeList, List, Lightbox) really did render
   both Anatomy and Usage — `lite` was read as a FLOOR a component could grow
   past, so the reverse implication would have false-positived on all nine. Those
   nine were RETAGGED `full` in the same change that landed this grammar; the
   exception class is empty, and growing an Anatomy diagram is now a PROMOTION the
   registry has to record. Both directions red: a full story thinned to a lite
   stub without a tier fix, and a lite page that grows a diagram without one.

   SCOPE: ported entries WITH a storyPath. Entries documented-in-sibling
   (TypeaheadItem, the TopNav sub-parts) have no storyPath and are exempt — there
   is no own story file to inspect.
   ============================================================================= */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "vitest";
import ts from "typescript";

const ROOT = process.cwd();

type Entry = {
  name: string;
  status: "ported" | "planned" | "external" | "out-of-scope";
  tier: "full" | "lite";
  storyPath?: string;
};

const registry: Entry[] = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8"));

/** Names of the top-level `export const …` bindings in a story file (AST, so a
 *  string or comment that merely mentions "Anatomy" can never be mistaken for it). */
function exportedConstNames(file: string): Set<string> {
  const src = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
  const names = new Set<string>();
  for (const stmt of sf.statements) {
    if (
      ts.isVariableStatement(stmt) &&
      stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      for (const d of stmt.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) names.add(d.name.text);
      }
    }
  }
  return names;
}

const FULL_SPINE = ["Anatomy", "Usage"] as const;
/** `Anatomy` = the callout diagram, full pages only. `Usage` = the docs story BOTH tiers carry. */
const [DIAGRAM_STORY, SHARED_STORY] = FULL_SPINE;

test("tier ⇔ story spine — full = Anatomy + Usage; lite = Usage without Anatomy", () => {
  const failures: string[] = [];
  for (const e of registry) {
    if (e.status !== "ported" || !e.storyPath) continue;
    const exported = exportedConstNames(join(ROOT, e.storyPath));
    if (e.tier === "full") {
      const missing = FULL_SPINE.filter((n) => !exported.has(n));
      if (missing.length) {
        failures.push(`${e.name} (${e.storyPath}): tier="full" but story does not export ${missing.join(" + ")}`);
      }
      continue;
    }
    if (!exported.has(SHARED_STORY)) {
      failures.push(
        `${e.name} (${e.storyPath}): tier="lite" but story does not export ${SHARED_STORY} — the single docs story every page carries (it was named Overview before the 2026-07-30 grammar)`,
      );
    }
    if (exported.has(DIAGRAM_STORY)) {
      failures.push(
        `${e.name} (${e.storyPath}): tier="lite" but story exports ${DIAGRAM_STORY} — a page carrying the callout diagram is tier="full"; retag it in registry.json`,
      );
    }
  }
  expect(
    failures,
    failures.length ? `tier↔spine drift — the tier and the story it labels disagree:\n  ${failures.join("\n  ")}` : "",
  ).toEqual([]);
});
