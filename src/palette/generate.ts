/* =============================================================================
   generate.ts — SEED -> A 12-STEP BRAND SCALE
   -----------------------------------------------------------------------------
   Pure arithmetic. No DOM, no Node built-ins, no dependency, so the same code
   runs in `Provider` (runtime) and in the CLI.

   WHERE THE CURVE COMES FROM — IT IS FITTED, NOT INVENTED
   -------------------------------------------------------
   The system specifies no ramp-shaping curve, and inventing one would be the
   defect the no-invented-values rule exists to prevent. So the curves below were
   MEASURED off Radix's own 25 chromatic scales (gray excluded): every scale
   converted to OKLCH, then the per-step median taken across all of them.

   Three facts fell out of that fit, and they are what the generator is built on:

     1. LIGHTNESS per step is remarkably consistent across hues, so it can be a
        curve rather than a per-brand decision.
     2. CHROMA peaks exactly at step 9 and falls away either side, so every step's
        chroma can be expressed as a MULTIPLE of step 9's.
     3. HUE drifts by at most ~2 degrees across a whole ramp. Radix effectively
        holds hue constant, so this generator does too — well inside the vendor's
        own variance.

   STEP 9 IS THE SEED, EXACTLY.
   A brand owner pastes their brand colour and expects to see it on the primary
   button. The fit says Radix's median step-9 lightness is 0.6341 in BOTH
   appearances — the solid brand fill barely moves between light and dark — so
   honouring the seed at step 9 in both modes is what the vendor already does.
   Steps 1-8 keep the fitted absolute lightness (in light mode they are near-white
   surface tints whatever the brand is); steps 10-12 shift with the seed so the
   dark end stays relative to the brand rather than to a constant.

   These are SUB-DECISIONS inside a ruling and each one is named here rather than
   defaulted silently: seed-at-step-9, absolute light tints, relative dark end,
   constant hue, chroma-only gamut clamping.
   ============================================================================= */
import {
  type RGB, type LCH,
  srgbToOklab, oklabToOklch, oklchToOklab, oklabToSrgb,
  inSrgbGamut, gamutClamp, linearFromByte,
} from "./oklch";

/** Median per-step OKLCH lightness of Radix's 25 chromatic scales. */
const L_CURVE = {
  light: [0.9936, 0.9819, 0.9588, 0.9325, 0.8995, 0.8592, 0.8063, 0.7336, 0.6341, 0.6075, 0.5444, 0.3320],
  dark: [0.1880, 0.2109, 0.2673, 0.3088, 0.3447, 0.3889, 0.4523, 0.5374, 0.6341, 0.6733, 0.7852, 0.9108],
} as const;

/** Per-step chroma as a multiple of step 9's. Peaks at step 9 by construction. */
const C_CURVE = {
  light: [0.0217, 0.0652, 0.1625, 0.2592, 0.3644, 0.4834, 0.6259, 0.7464, 1, 0.9912, 0.9031, 0.4493],
  dark: [0.0923, 0.1333, 0.3139, 0.4577, 0.5042, 0.5269, 0.5902, 0.7152, 1, 0.9515, 0.8183, 0.2931],
} as const;

/**
 * Place step `i`'s lightness for a seed whose own lightness is `seedL`.
 *
 * A ramp has exactly one law that cannot bend: it must be MONOTONIC. Holding
 * steps 1-8 at the fitted absolute lightness while pinning step 9 to the seed
 * breaks it the moment the seed sits far from the anchor — measured, amber
 * (#f59e0b, L 0.80) put step 9 ABOVE the fitted step 8 (0.7336), and oxblood
 * (#8a2119, L 0.42) put it below the fitted dark step 8. So the curve is
 * REMAPPED around the seed instead of being applied on top of it:
 *
 *   - step 1 keeps its fitted end (near-white in light, near-black in dark —
 *     Radix's step 1 barely varies by hue, so there is nothing to move);
 *   - step 9 IS the seed, exactly, in both appearances;
 *   - steps 2-8 are the fitted curve rescaled into [step 1, seed];
 *   - steps 10-12 extend past the seed by the fitted delta, scaled by how the
 *     seed compares to the anchor, so a dark brand gets a proportionally dark
 *     tail rather than one pinned to a constant it may already be past.
 *
 * Monotonic by construction, because each segment is an affine remap of a
 * monotonic curve.
 */
function placeL(curve: readonly number[], seedL: number, i: number): number {
  const anchor = curve[8]!, last = curve[11]!;
  if (i === 8) return seedL;

  /* The head runs from step 1 to the seed, so step 1 has to sit BEYOND the seed
     or the ramp doubles back on itself. The fitted endpoint does for every
     ordinary brand — 0.9936 in light, 0.188 in dark — but not for one at the
     extreme: a seed lighter than 0.9936 would make steps 1-8 ASCEND into it and
     then the tail descend away, which is a peak, not a ramp. So the endpoint
     yields to the seed rather than the other way round. The ramp compresses for
     such a brand, which is the honest outcome: there is no twelve-step scale
     with a near-white step 1 under a near-white step 9. */
  const MARGIN = 0.02;
  const towardsLight = curve[0]! > anchor; // light-mode curves start near white
  const first = towardsLight
    ? Math.min(1, Math.max(curve[0]!, seedL + MARGIN))
    : Math.max(0, Math.min(curve[0]!, seedL - MARGIN));

  if (i < 8) {
    const span = anchor - curve[0]!; // the fitted head span, never zero
    const t = (curve[i]! - curve[0]!) / span; // 0 at step 1, 1 at step 9
    return first + t * (seedL - first);
  }
  // Tail: the fitted delta from the anchor, scaled by the seed's own lightness,
  // so the tail always continues in the same direction the head was travelling.
  const scale = anchor === 0 ? 1 : seedL / anchor;
  const t = (curve[i]! - anchor) / (last - anchor); // 0 at step 9, 1 at step 12
  const delta = (last - anchor) * scale;
  return Math.max(0, Math.min(1, seedL + t * delta));
}

export type Appearance = "light" | "dark";

export interface BrandScale {
  /** 12 solid steps, `#rrggbb`. */
  solid: string[];
  /** 12 alpha steps, `#rrggbbaa`, composited to match `solid` over the mode's bg. */
  alpha: string[];
  /** `#fff` or `#000` — whichever clears WCAG against step 9. */
  contrast: string;
  /** Translucent tint for panel surfaces, mirroring oxblood's shape. */
  surface: string;
  /** Radix aliases both to step 9. */
  indicator: string;
  track: string;
}

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
const toHex = ({ r, g, b }: RGB) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;

/** WCAG relative luminance. Independent of `_assert.ts`'s copy on purpose — this
 *  is the producer side; that one verifies what shipped. */
function luminance({ r, g, b }: RGB): number {
  return 0.2126 * linearFromByte(r) + 0.7152 * linearFromByte(g) + 0.0722 * linearFromByte(b);
}
export function contrastRatio(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const WHITE: RGB = { r: 255, g: 255, b: 255 };
const BLACK: RGB = { r: 0, g: 0, b: 0 };

/** The alpha step whose composite over `bg` equals `target`.
 *  Standard derivation: take the smallest alpha that can still reach the target
 *  on its most-displaced channel, then solve the colour from it. Below that
 *  alpha no colour composites to the target; above it the tint is needlessly
 *  saturated. */
function alphaOver(target: RGB, bg: RGB): string {
  const ch: (keyof RGB)[] = ["r", "g", "b"];
  let a = 0;
  for (const c of ch) {
    const limit = target[c] < bg[c] ? 0 : 255;
    if (limit !== bg[c]) a = Math.max(a, (target[c] - bg[c]) / (limit - bg[c]));
  }
  a = Math.min(1, Math.max(0, a));
  if (a === 0) return `${toHex(bg)}00`;
  const solve = (c: keyof RGB) => (target[c] - bg[c] * (1 - a)) / a;
  const rgb = { r: solve("r"), g: solve("g"), b: solve("b") };
  return `${toHex(rgb)}${hex2(a * 255)}`;
}

/**
 * Generate one appearance's scale from a seed.
 *
 * The seed lands at step 9 unchanged (subject only to gamut clamping, which
 * cannot move an in-gamut seed — and `parseSeed` refuses an out-of-gamut one).
 */
export function generateBrandScale(seed: RGB, appearance: Appearance): BrandScale {
  const seedLch = oklabToOklch(srgbToOklab(seed));
  const Ls = L_CURVE[appearance];
  const Cs = C_CURVE[appearance];

  const shaped: LCH[] = [];
  for (let i = 0; i < 12; i++) {
    const lch: LCH = { L: placeL(Ls, seedLch.L, i), C: seedLch.C * Cs[i]!, h: seedLch.h };
    shaped.push(inSrgbGamut(oklchToOklab(lch)) ? lch : gamutClamp(lch).lch);
  }

  // The text steps must clear their floor against step 3, the darkest tint a soft
  // fill uses — clearing it clears steps 1 and 2 too. See the block above.
  const step3 = oklabToSrgb(oklchToOklab(shaped[2]!));
  const eleven = enforceTextContrast(shaped[10]!, step3, TEXT_FLOOR, appearance);
  shaped[10] = eleven.lch;
  const twelve = enforceTextContrast(shaped[11]!, step3, STRONG_TEXT_FLOOR, appearance);
  shaped[11] = twelve.lch;
  // Monotonicity survives the adjustment: step 12 must stay past step 11.
  if (appearance === "light" ? shaped[11]!.L > shaped[10]!.L : shaped[11]!.L < shaped[10]!.L) {
    shaped[11] = { ...shaped[11]!, L: shaped[10]!.L };
  }

  const solidRgb = shaped.map((c) => oklabToSrgb(oklchToOklab(c)));
  const bg = appearance === "light" ? WHITE : BLACK;
  const nine = solidRgb[8]!;

  return {
    solid: solidRgb.map(toHex),
    alpha: solidRgb.map((t) => alphaOver(t, bg)),
    // On-fill foreground: whichever pole reads better on the brand fill. [[text-on-solid-fill-contrast]]'s
    // floor for text on a solid fill is checked by the guard, not assumed here.
    contrast: contrastRatio(nine, WHITE) >= contrastRatio(nine, BLACK) ? "#fff" : "#000",
    // oxblood's shape: a step-2 tint carrying its own alpha (cc light / 80 dark).
    surface: `${solidRgb[1] ? toHex(solidRgb[1]) : toHex(bg)}${appearance === "light" ? "cc" : "80"}`,
    indicator: toHex(nine),
    track: toHex(nine),
  };
}

/* -----------------------------------------------------------------------------
   THE STEPS ARE A CONTRACT, NOT ONLY A SHAPE.
   Fitting Radix's curve reproduces its geometry and drops the thing that makes
   the geometry safe. Radix's step 11 is defined as text that clears 4.5:1 on
   steps 1-3, and step 12 as high-contrast text. Shape alone does not deliver
   that: measured, a light seed (#ff6b5e, L 0.709) put step 11 at L~0.61 — a
   mid-tone — and every soft and outline control on the page failed, outline at
   2.94:1 and soft at 3.62:1, while the solid button was fine at 7.52:1.

   In this system --accent-11 IS `--ds-text-link` and `--ds-icon-interactive`
   (semantic.css:34,45), so it is body-sized interactive text and 4.5 is the
   floor the system already audits against. Nothing is invented here: the ratio
   is WCAG AA for text, which the shipped TEXT_ON_BG pairings already use.

   So after the ramp is shaped, the two text steps are DARKENED (light) or
   LIGHTENED (dark) until they clear their floor against step 3 — the darkest of
   the three tints a soft fill can use, so clearing it clears 1 and 2 as well.
   Chroma and hue are untouched; only lightness moves, which is the same axis the
   shape already travels, so the ramp stays monotonic.
   -------------------------------------------------------------------------- */

/** WCAG AA for text. The floor the system already audits `--ds-text-*` against. */
const TEXT_FLOOR = 4.5;
/** Step 12 is the high-contrast text step; Radix keeps it far above the floor. */
const STRONG_TEXT_FLOOR = 7;

/** Move `lch` along L, away from `bg`, until it clears `floor` — or until it runs
 *  out of room. Returns the adjusted colour and whether the floor was reached, so
 *  a seed that cannot satisfy the contract is REPORTED rather than silently
 *  shipped just under it. */
function enforceTextContrast(
  lch: LCH, bg: RGB, floor: number, appearance: Appearance,
): { lch: LCH; met: boolean } {
  const darken = appearance === "light";
  // ALWAYS return a gamut-clamped colour. Returning the raw LCH let the final
  // conversion clip each channel independently, and per-channel clipping SHIFTS
  // HUE — measured, amber moved 7.3 degrees at a chroma where that is plainly
  // visible. Clamping reduces chroma and preserves hue, which is the trade the
  // ramp wants.
  const solve = (L: number) => gamutClamp({ ...lch, L }).lch;
  const at = (L: number) => oklabToSrgb(oklchToOklab(solve(L)));

  // Test the QUANTIZED colour, not the continuous one. The search converges on a
  // real number; what ships is 8 bits, and rounding was landing it at 4.4848
  // against a 4.5 floor — a guard that verifies a value other than the one that
  // renders is not a guard.
  if (contrastRatio(at(lch.L), bg) >= floor) return { lch: solve(lch.L), met: true };

  const limit = darken ? 0 : 1;
  if (contrastRatio(at(limit), bg) < floor) return { lch: solve(limit), met: false };

  let lo = darken ? limit : lch.L;
  let hi = darken ? lch.L : limit;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(at(mid), bg) >= floor) { if (darken) lo = mid; else hi = mid; }
    else { if (darken) hi = mid; else lo = mid; }
  }
  // Walk off the boundary until the ROUNDED colour clears the floor. One or two
  // steps of 0.002 in L; bounded so a pathological hue cannot loop.
  let L = darken ? lo : hi;
  for (let i = 0; i < 40 && contrastRatio(at(L), bg) < floor; i++) {
    L += darken ? -0.002 : 0.002;
    if (L < 0 || L > 1) { L = limit; break; }
  }
  return { lch: solve(L), met: contrastRatio(at(L), bg) >= floor };
}

/** Both appearances at once — what the Provider and the CLI both need. */
export function generateBrand(seed: RGB): Record<Appearance, BrandScale> {
  return { light: generateBrandScale(seed, "light"), dark: generateBrandScale(seed, "dark") };
}
