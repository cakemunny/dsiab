import { useCallback, useRef } from "react";

/* useListFocus — a thin 1D roving-focus keyboard mover for a single row/column of controls
 * (arrow to move, Home/End to jump, optional wrap). Built for the Pagination `dots` variant's APG
 * radiogroup interaction ([[pagination-control]] · D22) and reusable by any future segmented/1D control.
 *
 * WHY A PURPOSE-BUILT HOOK, NOT useGridFocus (the dots-focus DECISION, justified in [[pagination-control]]):
 * our lifted `useGridFocus` is a 2D grid hook — it needs a `columns` count, has no wrap (its edges
 * fire onNavigateBefore/After callbacks for month-flip), and OWNS the roving tabindex imperatively
 * (setAttribute in a layout effect). The dots pattern wants exactly the opposite: 1D, wrapping, and
 * a DECLARATIVE single tab stop (the active dot renders tabIndex=0) that moves via
 * selection-follows-focus — an imperative tabindex owner would fight React's per-dot tabIndex every
 * render. So this hook ONLY moves focus; the tab stop and selection stay declarative in the
 * component. Kept minimal: the index math is the pure `nextFocusIndex` (node-lane tested), the DOM
 * wiring is this hook (exercised by the _internal dots play).
 *
 * RIGHT-TO-LEFT. Under `dir="rtl"` a horizontal row runs from right to left, so the next item sits to
 * the LEFT and ArrowLeft moves to it (APG: the arrow keys follow the reading direction). The hook reads
 * the direction only for a horizontal ArrowLeft or ArrowRight, at the moment of the key press. An
 * explicit `dir` option wins. Without it, the hook reads the computed `direction` of the list
 * container, the same read Calendar makes. A vertical list ignores direction, because ArrowUp and
 * ArrowDown do not depend on it.
 */

export type ListOrientation = "horizontal" | "vertical";

export interface NextFocusOptions {
  /** Which arrow-key axis moves focus. @default 'horizontal' */
  orientation?: ListOrientation;
  /** Whether moving past an edge wraps to the other end. @default true */
  wrap?: boolean;
  /** Swaps ArrowLeft and ArrowRight for a horizontal list that runs right to left. @default false */
  rtl?: boolean;
}

/**
 * Pure next-focus index for a 1D roving list. Returns the destination index for a navigation key, or
 * `null` when the key is not a navigation key (so the caller leaves the event alone). `count <= 0`
 * yields `null`. A `current` of -1 (nothing focused) treats the next/prev keys as entering from the
 * respective edge.
 */
export function nextFocusIndex(
  current: number,
  count: number,
  key: string,
  opts: NextFocusOptions = {},
): number | null {
  const { orientation = "horizontal", wrap = true, rtl = false } = opts;
  if (count <= 0) return null;

  const horizontal = orientation === "horizontal";
  const nextKey = horizontal ? (rtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown";
  const prevKey = horizontal ? (rtl ? "ArrowRight" : "ArrowLeft") : "ArrowUp";

  switch (key) {
    case nextKey: {
      const n = current + 1;
      return n < count ? n : wrap ? 0 : count - 1;
    }
    case prevKey: {
      const p = current - 1;
      return p >= 0 ? p : wrap ? count - 1 : 0;
    }
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

export interface UseListFocusOptions extends Omit<NextFocusOptions, "rtl"> {
  /** CSS selector matching the focusable items inside the list container. @default 'button' */
  itemSelector?: string;
  /** The reading direction. When unset, the hook reads the computed `direction` of the list container. */
  dir?: "ltr" | "rtl";
}

const HORIZONTAL_ARROWS = new Set(["ArrowLeft", "ArrowRight"]);

/** True when the list runs right to left. An explicit `dir` wins over the computed style. */
function isRightToLeft(list: HTMLElement, dir: "ltr" | "rtl" | undefined): boolean {
  if (dir) return dir === "rtl";
  if (typeof window === "undefined") return false;
  return window.getComputedStyle(list).direction === "rtl";
}

export interface UseListFocusReturn<T extends HTMLElement> {
  /** Ref to attach to the list container. */
  listRef: React.RefObject<T | null>;
  /** Key-down handler for the container — moves focus among the items with wrap + Home/End. */
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

export function useListFocus<T extends HTMLElement = HTMLElement>(
  options: UseListFocusOptions = {},
): UseListFocusReturn<T> {
  const { itemSelector = "button", orientation = "horizontal", wrap = true, dir } = options;
  const listRef = useRef<T | null>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const list = listRef.current;
      if (!list) return;
      // Enabled items only — a [disabled] or aria-disabled control is not a focus target.
      const items = Array.from(
        list.querySelectorAll<HTMLElement>(itemSelector),
      ).filter(
        (el) =>
          !(el as HTMLButtonElement).disabled &&
          el.getAttribute("aria-disabled") !== "true",
      );
      if (items.length === 0) return;

      const active = document.activeElement as HTMLElement | null;
      const current = active ? items.indexOf(active) : -1;
      // Read the direction only when it can change the answer: a horizontal ArrowLeft or ArrowRight.
      const rtl = orientation === "horizontal" && HORIZONTAL_ARROWS.has(e.key) && isRightToLeft(list, dir);
      const next = nextFocusIndex(current, items.length, e.key, { orientation, wrap, rtl });
      if (next == null) return;

      e.preventDefault();
      items[next]?.focus();
    },
    [itemSelector, orientation, wrap, dir],
  );

  return { listRef, handleKeyDown };
}
