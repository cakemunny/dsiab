/* useScrollOverflow.logic.test.ts — node-lane coverage for the PURE overflow math (computeOverflow),
 * the extracted core of the lifted useScrollOverflow hook (DECISIONS [[catalog-as-specification]], [[carousel-scroller]]). Runs in pure node (no
 * DOM) — the hook's DOM wiring (scroll/resize listeners, the shared observer) is exercised by the
 * _internal Carousel plays instead. */

import { describe, it, expect } from "vitest";
import { computeOverflow } from "./useScrollOverflow";

describe("computeOverflow", () => {
  it("no overflow — content fits the viewport", () => {
    expect(computeOverflow(0, 500, 500)).toEqual({
      overflowStart: false,
      overflowEnd: false,
      hasOverflow: false,
    });
  });

  it("scrolled to the start — overflows the END only", () => {
    expect(computeOverflow(0, 1000, 500)).toEqual({
      overflowStart: false,
      overflowEnd: true,
      hasOverflow: true,
    });
  });

  it("scrolled to the middle — overflows BOTH edges", () => {
    expect(computeOverflow(250, 1000, 500)).toEqual({
      overflowStart: true,
      overflowEnd: true,
      hasOverflow: true,
    });
  });

  it("scrolled to the end — overflows the START only", () => {
    // maxScroll = 1000 - 500 = 500; scrollLeft at the end.
    expect(computeOverflow(500, 1000, 500)).toEqual({
      overflowStart: true,
      overflowEnd: false,
      hasOverflow: true,
    });
  });

  it("RTL negative scrollLeft folds onto the same axis (abs)", () => {
    // A middle RTL position — negative scrollLeft, still both edges overflow.
    expect(computeOverflow(-250, 1000, 500)).toEqual({
      overflowStart: true,
      overflowEnd: true,
      hasOverflow: true,
    });
  });

  it("1px tolerance — a sub-pixel gap does NOT read as end overflow", () => {
    // maxScroll = 1; pos = 0; overflowEnd = 0 < 1 - 1 = 0 → false. hasOverflow: 501 > 500 + 1 → false.
    expect(computeOverflow(0, 501, 500)).toEqual({
      overflowStart: false,
      overflowEnd: false,
      hasOverflow: false,
    });
  });

  it("just past the tolerance — end overflow appears", () => {
    // scrollWidth 502 > 501 → hasOverflow; maxScroll 2; overflowEnd = 0 < 2 - 1 = 1 → true.
    expect(computeOverflow(0, 502, 500)).toEqual({
      overflowStart: false,
      overflowEnd: true,
      hasOverflow: true,
    });
  });

  it("near-but-not-at the end stays within tolerance of the end cap", () => {
    // maxScroll = 500; scrollLeft 499.5; overflowEnd = 499.5 < 499 → false (within 1px of the end);
    // overflowStart = 499.5 > 1 → true.
    expect(computeOverflow(499.5, 1000, 500)).toEqual({
      overflowStart: true,
      overflowEnd: false,
      hasOverflow: true,
    });
  });
});
