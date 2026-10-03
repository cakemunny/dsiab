// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/hooks/useTreeFocus.ts @ 88c95e4 (MIT, © Meta Platforms)

/* useTreeFocus — generic React hook implementing the WAI-ARIA *tree* keyboard model: linear
 * ArrowUp/Down/Home/End over the VISIBLE treeitems (collapsed subtrees aren't rendered → naturally
 * excluded; disabled skipped), ArrowRight/ArrowLeft carrying tree semantics (expand / collapse /
 * first-child / parent-by-level-scan), Enter/Space activation (onActivate, falling back to an
 * expand-toggle), a 500ms typeahead buffer, and optional roving-tabindex ownership (a single tab
 * stop stamped + repaired across mounts/unmounts/disable via useIsomorphicLayoutEffect). It is the
 * tree analogue of the sibling useGridFocus (2D grids); a tree is NOT a linear list, which is why it
 * gets its own hook rather than reusing a list-focus helper.
 *
 * LIFTED from Astryx (facebook/astryx `@astryxdesign/core` v0.1.4, commit 88c95e4,
 * `packages/core/src/hooks/useTreeFocus.ts`) under the port doctrine (DECISIONS [[catalog-as-specification]]), adapted to our
 * naming. The pure decision logic (collectExpandedKeys / findInitialTabbableId / the level-scan to
 * parent / the typeahead matcher) is EXTRACTED to exported helpers so it is unit-testable in the node
 * lane (useTreeFocus.logic.test.ts) without a DOM; the DOM-integration behaviours (arrow/expand/
 * collapse/tab-stop-repair) are covered by browser plays. The only non-react dependency is the sibling
 * useIsomorphicLayoutEffect SSR shim. */

/**
 * @file useTreeFocus.ts
 * @input Uses React useCallback, useRef, useIsomorphicLayoutEffect
 * @output Exports useTreeFocus hook + the pure tree helpers for WAI-ARIA tree keyboard navigation
 * @position Core hook; used by TreeList for roving tabindex + the APG tree keyboard model
 */

import { useCallback, useRef } from "react";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

/** Keys handled by the tree keyboard model (used to gate typeahead). */
const NAVIGATION_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "ArrowRight",
  "ArrowLeft",
  "Home",
  "End",
  "Enter",
  " ",
]);

/** Default reset delay for the typeahead buffer. */
export const DEFAULT_TYPEAHEAD_RESET_MS = 500;

// =============================================================================
// Pure helpers (unit-tested in the node lane — no DOM)
// =============================================================================

/**
 * The minimal recursive node shape the pure helpers read. `TreeListItemData`
 * (TreeList.tsx) is a structural super-set, so the tree's data flows straight in
 * without the hook importing component types.
 */
export interface TreeNodeLike {
  id: string;
  children?: readonly TreeNodeLike[];
  isExpanded?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
}

/**
 * Recursively collect the ids of items flagged `isExpanded` (and that actually
 * have children). The seed for TreeList's uncontrolled expansion state.
 */
export function collectExpandedKeys(items: readonly TreeNodeLike[]): string[] {
  const keys: string[] = [];
  for (const item of items) {
    if (item.isExpanded === true && item.children != null && item.children.length > 0) {
      keys.push(item.id);
    }
    if (item.children != null) {
      keys.push(...collectExpandedKeys(item.children));
    }
  }
  return keys;
}

/**
 * The initial roving-tabindex seed: the first selected enabled item in document
 * order, else the first enabled item, else the first item. The hook takes over
 * on mount (preserving this seeded `tabindex="0"` on its repair pass).
 */
export function findInitialTabbableId(items: readonly TreeNodeLike[]): string | undefined {
  let firstEnabled: string | undefined;
  const walk = (list: readonly TreeNodeLike[]): string | undefined => {
    for (const item of list) {
      if (item.isSelected === true && item.isDisabled !== true) {
        return item.id;
      }
      if (firstEnabled == null && item.isDisabled !== true) {
        firstEnabled = item.id;
      }
      if (item.children != null && item.children.length > 0) {
        const selected = walk(item.children);
        if (selected != null) {
          return selected;
        }
      }
    }
    return undefined;
  };
  return walk(items) ?? firstEnabled ?? items[0]?.id;
}

/**
 * ArrowLeft's parent target: scanning UPWARD in visible order from `currentIndex`,
 * the nearest item at a shallower level. Returns its index, or -1 if the current
 * item is a root (no shallower ancestor is visible above it).
 */
export function findParentIndexByLevel(levels: readonly number[], currentIndex: number): number {
  if (currentIndex < 0 || currentIndex >= levels.length) {
    return -1;
  }
  const currentLevel = levels[currentIndex];
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (levels[i] < currentLevel) {
      return i;
    }
  }
  return -1;
}

/**
 * Typeahead resolution: from the accumulated `query`, the next enabled item whose
 * trimmed text starts with it — searching from AFTER the current item and wrapping
 * around to (and including) the current one last. Returns the matched index, or -1.
 */
export function matchTypeahead(
  texts: readonly string[],
  query: string,
  currentIndex: number,
  isDisabled: (index: number) => boolean = () => false,
): number {
  const n = texts.length;
  if (query === "" || n === 0) {
    return -1;
  }
  const q = query.toLowerCase();
  const start = currentIndex < 0 ? 0 : currentIndex;
  // step 1..n → indices (start+1) … (start+n) mod n, so the current item is checked LAST (wrap-around).
  for (let step = 1; step <= n; step++) {
    const i = (start + step) % n;
    if (!isDisabled(i) && texts[i].trim().toLowerCase().startsWith(q)) {
      return i;
    }
  }
  return -1;
}

// =============================================================================
// Hook types
// =============================================================================

/**
 * Configuration for tree focus behaviour. The hook stays generic by taking
 * callbacks for the tree-specific bits (expansion toggling, activation) — the
 * same shape as useGridFocus taking `isCellFocusable`.
 */
export interface UseTreeFocusOptions {
  /**
   * Selector matching ALL visible treeitems in DOM order (collapsed subtrees are
   * not rendered, so they are naturally excluded). Disabled items are matched
   * then skipped via {@link isItemDisabled}.
   * @default '[role="treeitem"]'
   */
  itemSelector?: string;

  /**
   * Whether a matched treeitem is disabled (skipped during arrow/Home/End). A
   * `.focus()` on a disabled item silently no-ops, which would otherwise stall
   * navigation.
   * @default reads `data-tree-disabled` / `aria-disabled="true"`
   */
  isItemDisabled?: (item: HTMLElement) => boolean;

  /**
   * The 1-based nesting level of a treeitem — resolves first-child (ArrowRight)
   * and parent (ArrowLeft) targets from the flat visible list.
   * @default reads `aria-level` (falling back to `1`)
   */
  getLevel?: (item: HTMLElement) => number;

  /** Whether a treeitem is an expanded parent. @default `aria-expanded === 'true'` */
  isExpanded?: (item: HTMLElement) => boolean;

  /** Whether a treeitem is a collapsed parent. @default `aria-expanded === 'false'` */
  isCollapsed?: (item: HTMLElement) => boolean;

  /** The stable id for a treeitem (passed to onToggleExpand / onActivate). @default `data-tree-id` */
  getItemId?: (item: HTMLElement) => string | undefined;

  /**
   * Expand/collapse the treeitem with the given id (ArrowRight on a collapsed
   * parent, ArrowLeft on an expanded parent, and Enter/Space on a parent with no
   * inner action).
   */
  onToggleExpand?: (id: string) => void;

  /**
   * Called when Enter/Space activates a treeitem. Return `true` if handled (e.g.
   * an inner link/button was clicked); return falsy to let the hook fall back to
   * toggling expansion for a parent.
   */
  onActivate?: (item: HTMLElement, id: string | undefined) => boolean | undefined;

  /** Whether typeahead is enabled. @default true */
  typeahead?: boolean;

  /** Reset delay for the typeahead buffer, in ms. @default 500 */
  typeaheadResetMs?: number;

  /** Notified whenever the hook moves focus to a treeitem, with its id (if any). */
  onActiveChange?: (id: string | undefined) => void;

  /**
   * Roving-tabindex ownership. When true, exactly one enabled treeitem carries
   * `tabindex="0"` (the rest `-1`); the stop is repaired on mount and whenever
   * items mount/unmount or toggle disabled, and moves with keyboard navigation.
   * An existing seeded `tabindex="0"` is preserved on the mount repair. When
   * false (default) the hook only moves focus and never touches `tabindex`.
   * @default false
   */
  hasRovingTabIndex?: boolean;
}

/** Return type for useTreeFocus. */
export interface UseTreeFocusReturn<T extends HTMLElement = HTMLElement> {
  /** Ref for the tree container (role="tree"). */
  treeRef: React.RefObject<T | null>;
  /** Key-down handler for the tree container. */
  handleKeyDown: (e: React.KeyboardEvent) => void;
  /** Focus handler for the container's `onFocus` — keeps the roving stop in sync (no-op when off). */
  handleFocus: (e: React.FocusEvent) => void;
  /** Focus the first enabled visible treeitem. */
  focusFirst: () => void;
  /** Focus the last enabled visible treeitem. */
  focusLast: () => void;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Roving-tabindex focus + the WAI-ARIA tree keyboard model.
 *
 * - ArrowDown / ArrowUp: next/previous visible treeitem (skip disabled)
 * - ArrowRight: collapsed parent → expand; expanded parent → first child; leaf → no-op
 * - ArrowLeft: expanded parent → collapse; otherwise → parent treeitem (level scan)
 * - Home / End: first / last visible treeitem
 * - Enter / Space: activate (onActivate), falling back to an expansion toggle
 * - Printable characters: typeahead to the next matching treeitem
 *
 * DOM-query based (reads aria-expanded / aria-level / data-tree-*), delegating the
 * pure decisions to the exported helpers above.
 */
export function useTreeFocus<T extends HTMLElement = HTMLElement>(
  options: UseTreeFocusOptions = {},
): UseTreeFocusReturn<T> {
  const {
    itemSelector = '[role="treeitem"]',
    isItemDisabled,
    getLevel,
    isExpanded,
    isCollapsed,
    getItemId,
    onToggleExpand,
    onActivate,
    typeahead = true,
    typeaheadResetMs = DEFAULT_TYPEAHEAD_RESET_MS,
    onActiveChange,
    hasRovingTabIndex = false,
  } = options;

  const treeRef = useRef<T>(null);
  const typeaheadRef = useRef<{ buffer: string; timer: number | null }>({ buffer: "", timer: null });

  /** Visible treeitems in DOM order (collapsed subtrees are not rendered). */
  const getItems = useCallback((): HTMLElement[] => {
    const root = treeRef.current;
    if (root == null) {
      return [];
    }
    return Array.from(root.querySelectorAll<HTMLElement>(itemSelector));
  }, [itemSelector]);

  const itemDisabled = useCallback(
    (el: HTMLElement): boolean =>
      isItemDisabled
        ? isItemDisabled(el)
        : el.dataset.treeDisabled != null || el.getAttribute("aria-disabled") === "true",
    [isItemDisabled],
  );

  const levelOf = useCallback(
    (el: HTMLElement): number => (getLevel ? getLevel(el) : Number(el.getAttribute("aria-level") ?? "1")),
    [getLevel],
  );

  const expandedOf = useCallback(
    (el: HTMLElement): boolean =>
      isExpanded ? isExpanded(el) : el.getAttribute("aria-expanded") === "true",
    [isExpanded],
  );

  const collapsedOf = useCallback(
    (el: HTMLElement): boolean =>
      isCollapsed ? isCollapsed(el) : el.getAttribute("aria-expanded") === "false",
    [isCollapsed],
  );

  const idOf = useCallback(
    (el: HTMLElement): string | undefined => (getItemId ? getItemId(el) : el.dataset.treeId),
    [getItemId],
  );

  // --- Roving tabindex ownership (opt-in via `hasRovingTabIndex`) -------------

  /** Set `tabindex` only when it differs (avoids redundant DOM writes). */
  const setTabIndex = useCallback((el: HTMLElement, value: 0 | -1) => {
    if (el.getAttribute("tabindex") !== String(value)) {
      el.setAttribute("tabindex", String(value));
    }
  }, []);

  /** Make `target` the sole tabbable treeitem: 0 on it, -1 on the rest. */
  const moveTabStop = useCallback(
    (items: HTMLElement[], target: HTMLElement) => {
      for (const el of items) {
        setTabIndex(el, el === target ? 0 : -1);
      }
    },
    [setTabIndex],
  );

  /**
   * Repair the roving tab stop: exactly one enabled treeitem is tabbable (0).
   * Prefer an existing `tabindex="0"` (seeded in render); else the first enabled.
   */
  const syncTabStops = useCallback(() => {
    const items = getItems();
    const enabled = items.filter((el) => !itemDisabled(el));
    if (enabled.length === 0) {
      return;
    }
    const current = enabled.find((el) => el.getAttribute("tabindex") === "0");
    moveTabStop(items, current ?? enabled[0]);
  }, [getItems, itemDisabled, moveTabStop]);

  // Keep the tab stop valid across renders (items added/removed, disabled toggled).
  useIsomorphicLayoutEffect(() => {
    if (hasRovingTabIndex) {
      syncTabStops();
    }
  });

  /** Move focus to a treeitem and notify the active-change listener. */
  const focusItem = useCallback(
    (el: HTMLElement | undefined) => {
      if (el == null) {
        return;
      }
      if (hasRovingTabIndex) {
        moveTabStop(getItems(), el);
      }
      onActiveChange?.(idOf(el));
      el.focus();
    },
    [idOf, onActiveChange, hasRovingTabIndex, moveTabStop, getItems],
  );

  /** First enabled treeitem from `start`, moving by `dir`. No wrap (clamp at ends). */
  const focusEnabledFrom = useCallback(
    (items: HTMLElement[], start: number, dir: 1 | -1) => {
      for (let i = start; i >= 0 && i < items.length; i += dir) {
        const candidate = items[i];
        if (candidate != null && !itemDisabled(candidate)) {
          focusItem(candidate);
          return;
        }
      }
    },
    [itemDisabled, focusItem],
  );

  const focusFirst = useCallback(() => {
    focusEnabledFrom(getItems(), 0, 1);
  }, [getItems, focusEnabledFrom]);

  const focusLast = useCallback(() => {
    const items = getItems();
    focusEnabledFrom(items, items.length - 1, -1);
  }, [getItems, focusEnabledFrom]);

  const runTypeahead = useCallback(
    (e: React.KeyboardEvent, items: HTMLElement[], currentIndex: number): void => {
      const state = typeaheadRef.current;
      if (state.timer != null) {
        clearTimeout(state.timer);
      }
      state.buffer += e.key.toLowerCase();
      state.timer = setTimeout(() => {
        typeaheadRef.current.buffer = "";
      }, typeaheadResetMs) as unknown as number;

      const texts = items.map((el) => el.textContent ?? "");
      const match = matchTypeahead(texts, state.buffer, currentIndex, (i) => itemDisabled(items[i]));
      if (match !== -1) {
        e.preventDefault();
        focusItem(items[match]);
      }
    },
    [typeaheadResetMs, itemDisabled, focusItem],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = getItems();
      if (items.length === 0) {
        return;
      }

      const active = document.activeElement;
      // The treeitem that owns focus: the NEAREST treeitem ancestor of the active element (never an
      // outer treeitem that merely contains it) — so an inner action's focus resolves to its own row.
      const activeItem = active instanceof Element ? active.closest('[role="treeitem"]') : null;
      const currentIndex = items.findIndex((item) => item === activeItem);
      const current = currentIndex >= 0 ? items[currentIndex] : undefined;

      // Typeahead: printable single characters jump to the next matching item.
      if (
        typeahead &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        NAVIGATION_KEYS.has(e.key) === false
      ) {
        runTypeahead(e, items, currentIndex);
        return;
      }

      if (!NAVIGATION_KEYS.has(e.key)) {
        return;
      }

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          focusEnabledFrom(items, currentIndex < 0 ? 0 : currentIndex + 1, 1);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          focusEnabledFrom(items, currentIndex < 0 ? items.length - 1 : currentIndex - 1, -1);
          break;
        }
        case "ArrowRight": {
          if (current == null) {
            break;
          }
          e.preventDefault();
          if (collapsedOf(current)) {
            // Collapsed parent → expand.
            const id = idOf(current);
            if (id != null) {
              onToggleExpand?.(id);
            }
          } else if (expandedOf(current)) {
            // Expanded parent → move to first child.
            const next = items[currentIndex + 1];
            if (next != null && levelOf(next) > levelOf(current)) {
              focusItem(next);
            }
          }
          // Leaf → no-op.
          break;
        }
        case "ArrowLeft": {
          if (current == null) {
            break;
          }
          e.preventDefault();
          if (expandedOf(current)) {
            // Expanded parent → collapse.
            const id = idOf(current);
            if (id != null) {
              onToggleExpand?.(id);
            }
          } else {
            // Otherwise → move to the parent treeitem (nearest shallower item, scanning up).
            const levels = items.map((el) => levelOf(el));
            const parentIndex = findParentIndexByLevel(levels, currentIndex);
            if (parentIndex !== -1) {
              focusItem(items[parentIndex]);
            }
          }
          break;
        }
        case "Home": {
          e.preventDefault();
          focusEnabledFrom(items, 0, 1);
          break;
        }
        case "End": {
          e.preventDefault();
          focusEnabledFrom(items, items.length - 1, -1);
          break;
        }
        case "Enter":
        case " ": {
          if (current == null || itemDisabled(current)) {
            break;
          }
          e.preventDefault();
          const id = idOf(current);
          // Activate: prefer the consumer's onActivate (click an inner link/button). Fall back to
          // toggling expansion for a parent with no action of its own.
          const handled = onActivate ? onActivate(current, id) === true : false;
          if (!handled && current.getAttribute("aria-expanded") != null) {
            if (id != null) {
              onToggleExpand?.(id);
            }
          }
          break;
        }
        default:
          break;
      }
    },
    [
      getItems,
      typeahead,
      runTypeahead,
      focusEnabledFrom,
      focusItem,
      collapsedOf,
      expandedOf,
      idOf,
      levelOf,
      itemDisabled,
      onToggleExpand,
      onActivate,
    ],
  );

  /** Keep the roving stop pointing at whatever ended up focused (click / programmatic). */
  const handleFocus = useCallback(() => {
    if (hasRovingTabIndex) {
      syncTabStops();
    }
  }, [hasRovingTabIndex, syncTabStops]);

  return { treeRef, handleKeyDown, handleFocus, focusFirst, focusLast };
}
