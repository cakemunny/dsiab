/* =============================================================================
   collision.logic.test.ts — the seed-driven collision chooser
   -----------------------------------------------------------------------------
   Node lane (`npm run test:tokens`). Pure arithmetic, no DOM.

   THE TEST THAT DEFINES THE FEATURE is `parity with the named path`. A custom
   seed has no accent NAME, so the twenty static blocks in `theme.css` cannot
   serve it — the shift has to be chosen from the seed's own hue. The way to know
   a chooser is right is to feed it the step-9 hex of a scale whose correct answer
   is already ruled, and require it to agree.

   That also kills the cheapest wrong implementation. Hardcoding one four-family
   shift into a static `[data-accent-color="ds-custom"]` block passes any test
   that only checks two named seeds; it cannot pass 27.
   ============================================================================= */
import { describe, expect, it } from "vitest";
import { chooseSemanticScales, semanticShiftDiagnostics } from "./collision";
import {
  COLLISION_TABLE, SEMANTIC_DEFAULT, SCALE_STEP_9, FAMILY_CANDIDATES,
  LIGHT_TARGET_SCALES, DARK_ON_SOLID, expectedScales, type SemFamily,
} from "./collisionTable";
import { ACCENT_STEP_9 } from "../foundations/semanticBaseline.fixture";
import { srgbToOklab, oklabToOklch, hueDistance, deltaEOK } from "./oklch";
import { parseSeed } from "./parseSeed";

const FAMILIES: SemFamily[] = ["error", "warning", "success", "info"];

/** Producer-side gate. Deliberately NOT `_assert.ts`'s `tooClose` — that one
 *  rasterises on a canvas and is the VERIFIER; see `oklch.ts`'s header. */
const MIN_DELTA_E = 0.135;
const MIN_HUE = 40;

function lchOf(hex: string) {
  const parsed = parseSeed(hex);
  if (!parsed.ok) throw new Error(`fixture hex did not parse: ${hex}`);
  const lab = srgbToOklab(parsed.rgb);
  return { lab, lch: oklabToOklch(lab) };
}

function collides(aHex: string, bHex: string): boolean {
  const a = lchOf(aHex), b = lchOf(bHex);
  const dE = deltaEOK(a.lab, b.lab);
  const dH = hueDistance(a.lch.h, b.lch.h);
  return dE < MIN_DELTA_E && dH < MIN_HUE;
}

/**
 * Accents where the hand-ruled table is MORE conservative than the shipped gate:
 * it moves a family the current thresholds say was already clear.
 *
 * These are almost certainly stale rather than wrong. [[brand-collision-shift-table]] derived the table by
 * "OKLCH step-9 hue-distance optimisation" against an 18-degree hue gate; [[oxblood-preset]] and
 * [[brand-status-collision-gate]] then replaced that metric with the perceptual ΔE-OK + hue gate this file
 * uses, and the table was never re-derived against it. So each entry below is a
 * decision taken under a rule the system no longer applies.
 *
 * PINNED, NOT SUPPRESSED. A new divergence fails the suite; these nine are
 * recorded so the residual is a stated number rather than a silent allowance —
 * the same posture as `boxLaw`'s suppression map and `_focus`'s residual set.
 * Closing them takes a ruling: either the gate is looser than intended, or
 * these nine entries should be re-derived and `theme.css` updated.
 */
const KNOWN_TABLE_DIVERGENCE: Record<string, SemFamily[]> = {
  gold: ["error", "warning"],
  bronze: ["error"],
  brown: ["warning"],
  teal: ["info"],
  lime: ["error", "warning"],
  mint: ["success"],
  sky: ["info"],
};

describe("chooseSemanticScales — parity with the named path", () => {
  for (const [accent, seed] of Object.entries(ACCENT_STEP_9)) {
    it(`seeding ${accent}'s own step-9 (${seed}) reproduces its ruled shift`, () => {
      const chosen = chooseSemanticScales(seed);
      const ruled = expectedScales(accent);
      const allowed = KNOWN_TABLE_DIVERGENCE[accent] ?? [];
      for (const f of FAMILIES) {
        if (allowed.includes(f)) continue;
        expect(chosen[f], `${accent}.${f}`).toBe(ruled[f]);
      }
    });
  }

  it("the divergence set has not grown", () => {
    const found: string[] = [];
    for (const [accent, seed] of Object.entries(ACCENT_STEP_9)) {
      const chosen = chooseSemanticScales(seed);
      const ruled = expectedScales(accent);
      for (const f of FAMILIES) {
        if (chosen[f] !== ruled[f] && !(KNOWN_TABLE_DIVERGENCE[accent] ?? []).includes(f)) {
          found.push(`${accent}.${f}`);
        }
      }
    }
    expect(found).toEqual([]);
  });

  it("every pinned divergence is still real — none has silently healed", () => {
    const healed: string[] = [];
    for (const [accent, families] of Object.entries(KNOWN_TABLE_DIVERGENCE)) {
      const chosen = chooseSemanticScales(ACCENT_STEP_9[accent]);
      const ruled = expectedScales(accent);
      for (const f of families) if (chosen[f] === ruled[f]) healed.push(`${accent}.${f}`);
    }
    expect(healed, "remove these from KNOWN_TABLE_DIVERGENCE").toEqual([]);
  });

  it("covers every accent that carries a block in theme.css", () => {
    const blocked = Object.keys(COLLISION_TABLE);
    const swept = Object.keys(ACCENT_STEP_9);
    expect(blocked.filter((a) => !swept.includes(a))).toEqual([]);
  });
});

describe("chooseSemanticScales — a shift never changes what a colour MEANS", () => {
  for (const [accent, seed] of Object.entries(ACCENT_STEP_9)) {
    it(`${accent} keeps every family inside its own hue neighbourhood`, () => {
      const chosen = chooseSemanticScales(seed);
      for (const f of FAMILIES) {
        expect(FAMILY_CANDIDATES[f], `${accent}.${f}`).toContain(chosen[f]);
      }
    });
  }
});

describe("chooseSemanticScales — no seed leaves a colliding family", () => {
  for (const [accent, seed] of Object.entries(ACCENT_STEP_9)) {
    it(`${accent} (${seed}) clears all four families`, () => {
      const chosen = chooseSemanticScales(seed);
      const offenders = FAMILIES.filter((f) => collides(seed, SCALE_STEP_9[chosen[f]]));
      expect(offenders).toEqual([]);
    });
  }
});

describe("chooseSemanticScales — on-solid contrast follows the shift", () => {
  it("a family routed to a light scale takes the dark ink", () => {
    // teal routes success -> lime, which theme.css pairs with #21201c.
    const chosen = chooseSemanticScales(ACCENT_STEP_9.teal);
    expect(LIGHT_TARGET_SCALES.has(chosen.success)).toBe(true);
  });

  it("names the dark ink theme.css already uses, not a fresh value", () => {
    expect(DARK_ON_SOLID).toBe("#21201c");
  });
});

describe("chooseSemanticScales — an uncolliding seed keeps the defaults", () => {
  it("a neutral gray seed shifts nothing", () => {
    expect(chooseSemanticScales(ACCENT_STEP_9.gray)).toEqual(SEMANTIC_DEFAULT);
  });
});

describe("a brand its own family cannot escape", () => {
  // #C8102E is a deep crimson. It collides with red, ruby AND oxblood — every
  // scale the error family may reach. This is a real condition with no correct
  // answer available, so the contract is: degrade to the furthest option, and
  // REPORT it. Pinned because the wrong behaviour here is silent and invisible.
  const HARD = "#C8102E";

  it("reports the family it could not separate", () => {
    expect(semanticShiftDiagnostics(HARD)).toEqual(["error"]);
  });

  it("does not silently fall back to the default it cannot use", () => {
    expect(chooseSemanticScales(HARD).error).not.toBe(SEMANTIC_DEFAULT.error);
  });

  it("still separates every family it CAN", () => {
    expect(semanticShiftDiagnostics(HARD)).not.toContain("warning");
    expect(semanticShiftDiagnostics(HARD)).not.toContain("success");
    expect(semanticShiftDiagnostics(HARD)).not.toContain("info");
  });

  it("an ordinary brand reports nothing", () => {
    expect(semanticShiftDiagnostics(ACCENT_STEP_9.blue)).toEqual([]);
    expect(semanticShiftDiagnostics(ACCENT_STEP_9.gray)).toEqual([]);
  });
});
