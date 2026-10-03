// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/hooks/useOverflow.test.ts @ 88c95e4 (MIT, © Meta Platforms)

/* computeVisibleCount.logic.test.ts — the ARITHMETIC cases from Astryx's `useOverflow.test.ts`
 * (commit 88c95e4), ported to the node lane as DIRECT reducer assertions (DECISIONS [[catalog-as-specification]]). Upstream drove
 * these through the hook while mocking every element as `{ offsetWidth }` — i.e. it was really testing
 * this pure reducer, so here they become plain input→output checks with no DOM or React. The React-only
 * render-count cases (which count re-renders, not fit math) are not arithmetic and live with the DOM
 * behavior story (_internal/OverflowList behavior). */

import { describe, it, expect } from "vitest";
import { computeVisibleCount } from "./computeVisibleCount";

// Thin wrapper with the reducer's defaults so each case reads like the upstream scenario.
function vc(args: {
  widths: number[];
  indicatorWidth?: number;
  availableWidth: number;
  gap?: number;
  minVisibleItems?: number;
  collapseFrom?: "start" | "end";
}): number {
  return computeVisibleCount({
    widths: args.widths,
    indicatorWidth: args.indicatorWidth ?? 0,
    availableWidth: args.availableWidth,
    gap: args.gap ?? 0,
    minVisibleItems: args.minVisibleItems ?? 0,
    collapseFrom: args.collapseFrom ?? "end",
  });
}

describe("computeVisibleCount", () => {
  it("shows all items when they fit", () => {
    // 3×50, gap 10 → 50+10+50+10+50 = 170 ≤ 200.
    expect(vc({ widths: [50, 50, 50], availableWidth: 200, gap: 10 })).toBe(3);
  });

  it("hides items that do not fit", () => {
    // 4×50, gap 10, indicator 30, available 150:
    // i0 50 (reserve 40) → 90 ✓ · i1 110 (reserve 40) → 150 ✓ · i2 170 (reserve 40) → 210 ✗ → 2.
    expect(vc({ widths: [50, 50, 50, 50], indicatorWidth: 30, availableWidth: 150, gap: 10 })).toBe(2);
  });

  it("shows zero items when nothing fits and minVisibleItems is 0", () => {
    // i0 100 (not last, reserve 30) → 130 > 50, count 0 ≥ min 0 → break.
    expect(vc({ widths: [100, 100, 100], indicatorWidth: 30, availableWidth: 50 })).toBe(0);
  });

  it("respects minVisibleItems even when items do not fit", () => {
    // count(0)<2 and count(1)<2 continue; last item i2 (reserve 0) 300>50 with count(2)≥2 → break → 2.
    expect(
      vc({ widths: [100, 100, 100], indicatorWidth: 30, availableWidth: 50, minVisibleItems: 2 }),
    ).toBe(2);
  });

  it("handles no gap", () => {
    // 3×40, gap 0, indicator 20, available 100: i0 40 (reserve 20) → 60 ✓ · i1 80 (reserve 20) → 100 ✓ ·
    // i2 120 last (reserve 0) → 120 > 100 → 2.
    expect(vc({ widths: [40, 40, 40], indicatorWidth: 20, availableWidth: 100 })).toBe(2);
  });

  it("works without an overflow indicator", () => {
    // 3×50, gap 10, no indicator, available 130: i0 50 ✓ · i1 110 ✓ · i2 170 last → 170 > 130 → 2.
    expect(vc({ widths: [50, 50, 50], availableWidth: 130, gap: 10 })).toBe(2);
  });

  it("handles items with different widths", () => {
    // [30,80,40,60], gap 10, indicator 25, available 200:
    // i0 30 (reserve 25) → 55 ✓ · i1 120 (reserve 35) → 155 ✓ · i2 170 (reserve 35) → 205 ✗ → 2.
    expect(vc({ widths: [30, 80, 40, 60], indicatorWidth: 25, availableWidth: 200, gap: 10 })).toBe(2);
  });

  it("collapses from start", () => {
    // reversed → [40,80,30]: i0 40 (reserve 25) → 65 ✓ · i1 130 (reserve 35) → 165 > 100 → 1 kept.
    expect(
      vc({ widths: [30, 80, 40], indicatorWidth: 25, availableWidth: 100, gap: 10, collapseFrom: "start" }),
    ).toBe(1);
  });

  it("handles zero children", () => {
    expect(vc({ widths: [], availableWidth: 200 })).toBe(0);
  });

  it("shows all items when exact fit with indicator not needed", () => {
    // 3×50, gap 10, indicator 30, available 170: last item lands at exactly 170 ≤ 170 → all 3.
    expect(vc({ widths: [50, 50, 50], indicatorWidth: 30, availableWidth: 170, gap: 10 })).toBe(3);
  });

  it("recalculates as the container shrinks (resize)", () => {
    const widths = [50, 50, 50];
    expect(vc({ widths, indicatorWidth: 30, availableWidth: 170, gap: 10 })).toBe(3);
    // Narrower: i0 90 ✓ · i1 150 > 100 → 1.
    expect(vc({ widths, indicatorWidth: 30, availableWidth: 100, gap: 10 })).toBe(1);
  });

  it("single item that fits", () => {
    expect(vc({ widths: [50], availableWidth: 100, gap: 10 })).toBe(1);
  });

  it("single item that does not fit without minVisibleItems", () => {
    // The sole item is the last item (reserve 0) → 200 > 100, count 0 ≥ 0 → break → 0.
    expect(vc({ widths: [200], indicatorWidth: 30, availableWidth: 100 })).toBe(0);
  });

  // --- observeParent arithmetic: availableWidth = parent.clientWidth − paddingLeft − paddingRight ---
  it("uses parent content width as available space", () => {
    // parent 400 − 8×2 = 384; 4×50, gap 10, indicator 30 → all 4 fit (last lands at 230 ≤ 384).
    expect(vc({ widths: [50, 50, 50, 50], indicatorWidth: 30, availableWidth: 400 - 16, gap: 10 })).toBe(4);
  });

  it("overflows when parent content width is too small", () => {
    // parent 200 − 8×2 = 184; i0 90 ✓ · i1 150 ✓ · i2 210 > 184 → 2.
    expect(vc({ widths: [50, 50, 50, 50], indicatorWidth: 30, availableWidth: 200 - 16, gap: 10 })).toBe(2);
  });

  it("accounts for parent padding", () => {
    // parent 200 − 40×2 = 120; 3×50, gap 10, no indicator → i0 50 ✓ · i1 110 ✓ · i2 170 last > 120 → 2.
    expect(vc({ widths: [50, 50, 50], availableWidth: 200 - 80, gap: 10 })).toBe(2);
  });
});
