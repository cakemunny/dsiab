/* The helper-layer searches' arithmetic ([[generated-helper-layers]]). Whether they reproduce the
   theme's picks is `_internal/Helper layer parity`'s job, in the browser. */
import { describe, expect, it } from "vitest";
import { BLACK_A, WHITE_A, partEdge, scrimStack, thumbStroke } from "./helperLayers";
import { asReadBack, parseColour } from "./surfaces";

describe("asReadBack", () => {
  it("leaves an opaque colour as it is", () => {
    expect(parseColour(asReadBack("#3b82f6"))).toEqual({ r: 59, g: 130, b: 246, a: 1 });
  });
  it("stores alpha in a byte and the channels premultiplied, as a canvas does", () => {
    const c = parseColour(asReadBack("rgba(255, 255, 255, 0.05)"));
    expect(c.a).toBe(13 / 255);
    expect(c.r).toBe(255);
    const t = parseColour(asReadBack("#ddeaf814"));
    expect(t.a).toBe(20 / 255);
    expect([t.r, t.g, t.b]).not.toEqual([0xdd, 0xea, 0xf8]);
  });
});

describe("the searches", () => {
  it("hold twelve steps of each Radix alpha scale", () => {
    expect(BLACK_A).toHaveLength(12);
    expect(WHITE_A).toHaveLength(12);
  });
  it("leave a fill that already clears alone", () => {
    expect(partEdge({ r: 0x3b, g: 0x82, b: 0xf6 }, "light")).toBe("none");
  });
  it("stack the lightest step that clears where the fill does not", () => {
    // A pale yellow fill is invisible on a light page, so it takes a black alpha.
    expect(partEdge({ r: 0xff, g: 0xf5, b: 0x9d }, "light")).toMatch(/^black-a\d+$/);
  });
  it("brighten a ring on the dark scrim with white and darken it on the light scrim with black", () => {
    const mid = { r: 0x80, g: 0x40, b: 0x40 };
    expect(scrimStack(mid, "dark")).toMatch(/^(none|white-a\d+)$/);
    expect(scrimStack(mid, "light")).toMatch(/^(none|black-a\d+)$/);
  });
  it("keep Radix's own hairline on a thumb that already reads on its track", () => {
    const solid = Array.from({ length: 12 }, () => "#000000");
    const alpha = Array.from({ length: 12 }, () => "#00000000");
    expect(thumbStroke(solid, alpha, { r: 0x3b, g: 0x82, b: 0xf6 })).toBe("accent-a4");
  });
});

describe("a part's own shade", () => {
  it("moves the fill by lightness to the nearest that reads, darker first on a tie", async () => {
    const { ownShade } = await import("./markLayers");
    const dark = (c: { r: number; g: number; b: number }) => c.r + c.g + c.b < 300;
    const shade = ownShade({ r: 0x88, g: 0x99, b: 0xaa }, dark);
    expect(shade?.direction).toBe("darker");
    const back = parseColour(shade!.fill);
    expect(back.r + back.g + back.b).toBeLessThan(300);
  });
  it("returns null when nothing reads", async () => {
    const { ownShade } = await import("./markLayers");
    expect(ownShade({ r: 128, g: 128, b: 128 }, () => false)).toBeNull();
  });
});
