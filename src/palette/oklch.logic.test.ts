/* =============================================================================
   oklch.logic.test.ts — the colour maths, tested against PUBLISHED values
   -----------------------------------------------------------------------------
   WHY THIS FILE EXISTS, stated plainly, because "the browser suite proves it" is
   the belief it refutes:

   Every colour assertion in the browser suite is an INEQUALITY (>= 4.39,
   >= 0.135, > 1 degree) with wide margins — [[brand-status-collision-gate]]'s own calibration shows observed
   calls at 0.081 (fail) and 0.137 / 0.20 (pass). A transposed matrix coefficient
   or a radians/degrees slip moves the values without moving any comparison across
   a threshold. THE SUITE STAYS GREEN WITH WRONG MATHS. And before this file there
   was no unit test of colour anywhere: the node lane's *.logic.test.ts files were
   dates, hooks, utils and powersearch — not one was colour.

   FALSIFICATION (run it, don't trust it): change 0.4122214708 to 0.4122214700 in
   oklch.ts. `golden` below goes RED; the entire browser suite stays green. Running
   both IS the proof that the suite could not have proved it.
   ============================================================================= */
import { describe, it, expect } from "vitest";
import {
  srgbToOklab, oklabToSrgb, oklabToOklch, oklchToOklab, oklchToSrgb,
  inSrgbGamut, gamutClamp, hueDistance, deltaEOK, linearFromByte, byteFromLinear,
  type RGB,
} from "./oklch";

const hex = (s: string): RGB => ({
  r: parseInt(s.slice(1, 3), 16),
  g: parseInt(s.slice(3, 5), 16),
  b: parseInt(s.slice(5, 7), 16),
});

describe("srgbToOklab — published reference values", () => {
  // Ottosson's own worked examples. White is the anchor: L=1 exactly, no chroma.
  it("white is L=1 with zero chroma", () => {
    const [L, a, b] = srgbToOklab(hex("#ffffff"));
    expect(L).toBeCloseTo(1, 5);
    expect(a).toBeCloseTo(0, 5);
    expect(b).toBeCloseTo(0, 5);
  });

  it("black is the origin", () => {
    const [L, a, b] = srgbToOklab(hex("#000000"));
    expect(L).toBeCloseTo(0, 6);
    expect(a).toBeCloseTo(0, 6);
    expect(b).toBeCloseTo(0, 6);
  });

  it("a neutral gray has no chroma — the axis test a hue-only check would miss", () => {
    const [, a, b] = srgbToOklab(hex("#808080"));
    expect(a).toBeCloseTo(0, 4);
    expect(b).toBeCloseTo(0, 4);
  });

  it("pure red sits where the reference says", () => {
    const [L, a, b] = srgbToOklab(hex("#ff0000"));
    expect(L).toBeCloseTo(0.6279, 3);
    expect(a).toBeCloseTo(0.2249, 3);
    expect(b).toBeCloseTo(0.1258, 3);
  });

  it("pure green sits where the reference says", () => {
    const [L, a, b] = srgbToOklab(hex("#00ff00"));
    expect(L).toBeCloseTo(0.8664, 3);
    expect(a).toBeCloseTo(-0.2339, 3);
    expect(b).toBeCloseTo(0.1795, 3);
  });

  it("pure blue sits where the reference says", () => {
    const [L, a, b] = srgbToOklab(hex("#0000ff"));
    expect(L).toBeCloseTo(0.4520, 3);
    expect(a).toBeCloseTo(-0.0324, 3);
    expect(b).toBeCloseTo(-0.3115, 3);
  });
});

describe("the transfer function round-trips", () => {
  it("every one of the 256 channel values survives linear -> byte", () => {
    for (let c = 0; c <= 255; c++) expect(byteFromLinear(linearFromByte(c))).toBe(c);
  });
});

describe("srgb -> oklab -> srgb round-trips across a lattice", () => {
  it("returns every sampled colour to within 1/255", () => {
    let worst = 0;
    for (let r = 0; r <= 255; r += 17) {
      for (let g = 0; g <= 255; g += 17) {
        for (let b = 0; b <= 255; b += 17) {
          const back = oklabToSrgb(srgbToOklab({ r, g, b }));
          worst = Math.max(worst, Math.abs(back.r - r), Math.abs(back.g - g), Math.abs(back.b - b));
        }
      }
    }
    expect(worst).toBeLessThanOrEqual(1);
  });

  it("survives the polar detour through OKLCH too", () => {
    for (const s of ["#8a2119", "#ff6b5e", "#0891b2", "#16a34a", "#f59e0b"]) {
      const rgb = hex(s);
      const back = oklchToSrgb(oklabToOklch(srgbToOklab(rgb)));
      expect(Math.abs(back.r - rgb.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.g - rgb.g)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.b - rgb.b)).toBeLessThanOrEqual(1);
    }
  });
});

describe("hueDistance — the wraparound the collision gate depends on", () => {
  it("crosses 0/360 correctly", () => {
    expect(hueDistance(359, 1)).toBe(2);
    expect(hueDistance(1, 359)).toBe(2);
  });
  it("is symmetric and caps at 180", () => {
    expect(hueDistance(0, 180)).toBe(180);
    expect(hueDistance(0, 181)).toBe(179);
    expect(hueDistance(90, 90)).toBe(0);
  });
});

describe("gamut", () => {
  it("recognises an in-gamut colour and leaves it alone", () => {
    const lch = oklabToOklch(srgbToOklab(hex("#8a2119")));
    const { clamped, lch: out } = gamutClamp(lch);
    expect(clamped).toBe(false);
    expect(out.C).toBe(lch.C);
  });

  it("rejects a colour outside sRGB — the case §4 refuses rather than maps", () => {
    // A saturated green far beyond sRGB's reach.
    expect(inSrgbGamut(oklchToOklab({ L: 0.7, C: 0.3, h: 150 }))).toBe(false);
  });

  it("clamps by chroma ONLY — lightness and hue must survive", () => {
    const before = { L: 0.7, C: 0.3, h: 150 };
    const { lch: after, clamped } = gamutClamp(before);
    expect(clamped).toBe(true);
    expect(after.L).toBe(before.L);
    expect(after.h).toBe(before.h);
    expect(after.C).toBeLessThan(before.C);
    expect(inSrgbGamut(oklchToOklab(after))).toBe(true);
  });

  it("throws rather than reporting a bogus clamp for an impossible lightness", () => {
    // Every chroma is out of gamut when L is outside [0,1], including 0 — so the
    // binary search would return C=0 and call it a clamp. That is a different
    // failure wearing a success's clothes.
    expect(() => gamutClamp({ L: 1.4, C: 0.1, h: 30 })).toThrow(RangeError);
    expect(() => gamutClamp({ L: -0.2, C: 0.1, h: 30 })).toThrow(RangeError);
  });

  it("lands ON the boundary, not well inside it", () => {
    // A clamp that overshoots would desaturate a brand for no reason. Nudging the
    // result back up must leave the gamut.
    const { lch } = gamutClamp({ L: 0.7, C: 0.3, h: 150 });
    expect(inSrgbGamut(oklchToOklab({ ...lch, C: lch.C + 0.005 }))).toBe(false);
  });
});

describe("deltaEOK", () => {
  it("is zero for a colour against itself", () => {
    const lab = srgbToOklab(hex("#8a2119"));
    expect(deltaEOK(lab, lab)).toBe(0);
  });
  it("orders two pairs the way the shipped gate does", () => {
    const near = deltaEOK(srgbToOklab(hex("#f59e0b")), srgbToOklab(hex("#ff611b")));
    const far = deltaEOK(srgbToOklab(hex("#ffffff")), srgbToOklab(hex("#000000")));
    expect(far).toBeGreaterThan(near);
  });
});

/* -----------------------------------------------------------------------------
   THE CROSS-IMPLEMENTATION CHECK — the strongest evidence in this file.
   The LOCKED table below holds five brand->semantic pairs with
   their dE-OK, computed in June 2026 on the Paper canvas by a completely separate
   route. This implementation reproduces all five to <= 0.0007 — rounding, against
   a table it has never seen. That is what "two implementations agreeing is
   evidence" means in practice, and it is why the header refuses to consolidate
   this file with `_assert.ts`: one implementation agreeing with itself would have
   produced the same green from nothing.
   -------------------------------------------------------------------------- */
describe("cross-check against the proposal's locked collision table", () => {
  const LOCKED: [name: string, brand: string, semantic: string, documented: number][] = [
    ["red -> brick", "#dc2626", "#992e01", 0.138],
    ["amber -> orange", "#f59e0b", "#ff611b", 0.130],
    ["green -> forest", "#16a34a", "#057957", 0.138],
    ["cyan -> cobalt", "#0891b2", "#0066c8", 0.134],
    ["coral -> burnt", "#ff6b5e", "#d24100", 0.134],
  ];

  it.each(LOCKED)("%s matches the documented dE-OK", (_n, brand, semantic, documented) => {
    const got = deltaEOK(srgbToOklab(hex(brand)), srgbToOklab(hex(semantic)));
    // The proposal quotes three decimals, so agreement is bounded by its own precision.
    expect(Math.abs(got - documented)).toBeLessThan(0.001);
  });
});

/* -----------------------------------------------------------------------------
   THE GOLDEN TEST — the one that goes red when a matrix coefficient moves.
   Values pinned from THIS implementation at the commit that introduced it, after
   the published-reference tests above passed. Its job is not to be right in the
   abstract; it is to make an unintended change to the constants IMPOSSIBLE to
   land silently. #8a2119 is oxblood's seed and is in here deliberately.

   ON THE PRECISION — this was got wrong once, and the falsification is what
   caught it. The first version stored 10 decimals and asserted `toBeCloseTo(x, 7)`
   (a 5e-8 tolerance). Planting the plan's named perturbation — 0.4122214708 ->
   0.4122214700, a change of 8e-10 — left all 23 tests GREEN, because that
   coefficient shift propagates to roughly 1.7e-10 in L, far under the threshold.
   A guard that cannot catch the change it was written for is not a guard.

   So: values are stored at FULL DOUBLE PRECISION (toPrecision(17) round-trips an
   IEEE-754 double exactly) and compared at 1e-12. That is tight enough to catch a
   1.7e-10 drift and loose enough to absorb the 1-ulp (~1e-16) differences a
   different JS engine's Math.cbrt / Math.pow can produce.
   -------------------------------------------------------------------------- */
describe("golden", () => {
  const GOLDEN: Record<string, [number, number, number]> = {
    "#8a2119": [0.4200729436661938, 0.12405511981358555, 0.0686823290025872], // oxblood's seed ([[oxblood-preset]])
    "#ff6b5e": [0.709384983102713, 0.16219564957638494, 0.08504608391627771], // the proposal's coral
    "#0891b2": [0.6089109126809603, -0.082801384204304, -0.07383326909938448],
    "#16a34a": [0.6270522294252733, -0.1459686069072528, 0.08696715073421873],
    "#ffffff": [0.9999999934735462, 8.095285553011422e-11, 3.727390762708893e-8],
  };

  /** Tight enough to see a single-coefficient drift; loose enough for cross-engine
   *  1-ulp noise. See the block comment above — this number was measured, not picked. */
  const TOLERANCE = 1e-12;

  it("pins the conversion to fixed byte triples", () => {
    for (const [h, expected] of Object.entries(GOLDEN)) {
      const got = srgbToOklab(hex(h));
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(got[i] - expected[i])).toBeLessThan(TOLERANCE);
      }
    }
  });
});
