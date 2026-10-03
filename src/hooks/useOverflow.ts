// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/hooks/useOverflow.ts @ 88c95e4 (MIT, © Meta Platforms)

/* useOverflow — the DOM wrapper for OverflowList's measurement engine. Reads the measured widths off a
 * hidden dual-render container (offsetWidth / clientWidth), wires the shared ResizeObserver singleton, and
 * feeds the numbers to the pure `computeVisibleCount` reducer. LIFTED from Astryx (facebook/astryx
 * `@astryxdesign/core` v0.1.4, commit 88c95e4, `packages/core/src/hooks/useOverflow.ts`) under the port
 * doctrine (DECISIONS [[catalog-as-specification]]); the greedy-fit arithmetic is EXTRACTED to `../utils/computeVisibleCount` so it
 * can be exercised on the node lane without a DOM.
 *
 * CRITICAL — the cleanup is CALLBACK-REF based, not a `useEffect` return. React invokes `containerRef(null)`
 * on unmount (and before re-attaching), and THAT is where `unobserveResize` runs. There is deliberately no
 * effect-return teardown upstream; a naive `useRef` + `useEffect` rewrite would DROP the observer cleanup.
 * Keep the callback refs. */

import { useState, useCallback, useRef } from "react";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";
import { observeResize, unobserveResize } from "../utils/sharedResizeObserver";
import { computeVisibleCount } from "../utils/computeVisibleCount";

export interface UseOverflowOptions {
  /** Gap between items in px, used in the fit math. @default 0 */
  gap?: number;
  /** Minimum number of items to always show, even if they don't fit. @default 0 */
  minVisibleItems?: number;
  /** Which end to collapse items from. @default 'end' */
  collapseFrom?: "start" | "end";
  /**
   * Which element governs the available width.
   * - `'observeSelf'` (default): the visible container's own width.
   * - `'observeParent'`: the parent's content width — keeps the list content-sized while still detecting
   *   room for grow-back.
   * @default 'observeSelf'
   */
  behavior?: "observeParent" | "observeSelf";
}

export interface UseOverflowReturn {
  /** Callback ref for the VISIBLE container. */
  containerRef: React.RefCallback<HTMLElement>;
  /** Callback ref for the HIDDEN measurement container (all items + the indicator at max width). */
  measureRef: React.RefCallback<HTMLElement>;
  /** How many items fit in the visible container. */
  visibleCount: number;
  /** Whether any items are overflowing. */
  hasOverflow: boolean;
}

/**
 * Manage horizontal overflow of a list. All items are rendered into a hidden measurement container; this
 * measures how many fit in the visible container's width and recalculates on resize via the shared
 * observer. The measurement container holds the items followed (optionally) by the overflow indicator —
 * the indicator is identified by POSITION (there are more children than items), never by an attribute.
 */
export function useOverflow(itemCount: number, options: UseOverflowOptions = {}): UseOverflowReturn {
  const { gap = 0, minVisibleItems = 0, collapseFrom = "end", behavior = "observeSelf" } = options;

  const observeParent = behavior === "observeParent";

  const [visibleCount, setVisibleCount] = useState(itemCount);
  const containerElRef = useRef<HTMLElement | null>(null);
  const measureElRef = useRef<HTMLElement | null>(null);
  const observedElRef = useRef<HTMLElement | null>(null);

  const calculate = useCallback(() => {
    const container = containerElRef.current;
    const measure = measureElRef.current;
    if (!container || !measure) return;

    let availableWidth: number;
    if (observeParent && container.parentElement) {
      const parent = container.parentElement;
      const parentStyle = getComputedStyle(parent);
      availableWidth =
        parent.clientWidth - parseFloat(parentStyle.paddingLeft) - parseFloat(parentStyle.paddingRight);
    } else {
      availableWidth = container.offsetWidth;
    }

    const allChildren = Array.from(measure.children) as HTMLElement[];

    // The measurement container holds `itemCount` items, plus (optionally) the overflow indicator as the
    // LAST child — identified by position (more children than items), not a data attribute.
    const hasIndicator = allChildren.length > itemCount;
    const children = hasIndicator ? allChildren.slice(0, itemCount) : allChildren;
    const indicatorWidth = hasIndicator ? allChildren[allChildren.length - 1].offsetWidth : 0;

    setVisibleCount(
      computeVisibleCount({
        widths: children.map((child) => child.offsetWidth),
        indicatorWidth,
        availableWidth,
        gap,
        minVisibleItems,
        collapseFrom,
      }),
    );
  }, [itemCount, gap, minVisibleItems, collapseFrom, observeParent]);

  const containerRef = useCallback(
    (el: HTMLElement | null) => {
      containerElRef.current = el;

      // Clean up the previous observation — this runs on unmount (React calls the ref with null) and
      // before re-attaching. This IS the teardown; there is no useEffect return.
      if (observedElRef.current) {
        unobserveResize(observedElRef.current);
        observedElRef.current = null;
      }

      if (el) {
        const target = observeParent && el.parentElement ? el.parentElement : el;
        observeResize(target, () => {
          calculate();
        });
        observedElRef.current = target;
      }
    },
    [calculate, observeParent],
  );

  const measureRef = useCallback(
    (el: HTMLElement | null) => {
      measureElRef.current = el;
      if (el) calculate();
    },
    [calculate],
  );

  // Recalculate when the derived `calculate` changes (itemCount / gap / options).
  useIsomorphicLayoutEffect(() => {
    calculate();
  }, [calculate]);

  return { containerRef, measureRef, visibleCount, hasOverflow: visibleCount < itemCount };
}
