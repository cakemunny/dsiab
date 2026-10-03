/* =============================================================================
   oklch.ts — GENERATION-SIDE COLOUR MATHS
   -----------------------------------------------------------------------------
   Forward AND inverse sRGB <-> OKLab/OKLCH, plus a gamut clamp. Pure arithmetic:
   no DOM, no canvas, no Node built-ins, no dependency. It must run in the browser
   (Provider's runtime path) and in Node (the CLI) from the same source.

   WHY THIS DUPLICATES `src/foundations/_assert.ts`, DELIBERATELY
   -------------------------------------------------------------
   `_assert.ts` converts by rasterising on a 1x1 canvas, which is the P3-safe
   readback [[srgb-contrast-checks]] rules and is right for VERIFICATION. It cannot generate: there is
   no inverse, and it needs a live element.

   The tempting move is to share one implementation. It is wrong here, and the
   reason is the repo's own rule inverted. `boxLaw.ts` shares a table between two
   VERIFIERS — fine. Sharing here would be between the PRODUCER (this file shapes
   ramps and picks collision targets in OKLCH) and the VERIFIER (`tooClose` ->
   `deltaEOK` -> `oklab`). A generator that computes "these sit 0.20 apart",
   checked by a function computing the same 0.20 from the same code, agrees with
   itself by construction — "a probe must never read the table the component
   reads", promoted into the architecture and called a virtue.

   BE ACCURATE ABOUT WHAT THIS SEPARATION IS AND IS NOT
   ----------------------------------------------------
   An earlier version of this header said "two implementations agreeing is
   evidence; one agreeing with itself is not." THAT IS NOT TRUE OF THIS FILE and
   the claim is withdrawn. The twelve forward matrix coefficients below are
   CHARACTER-IDENTICAL to `_assert.ts`'s, so the forward transform is one
   implementation typed twice; a transposed coefficient pasted into both would
   agree with itself perfectly. The transfer thresholds differ on paper (0.04045
   here, 0.03928 there) and disagree on ZERO of the 256 byte values, so that is
   not a second opinion either.

   What is genuinely separate is the PLUMBING and the DIRECTION: `_assert.ts`
   reads through a canvas (needed for P3-safe readback, unusable in Node), has no
   inverse, and requires a live element. Those reasons carry the decision on their
   own without an evidence claim the code does not support.

   The evidence that this maths is RIGHT comes from three external references, in
   `oklch.logic.test.ts`: Ottosson's published values, the five dE-OK pairs in
   its LOCKED table (computed in June by a different
   route, reproduced here to <= 0.0007), and — for `parseSeed.ts` — Chrome's own
   CSS engine.

   DO NOT consolidate this with `_assert.ts` in a later normalize pass. NOTE that
   this comment is the WEAKEST rung of the enforcement ladder (unrepresentable >
   guarded > documented > remembered): nothing currently stops a normalize pass
   from merging them. A cross-check test asserting the two agree to 1e-6 is the
   named follow-up that would make the drift impossible without merging the code.
   ============================================================================= */

/** Linear-light [0,1] from an 8-bit sRGB channel. The sRGB transfer function. */
export function linearFromByte(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** 8-bit sRGB from linear-light [0,1]. Inverse of `linearFromByte`, rounded. */
export function byteFromLinear(v: number): number {
  const s = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(s * 255)));
}

export type RGB = { r: number; g: number; b: number };
export type Lab = [L: number, a: number, b: number];
export type LCH = { L: number; C: number; h: number };

/** sRGB bytes -> OKLab. Björn Ottosson's matrices, stated here rather than
 *  imported, so a change to one implementation cannot silently move the other. */
export function srgbToOklab({ r, g, b }: RGB): Lab {
  const lr = linearFromByte(r), lg = linearFromByte(g), lb = linearFromByte(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

/** OKLab -> linear-light sRGB, UNCLAMPED. Components outside [0,1] mean the
 *  colour is outside the sRGB gamut — which is information the caller needs, so
 *  it is not clamped away here. `inSrgbGamut` and `gamutClamp` read it. */
export function oklabToLinearSrgb([L, A, B]: Lab): { r: number; g: number; b: number } {
  const l_ = L + 0.3963377774 * A + 0.2158037573 * B;
  const m_ = L - 0.1055613458 * A - 0.0638541728 * B;
  const s_ = L - 0.0894841775 * A - 1.2914855480 * B;
  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  return {
    r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  };
}

/** OKLab -> sRGB bytes. Out-of-gamut components are clipped by `byteFromLinear`;
 *  call `inSrgbGamut` FIRST when the distinction matters (it does for a seed —
 *  see §4's refusal of wide-gamut input). */
export function oklabToSrgb(lab: Lab): RGB {
  const { r, g, b } = oklabToLinearSrgb(lab);
  return { r: byteFromLinear(r), g: byteFromLinear(g), b: byteFromLinear(b) };
}

/** Is this OKLab colour representable in sRGB? EPS absorbs float noise at the
 *  gamut boundary, where an exactly-in-gamut colour can compute to -1e-17. */
const GAMUT_EPS = 1e-6;
export function inSrgbGamut(lab: Lab): boolean {
  const { r, g, b } = oklabToLinearSrgb(lab);
  return [r, g, b].every((v) => v >= -GAMUT_EPS && v <= 1 + GAMUT_EPS);
}

export function oklabToOklch([L, a, b]: Lab): LCH {
  const C = Math.hypot(a, b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}

export function oklchToOklab({ L, C, h }: LCH): Lab {
  const rad = (h * Math.PI) / 180;
  return [L, C * Math.cos(rad), C * Math.sin(rad)];
}

export function oklchToSrgb(lch: LCH): RGB {
  return oklabToSrgb(oklchToOklab(lch));
}

/** Bring an OKLCH colour into sRGB by reducing CHROMA ONLY, preserving lightness
 *  and hue — the property that matters for a brand ramp, where a hue shift reads
 *  as a different colour and a lightness shift breaks the step's contrast
 *  contract. Binary search, because the gamut boundary is not analytic in OKLCH.
 *
 *  Returns the clamped colour AND whether it moved, because §4 requires the
 *  clamp to be REPORTED: shipping a different colour than the consumer typed,
 *  silently, is the failure this is guarding.
 *
 *  WHY THIS EXISTS WHILE `parseSeed.ts` REFUSES OUT-OF-GAMUT INPUT — the two are
 *  not in tension, and the distinction is the whole point. A SEED is the value a
 *  consumer typed: it must never move, so an out-of-gamut seed is refused rather
 *  than mapped. A GENERATED RAMP STEP is the system's own output, computed to hit
 *  a lightness and contrast target; it has to land somewhere renderable, so it is
 *  clamped — by chroma only, and the caller is told. Refusing input and mapping
 *  output are the same policy applied to two different things.
 *
 *  NOT YET CALLED by shipped code: the ramp generator that uses it is a later
 *  step. It is here, tested, because `parseSeed`'s in-gamut check needs
 *  `inSrgbGamut` from the same module. */
export function gamutClamp(lch: LCH, iterations = 24): { lch: LCH; clamped: boolean } {
  // Chroma reduction cannot rescue a lightness outside [0,1] — every chroma,
  // including 0, is out of gamut, so the search would return C=0 and report a
  // "clamp" that is really an unrepresentable input. Say so instead.
  if (!(lch.L >= 0 && lch.L <= 1)) {
    throw new RangeError(`OKLCH lightness must be within [0, 1]; got ${lch.L}`);
  }
  if (inSrgbGamut(oklchToOklab(lch))) return { lch, clamped: false };
  let lo = 0, hi = lch.C;
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    if (inSrgbGamut(oklchToOklab({ ...lch, C: mid }))) lo = mid;
    else hi = mid;
  }
  return { lch: { ...lch, C: lo }, clamped: true };
}

/** Euclidean distance in OKLab. ~0.10 ~ CIEDE2000 dE 5.
 *  Mirrors `deltaEOK` in `_assert.ts` on purpose — see the header. */
export function deltaEOK(a: Lab, b: Lab): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Smallest angular distance between two hues, in degrees, 0-180. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
