// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Timestamp/Timestamp.tsx @ 88c95e4 (MIT, © Meta Platforms)

/* timestampFormat — the pure time-math for Timestamp (D15).
 *
 * LIFTED + FIXED from Astryx (`@astryxdesign/core`, commit 88c95e4, `packages/core/src/Timestamp/Timestamp.tsx`,
 * where these were inline private helpers) under the port doctrine (DECISIONS [[catalog-as-specification]]), extracted here so the
 * component and the node-lane logic suite share ONE set of pure functions.
 *
 * THE D15 FIX — `Intl.RelativeTimeFormat`, not a hand-rolled English ladder. Upstream's header CLAIMS it
 * uses `Intl.RelativeTimeFormat` but the source hand-rolls English strings ("2 hours ago", "yesterday").
 * Ours splits the concern: `getRelativeParts` is a PURE, locale-independent chooser that returns the
 * `{value, unit}` to feed `Intl.RelativeTimeFormat` (so the ladder boundaries + the clock-skew clamps stay
 * unit-testable), and `formatRelative` applies the locale-correct words via `Intl`. The absolute presets
 * stay on `Intl.DateTimeFormat` (in the component); the `system_*` presets stay manual `pad()` builders
 * (locale-independent BY DESIGN — a machine format).
 */

export type TimestampFormat =
  | "relative"
  | "auto"
  | "date"
  | "date_time"
  | "time"
  | "system_date"
  | "system_date_time"
  | "system_time";

// Seconds in each unit.
export const MINUTE = 60;
export const HOUR = 3600;
export const DAY = 86400;
export const MONTH = 30 * DAY;
export const YEAR = 365 * DAY;

/** Default `auto` threshold: 7 days in seconds. */
export const DEFAULT_AUTO_THRESHOLD = 7 * DAY;

/**
 * Tolerance (seconds) for treating a *future* timestamp as the present. A value only a handful of seconds
 * ahead of our reference clock is almost always clock skew (the displayed `now` lagging the real clock, or
 * the value produced on a slightly faster clock), not a genuine future event — so it reads as "now" rather
 * than a confusing "in a few seconds". The future window is WIDER than the past (which only absorbs
 * sub-second render lag) because future drift is far more likely to be skew than real.
 */
export const FUTURE_SKEW_TOLERANCE = 30;

/** Symmetric "present" window (seconds) — |diff| under this rounds to "now" in either direction. */
export const NOW_TOLERANCE = 10;

/**
 * Parse a Timestamp `value` into a Date.
 * Heuristic: a number `< 1e12` is Unix SECONDS (× 1000), otherwise milliseconds. Unix seconds stay below
 * 1e12 until ~2286, and ms timestamps have been above it since 2001 — so the split is unambiguous in range.
 */
export function parseValue(value: string | number): Date {
  if (typeof value === "number") {
    return new Date(value < 1e12 ? value * 1000 : value);
  }
  return new Date(value);
}

export type RelativeParts = { value: number; unit: Intl.RelativeTimeFormatUnit };

/**
 * Pure, LOCALE-INDEPENDENT chooser: given `diffSeconds = now - date` (positive = past, negative = future),
 * return the `{value, unit}` to hand `Intl.RelativeTimeFormat(...).format(value, unit)`. `value` is negative
 * for the past ("2 hours ago") and positive for the future ("in 2 hours"); `{value: 0, unit: "second"}`
 * means "now" (Intl renders 0 seconds as "now" under `numeric: "auto"`).
 *
 * Applies the asymmetric clock-skew clamps: |diff| < 10s → now (both sides); a future value ≤ 30s → now.
 */
export function getRelativeParts(diffSeconds: number): RelativeParts {
  const now: RelativeParts = { value: 0, unit: "second" };

  // Symmetric present window — a value at (or a hair either side of) the render-time `now`.
  if (Math.abs(diffSeconds) < NOW_TOLERANCE) return now;
  // A near-future value is almost always skew, not a real event — wider than the past window on purpose.
  if (diffSeconds < 0 && Math.abs(diffSeconds) <= FUTURE_SKEW_TOLERANCE) return now;

  const abs = Math.abs(diffSeconds);
  const sign = diffSeconds > 0 ? -1 : 1; // past → negative (ago), future → positive (in)

  if (abs < MINUTE) return { value: sign * abs, unit: "second" };
  if (abs < HOUR) return { value: sign * Math.round(abs / MINUTE), unit: "minute" };
  if (abs < DAY) return { value: sign * Math.round(abs / HOUR), unit: "hour" };
  if (abs < MONTH) return { value: sign * Math.round(abs / DAY), unit: "day" };
  if (abs < YEAR) return { value: sign * Math.round(abs / MONTH), unit: "month" };
  return { value: sign * Math.round(abs / YEAR), unit: "year" };
}

/**
 * Locale-correct relative string via `Intl.RelativeTimeFormat` (the D15 fix). `numeric: "auto"` yields the
 * idiomatic special-cases per locale — "now", "yesterday"/"tomorrow", "last week" — instead of the
 * English-only "1 day ago". Pass `locale` to pin it; omit for the runtime default.
 */
export function formatRelative(diffSeconds: number, locale?: string): string {
  const { value, unit } = getRelativeParts(diffSeconds);
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, unit);
}

/** The interval (ms) at which a live relative timestamp re-renders — finer near the event, coarser as it recedes. */
export function getLiveInterval(diffSeconds: number): number {
  const abs = Math.abs(diffSeconds);
  if (abs < MINUTE) return 1000; // every second
  if (abs < HOUR) return 30_000; // every 30s
  if (abs < DAY) return 60_000; // every minute
  return 300_000; // every 5 minutes
}

/** Whether a format is non-relative (shows a fixed date/time), narrowing the union for `formatAbsolute`. */
export function isAbsoluteFormat(
  format: TimestampFormat,
): format is Exclude<TimestampFormat, "relative" | "auto"> {
  return format !== "relative" && format !== "auto";
}
