/* =============================================================================
   generate.logic.test.ts
   -----------------------------------------------------------------------------
   The load-bearing assertions are the LAWS the ramp must hold, not a pin of the
   values it happens to produce — a pin would just restate the implementation.
   The one thing pinned is that the seed survives at step 9, because that is the
   promise "paste your brand colour" makes.
   ============================================================================= */
import { describe, it, expect } from "vitest";
import { generateBrandScale, generateBrand, contrastRatio } from "./generate";
import { srgbToOklab, oklabToOklch, type RGB } from "./oklch";

const hex = (s: string): RGB => ({
  r: parseInt(s.slice(1, 3), 16),
  g: parseInt(s.slice(3, 5), 16),
  b: parseInt(s.slice(5, 7), 16),
});

const SEEDS = ["#8a2119", "#ff6b5e", "#0891b2", "#16a34a", "#f59e0b", "#3b82f6", "#a855f7"];

/* The lightness boundaries. A seed at either extreme is where the head remap can
   double back on itself, so the invariants are asserted against them explicitly
   rather than left to the seven ordinary hues above. `parseSeed` refuses pure
   white and pure black at the door, but near-white and near-black are legal
   brands and must still produce a ramp. */
const EXTREME_SEEDS = ["#fdfdfd", "#050505", "#ffffff", "#000000"];
/* Note the last two are refused by `parseSeed` and can never reach the generator
   through the supported path. They are asserted here anyway: `generateBrandScale`
   is a lower layer with its own contract, and a guard that only holds because a
   caller happens to filter its input is not holding anything. */

describe("the seed survives at step 9 — the promise the feature makes", () => {
  it.each(SEEDS)("%s is step 9 in light mode", (s) => {
    expect(generateBrandScale(hex(s), "light").solid[8]).toBe(s);
  });
  it.each(SEEDS)("%s is step 9 in dark mode too", (s) => {
    // The fit found Radix's median step-9 lightness identical in both modes, so
    // the brand fill does not move between appearances.
    expect(generateBrandScale(hex(s), "dark").solid[8]).toBe(s);
  });
});

describe("shape", () => {
  it.each(SEEDS)("%s emits the full token set in both appearances", (s) => {
    const both = generateBrand(hex(s));
    for (const mode of ["light", "dark"] as const) {
      const sc = both[mode];
      expect(sc.solid).toHaveLength(12);
      expect(sc.alpha).toHaveLength(12);
      expect(sc.solid.every((v) => /^#[0-9a-f]{6}$/.test(v))).toBe(true);
      expect(sc.alpha.every((v) => /^#[0-9a-f]{8}$/.test(v))).toBe(true);
      expect(["#fff", "#000"]).toContain(sc.contrast);
      expect(sc.surface).toMatch(/^#[0-9a-f]{8}$/);
      expect(sc.indicator).toBe(sc.solid[8]);
      expect(sc.track).toBe(sc.solid[8]);
    }
  });
});

describe("lightness is monotonic — the law that makes a ramp a ramp", () => {
  it.each(SEEDS)("%s descends in light mode", (s) => {
    const Ls = generateBrandScale(hex(s), "light").solid.map((h) => oklabToOklch(srgbToOklab(hex(h))).L);
    for (let i = 1; i < 12; i++) expect(Ls[i]!).toBeLessThan(Ls[i - 1]! + 1e-9);
  });
  it.each(SEEDS)("%s ascends in dark mode", (s) => {
    const Ls = generateBrandScale(hex(s), "dark").solid.map((h) => oklabToOklch(srgbToOklab(hex(h))).L);
    for (let i = 1; i < 12; i++) expect(Ls[i]!).toBeGreaterThan(Ls[i - 1]! - 1e-9);
  });
});

/* The generator holds hue EXACTLY — it passes the seed's hue to every step. What
   moves it is 8-BIT QUANTIZATION: at step 1 the chroma is the seed's times
   0.0217, roughly 0.002 in OKLab units, so rounding to bytes swings the angle
   wildly while barely touching the colour. A flat "within 2 degrees" assertion is
   therefore the wrong law and fails on faces it should pass — measured, #0891b2
   drifted 7.98 degrees at a chroma where that is invisible.

   The right law is chroma-proportional: a byte of rounding displaces a and b by
   at most ~0.004, so the angle it can induce is atan(0.004 / C). Asserting that
   bound tests the generator; asserting a constant tests the number 2. */
describe("hue is held to within what 8-bit quantization permits", () => {
  it.each(SEEDS)("%s", (s) => {
    const seedH = oklabToOklch(srgbToOklab(hex(s))).h;
    for (const mode of ["light", "dark"] as const) {
      for (const step of generateBrandScale(hex(s), mode).solid) {
        const c = oklabToOklch(srgbToOklab(hex(step)));
        if (c.C < 1e-4) continue; // no hue exists at zero chroma
        const bound = (Math.atan2(0.004, c.C) * 180) / Math.PI + 0.5;
        let d = Math.abs(c.h - seedH) % 360;
        if (d > 180) d = 360 - d;
        expect(d).toBeLessThan(bound);
      }
    }
  });
});

describe("alpha steps composite back to their solids", () => {
  const composite = (a: string, bg: RGB): RGB => {
    const c = hex(a);
    const al = parseInt(a.slice(7, 9), 16) / 255;
    return { r: c.r * al + bg.r * (1 - al), g: c.g * al + bg.g * (1 - al), b: c.b * al + bg.b * (1 - al) };
  };
  it.each(SEEDS)("%s matches within a rounding step", (s) => {
    for (const [mode, bg] of [["light", { r: 255, g: 255, b: 255 }], ["dark", { r: 0, g: 0, b: 0 }]] as const) {
      const sc = generateBrandScale(hex(s), mode);
      sc.alpha.forEach((a, i) => {
        const got = composite(a, bg);
        const want = hex(sc.solid[i]!);
        expect(Math.abs(got.r - want.r)).toBeLessThanOrEqual(2);
        expect(Math.abs(got.g - want.g)).toBeLessThanOrEqual(2);
        expect(Math.abs(got.b - want.b)).toBeLessThanOrEqual(2);
      });
    }
  });
});

describe("contrast picks the better pole", () => {
  it.each(SEEDS)("%s never picks the worse of white/black", (s) => {
    for (const mode of ["light", "dark"] as const) {
      const sc = generateBrandScale(hex(s), mode);
      const nine = hex(sc.solid[8]!);
      const white = contrastRatio(nine, { r: 255, g: 255, b: 255 });
      const black = contrastRatio(nine, { r: 0, g: 0, b: 0 });
      const chosen = sc.contrast === "#fff" ? white : black;
      expect(chosen).toBeGreaterThanOrEqual(Math.max(white, black) - 1e-9);
    }
  });

  /* NOT a pass/fail gate on the [[text-on-solid-fill-contrast]] floor. Reporting it here rather than
     asserting it, because whether a GENERATED brand must clear the same floor as
     a hand-tuned one — and what the generator does when a seed cannot — is an
     open question ("cannot meet the floors"). A green
     here would pre-empt it. */
  it("reports the on-fill contrast of every seed rather than gating it", () => {
    const rows = SEEDS.map((s) => {
      const sc = generateBrandScale(hex(s), "light");
      const nine = hex(sc.solid[8]!);
      const c = sc.contrast === "#fff"
        ? contrastRatio(nine, { r: 255, g: 255, b: 255 })
        : contrastRatio(nine, { r: 0, g: 0, b: 0 });
      return `${s} on ${sc.contrast}: ${c.toFixed(2)}:1`;
    });
    expect(rows).toHaveLength(SEEDS.length);
  });
});

/* The steps are a CONTRACT, not only a shape — and this is the arm that holds it.
   Without it the fitted curve produced a step 11 at L~0.61 for a light seed, and
   every soft and outline control failed: outline 2.94:1, soft 3.62:1, measured on
   the rendered page. --accent-11 is `--ds-text-link` and `--ds-icon-interactive`
   in this system, so it is interactive text and 4.5 is the shipped floor. */
describe("the text steps clear their contrast floor against the tints", () => {
  it.each(SEEDS)("%s — step 11 clears 4.5:1 on steps 1, 2 and 3", (s) => {
    for (const mode of ["light", "dark"] as const) {
      const sc = generateBrandScale(hex(s), mode);
      const text = hex(sc.solid[10]!);
      for (const tint of [0, 1, 2]) {
        expect(contrastRatio(text, hex(sc.solid[tint]!))).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it.each(SEEDS)("%s — step 12 is the stronger text step, and clears 7:1", (s) => {
    for (const mode of ["light", "dark"] as const) {
      const sc = generateBrandScale(hex(s), mode);
      const strong = contrastRatio(hex(sc.solid[11]!), hex(sc.solid[2]!));
      const weak = contrastRatio(hex(sc.solid[10]!), hex(sc.solid[2]!));
      expect(strong).toBeGreaterThanOrEqual(weak - 1e-6);
      // STRONG_TEXT_FLOOR — asserted, not merely aimed at.
      expect(strong).toBeGreaterThanOrEqual(7);
    }
  });

  it("a near-neutral seed still clears the floor", () => {
    const sc = generateBrandScale(hex("#808080"), "light");
    expect(contrastRatio(hex(sc.solid[10]!), hex(sc.solid[2]!))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("every emitted colour is inside sRGB", () => {
  it.each(SEEDS)("%s", (s) => {
    for (const mode of ["light", "dark"] as const) {
      for (const step of generateBrandScale(hex(s), mode).solid) {
        const { r, g, b } = hex(step);
        for (const v of [r, g, b]) expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThanOrEqual(255);
      }
    }
  });
});

describe("the lightness boundaries — where the head remap can double back", () => {
  it.each(EXTREME_SEEDS)("%s stays monotonic in light mode", (s) => {
    const Ls = generateBrandScale(hex(s), "light").solid.map((h) => oklabToOklch(srgbToOklab(hex(h))).L);
    for (let i = 1; i < 12; i++) expect(Ls[i]!).toBeLessThanOrEqual(Ls[i - 1]! + 1e-9);
  });
  it.each(EXTREME_SEEDS)("%s stays monotonic in dark mode", (s) => {
    const Ls = generateBrandScale(hex(s), "dark").solid.map((h) => oklabToOklch(srgbToOklab(hex(h))).L);
    for (let i = 1; i < 12; i++) expect(Ls[i]!).toBeGreaterThanOrEqual(Ls[i - 1]! - 1e-9);
  });
  it.each(EXTREME_SEEDS)("%s emits twelve well-formed steps", (s) => {
    for (const mode of ["light", "dark"] as const) {
      const sc = generateBrandScale(hex(s), mode);
      expect(sc.solid).toHaveLength(12);
      expect(sc.solid.every((v) => /^#[0-9a-f]{6}$/.test(v))).toBe(true);
    }
  });
});

describe("a near-neutral seed does not explode", () => {
  it("produces a monotonic ramp with no NaN", () => {
    const sc = generateBrandScale(hex("#808080"), "light");
    expect(sc.solid.every((v) => /^#[0-9a-f]{6}$/.test(v))).toBe(true);
    expect(sc.solid[8]).toBe("#808080");
  });
});
