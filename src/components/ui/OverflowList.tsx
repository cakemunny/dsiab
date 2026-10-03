// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/OverflowList/OverflowList.tsx @ 88c95e4 (MIT, © Meta Platforms)

import { Children, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { Badge } from "./Badge";
import { VisuallyHidden } from "./VisuallyHidden";
import { useOverflow } from "../../hooks/useOverflow";

/* OverflowList — a MEASUREMENT ENGINE, not an indicator. It measures its own (or its parent's) width and
 * collapses the items that don't fit into a single "+N" indicator, so a horizontal list stays on one line
 * responsively. The engine (the shared ResizeObserver + the dual-render measurement + the pure
 * `computeVisibleCount` reducer) is LIFTED from Astryx (DECISIONS [[catalog-as-specification]] / [[overflow-list]]); the indicator and its reveal
 * are DEFAULTED but consumer-overridable via `overflowRenderer`. See DECISIONS [[overflow-list]]. */

/** Gap between items, as a Radix spacing step (each maps to `--ds-space-*`, scaling-aware). */
export type OverflowGap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// px mirror of the Radix `--space-N` scale at scaling 1 — the arithmetic gap fed to the reducer. The
// VISIBLE gap is applied from `--ds-space-*` in CSS (see .rt-ds-overflowlist[data-gap] in components.css),
// so under the default scaling the math and the layout agree exactly.
const GAP_PX: Record<OverflowGap, number> = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 40, 8: 48, 9: 64 };

export interface OverflowItem {
  /** The React element for this item. */
  child: ReactElement;
  /** Its index in the original children list. */
  index: number;
}

export interface OverflowListProps extends Omit<ComponentProps<"div">, "children"> {
  /** The items — each child should be a single element. */
  children: ReactNode;
  /**
   * Gap between items as a spacing step (0–9 → `--ds-space-*`). Also feeds the fit math.
   * @default 2
   */
  gap?: OverflowGap;
  /** Minimum number of items to always show. @default 0 */
  minVisibleItems?: number;
  /**
   * Which end collapses. `'end'` keeps leading items and puts "+N" last; `'start'` keeps trailing items
   * and puts "+N" first. Defaults to `'end'` — a deliberate divergence from Blueprint's `'start'`, matching
   * AvatarGroup's end-collapse house idiom.
   * @default 'end'
   */
  collapseFrom?: "start" | "end";
  /**
   * Which element governs the available width.
   * - `'observeSelf'` (default): the list's own width.
   * - `'observeParent'`: the parent's content width — the list stays content-sized (width:100% while
   *   overflowing) so it can grow back when the parent widens.
   * @default 'observeSelf'
   */
  behavior?: "observeParent" | "observeSelf";
  /**
   * Accessible name for the visible set (a `role="group"`). Collapsed items LEAVE the a11y tree, so this
   * names the surviving group as one unit. Reuses the AvatarGroup group-naming idiom. Pass `null` to opt
   * OUT of the group role entirely — for when the OverflowList sits inside an already-named group (e.g.
   * Tokenizer's surface) and a second identically-named group would just double-announce.
   * @default 'List'
   */
  label?: string | null;
  /**
   * Render the overflow indicator, given the hidden items (each with its original index). Only called when
   * items overflow. Defaults to a neutral, NON-interactive Badge "+N" with a hidden "N more" name — the
   * REVEAL (a menu/popover of the hidden items) is the consumer's job: return an interactive control here
   * (e.g. a clickable `Token` opening a `DropdownMenu`).
   */
  overflowRenderer?: (overflowItems: OverflowItem[]) => ReactNode;
  /** Ref forwarded to the visible container. */
  ref?: React.Ref<HTMLDivElement>;
}

function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
  return (value) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(value);
      else if (ref != null) (ref as React.RefObject<T | null>).current = value;
    }
  };
}

/** Default indicator: a neutral "+N" Badge — a COUNT, not a control. The stronger-neutral gray reads as a
 *  count (the AvatarGroup treatment); "N more" is what assistive tech hears in place of the "+N" glyph.
 *
 *  That substitution is carried by REAL TEXT, not by `aria-label` alone. A display Badge is a plain
 *  `<span>`, which computes to the generic role — and a generic element is one that ARIA marks as
 *  name-prohibited, so a conforming screen reader is entitled to ignore an `aria-label` on it and read
 *  the element's contents instead — and when the glyph was the only content, that fallback announced
 *  "plus five". So the announcement now lives in a visually-hidden child and the glyph is hidden from
 *  the a11y tree: whichever way a given AT resolves the name, what it reaches is the sentence "5 more".
 *  `aria-label` stays as the redundant belt — browsers that do expose it expose the identical string. */
function defaultOverflowRenderer(items: OverflowItem[]): ReactNode {
  return (
    <Badge color="gray" aria-label={`${items.length} more`}>
      <span aria-hidden>+{items.length}</span>
      <VisuallyHidden>{items.length} more</VisuallyHidden>
    </Badge>
  );
}

/**
 * A horizontal list that hides items that don't fit and shows an overflow indicator, using a hidden
 * measurement copy to avoid flicker. The indicator is measured automatically, so no manual width is needed.
 */
export function OverflowList({
  children,
  gap = 2,
  minVisibleItems = 0,
  collapseFrom = "end",
  behavior = "observeSelf",
  label,
  overflowRenderer = defaultOverflowRenderer,
  className,
  style,
  ref,
  ...props
}: OverflowListProps) {
  const childArray = Children.toArray(children) as ReactElement[];
  const itemCount = childArray.length;

  const observeParent = behavior === "observeParent";

  const { containerRef, measureRef, visibleCount, hasOverflow } = useOverflow(itemCount, {
    gap: GAP_PX[gap],
    minVisibleItems,
    collapseFrom,
    behavior,
  });

  const allItems: OverflowItem[] = childArray.map((child, index) => ({ child, index }));

  const visibleItems =
    collapseFrom === "end" ? allItems.slice(0, visibleCount) : allItems.slice(itemCount - visibleCount);
  const overflowItems =
    collapseFrom === "end" ? allItems.slice(visibleCount) : allItems.slice(0, itemCount - visibleCount);

  // Render the indicator at MAX width (all items overflowing) in the measurement copy so the engine
  // reserves the right amount of space regardless of how many actually collapse.
  const measureIndicator = overflowRenderer(allItems);
  const liveIndicator = hasOverflow ? overflowRenderer(overflowItems) : null;

  // `label === null` opts out of the group role (transparent wrapper inside an already-named group);
  // undefined falls back to the default name so the standalone use is still a named group.
  const isGroup = label !== null;
  const groupLabel = label ?? "List";

  return (
    <>
      {/* Hidden measurement copy: ALL children + the indicator at max width. aria-hidden + inert so it
          never announces or receives focus (the collapsed items live here, out of the a11y tree). */}
      <div ref={measureRef} aria-hidden inert className="rt-ds-overflowlist-measure" data-gap={gap}>
        {childArray}
        {measureIndicator != null && (
          <div className="rt-ds-overflowlist-measure-indicator">{measureIndicator}</div>
        )}
      </div>

      {/* Visible set — a named group so a screen reader hears one unit, not N items + a stray "+N".
          Suppressed (role/name dropped) when label={null}: the enclosing surface is already the group. */}
      <div
        ref={mergeRefs(ref, containerRef)}
        role={isGroup ? "group" : undefined}
        aria-label={isGroup ? groupLabel : undefined}
        data-gap={gap}
        data-fill={observeParent && hasOverflow ? "" : undefined}
        className={["rt-ds-overflowlist", className].filter(Boolean).join(" ")}
        style={style}
        {...props}
      >
        {collapseFrom === "start" && liveIndicator}
        {visibleItems.map(({ child }) => child)}
        {collapseFrom === "end" && liveIndicator}
      </div>
    </>
  );
}

OverflowList.displayName = "OverflowList";
