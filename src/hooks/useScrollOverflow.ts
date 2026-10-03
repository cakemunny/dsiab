// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/hooks/useScrollOverflow.ts @ 88c95e4 (MIT, © Meta Platforms)
// Portions derived from facebook/astryx packages/core/src/Carousel/Carousel.tsx @ 88c95e4 (MIT, © Meta Platforms)

import { useState, useCallback, useEffect, useRef } from "react";
import { observeResize, unobserveResize } from "../utils/sharedResizeObserver";

/* useScrollOverflow — tracks whether a horizontally-scrollable container overflows at the start, the end,
 * or both, and updates on scroll + resize. LIFTED from Astryx (`@astryxdesign/core` v0.1.4, commit
 * 88c95e4, `hooks/useScrollOverflow.ts`) under the port doctrine (DECISIONS [[catalog-as-specification]]), adapted to our naming.
 * Consumed by Carousel ([[carousel-scroller]]) for the edge fades + prev/next enable state.
 *
 * It REUSES our shared ResizeObserver singleton (src/utils/sharedResizeObserver.ts — `observeResize` /
 * `unobserveResize`), the exact primitive upstream imports, so N carousels share ONE observer. The pure
 * overflow math is extracted to `computeOverflow` for the node lane (useScrollOverflow.logic.test.ts). */

export interface ScrollOverflowState {
  /** Content overflows the start (left in LTR, right in RTL). */
  overflowStart: boolean;
  /** Content overflows the end (right in LTR, left in RTL). */
  overflowEnd: boolean;
  /** Whether the container has any overflow at all. */
  hasOverflow: boolean;
}

/**
 * Pure overflow math from a container's scroll geometry — node-testable (no DOM). `Math.abs(scrollLeft)`
 * folds RTL's negative scrollLeft onto the same axis; a 1px tolerance absorbs sub-pixel rounding so an
 * unscrollable container never reads as "overflowing at the end".
 */
export function computeOverflow(
  scrollLeft: number,
  scrollWidth: number,
  clientWidth: number,
  tolerance = 1,
): ScrollOverflowState {
  const maxScroll = scrollWidth - clientWidth;
  const pos = Math.abs(scrollLeft);
  return {
    overflowStart: pos > tolerance,
    overflowEnd: pos < maxScroll - tolerance,
    hasOverflow: scrollWidth > clientWidth + tolerance,
  };
}

/** Whether the user has asked for reduced motion (SSR-safe). */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Scroll a container by ~one viewport, leaving a half-item peek so the user keeps their place. Honors
 * reduced motion (`behavior: "auto"`) — the JS mirror of the CSS `scroll-behavior` override. `direction`
 * is -1 (prev) or 1 (next).
 */
export function scrollByViewport(el: HTMLElement, direction: -1 | 1): void {
  const firstChild = el.firstElementChild as HTMLElement | null;
  const itemWidth = firstChild ? firstChild.offsetWidth : 0;
  const amount = el.clientWidth - itemWidth * 0.5;
  el.scrollBy({
    left: direction * Math.max(amount, itemWidth),
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

/**
 * Tracks scroll-overflow state for a horizontally scrollable container. Returns a ref callback to attach
 * to the scroll container plus `{ overflowStart, overflowEnd, hasOverflow }`, updated on scroll + resize.
 *
 * @example
 * const { scrollRef, overflowStart, overflowEnd } = useScrollOverflow();
 * <div ref={scrollRef} style={{ overflowX: "auto" }}>…</div>
 */
export function useScrollOverflow() {
  const elRef = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<ScrollOverflowState>({
    overflowStart: false,
    overflowEnd: false,
    hasOverflow: false,
  });

  const measure = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    const next = computeOverflow(el.scrollLeft, el.scrollWidth, el.clientWidth);
    setState((prev) =>
      prev.overflowStart === next.overflowStart &&
      prev.overflowEnd === next.overflowEnd &&
      prev.hasOverflow === next.hasOverflow
        ? prev
        : next,
    );
  }, []);

  const scrollRef = useCallback(
    (el: HTMLElement | null) => {
      if (elRef.current) {
        unobserveResize(elRef.current);
        elRef.current.removeEventListener("scroll", measure);
      }
      elRef.current = el;
      if (el) {
        el.addEventListener("scroll", measure, { passive: true });
        observeResize(el, measure); // fires once synchronously → initial measurement
      }
    },
    [measure],
  );

  useEffect(() => {
    return () => {
      if (elRef.current) {
        unobserveResize(elRef.current);
        elRef.current.removeEventListener("scroll", measure);
      }
    };
  }, [measure]);

  return { scrollRef, ...state };
}
