// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Pagination/Pagination.tsx @ 88c95e4 (MIT, © Meta Platforms)
//
// The pure page-range generator (publicly exported upstream) + the pageSize coercion guard, LIFTED under
// the port doctrine (DECISIONS [[catalog-as-specification]]). Kept verbatim so upstream diffs stay legible; upstream's JSDoc
// examples become the logic-lane assertions in generatePageRange.logic.test.ts ([[pagination-control]] · D22).

/**
 * Generates the range of page numbers to display, including ellipsis markers.
 * Returns an array of page numbers and '...' strings.
 *
 * The slot budget is `5 + 2*siblingCount` — first + last + current + 2*siblings, plus two
 * potential ellipsis slots. If the total fits, every page is shown; otherwise the range collapses
 * with a left and/or right ellipsis depending on where the current page sits.
 *
 * @example
 * ```
 * generatePageRange(5, 10, 1) → [1, '...', 4, 5, 6, '...', 10]
 * generatePageRange(1, 10, 1) → [1, 2, 3, 4, 5, '...', 10]   // near-start window = 3 + 2*siblingCount = 5 pages
 * generatePageRange(1, 5, 1)  → [1, 2, 3, 4, 5]
 * ```
 * (Upstream's JSDoc showed the near-start case as `[1, 2, 3, '...', 10]`; that under-counts the
 * `leftRange = 3 + 2*siblingCount` window the code below actually emits — corrected here, source wins.)
 */
export function generatePageRange(
  currentPage: number,
  totalPages: number,
  siblingCount: number,
): (number | "...")[] {
  // Total page number slots (excluding ellipses):
  // first + last + current + 2*siblings = 3 + 2*siblings
  // With 2 potential ellipsis slots: 5 + 2*siblings
  const totalSlots = 5 + 2 * siblingCount;

  // If total pages fit within slots, show all pages
  if (totalPages <= totalSlots) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const showLeftEllipsis = leftSiblingIndex > 2;
  const showRightEllipsis = rightSiblingIndex < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    // Near the start: show more pages on the left
    const leftRange = 3 + 2 * siblingCount;
    const pages: (number | "...")[] = Array.from(
      { length: leftRange },
      (_, i) => i + 1,
    );
    pages.push("...", totalPages);
    return pages;
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    // Near the end: show more pages on the right
    const rightRange = 3 + 2 * siblingCount;
    const pages: (number | "...")[] = [1, "..."];
    for (let i = totalPages - rightRange + 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  // In the middle: show ellipsis on both sides
  const pages: (number | "...")[] = [1, "..."];
  for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
    pages.push(i);
  }
  pages.push("...", totalPages);
  return pages;
}

/**
 * Coerce a `pageSize` to a positive integer. `pageSize` is typed as `number`, so 0, NaN, negatives,
 * and ±Infinity are valid at the type level but yield Infinity/NaN page counts — and
 * `Array.from({ length: Infinity })` crashes the `dots` variant. Non-finite values fall back to the
 * default (10); finite values floor and clamp to at least 1. Lifted verbatim from the Astryx
 * component body ([[catalog-as-specification]]) so the guard travels with the range logic it protects.
 */
export function coercePageSize(pageSize: number): number {
  return Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 10;
}
