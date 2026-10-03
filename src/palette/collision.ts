/* =============================================================================
   collision.ts — CHOOSING THE SEMANTIC SHIFT FOR A SEEDED BRAND
   -----------------------------------------------------------------------------
   Pure arithmetic. No DOM, no dependency — runs in `Provider` and in Node, the
   same constraint `generate.ts` and `oklch.ts` carry.

   THE PROBLEM THIS SOLVES. A brand chosen from the 27 NAMED accents gets its
   semantic shift from a hand-ruled lookup: `theme.css` carries one static block
   per colliding accent. A brand supplied as `{ seed: "#..." }` has no name, so
   no block can serve it — and that is the only route to a client's exact hex.
   Before this file, a red-seeded brand kept a red error and a destructive button
   rendered the same colour as a primary one.

   WHY THIS IS NOT A LOOKUP. The seed space is the whole hue circle, not an enum.
   Any static block is right for the seeds it was tuned against and wrong for the
   rest, which is precisely the shape of bug that passes a two-sample test.

   THE RULE — SUB-DECISION, and the first version of it was WRONG.
   "Take the candidate furthest from the seed" was tried and disproved: the scale
   furthest from a red brand is lime, so it produced a lime error message. An
   error that is not red is not an error. The hand-ruled table never once routes
   error to a green or info to a red — that constraint was encoded twenty times
   and written down zero times.
   So: candidates are PER FAMILY, ordered nearest-first, and the shift takes the
   SMALLEST move the gate allows. Error moves within the reds, warning within the
   warms, success within the greens, info within the blues. Red falls through to
   oxblood only because ruby cannot clear a red brand — the named reds sit ~ΔE-OK
   0.07 apart — which is exactly what the table's own note records.

   THE SHIFTS CASCADE, AND MISSING THAT IS THE EASY BUG. Moving one family can
   collide it with another. An amber brand moves warning to orange; orange warning
   then sits ~ΔE-OK 0.10 from the default red error, so error must move too — even
   though red never collided with the brand. The table records exactly this for
   gold/yellow/amber/lime. A greedy per-family pass cannot find it, because it
   only ever moves the family that is itself in trouble; this searches all 108
   assignments and takes the one with the least total movement.

   THE GATE IS DUPLICATED ON PURPOSE. `_assert.ts` owns the verifier's copy and
   rasterises through a canvas for P3-safe readback; this is the producer's copy
   and is pure. Sharing them would let the generator be checked by its own
   arithmetic — see `oklch.ts`'s header for the full reasoning. Only the DATA is
   shared, from `collisionTable.ts`.
   ============================================================================= */
import { srgbToOklab, oklabToOklch, deltaEOK, hueDistance, type Lab, type RGB } from "./oklch";
import { parseSeed } from "./parseSeed";
import {
  FAMILY_CANDIDATES, SCALE_STEP_9, type SemFamily,
} from "./collisionTable";

/** Producer-side gate, mirroring the verifier's thresholds in `_assert.ts`.
 *  A pair collides only when BOTH axes are low, so it clears on either. */
export const MIN_BRAND_DELTA_E = 0.135;
export const MIN_BRAND_HUE = 40;

const FAMILY_ORDER: SemFamily[] = ["error", "warning", "success", "info"];

interface Sample { lab: Lab; hue: number }

/** OKLab + hue of a colour, via the producer's own maths.
 *
 *  Accepts an already-parsed `RGB` as well as a hex string, because the live
 *  path arrives pre-parsed: `Provider` parses the seed once and hands
 *  `customBrandProperties` the `RGB`. Re-serialising it to hex just to parse it
 *  back would be a second parse that could disagree with the first. */
function sample(input: string | RGB): Sample {
  let rgb: RGB;
  if (typeof input === "string") {
    const parsed = parseSeed(input);
    if (!parsed.ok) throw new Error(`collision: unparseable colour ${input}`);
    rgb = parsed.rgb;
  } else {
    rgb = input;
  }
  const lab = srgbToOklab(rgb);
  return { lab, hue: oklabToOklch(lab).h };
}

/** True when two colours are close enough to read as the same. */
function collides(a: Sample, b: Sample): boolean {
  return deltaEOK(a.lab, b.lab) < MIN_BRAND_DELTA_E
    && hueDistance(a.hue, b.hue) < MIN_BRAND_HUE;
}

/** Cache: the scale constants never change within a process. */
const SCALE_SAMPLES = new Map<string, Sample>();
function scaleSample(scale: string): Sample {
  let s = SCALE_SAMPLES.get(scale);
  if (!s) {
    const hex = SCALE_STEP_9[scale];
    if (!hex) throw new Error(`collision: no step-9 recorded for scale ${scale}`);
    s = sample(hex);
    SCALE_SAMPLES.set(scale, s);
  }
  return s;
}

/**
 * Pick the semantic scale for each family, given a brand seed.
 *
 * Returns the same shape the named path produces, so the result can be compared
 * directly against `expectedScales(accent)` — which is what proves the chooser
 * agrees with twenty decisions already made by hand.
 */
export function chooseSemanticScales(seedInput: string | RGB): Record<SemFamily, string> {
  const seed = sample(seedInput);

  // WHY AN EXHAUSTIVE SEARCH RATHER THAN FIXING EACH FAMILY IN TURN.
  // A per-family pass deadlocks, and the hand table records the case that proves
  // it: an amber brand must move warning to orange, but orange collides with the
  // DEFAULT red error, so error has to vacate first — even though red never
  // collided with the brand. One family moves to unblock another. A greedy pass
  // only ever moves the family that is itself colliding, so it cannot find that.
  //
  // The space is 3 x 3 x 3 x 4 = 108 assignments. Enumerating it is cheaper than
  // reasoning about the ordering, and it is exhaustive rather than merely
  // plausible — no seed can hit a case the search missed.
  const lists = FAMILY_ORDER.map((f) => FAMILY_CANDIDATES[f]);
  let best: { assignment: Record<SemFamily, string>; cost: number; violations: number; deficit: number } | null = null;

  for (let i0 = 0; i0 < lists[0].length; i0++)
    for (let i1 = 0; i1 < lists[1].length; i1++)
      for (let i2 = 0; i2 < lists[2].length; i2++)
        for (let i3 = 0; i3 < lists[3].length; i3++) {
          const idx = [i0, i1, i2, i3];
          const scales = idx.map((n, f) => lists[f][n]);
          const samples = scales.map(scaleSample);

          // COUNT violations rather than rejecting on the first one. Some brands
          // cannot be fully separated — a deep crimson collides with every red the
          // error family may reach — and an all-or-nothing filter degrades all
          // four families when only one was stuck. Scoring lets the three that
          // CAN be solved stay solved.
          let violations = 0;
          // How BADLY it violates, not just how often. When a family cannot be
          // separated at all — a deep crimson against every red — every candidate
          // scores one violation, and a tie broken on movement alone picks the
          // NEAREST, which is the worst possible answer: the brand's own colour.
          // Deficit ranks the unavoidable failures by how much separation they
          // still buy, so an impossible case degrades to the most distinct option
          // rather than the least.
          let deficit = 0;
          const rate = (a: Sample, b: Sample) => {
            if (!collides(a, b)) return;
            violations++;
            deficit += Math.max(0, MIN_BRAND_DELTA_E - deltaEOK(a.lab, b.lab));
          };
          for (const s of samples) rate(seed, s);
          for (let a = 0; a < samples.length; a++)
            for (let b = a + 1; b < samples.length; b++) rate(samples[a], samples[b]);

          // Fewest violations first; among equals, the smallest total move. Each
          // list is ordered nearest-first, so the sum of indices IS "how far this
          // assignment strays from the defaults".
          const cost = idx.reduce((a, b) => a + b, 0);
          const better = !best
            || violations < best.violations
            || (violations === best.violations && deficit < best.deficit - 1e-9)
            || (violations === best.violations
                && Math.abs(deficit - best.deficit) <= 1e-9 && cost < best.cost);
          if (better) {
            const assignment = {} as Record<SemFamily, string>;
            FAMILY_ORDER.forEach((f, n) => (assignment[f] = scales[n]));
            best = { assignment, cost, violations, deficit };
          }
        }

  // The search always yields an assignment now — it scores rather than filters —
  // so there is no silent fallback path. Where `violations > 0` the brand could
  // not be fully separated and `semanticShiftDiagnostics` names the families, so
  // the condition is reported rather than absorbed.
  return best!.assignment;
}

/**
 * Which families the chooser could not separate from this seed.
 *
 * Empty for almost every brand. Non-empty is a real answer, not a failure to
 * compute: a deep-crimson brand exhausts every red the error family may use. The
 * caller surfaces it — a consumer whose destructive colour cannot be told apart
 * from their brand needs to know at build time, not from a support ticket.
 */
export function semanticShiftDiagnostics(seedInput: string | RGB): SemFamily[] {
  const seed = sample(seedInput);
  const chosen = chooseSemanticScales(seedInput);
  return FAMILY_ORDER.filter((f) => collides(seed, scaleSample(chosen[f])));
}
