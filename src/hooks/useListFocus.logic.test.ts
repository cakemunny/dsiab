// Node-lane logic suite for nextFocusIndex — the pure 1D roving-focus index math behind useListFocus
// (the Pagination dots keyboard model, [[pagination-control]] · D22). The DOM wiring (querySelector + .focus()) is
// exercised by the _internal Pagination dots play; the index arithmetic is unit-tested here.

import { describe, it, expect } from "vitest";
import { nextFocusIndex } from "./useListFocus";

describe("nextFocusIndex — horizontal (default), wrapping", () => {
  it("ArrowRight advances", () => {
    expect(nextFocusIndex(0, 5, "ArrowRight")).toBe(1);
    expect(nextFocusIndex(3, 5, "ArrowRight")).toBe(4);
  });
  it("ArrowLeft retreats", () => {
    expect(nextFocusIndex(4, 5, "ArrowLeft")).toBe(3);
    expect(nextFocusIndex(1, 5, "ArrowLeft")).toBe(0);
  });
  it("wraps at the ends", () => {
    expect(nextFocusIndex(4, 5, "ArrowRight")).toBe(0);
    expect(nextFocusIndex(0, 5, "ArrowLeft")).toBe(4);
  });
  it("Home/End jump to the ends", () => {
    expect(nextFocusIndex(3, 5, "Home")).toBe(0);
    expect(nextFocusIndex(1, 5, "End")).toBe(4);
  });
});

describe("nextFocusIndex — wrap disabled clamps at the ends", () => {
  it("clamps instead of wrapping", () => {
    expect(nextFocusIndex(4, 5, "ArrowRight", { wrap: false })).toBe(4);
    expect(nextFocusIndex(0, 5, "ArrowLeft", { wrap: false })).toBe(0);
  });
});

describe("nextFocusIndex — vertical orientation", () => {
  it("uses ArrowDown/ArrowUp, ignores Left/Right", () => {
    expect(nextFocusIndex(0, 3, "ArrowDown", { orientation: "vertical" })).toBe(1);
    expect(nextFocusIndex(2, 3, "ArrowUp", { orientation: "vertical" })).toBe(1);
    expect(nextFocusIndex(0, 3, "ArrowRight", { orientation: "vertical" })).toBeNull();
    expect(nextFocusIndex(0, 3, "ArrowLeft", { orientation: "vertical" })).toBeNull();
  });
});

describe("nextFocusIndex — non-navigation keys + guards", () => {
  it("returns null for keys it does not handle", () => {
    expect(nextFocusIndex(0, 5, "Enter")).toBeNull();
    expect(nextFocusIndex(0, 5, " ")).toBeNull();
    expect(nextFocusIndex(0, 5, "a")).toBeNull();
    // Vertical arrows are not horizontal navigation keys.
    expect(nextFocusIndex(0, 5, "ArrowDown")).toBeNull();
  });
  it("returns null when the list is empty", () => {
    expect(nextFocusIndex(0, 0, "ArrowRight")).toBeNull();
    expect(nextFocusIndex(-1, 0, "Home")).toBeNull();
  });
  it("treats a -1 current (nothing focused) as entering from an edge", () => {
    expect(nextFocusIndex(-1, 5, "ArrowRight")).toBe(0);
    expect(nextFocusIndex(-1, 5, "ArrowLeft")).toBe(4);
    expect(nextFocusIndex(-1, 5, "Home")).toBe(0);
  });
});
