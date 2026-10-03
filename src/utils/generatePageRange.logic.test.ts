// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Pagination/Pagination.tsx @ 88c95e4 (MIT, © Meta Platforms)
//
// Node-lane logic suite for the LIFTED generatePageRange + coercePageSize (DECISIONS [[catalog-as-specification]], [[pagination-control]] · D22).
// The upstream JSDoc examples are the ready-made assertions; extended to cover the four regimes
// (fits-all / near-start / near-end / middle) at siblingCount 0/1/2 plus the coercion guard that
// protects the dots `Array.from({ length })` from Infinity/NaN.

import { describe, it, expect } from "vitest";
import { generatePageRange, coercePageSize } from "./generatePageRange";

describe("generatePageRange — the upstream JSDoc examples", () => {
  it("middle: [1, '...', 4, 5, 6, '...', 10]", () => {
    expect(generatePageRange(5, 10, 1)).toEqual([1, "...", 4, 5, 6, "...", 10]);
  });
  it("near-start: [1, 2, 3, 4, 5, '...', 10] (window = 3 + 2*siblingCount = 5)", () => {
    expect(generatePageRange(1, 10, 1)).toEqual([1, 2, 3, 4, 5, "...", 10]);
  });
  it("fits-all: [1, 2, 3, 4, 5]", () => {
    expect(generatePageRange(1, 5, 1)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("generatePageRange — fits within the slot budget (5 + 2*siblingCount)", () => {
  it("shows every page when totalPages <= totalSlots (siblingCount 1 → 7 slots)", () => {
    expect(generatePageRange(3, 7, 1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it("siblingCount 0 → 5 slots: 5 pages fit, 6 collapse", () => {
    expect(generatePageRange(3, 5, 0)).toEqual([1, 2, 3, 4, 5]);
    expect(generatePageRange(3, 6, 0)).toEqual([1, "...", 3, "...", 6]);
  });
  it("siblingCount 2 → 9 slots: 9 pages fit", () => {
    expect(generatePageRange(5, 9, 2)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe("generatePageRange — near the start (right ellipsis only)", () => {
  it("current at 1 of 20 (siblingCount 1)", () => {
    expect(generatePageRange(1, 20, 1)).toEqual([1, 2, 3, 4, 5, "...", 20]);
  });
  it("current at 3 of 20 stays near-start (left index 2, no left ellipsis)", () => {
    expect(generatePageRange(3, 20, 1)).toEqual([1, 2, 3, 4, 5, "...", 20]);
  });
  it("siblingCount 2 widens the left window", () => {
    expect(generatePageRange(2, 20, 2)).toEqual([1, 2, 3, 4, 5, 6, 7, "...", 20]);
  });
});

describe("generatePageRange — near the end (left ellipsis only)", () => {
  it("current at 20 of 20 (siblingCount 1): window = 3 + 2*siblingCount = 5 pages", () => {
    expect(generatePageRange(20, 20, 1)).toEqual([1, "...", 16, 17, 18, 19, 20]);
  });
  it("current at 18 of 20 stays near-end", () => {
    expect(generatePageRange(18, 20, 1)).toEqual([1, "...", 16, 17, 18, 19, 20]);
  });
});

describe("generatePageRange — in the middle (both ellipses)", () => {
  it("current at 10 of 20 (siblingCount 1)", () => {
    expect(generatePageRange(10, 20, 1)).toEqual([1, "...", 9, 10, 11, "...", 20]);
  });
  it("siblingCount 2 shows five middle pages", () => {
    expect(generatePageRange(10, 20, 2)).toEqual([1, "...", 8, 9, 10, 11, 12, "...", 20]);
  });
  it("the first and last pages always anchor the ends", () => {
    const r = generatePageRange(50, 100, 1);
    expect(r[0]).toBe(1);
    expect(r[r.length - 1]).toBe(100);
    expect(r).toContain("...");
  });
});

describe("coercePageSize — protects Array.from({ length }) from non-finite sizes", () => {
  it("passes finite positive integers through", () => {
    expect(coercePageSize(10)).toBe(10);
    expect(coercePageSize(1)).toBe(1);
    expect(coercePageSize(250)).toBe(250);
  });
  it("floors fractional sizes", () => {
    expect(coercePageSize(10.9)).toBe(10);
    expect(coercePageSize(1.2)).toBe(1);
  });
  it("clamps 0 and negatives up to 1", () => {
    expect(coercePageSize(0)).toBe(1);
    expect(coercePageSize(-5)).toBe(1);
  });
  it("falls back to the default 10 for non-finite values", () => {
    expect(coercePageSize(Number.NaN)).toBe(10);
    expect(coercePageSize(Number.POSITIVE_INFINITY)).toBe(10);
    expect(coercePageSize(Number.NEGATIVE_INFINITY)).toBe(10);
  });
});
