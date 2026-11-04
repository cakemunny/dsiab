/* =============================================================================
   brand-analysis.node-check.ts — THE GENERATOR'S ERROR FILLS ARE THE THEME'S
   -----------------------------------------------------------------------------
   `ERROR_FILL` in `src/palette/brandAnalysis.ts` holds the fill a destructive
   button paints for each family the error search may choose
   ([[generated-button-fill]]). The theme pins the same fills for the named
   accents in `src/tokens/theme.css` ([[text-on-solid-fill-contrast]]). Two copies of
   one ruling drift, so this reads the pins back out of the CSS:

     • red, the default, is pinned on the base error block;
     • ruby, wherever a collision block moves error to ruby;
     • oxblood, wherever a block moves error to oxblood, as its own step 9.

   It also holds that the families the error search may choose are exactly the
   families `ERROR_FILL` covers, so a new candidate cannot ship without a fill.
   ============================================================================= */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "vitest";
import { ERROR_FILL } from "../palette/brandAnalysis";
import { FAMILY_CANDIDATES, SCALE_STEP_9 } from "../palette/collisionTable";

const THEME = readFileSync(join(process.cwd(), "src/tokens/theme.css"), "utf8");

/** Every `--error-solid` the theme declares in a block that maps error to `family`. */
function pinsFor(family: string): string[] {
  const out: string[] = [];
  for (const block of THEME.split("}")) {
    const maps = new RegExp(`--error-9:\\s*var\\(--${family}-9\\)`).test(block);
    const pin = /--error-solid:\s*([^;]+);/.exec(block);
    if (maps && pin) out.push(pin[1]!.trim());
  }
  return out;
}

test("the error search's candidates are exactly the families with a fill", () => {
  expect(Object.keys(ERROR_FILL).sort()).toEqual([...FAMILY_CANDIDATES.error].sort());
});

test("red's fill is the base pin", () => {
  const base = /--error-solid:\s*(#[0-9a-f]{6});\s*\/\*\s*red light-11/i.exec(THEME);
  expect(base?.[1]?.toLowerCase(), "the base --error-solid pin was not found").toBe(ERROR_FILL.red);
});

test("ruby's fill is the pin every ruby block carries", () => {
  const pins = pinsFor("ruby");
  expect(pins.length, "no collision block maps error to ruby").toBeGreaterThan(0);
  for (const p of pins) expect(p.split(/\s/)[0]!.toLowerCase()).toBe(ERROR_FILL.ruby);
});

test("oxblood's fill is its own step 9, as every oxblood block declares", () => {
  const pins = pinsFor("oxblood");
  expect(pins.length, "no collision block maps error to oxblood").toBeGreaterThan(0);
  for (const p of pins) expect(p.split(/\s/)[0]).toBe("var(--error-9)");
  expect(ERROR_FILL.oxblood).toBe(SCALE_STEP_9.oxblood);
});
