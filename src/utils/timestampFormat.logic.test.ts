// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file timestampFormat.logic.test.ts
 * @input Uses vitest, timestampFormat
 * @output Unit tests for the lifted Timestamp time-math (node lane, DECISIONS [[catalog-as-specification]]/D15)
 * @position Testing; validates timestampFormat.ts. The helpers are LIFTED from Astryx
 *   (`packages/core/src/Timestamp/Timestamp.tsx`, commit 88c95e4) and FIXED to feed `Intl.RelativeTimeFormat`
 *   (D15). Upstream ships tests for its hand-rolled ladder; this re-covers the boundaries against the new
 *   Intl-parts chooser + the skew/interval/parse contracts the component depends on.
 *
 * SYNC: When timestampFormat.ts changes, update tests to match new behavior.
 */

import { describe, it, expect } from "vitest";
import {
  parseValue, getRelativeParts, formatRelative, getLiveInterval, isAbsoluteFormat,
  MINUTE, HOUR, DAY, MONTH, YEAR, FUTURE_SKEW_TOLERANCE,
} from "./timestampFormat";

describe("parseValue — the <1e12 seconds-vs-ms heuristic", () => {
  it("treats a number below 1e12 as Unix SECONDS", () => {
    // 1_700_000_000 s = 2023-11-14T22:13:20Z → ×1000 into the Date.
    expect(parseValue(1_700_000_000).getTime()).toBe(1_700_000_000_000);
  });
  it("treats a number at or above 1e12 as MILLISECONDS", () => {
    expect(parseValue(1_700_000_000_000).getTime()).toBe(1_700_000_000_000);
  });
  it("crosses the 1e12 boundary correctly", () => {
    // Just below → seconds (×1000, huge); just at → ms (as-is).
    expect(parseValue(1e12 - 1).getTime()).toBe((1e12 - 1) * 1000);
    expect(parseValue(1e12).getTime()).toBe(1e12);
  });
  it("parses ISO 8601 strings", () => {
    expect(parseValue("2026-02-19T17:00:00Z").getTime()).toBe(Date.parse("2026-02-19T17:00:00Z"));
  });
});

describe("getRelativeParts — clock-skew clamps → 'now'", () => {
  it("clamps |diff| under 10s to now (both directions)", () => {
    expect(getRelativeParts(0)).toEqual({ value: 0, unit: "second" });
    expect(getRelativeParts(9)).toEqual({ value: 0, unit: "second" });
    expect(getRelativeParts(-9)).toEqual({ value: 0, unit: "second" });
  });
  it("clamps a FUTURE value within the 30s skew window to now", () => {
    expect(getRelativeParts(-FUTURE_SKEW_TOLERANCE)).toEqual({ value: 0, unit: "second" }); // -30 → now
    expect(getRelativeParts(-20)).toEqual({ value: 0, unit: "second" });
  });
  it("does NOT clamp a future value just past the skew window", () => {
    // -31s → 31 seconds in the future (positive value, second unit).
    expect(getRelativeParts(-31)).toEqual({ value: 31, unit: "second" });
  });
  it("does NOT clamp a past value past the 10s window (the past window is only 10s)", () => {
    // +20s past → "20 seconds ago" (negative value).
    expect(getRelativeParts(20)).toEqual({ value: -20, unit: "second" });
  });
});

describe("getRelativeParts — ladder boundaries + sign polarity", () => {
  it("past values are negative (ago), future values are positive (in)", () => {
    expect(getRelativeParts(2 * HOUR)).toEqual({ value: -2, unit: "hour" });
    expect(getRelativeParts(-2 * HOUR)).toEqual({ value: 2, unit: "hour" });
  });
  it("selects the unit at each rung", () => {
    expect(getRelativeParts(45).unit).toBe("second");
    expect(getRelativeParts(5 * MINUTE)).toEqual({ value: -5, unit: "minute" });
    expect(getRelativeParts(3 * HOUR)).toEqual({ value: -3, unit: "hour" });
    expect(getRelativeParts(2 * DAY)).toEqual({ value: -2, unit: "day" });
    expect(getRelativeParts(3 * MONTH)).toEqual({ value: -3, unit: "month" });
    expect(getRelativeParts(2 * YEAR)).toEqual({ value: -2, unit: "year" });
  });
  it("rounds within a rung", () => {
    // 90 minutes → 2 hours (round 1.5).
    expect(getRelativeParts(90 * MINUTE)).toEqual({ value: -2, unit: "hour" });
  });
});

describe("formatRelative — Intl.RelativeTimeFormat (D15 fix, pinned to 'en')", () => {
  it("renders 'now' at the present", () => {
    expect(formatRelative(0, "en")).toBe("now");
    expect(formatRelative(-20, "en")).toBe("now"); // future skew → now
  });
  it("renders idiomatic past/future via numeric:auto", () => {
    expect(formatRelative(2 * HOUR, "en")).toBe("2 hours ago");
    expect(formatRelative(-2 * HOUR, "en")).toBe("in 2 hours");
    expect(formatRelative(DAY, "en")).toBe("yesterday"); // -1 day, auto → "yesterday"
    expect(formatRelative(-DAY, "en")).toBe("tomorrow"); // +1 day, auto → "tomorrow"
  });
  it("respects an explicit non-English locale (locale-correct, not English-only)", () => {
    // The whole point of D15: another locale gets its own words, not the hand-rolled English.
    expect(formatRelative(2 * HOUR, "es")).toBe("hace 2 horas");
  });
});

describe("getLiveInterval — finer near the event, coarser as it recedes", () => {
  it("< 1 min → every second", () => {
    expect(getLiveInterval(30)).toBe(1000);
    expect(getLiveInterval(MINUTE - 1)).toBe(1000);
  });
  it("< 1 hr → every 30s", () => {
    expect(getLiveInterval(MINUTE)).toBe(30_000);
    expect(getLiveInterval(HOUR - 1)).toBe(30_000);
  });
  it("< 1 day → every minute", () => {
    expect(getLiveInterval(HOUR)).toBe(60_000);
    expect(getLiveInterval(DAY - 1)).toBe(60_000);
  });
  it(">= 1 day → every 5 minutes", () => {
    expect(getLiveInterval(DAY)).toBe(300_000);
    expect(getLiveInterval(30 * DAY)).toBe(300_000);
  });
  it("uses |diff| — a future value ladders the same as its past mirror", () => {
    expect(getLiveInterval(-30)).toBe(1000);
    expect(getLiveInterval(-HOUR)).toBe(60_000);
  });
});

describe("isAbsoluteFormat — the relative/auto exclusion", () => {
  it("is false for relative and auto", () => {
    expect(isAbsoluteFormat("relative")).toBe(false);
    expect(isAbsoluteFormat("auto")).toBe(false);
  });
  it("is true for every fixed preset", () => {
    for (const f of ["date", "date_time", "time", "system_date", "system_date_time", "system_time"] as const) {
      expect(isAbsoluteFormat(f)).toBe(true);
    }
  });
});
