/* =============================================================================
   token-census.node-check.ts — EVERY COLOUR ROLE IS ACTUALLY CHECKED
   -----------------------------------------------------------------------------
   `DS_ROLES` in `_assert.ts` is the inventory of colour roles, and two things
   depend on it: the `assertNoEmpty` sweep that catches a role resolving to the
   empty string, and the Colors story's wall, which renders every role for every
   accent. A role missing from that inventory is not weakly checked. It is not
   checked at all, and it does not appear on the wall either — so if it broke,
   nothing anywhere would say so.

   The inventory was hand-maintained, and it drifted. Two roles were declared in
   `semantic.css` and never added: `--ds-scrim-light`, minted by [[light-scrim]] in July 2026,
   and `--ds-fill-error-hover`. Neither had reached a single assertion. Finding
   that took a hand-written comparison, which is the argument for this file: the
   next role minted would have inherited the same hole, silently, and nobody would
   have looked again.

   BOTH DIRECTIONS FAIL, and the second one matters as much as the first:
     - declared in the CSS but absent from the inventory -> an unchecked role;
     - in the inventory but no longer declared -> a dead entry that still reads as
       coverage, which is the more expensive kind of wrong.

   WHY THIS READS `semantic.css` AND NOT EVERY TOKEN FILE. The `--ds-` prefix is
   shared across families that have nothing to do with colour, and one prefix is
   outright overloaded: `--ds-icon-neutral` is a colour role in `semantic.css`,
   while `--ds-icon-h3` and `--ds-icon-weight-base` are a size and a weight in
   `icons.css`. A scan across every file keyed on the prefix would report those as
   missing colour roles, and the fix for a false positive is always to widen the
   guard until it stops meaning anything. `semantic.css` is the file that owns
   colour roles; measured when this was written, all 62 of its `--ds-*`
   declarations are colour, and no other token file declares one.

   The non-colour families — spacing, typography, motion, shadow, stacking, icon
   sizes — have no equivalent inventory, so nothing here covers them. That is a
   real gap and it is named rather than quietly implied by this file's scope.

   COMMENTS ARE STRIPPED BEFORE SCANNING. `semantic.css` names tokens in prose
   constantly, and a name inside a comment is a mention, not a declaration.
   Counting one would put a phantom role in the census that no CSS defines.
   ============================================================================= */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "vitest";
import { ALL_DS_ROLES } from "./_assert";

const SEMANTIC_CSS = join(process.cwd(), "src/tokens/semantic.css");

/**
 * Colour roles declared in `semantic.css` that are deliberately NOT in the
 * inventory. Empty today, and that is the honest state: every role declared there
 * is checked.
 *
 * If a role ever belongs here, it needs a reason next to it, and the anti-rot arm
 * below fails if the name stops being declared — so an exemption cannot outlive
 * the thing it exempts.
 */
const UNCOUNTED: Record<string, string> = {};

/** Every `--ds-*` custom property DECLARED in semantic.css, comments removed. */
function declaredRoles(): string[] {
  const css = readFileSync(SEMANTIC_CSS, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  return [...new Set([...css.matchAll(/(--ds-[a-z0-9-]+)\s*:/g)].map((m) => m[1]))].sort();
}

/**
 * `ALL_DS_ROLES` only, deliberately. The `--on-*` foregrounds are inventoried too
 * (in `ON_TOKENS`), but they are declared in `theme.css` rather than here, because
 * they derive from the accent and are re-pinned per brand by the collision blocks.
 * They can never appear in a `--ds-*` scan, so counting them would leave every one
 * of them looking like an inventoried role that stopped being declared.
 */
const declared = declaredRoles();
const inventory = new Set<string>(ALL_DS_ROLES);

test("the scan finds roles at all — a regex that matches nothing passes everything", () => {
  // The positive control. If `semantic.css` moved, or the declaration syntax
  // changed, an empty result would make every arm below vacuously true. This is
  // the arm that stops that from reading as a clean run.
  expect(declared.length, `no --ds-* declarations found in ${SEMANTIC_CSS}`).toBeGreaterThan(40);
});

test("every colour role declared in semantic.css is in the inventory", () => {
  const missing = declared.filter((role) => !inventory.has(role) && !(role in UNCOUNTED));
  expect(
    missing,
    missing.length === 0
      ? ""
      : `these roles are declared but reach no assertion and no colour wall — add them to DS_ROLES ` +
        `in _assert.ts AND to GROUPS in Colors.stories.tsx (the Swatches play asserts the two agree), ` +
        `or register them in UNCOUNTED here with a reason`,
  ).toEqual([]);
});

test("no inventoried colour role has stopped being declared", () => {
  // Dead coverage reads exactly like real coverage, which is why this direction
  // is a separate arm rather than a footnote on the one above.
  const declaredSet = new Set(declared);
  const stale = [...inventory].filter((role) => !declaredSet.has(role));
  expect(
    stale,
    `these are inventoried but no longer declared in semantic.css — they are checked against nothing`,
  ).toEqual([]);
});

test("no UNCOUNTED exemption outlives the role it describes", () => {
  const declaredSet = new Set(declared);
  for (const [role, reason] of Object.entries(UNCOUNTED)) {
    expect(reason.length, `${role} is exempted with no reason`).toBeGreaterThan(10);
    expect(
      declaredSet.has(role),
      `UNCOUNTED exempts ${role}, which semantic.css no longer declares — delete the exemption`,
    ).toBe(true);
  }
});
