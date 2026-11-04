/* The generator's button search and brand analysis ([[generated-button-fill]]), on the custom-accent
   census's named examples. Each row states what the census measured. Two light shades land one
   step from the census's, because the search measures hover and press on the bytes that paint
   where the census blended unrounded: #00a86b goes to #43ca8a (census #42c98a) and #ff8c00 to
   #ff9a40 (census #ff9b43). Both pass question 2. */
import { describe, expect, it } from "vitest";
import { analyseBrand } from "./brandAnalysis";
import { labelOnFill, pressed, searchFill } from "./buttonFill";
import { chooseSemanticScales, chooseSemanticScalesFor } from "./collision";
import { parseSeed } from "./parseSeed";
import type { RGB } from "./oklch";

function seed(s: string): RGB {
  const p = parseSeed(s);
  if (!p.ok) throw new Error(`${s} did not parse`);
  return p.rgb;
}

describe("question 2 and the search, under rule (b)", () => {
  it.each([
    // seed, light fill, dark fill, direction, ink
    ["#3b82f6", "#2b72e5", "#2b72e5", "darker", "white"],
    ["#ff6b5e", "#d4433a", "#d4433a", "darker", "white"],
    ["#00a86b", "#43ca8a", "#42c98a", "lighter", "nearBlack"],
    ["#ff8c00", "#ff9a40", "#ff9a40", "lighter", "nearBlack"],
    ["#e91e63", "#e51760", "#e51760", "darker", "white"],
    ["#8fa9ff", "#5c72c3", "#5c72c3", "darker", "white"],
  ] as const)("%s adjusts to %s in light and %s in dark, %s, with %s ink", (s, light, dark, direction, ink) => {
    for (const [appearance, fill] of [["light", light], ["dark", dark]] as const) {
      const r = searchFill(seed(s), appearance);
      expect(r).toMatchObject({ fill, adjusted: true, direction });
      expect(r.label.passes).toBe(true);
      expect(r.label.ink).toBe(ink);
    }
  });

  it.each(["#6e56cf", "#c8102e", "#fff59d", "#0b1a3a"])("%s passes as typed in both appearances", (s) => {
    for (const appearance of ["light", "dark"] as const) {
      expect(searchFill(seed(s), appearance)).toMatchObject({ fill: s, adjusted: false, direction: null, chromaLost: 0 });
    }
  });

  it("reports chroma lost on the painted shade (answer F)", () => {
    const r = searchFill(seed("#ff8c00"), "light");
    expect(r.chromaLost).toBeGreaterThan(0.1);
    expect(r.chromaLost).toBeLessThan(0.14);
    // Rounding the painted hex alone moves chroma by a few ten-thousandths, which is not the clamp.
    expect(searchFill(seed("#ff6b5e"), "light").chromaLost).toBeLessThan(0.001);
  });

  it("holds every state: a fill that passes at rest but not under the overlay fails", () => {
    const blue = labelOnFill(seed("#3b82f6"), "light");
    expect(blue.passes).toBe(false);
    expect(blue.inks.white.rest.ratio).toBeLessThan(4.5);
  });

  it("applies Radix's press filter: dark brightens, light darkens and saturates", () => {
    expect(pressed({ r: 100, g: 100, b: 100 }, "dark")).toEqual({ r: 108, g: 108, b: 108 });
    expect(pressed({ r: 255, g: 255, b: 255 }, "dark")).toEqual({ r: 255, g: 255, b: 255 });
    const grey = pressed({ r: 100, g: 100, b: 100 }, "light");
    for (const v of [grey.r, grey.g, grey.b]) expect(v).toBeCloseTo(92, 6);
  });
});

describe("the brand analysis", () => {
  it("#6e56cf works as typed, and fails 1a in dark at 3.48:1 and Lc 24.7", () => {
    const a = analyseBrand(seed("#6e56cf"));
    expect(a.light.button.adjusted || a.dark.button.adjusted).toBe(false);
    expect(a.light.page.passes).toBe(true);
    expect(a.dark.page).toMatchObject({ passes: false });
    expect(a.dark.page.ratio).toBeCloseTo(3.48, 2);
    expect(a.dark.page.lc).toBeCloseTo(24.7, 1);
  });

  it("#c8102e passes question 2 in both and 1a in light, and fails 1a in dark at 3.19:1 and Lc 24.1", () => {
    const a = analyseBrand(seed("#c8102e"));
    expect(a.light.button.adjusted || a.dark.button.adjusted).toBe(false);
    expect(a.light.page.passes).toBe(true);
    expect(a.dark.page.ratio).toBeCloseTo(3.19, 2);
    expect(a.dark.page.lc).toBeCloseTo(24.1, 1);
  });

  it("#fff59d fails 1a in light only and keeps its button, and its steps 11 and 12 merge in dark", () => {
    const a = analyseBrand(seed("#fff59d"));
    expect([a.light.page.passes, a.dark.page.passes]).toEqual([false, true]);
    expect(a.light.button.adjusted || a.dark.button.adjusted).toBe(false);
    expect([a.light.text.distinct, a.dark.text.distinct]).toEqual([true, false]);
  });

  it("#0b1a3a fails 1a in dark only and keeps its button", () => {
    const a = analyseBrand(seed("#0b1a3a"));
    expect([a.light.page.passes, a.dark.page.passes]).toEqual([true, false]);
    expect(a.light.button.adjusted || a.dark.button.adjusted).toBe(false);
  });

  it("gives a reddish brand the oxblood error fill, which carries white at 4.5:1 and Lc 60", () => {
    for (const s of ["#ff6b5e", "#c8102e", "#e54666"]) {
      const a = analyseBrand(seed(s));
      expect(a.statusFamilies.error).toBe("oxblood");
      for (const ap of [a.light, a.dark]) expect(ap.error).toMatchObject({ family: "oxblood", fill: "#8a2119", ink: "white" });
      expect(a.light.error.label.inks.white.passes).toBe(true);
    }
  });

  it("gives an unshifted brand red's pinned light step 11", () => {
    const a = analyseBrand(seed("#3b82f6"));
    expect(a.light.error).toMatchObject({ family: "red", fill: "#ce2c31", ink: "white" });
    expect(a.light.error.label.inks.white.passes).toBe(true);
  });

  it("picks the APCA glyph ink by the higher |Lc| on step 9", () => {
    expect(analyseBrand(seed("#fff59d")).light.glyphInk).toBe("nearBlack");
    expect(analyseBrand(seed("#0b1a3a")).light.glyphInk).toBe("white");
  });

  it("records the APCA version every Lc was measured with", () => {
    expect(analyseBrand(seed("#6e56cf")).apca).toBe("0.0.98G-4g");
  });
});

describe("one status shift for every brand colour", () => {
  it.each(["#3b82f6", "#ff6b5e", "#fff59d", "#00a86b", "#c8102e", "#ffc53d"])(
    "%s alone gives the single-colour choice",
    (s) => expect(chooseSemanticScalesFor([seed(s)])).toEqual(chooseSemanticScales(seed(s))),
  );

  it("the analysis chooses for the seed and every adjusted shade together", () => {
    for (const s of ["#3b82f6", "#ff6b5e", "#00a86b", "#ff8c00"]) {
      const a = analyseBrand(seed(s));
      const colours = [seed(s), seed(a.light.button.fill), seed(a.dark.button.fill)];
      expect(a.statusFamilies).toEqual(chooseSemanticScalesFor(colours));
    }
  });

  it("refuses an empty list", () => expect(() => chooseSemanticScalesFor([])).toThrow());
});
