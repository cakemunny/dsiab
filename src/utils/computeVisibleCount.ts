// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/hooks/useOverflow.ts @ 88c95e4 (MIT, © Meta Platforms)

/* computeVisibleCount — the pure greedy-fit reducer at the heart of OverflowList's measurement engine.
 * EXTRACTED from the `calculate` closure of Astryx's `useOverflow` hook (facebook/astryx
 * `@astryxdesign/core` v0.1.4, commit 88c95e4, `packages/core/src/hooks/useOverflow.ts`) under the port
 * doctrine (DECISIONS [[catalog-as-specification]]) so the arithmetic can be exercised on the node lane WITHOUT a DOM — upstream
 * only tested it through the hook (mocking elements as `{ offsetWidth }`), which is exactly this reducer.
 *
 * The algorithm: for `collapseFrom:'start'` the widths are reversed; greedily accumulate
 * `itemWidth + gap`, reserving `indicatorWidth + gap` for every NON-last item (the "+N" must still fit);
 * break as soon as the candidate + reserved exceeds `availableWidth` AND we have already met the
 * `minVisibleItems` floor; finally clamp the count to `[minVisibleItems, itemCount]`. */

export interface ComputeVisibleCountArgs {
  /** Measured widths (offsetWidth) of each item, in source order. */
  widths: number[];
  /** Measured width of the overflow indicator ("+N") at its maximum, or 0 when there is none. */
  indicatorWidth: number;
  /** The width the visible row has to fill. */
  availableWidth: number;
  /** Gap between items, in px. */
  gap: number;
  /** Minimum number of items to keep visible even when they don't fit. */
  minVisibleItems: number;
  /** Which end collapses: `'end'` keeps leading items, `'start'` keeps trailing items. */
  collapseFrom: "start" | "end";
}

/**
 * Given measured item widths, an indicator width, and the available width, return how many items fit.
 * Pure — no DOM, no React. The DOM reads (offsetWidth / clientWidth) live in `useOverflow`, which feeds
 * this reducer.
 */
export function computeVisibleCount({
  widths,
  indicatorWidth,
  availableWidth,
  gap,
  minVisibleItems,
  collapseFrom,
}: ComputeVisibleCountArgs): number {
  if (widths.length === 0) return 0;

  // Collapsing from the start keeps the TRAILING items, so measure from the end inward.
  const orderedWidths = collapseFrom === "end" ? widths : [...widths].reverse();

  let totalWidth = 0;
  let count = 0;

  for (let i = 0; i < orderedWidths.length; i++) {
    const itemWidth = orderedWidths[i];
    const gapWidth = i > 0 ? gap : 0;
    const candidateWidth = totalWidth + itemWidth + gapWidth;

    // Every item except the last must leave room for the indicator + its gap.
    const isLastItem = i === orderedWidths.length - 1;
    const reservedWidth = isLastItem ? 0 : indicatorWidth + (count > 0 || indicatorWidth > 0 ? gap : 0);

    if (candidateWidth + reservedWidth > availableWidth && count >= minVisibleItems) {
      break;
    }

    totalWidth = candidateWidth;
    count++;
  }

  return Math.max(Math.min(count, widths.length), minVisibleItems);
}
