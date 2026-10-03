// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/NumberInput/NumberInput.tsx @ 88c95e4 (MIT, © Meta Platforms)

/* parseNumberInput — parse & validate a free-text string as a number, or return null.
 *
 * LIFTED from Astryx (facebook/astryx `@astryxdesign/core`, commit 88c95e4,
 * `packages/core/src/NumberInput/NumberInput.tsx`, where it was an inline private helper) under the port
 * doctrine (DECISIONS [[catalog-as-specification]]). Kept BYTE-FAITHFUL to the upstream logic — the only change is extracting it to
 * its own module so the NumberInput component and the node-lane logic suite can share one pure function.
 *
 * The contract (all reject → null, NEVER clamp):
 *   • empty string or a bare "-"      → null (an in-progress / meaningless entry)
 *   • non-finite (NaN / ±Infinity)     → null (e.g. "abc", "1e", "1.2.3")
 *   • non-integer while isIntegerOnly  → null
 *   • below min (exclusive) or above max → null — a range violation is REJECTED, not silently clamped to
 *     the bound (the reject-not-clamp model NumberInput's two-channel revert depends on: typed out-of-range
 *     text reverts to the last valid value, it never becomes the bound).
 * min/max are INCLUSIVE bounds (num === min and num === max both pass). A `null`/`undefined` bound is "no
 * bound on that side". Note `Number("1.") === 1` etc. — a native `type=number` field sanitizes such partial
 * strings to "" before they ever reach here, so at runtime the component never asks this to judge "1.".
 */
export function parseNumberInput(
  input: string,
  options: {
    min?: number | null;
    max?: number | null;
    isIntegerOnly?: boolean;
  },
): number | null {
  const trimmed = input.trim();
  if (trimmed === "" || trimmed === "-") {
    return null;
  }

  const num = Number(trimmed);
  if (!Number.isFinite(num)) {
    return null;
  }

  // Integer-only constraint.
  if (options.isIntegerOnly && !Number.isInteger(num)) {
    return null;
  }

  // Min constraint (inclusive) — REJECT, never clamp.
  if (options.min != null && num < options.min) {
    return null;
  }

  // Max constraint (inclusive) — REJECT, never clamp.
  if (options.max != null && num > options.max) {
    return null;
  }

  return num;
}
