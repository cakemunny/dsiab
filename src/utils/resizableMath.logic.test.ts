/* resizableMath.logic.test.ts — node-lane coverage for the PURE resize arithmetic behind
 * useResizable (DECISIONS [[catalog-as-specification]], D5). The DOM/pointer/localStorage wiring is exercised by the
 * _internal ResizeHandle plays; the math is unit-tested here. These cases would FAIL if the math
 * regressed — in particular the D5 collapse/expand FIX (expand restores preCollapseSize, NOT
 * minSizePx) is pinned by the `restoreSize` / `toggleCollapse` suites below. */

import { describe, it, expect } from "vitest";
import {
  ARROW_STEP,
  SHIFT_ARROW_STEP,
  clampSize,
  snapToStep,
  stepForShift,
  deltaForKey,
  restoreSize,
  toggleCollapse,
  resolveDragResult,
  resizeByKey,
  type ResizeState,
} from "./resizableMath";

describe("clampSize", () => {
  it("clamps to the [min, max] bounds", () => {
    expect(clampSize(200, 160, 400)).toBe(200);
    expect(clampSize(120, 160, 400)).toBe(160); // below min
    expect(clampSize(999, 160, 400)).toBe(400); // above max
    expect(clampSize(160, 160, 400)).toBe(160); // on the min edge
    expect(clampSize(400, 160, 400)).toBe(400); // on the max edge
  });
  it("treats an Infinity max as unbounded above (min still applies)", () => {
    expect(clampSize(5000, 160, Infinity)).toBe(5000);
    expect(clampSize(100, 160, Infinity)).toBe(160);
  });
});

describe("snapToStep", () => {
  it("snaps to the nearest step multiple", () => {
    expect(snapToStep(147, 10)).toBe(150);
    expect(snapToStep(143, 10)).toBe(140);
    expect(snapToStep(145, 10)).toBe(150); // .5 rounds up
  });
  it("is a no-op for a missing or non-positive step", () => {
    expect(snapToStep(147)).toBe(147);
    expect(snapToStep(147, 0)).toBe(147);
    expect(snapToStep(147, -5)).toBe(147);
  });
});

describe("stepForShift / arrow deltas", () => {
  it("Shift widens the step from 10 to 50", () => {
    expect(stepForShift(false)).toBe(ARROW_STEP);
    expect(stepForShift(false)).toBe(10);
    expect(stepForShift(true)).toBe(SHIFT_ARROW_STEP);
    expect(stepForShift(true)).toBe(50);
  });

  it("vertical separator: Right/Left arrows resize width by ±step", () => {
    expect(deltaForKey("ArrowRight", false, "vertical")).toBe(10);
    expect(deltaForKey("ArrowRight", true, "vertical")).toBe(50);
    expect(deltaForKey("ArrowLeft", false, "vertical")).toBe(-10);
    expect(deltaForKey("ArrowLeft", true, "vertical")).toBe(-50);
    // Up/Down are not width arrows on a vertical separator.
    expect(deltaForKey("ArrowUp", false, "vertical")).toBeNull();
    expect(deltaForKey("ArrowDown", false, "vertical")).toBeNull();
  });

  it("horizontal separator: Down/Up arrows resize height by ±step", () => {
    expect(deltaForKey("ArrowDown", false, "horizontal")).toBe(10);
    expect(deltaForKey("ArrowUp", true, "horizontal")).toBe(-50);
    expect(deltaForKey("ArrowLeft", false, "horizontal")).toBeNull();
    expect(deltaForKey("ArrowRight", false, "horizontal")).toBeNull();
  });

  it("invert flips the sign (end-docked pane grows toward the trigger side)", () => {
    expect(deltaForKey("ArrowRight", false, "vertical", true)).toBe(-10);
    expect(deltaForKey("ArrowLeft", false, "vertical", true)).toBe(10);
  });

  it("returns null for non-arrow keys", () => {
    expect(deltaForKey("Enter", false, "vertical")).toBeNull();
    expect(deltaForKey("Home", false, "vertical")).toBeNull();
    expect(deltaForKey("a", false, "vertical")).toBeNull();
  });
});

describe("restoreSize — the D5 preCollapseSize-restore FIX", () => {
  it("restores the remembered pre-collapse size, NOT minSizePx (the fix)", () => {
    // A pane collapsed from 240 must expand back to 240 — the upstream bug restored 160 (min).
    expect(restoreSize(240, { minSizePx: 160, maxSizePx: Infinity })).toBe(240);
    expect(restoreSize(240, { minSizePx: 160, maxSizePx: Infinity })).not.toBe(160);
  });
  it("clamps the remembered size to the current bounds", () => {
    expect(restoreSize(500, { minSizePx: 160, maxSizePx: 400 })).toBe(400);
    expect(restoreSize(100, { minSizePx: 160, maxSizePx: 400 })).toBe(160);
  });
  it("falls back to minSizePx only when nothing was remembered", () => {
    expect(restoreSize(null, { minSizePx: 160, maxSizePx: 400 })).toBe(160);
  });
});

describe("toggleCollapse", () => {
  const bounds = { minSizePx: 160, maxSizePx: 400 };

  it("COLLAPSE remembers the current size as preCollapseSize", () => {
    const start: ResizeState = { size: 240, isCollapsed: false, preCollapseSize: null };
    expect(toggleCollapse(start, bounds)).toEqual({
      size: 240,
      isCollapsed: true,
      preCollapseSize: 240,
    });
  });

  it("EXPAND restores the remembered size (round-trip preserves 240, not 160)", () => {
    const collapsed: ResizeState = { size: 240, isCollapsed: true, preCollapseSize: 240 };
    const expanded = toggleCollapse(collapsed, bounds);
    expect(expanded).toEqual({ size: 240, isCollapsed: false, preCollapseSize: null });
    expect(expanded.size).not.toBe(160); // guards against the upstream regression
  });

  it("collapse→expand is an identity on size for any in-bounds size", () => {
    const start: ResizeState = { size: 312, isCollapsed: false, preCollapseSize: null };
    const roundTrip = toggleCollapse(toggleCollapse(start, bounds), bounds);
    expect(roundTrip.size).toBe(312);
    expect(roundTrip.isCollapsed).toBe(false);
  });
});

describe("resolveDragResult — collapse-threshold logic", () => {
  const base = { minSizePx: 160, maxSizePx: 400, collapsible: true, collapseThresholdPx: 80 };

  it("snaps closed when dragged below the collapse threshold", () => {
    expect(resolveDragResult(60, base)).toEqual({ size: 160, isCollapsed: true });
  });
  it("clamps to min (stays open) between the threshold and min", () => {
    expect(resolveDragResult(120, base)).toEqual({ size: 160, isCollapsed: false });
  });
  it("passes an in-range size through unchanged", () => {
    expect(resolveDragResult(250, base)).toEqual({ size: 250, isCollapsed: false });
  });
  it("clamps to max at the top", () => {
    expect(resolveDragResult(999, base)).toEqual({ size: 400, isCollapsed: false });
  });
  it("never collapses when collapsible is false", () => {
    expect(resolveDragResult(10, { ...base, collapsible: false })).toEqual({
      size: 160,
      isCollapsed: false,
    });
  });
});

describe("resizeByKey — arrows / Home / End integrate delta + clamp", () => {
  const vBounds = { minSizePx: 160, maxSizePx: 400, orientation: "vertical" as const };
  const open = (size: number) => ({ size, isCollapsed: false });

  it("arrow steps from the current size and clamps", () => {
    expect(resizeByKey("ArrowRight", false, open(200), vBounds)).toBe(210);
    expect(resizeByKey("ArrowRight", true, open(200), vBounds)).toBe(250); // Shift
    expect(resizeByKey("ArrowLeft", false, open(165), vBounds)).toBe(160); // clamped to min
    expect(resizeByKey("ArrowRight", true, open(380), vBounds)).toBe(400); // clamped to max
  });

  it("Home → min, End → max", () => {
    expect(resizeByKey("Home", false, open(300), vBounds)).toBe(160);
    expect(resizeByKey("End", false, open(300), vBounds)).toBe(400);
  });

  it("an increase arrow from a collapsed pane expands it up to min", () => {
    expect(resizeByKey("ArrowRight", false, { size: 240, isCollapsed: true }, vBounds)).toBe(160);
  });

  it("a DECREASE arrow on a collapsed pane is a no-op (stays closed, never jumps to min)", () => {
    // Regression: without the collapsed+shrink guard the clamp would return minSizePx (160), re-opening a
    // pane the user just collapsed. Both docks: start-docked shrinks on ArrowLeft; end-docked on ArrowRight.
    const collapsed = { size: 240, isCollapsed: true } as const;
    expect(resizeByKey("ArrowLeft", false, collapsed, vBounds)).toBeNull(); // start-docked shrink
    expect(resizeByKey("ArrowLeft", true, collapsed, vBounds)).toBeNull(); // + Shift
    // end-docked (invert): the sign flips, so ArrowRight is the shrink direction — also a no-op.
    expect(resizeByKey("ArrowRight", false, collapsed, { ...vBounds, invert: true })).toBeNull();
    // …and the matching increase arrow still expands from 0 up to min on the end dock.
    expect(resizeByKey("ArrowLeft", false, collapsed, { ...vBounds, invert: true })).toBe(160);
  });

  it("returns null for non-resize keys (Enter is a toggle, handled elsewhere)", () => {
    expect(resizeByKey("Enter", false, open(200), vBounds)).toBeNull();
    expect(resizeByKey("PageUp", false, open(200), vBounds)).toBeNull();
  });
});
