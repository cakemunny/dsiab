/* =============================================================================
   oklch-assert-agreement.logic.test.ts — the two OKLab conversions agree
   -----------------------------------------------------------------------------
   `oklch.ts` (the generator side) and `foundations/_assert.ts` (the verifier side)
   each carry their own sRGB -> OKLab conversion, kept apart on purpose (see the
   header of oklch.ts). Keeping two copies is safe only while they return the same
   numbers. This test is the check that holds them to it: it runs both over a dense
   sample of the sRGB byte range and fails when any of the three components differs
   by more than 1e-6.

   Sample: every 5th byte value per channel (0, 5, ... 255, so 52 values and 140,608
   colours) plus all 256 grays.

   `_assert.ts` reads colour through a canvas, which does not exist in the node lane.
   The stubs below stand in for the three DOM calls its `oklab()` makes and hand
   back the exact bytes asked for. They test the maths, not the canvas.
   ============================================================================= */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { oklab as assertOklab } from "../foundations/_assert";
import { srgbToOklab } from "./oklch";

const TOLERANCE = 1e-6;

/** Install the minimum DOM that `_assert.ts` `oklab()` touches, returning the bytes it was given. */
function stubCanvas(): void {
  let bytes: [number, number, number] = [0, 0, 0];
  const ctx = {
    clearRect() {},
    fillRect() {},
    set fillStyle(v: string) {
      const m = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(v);
      if (!m) throw new Error(`stub canvas only reads "rgb(r, g, b)", got ${JSON.stringify(v)}`);
      bytes = [Number(m[1]), Number(m[2]), Number(m[3])];
    },
    getImageData: () => ({ data: [...bytes, 255] }),
  };
  vi.stubGlobal("document", {
    createElement: (tag: string) =>
      tag === "canvas" ? { getContext: () => ctx } : { style: { color: "" }, remove() {} },
  });
  vi.stubGlobal("getComputedStyle", (probe: { style: { color: string } }) => ({ color: probe.style.color }));
}

const el = { appendChild() {} } as unknown as Element;

/** Largest per-component gap between the two conversions for one colour. */
function gap(r: number, g: number, b: number): number {
  const a = assertOklab(el, `rgb(${r}, ${g}, ${b})`);
  const o = srgbToOklab({ r, g, b });
  return Math.max(Math.abs(a[0] - o[0]), Math.abs(a[1] - o[1]), Math.abs(a[2] - o[2]));
}

describe("oklch.ts and _assert.ts agree on sRGB -> OKLab", () => {
  beforeAll(stubCanvas);
  afterAll(() => vi.unstubAllGlobals());

  it("agree within 1e-6 on every 5th value per channel and all 256 grays", () => {
    const steps: number[] = [];
    for (let v = 0; v <= 255; v += 5) steps.push(v);
    let worst = 0;
    let worstAt = "";
    let count = 0;
    const note = (r: number, g: number, b: number) => {
      const d = gap(r, g, b);
      count += 1;
      if (d > worst) {
        worst = d;
        worstAt = `rgb(${r}, ${g}, ${b})`;
      }
    };
    for (const r of steps) for (const g of steps) for (const b of steps) note(r, g, b);
    for (let v = 0; v < 256; v += 1) note(v, v, v);
    expect(count).toBe(steps.length ** 3 + 256);
    expect(
      worst,
      `the two OKLab conversions differ by ${worst} at ${worstAt}, over the ${TOLERANCE} limit. ` +
        `src/palette/oklch.ts and src/foundations/_assert.ts must return the same numbers.`,
    ).toBeLessThanOrEqual(TOLERANCE);
  });
});
