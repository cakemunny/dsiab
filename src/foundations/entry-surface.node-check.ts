/* =============================================================================
   entry-surface.node-check.ts — THE HAND-WRITTEN HALF OF THE PUBLIC SURFACE
   -----------------------------------------------------------------------------
   `src/index.ts` opens with two claims: everything a consumer can import is in
   that file and nothing else is, and adding a name to its hand-authored sections
   is "a DECISION about what this system endorses, not a convenience".

   Neither was enforced. `barrel.node-check.ts` checks the GENERATED block against
   `registry.json` in both directions and is rigorous about it, but it does not
   look at the rest of the file — so an `export const` typed anywhere outside the
   `gen-barrel` markers reached consumers with no registry entry, no ruling, and
   nothing in any suite to notice. Measured 2026-09-02: appending
   `export const __sabotage_probe = 1` to the entry file passed all 919 tests in
   the guard lane.

   That matters more than an untidy export, because the asymmetry is permanent.
   ADDING an export later is additive and safe. REMOVING one is a breaking change
   for anybody who adopted it, and a name that shipped by accident is exactly the
   name nobody meant to support.

   So the hand-authored names are registered here, and the register is the visible
   decision the file already says it requires. Adding one means editing this list,
   which lands in a diff a reviewer can see and ask about. Both directions fail:
     - exported but unregistered -> a name shipped without a decision;
     - registered but no longer exported -> a dead entry that reads as coverage.

   WHY IT PARSES RATHER THAN GREPS. The entry file re-exports in several shapes
   (`export { X, type Y } from …`, `export const`, `export type`) and carries a
   long closing comment that NAMES many Radix exports it deliberately does not
   re-export. A text scan would count those mentions as exports and report a
   surface twice the real size. This walks the TypeScript AST and classifies each
   export by whether its line falls inside the `gen-barrel` fence.

   The fence markers and their regexes are imported from the barrel generator
   rather than restated, so this guard and the generator can never disagree about
   where the generated region begins.
   ============================================================================= */
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { test, expect } from "vitest";
import ts from "typescript";
import { ENTRY_PATH, ENTRY_BEGIN, ENTRY_END } from "../../scripts/gen-barrel.mjs";

/**
 * Every name the entry file publishes by hand, outside the generated block.
 *
 * Grouped the way `src/index.ts` groups them, because the two groups are governed
 * differently: section 1 is the theme surface plus the package version, and
 * section 3 is a curated subset of names `@radix-ui/themes` exports that this
 * system does not wrap. The file's own prose calls section 3 an endorsement
 * rather than a convenience, and it is the half where a careless addition is
 * least likely to be noticed.
 */
const REGISTERED: Record<string, readonly string[]> = {
  "1. theme + package": [
    "Provider", "ProviderProps", "ContrastMode",
    "Contrast",
    "UISize",
    "ButtonOrder",
    // Added 2026-09-02 so a bug report can name the artifact it came from.
    "version",
  ],
  "3. radix gap-fillers": [
    "AccessibleIcon", "AccessibleIconProps",
    "Box", "BoxProps",
    "Container", "ContainerProps",
    "Em", "EmProps",
    "Flex", "FlexProps",
    "Inset", "InsetProps",
    "Quote", "QuoteProps",
    "Reset", "ResetProps",
    "Slot", "Slottable",
    "Strong", "StrongProps",
  ],
};

const ALL_REGISTERED = new Set(Object.values(REGISTERED).flat());

/** Exported names in the entry file, split by which side of the fence they sit on. */
function entryExports(): { inside: string[]; outside: string[]; fence: [number, number] } {
  const text = readFileSync(ENTRY_PATH, "utf8");
  const sf = ts.createSourceFile(ENTRY_PATH, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const lines = text.split("\n");
  const begin = lines.findIndex((l) => ENTRY_BEGIN.test(l));
  const end = lines.findIndex((l) => ENTRY_END.test(l));

  const inside: string[] = [];
  const outside: string[] = [];
  const lineOf = (node: ts.Node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line;

  for (const st of sf.statements) {
    const line = lineOf(st);
    const bucket = begin !== -1 && end !== -1 && line > begin && line < end ? inside : outside;

    if (ts.isExportDeclaration(st) && st.exportClause && ts.isNamedExports(st.exportClause)) {
      for (const el of st.exportClause.elements) bucket.push(el.name.text);
      continue;
    }
    const mods = ts.canHaveModifiers(st) ? (ts.getModifiers(st) ?? []) : [];
    if (!mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;

    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) bucket.push(d.name.text);
      }
    } else if ("name" in st && st.name && ts.isIdentifier(st.name as ts.Node)) {
      bucket.push((st.name as ts.Identifier).text);
    }
  }

  return { inside, outside, fence: [begin, end] };
}

const { inside, outside, fence } = entryExports();
const rel = relative(process.cwd(), ENTRY_PATH);

test("the fence is found and the generated block is inside it", () => {
  // The positive control. If the markers moved, every export would land in
  // `outside`, the register would look wildly wrong, and the failure would point
  // at the wrong thing. If they were BOTH lost, `begin` and `end` are -1 and the
  // classification silently collapses.
  expect(fence[0], `${rel}: no gen-barrel:begin marker`).toBeGreaterThan(-1);
  expect(fence[1], `${rel}: no gen-barrel:end marker`).toBeGreaterThan(fence[0]);
  expect(inside.length, "the generated block publishes nothing — the fence is probably misplaced").toBeGreaterThan(100);
});

test("every hand-written export is registered", () => {
  const unregistered = outside.filter((name) => !ALL_REGISTERED.has(name));
  expect(
    unregistered,
    unregistered.length === 0
      ? ""
      : `${rel} publishes these outside the generated block and they are not registered in ` +
        `entry-surface.node-check.ts. Adding a name to the public surface is a decision: put it in ` +
        `REGISTERED with the group it belongs to, so it lands in a diff somebody can question. ` +
        `Removing it later is a breaking change for anyone who adopted it.`,
  ).toEqual([]);
});

test("no registered name has stopped being exported", () => {
  const exported = new Set(outside);
  const stale = [...ALL_REGISTERED].filter((name) => !exported.has(name));
  expect(
    stale,
    `these are registered as part of the public surface but ${rel} no longer exports them — ` +
      `delete them from REGISTERED rather than leaving a list that overstates what ships`,
  ).toEqual([]);
});

test("the register is not silently duplicated across groups", () => {
  const seen = new Set<string>();
  const duplicated: string[] = [];
  for (const names of Object.values(REGISTERED)) {
    for (const name of names) {
      if (seen.has(name)) duplicated.push(name);
      seen.add(name);
    }
  }
  expect(duplicated, "a name in two groups makes the group counts a lie").toEqual([]);
});
