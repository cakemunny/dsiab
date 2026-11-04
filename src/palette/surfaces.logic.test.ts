/* The surface table's own arithmetic ([[palette-surface-table]]). Whether its values match the
   rendered theme is `_internal/Surface table`'s job, in the browser. This holds the parts a
   browser cannot see: the parser, the layering and the shape of the result. */
import { describe, expect, it } from "vitest";
import {
  NEUTRALS, NEUTRAL_SURFACE_NAMES, TINT_SURFACE_NAMES, allSurfaces, layOver, neutralSurfaces, parseColour,
  type TintSteps,
} from "./surfaces";

const TINTS: TintSteps = {
  accentA3: "#0000ff10", accentA5: "#0000ff30", errorA3: "#ff000010",
  warningA3: "#ffaa0010", successA3: "#00aa0010", infoA3: "#00aaff10",
};

describe("parseColour", () => {
  it("reads six- and eight-digit hex and rgba()", () => {
    expect(parseColour("#102030")).toEqual({ r: 16, g: 32, b: 48, a: 1 });
    expect(parseColour("#10203080")).toEqual({ r: 16, g: 32, b: 48, a: 128 / 255 });
    expect(parseColour("rgba(0, 0, 0, 0.1)")).toEqual({ r: 0, g: 0, b: 0, a: 0.1 });
  });
  it("refuses anything else rather than reading it as black", () => {
    expect(() => parseColour("color(display-p3 0 0 0)")).toThrow();
    expect(() => parseColour("#123")).toThrow();
  });
});

describe("layering", () => {
  it("blends a translucent layer over an opaque one, unrounded", () => {
    expect(layOver("rgba(0, 0, 0, 0.4)", { r: 17, g: 17, b: 17 })).toEqual({ r: 10.2, g: 10.2, b: 10.2 });
    expect(layOver("#ffffff", { r: 0, g: 0, b: 0 })).toEqual({ r: 255, g: 255, b: 255 });
  });
});

describe("the surfaces", () => {
  it.each(NEUTRALS.flatMap((n) => (["light", "dark"] as const).map((a) => [n, a] as const)))(
    "%s %s gives all fifteen, in order, with the page opaque and first",
    (neutral, appearance) => {
      const all = allSurfaces(neutral, appearance, TINTS);
      expect(Object.keys(all)).toEqual([...NEUTRAL_SURFACE_NAMES, ...TINT_SURFACE_NAMES]);
      for (const c of Object.values(all)) for (const v of [c.r, c.g, c.b]) expect(v >= 0 && v <= 255).toBe(true);
    },
  );
  it("puts a card above the page in dark and leaves it white in light", () => {
    const dark = neutralSurfaces("gray", "dark");
    expect(dark.card.r).toBeGreaterThan(dark.page.r);
    expect(neutralSurfaces("gray", "light").card).toEqual({ r: 255, g: 255, b: 255 });
  });
});
