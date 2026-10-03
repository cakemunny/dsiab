// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file parseNumberInput.logic.test.ts
 * @input Uses vitest, parseNumberInput
 * @output Unit tests for the lifted number-parse/validate helper
 * @position Testing; validates parseNumberInput.ts. The function is LIFTED from Astryx
 *   (`packages/core/src/NumberInput/NumberInput.tsx`, commit 88c95e4) under DECISIONS [[catalog-as-specification]]; upstream
 *   ships NO tests for it, so this coverage is NET-NEW (the reject-not-clamp contract NumberInput relies on).
 *
 * SYNC: When parseNumberInput.ts changes, update tests to match new behavior.
 */

import { describe, it, expect } from "vitest";
import { parseNumberInput } from "./parseNumberInput";

describe("parseNumberInput — valid numbers", () => {
  it("parses integers", () => {
    expect(parseNumberInput("0", {})).toBe(0);
    expect(parseNumberInput("5", {})).toBe(5);
    expect(parseNumberInput("42", {})).toBe(42);
    expect(parseNumberInput("-7", {})).toBe(-7);
  });

  it("parses decimals", () => {
    expect(parseNumberInput("1.5", {})).toBe(1.5);
    expect(parseNumberInput("-0.25", {})).toBe(-0.25);
    expect(parseNumberInput("3.14159", {})).toBe(3.14159);
  });

  it("trims surrounding whitespace", () => {
    expect(parseNumberInput("  12  ", {})).toBe(12);
  });
});

describe("parseNumberInput — empty / partial → null", () => {
  it("returns null for an empty or whitespace-only string", () => {
    expect(parseNumberInput("", {})).toBeNull();
    expect(parseNumberInput("   ", {})).toBeNull();
  });

  it("returns null for a bare minus sign", () => {
    expect(parseNumberInput("-", {})).toBeNull();
  });

  // Faithful-port behavior: Number("1.") === 1, so the pure parser ACCEPTS a trailing-dot string as the
  // finite number it denotes. This never surfaces in the component: a native type=number field sanitizes
  // "1." to "" before it reaches here (the pending-string model), so the field never commits a bare "1.".
  it("treats a trailing-dot string as its finite value (verbatim upstream)", () => {
    expect(parseNumberInput("1.", {})).toBe(1);
  });
});

describe("parseNumberInput — non-finite → null", () => {
  it("returns null for non-numeric text", () => {
    expect(parseNumberInput("abc", {})).toBeNull();
    expect(parseNumberInput("1e", {})).toBeNull(); // Number("1e") === NaN
    expect(parseNumberInput("1.2.3", {})).toBeNull();
    expect(parseNumberInput("Infinity", {})).toBeNull(); // Number.isFinite rejects ±Infinity
    expect(parseNumberInput("-Infinity", {})).toBeNull();
    expect(parseNumberInput("NaN", {})).toBeNull();
  });
});

describe("parseNumberInput — integer-only rejects decimals", () => {
  it("rejects a non-integer when isIntegerOnly", () => {
    expect(parseNumberInput("1.5", { isIntegerOnly: true })).toBeNull();
    expect(parseNumberInput("-0.25", { isIntegerOnly: true })).toBeNull();
  });

  it("still accepts integers when isIntegerOnly", () => {
    expect(parseNumberInput("3", { isIntegerOnly: true })).toBe(3);
    expect(parseNumberInput("-7", { isIntegerOnly: true })).toBe(-7);
    // A decimal string that denotes a whole number is an integer (Number.isInteger(2.0) === true).
    expect(parseNumberInput("2.0", { isIntegerOnly: true })).toBe(2);
  });
});

describe("parseNumberInput — min/max REJECT, never clamp", () => {
  it("rejects a value below min (does not clamp up to min)", () => {
    expect(parseNumberInput("0", { min: 1 })).toBeNull();
    expect(parseNumberInput("-5", { min: 0 })).toBeNull();
  });

  it("rejects a value above max (does not clamp down to max)", () => {
    expect(parseNumberInput("99", { max: 10 })).toBeNull();
    expect(parseNumberInput("11", { min: 1, max: 10 })).toBeNull();
  });

  it("accepts values ON the inclusive bounds", () => {
    expect(parseNumberInput("1", { min: 1, max: 10 })).toBe(1);
    expect(parseNumberInput("10", { min: 1, max: 10 })).toBe(10);
    expect(parseNumberInput("5", { min: 1, max: 10 })).toBe(5);
  });

  it("treats null/undefined bounds as unbounded on that side", () => {
    expect(parseNumberInput("1000", { min: null, max: null })).toBe(1000);
    expect(parseNumberInput("-1000", {})).toBe(-1000);
    expect(parseNumberInput("1000", { min: 0 })).toBe(1000);
  });
});
