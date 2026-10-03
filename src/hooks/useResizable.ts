// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Resizable/useResizable.ts @ d7c9a39b (MIT, © Meta Platforms)
//
// The WAI window-splitter resize engine, LIFTED under the port doctrine
// (DECISIONS [[catalog-as-specification]]). The pure arithmetic (clamp / snap / collapse-threshold / key deltas / the
// collapse-expand transition) is EXTRACTED to `../utils/resizableMath` for the node lane; this hook
// composes it with the DOM, pointer, and localStorage wiring.
//
// D5 FIXES carried here (upstream bugs NOT reproduced):
//   1. Keyboard/double-click EXPAND restores `preCollapseSize`, not `minSizePx` (via `toggleCollapse`
//      → `restoreSize`). See resizableMath.
//   2. The dead `shrinkOrder` field is DROPPED — it does not exist in this API.
//   3. Multi-region is FIXED-ARITY or per-region component: this hook is called ONCE per separator,
//      never inside a `.map()`. Callers with N regions render N `<ResizePanel>` children, each
//      calling `useResizable` at its own top level.
//   4. The pointer-drag listeners (pointermove/pointerup) are torn down on unmount MID-DRAG via an
//      effect-return cleanup, not only on pointerup — so an unmount while dragging cannot leak them.

import { useCallback, useEffect, useRef, useState } from "react";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";
import {
  type ResizeOrientation,
  type ResizeState,
  clampSize,
  resizeByKey,
  resolveDragResult,
  snapToStep,
  toggleCollapse,
} from "../utils/resizableMath";

/** localStorage key prefix — all persisted resize state lives under `ds-resizable:<id>`. */
const STORAGE_PREFIX = "ds-resizable:";

export interface UseResizableOptions {
  /** The pane's initial expanded size in px (before any persisted value is read). */
  defaultSize: number;
  /** Smallest expanded size in px. @default 0 */
  minSizePx?: number;
  /** Largest expanded size in px, or `Infinity` for unbounded (then `aria-valuemax` is omitted). @default Infinity */
  maxSizePx?: number;
  /** Separator axis / `aria-orientation`: `"vertical"` resizes width, `"horizontal"` resizes height. @default "vertical" */
  orientation?: ResizeOrientation;
  /**
   * Which side the pane is docked to. `"start"` grows toward the end (drag/arrow away from the
   * dock); `"end"` inverts both the pointer delta and the arrow keys so the pane grows toward its
   * dock. @default "start"
   */
  side?: "start" | "end";
  /** Whether the pane can collapse (drag-below-threshold, Enter, double-click). @default false */
  collapsible?: boolean;
  /** Start collapsed. @default false */
  defaultCollapsed?: boolean;
  /** Drag the pane below this many px (when collapsible) and it snaps closed. @default minSizePx / 2 */
  collapseThresholdPx?: number;
  /** Snap the drag size to a px grid. Omit for free resize. */
  stepPx?: number;
  /** Persist size + collapsed state to localStorage under `ds-resizable:<persistId>`. */
  persistId?: string;
  /** Accessible name for the separator (WAI recommends one). */
  "aria-label"?: string;
  /** Notified after every committed size change (drag end, keyboard step, Home/End). */
  onResize?: (size: number) => void;
  /** Notified when the collapsed state changes. */
  onCollapsedChange?: (collapsed: boolean) => void;
}

/** Props to spread onto the separator element (the drag handle). Excludes `onPointerDown` — attach
 * `onDragStart` separately (the §1d seam keeps the pointer-drag start handler distinct). */
export interface SeparatorProps {
  role: "separator";
  "aria-orientation": ResizeOrientation;
  "aria-valuenow": number;
  "aria-valuemin": number;
  /** Present only when `maxSizePx` is finite — omitted for an unbounded pane (WAI). */
  "aria-valuemax"?: number;
  "aria-label"?: string;
  tabIndex: 0;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
}

export interface UseResizableReturn {
  /** The pane's current expanded pixel size — apply as the panel's `width`/`height` when open. */
  size: number;
  /** Whether the pane is collapsed. When collapsed, render the collapsed rail; `aria-valuenow` is 0. */
  isCollapsed: boolean;
  /** Spread on the separator element (role/aria/tabIndex/onKeyDown/onDoubleClick). */
  separatorProps: SeparatorProps;
  /** Pointer-drag start handler — attach to the separator's `onPointerDown` (kept separate per §1d). */
  onDragStart: (e: React.PointerEvent) => void;
  /** Set the collapsed state explicitly (restores `preCollapseSize` on expand). */
  setCollapsed: (collapsed: boolean) => void;
  /** Toggle the collapsed state (the Enter / double-click action). */
  toggle: () => void;
}

interface DragSession {
  startCoord: number;
  startSize: number;
}

/**
 * The WAI window-splitter resize engine. Call ONCE per separator (never inside a `.map()` — render a
 * per-region component instead). Returns the live `size`/`isCollapsed`, the `separatorProps` to
 * spread on the handle, an `onDragStart` pointer handler, and imperative `setCollapsed`/`toggle`.
 */
export function useResizable(options: UseResizableOptions): UseResizableReturn {
  const {
    defaultSize,
    minSizePx = 0,
    maxSizePx = Infinity,
    orientation = "vertical",
    side = "start",
    collapsible = false,
    defaultCollapsed = false,
    collapseThresholdPx = minSizePx / 2,
    stepPx,
    persistId,
    onResize,
    onCollapsedChange,
  } = options;

  const invert = side === "end";
  const maxIsFinite = Number.isFinite(maxSizePx);

  const [state, setState] = useState<ResizeState>(() => ({
    size: clampSize(defaultSize, minSizePx, maxSizePx),
    isCollapsed: defaultCollapsed,
    preCollapseSize: defaultCollapsed ? clampSize(defaultSize, minSizePx, maxSizePx) : null,
  }));

  // Latest callbacks without re-subscribing pointer listeners on every render.
  const onResizeRef = useRef(onResize);
  const onCollapsedRef = useRef(onCollapsedChange);
  useEffect(() => {
    onResizeRef.current = onResize;
    onCollapsedRef.current = onCollapsedChange;
  });

  // --- localStorage persistence (SSR-safe: read in a client-only layout effect, never at module
  // eval or during render). Written on every committed change. ------------------------------------
  useIsomorphicLayoutEffect(() => {
    if (!persistId || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_PREFIX + persistId);
      if (!raw) return;
      const saved = JSON.parse(raw) as { size?: number; isCollapsed?: boolean };
      setState((prev) => ({
        size: typeof saved.size === "number" ? clampSize(saved.size, minSizePx, maxSizePx) : prev.size,
        isCollapsed: saved.isCollapsed ?? prev.isCollapsed,
        preCollapseSize: saved.isCollapsed
          ? typeof saved.size === "number"
            ? clampSize(saved.size, minSizePx, maxSizePx)
            : prev.size
          : null,
      }));
    } catch {
      // Corrupt/again-unavailable storage → keep the default; never throw during layout.
    }
    // Read once on mount for this persistId; bounds are config, not reactive keys here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistId]);

  useEffect(() => {
    if (!persistId || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_PREFIX + persistId,
        JSON.stringify({ size: state.size, isCollapsed: state.isCollapsed }),
      );
    } catch {
      // Storage full/blocked — persistence is best-effort, resizing still works.
    }
  }, [persistId, state.size, state.isCollapsed]);

  // Fire consumer callbacks when the committed values change.
  const lastSizeRef = useRef(state.size);
  const lastCollapsedRef = useRef(state.isCollapsed);
  useEffect(() => {
    if (state.size !== lastSizeRef.current) {
      lastSizeRef.current = state.size;
      onResizeRef.current?.(state.size);
    }
    if (state.isCollapsed !== lastCollapsedRef.current) {
      lastCollapsedRef.current = state.isCollapsed;
      onCollapsedRef.current?.(state.isCollapsed);
    }
  }, [state.size, state.isCollapsed]);

  const bounds = { minSizePx, maxSizePx };

  const setCollapsed = useCallback(
    (collapsed: boolean) => {
      setState((prev) =>
        prev.isCollapsed === collapsed ? prev : toggleCollapse(prev, bounds),
      );
    },
    [minSizePx, maxSizePx],
  );

  const toggle = useCallback(() => {
    if (!collapsible) return;
    setState((prev) => toggleCollapse(prev, bounds));
  }, [collapsible, minSizePx, maxSizePx]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        if (!collapsible) return;
        e.preventDefault();
        setState((prev) => toggleCollapse(prev, bounds));
        return;
      }
      setState((prev) => {
        const next = resizeByKey(e.key, e.shiftKey, prev, { minSizePx, maxSizePx, orientation, invert });
        if (next == null) return prev; // not a resize key
        return { size: next, isCollapsed: false, preCollapseSize: null };
      });
      // preventDefault ONLY for keys THIS separator actually handles — its on-axis arrows + Home/End. An
      // off-axis arrow (e.g. ArrowUp on a VERTICAL splitter) must keep native behaviour (page scroll), not
      // be swallowed. resizeByKey's handled/null decision is size-independent, so a throwaway state resolves
      // it (a real collapsed+shrink no-op still owns its axis arrow, so probe with a non-collapsed state).
      const handlesKey =
        resizeByKey(e.key, e.shiftKey, { size: 0, isCollapsed: false }, { minSizePx, maxSizePx, orientation, invert }) != null;
      if (handlesKey) e.preventDefault();
    },
    [collapsible, minSizePx, maxSizePx, orientation, invert],
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!collapsible) return;
      e.preventDefault();
      setState((prev) => toggleCollapse(prev, bounds));
    },
    [collapsible, minSizePx, maxSizePx],
  );

  // --- Pointer drag. The move/up listeners live on `window`; they are stored in a ref so the
  // effect-return cleanup can remove them even if the component unmounts MID-DRAG (D5 fix #4). -----
  const dragRef = useRef<DragSession | null>(null);
  const listenersRef = useRef<{ move: (e: PointerEvent) => void; up: (e: PointerEvent) => void } | null>(
    null,
  );

  const removeListeners = useCallback(() => {
    if (listenersRef.current) {
      window.removeEventListener("pointermove", listenersRef.current.move);
      window.removeEventListener("pointerup", listenersRef.current.up);
      window.removeEventListener("pointercancel", listenersRef.current.up);
      listenersRef.current = null;
    }
  }, []);

  const onDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return; // primary button only
      // A new primary pointer session supersedes any in-flight one — tear down existing listeners FIRST so
      // a re-entrant pointerdown (e.g. a second touch) can never leave a leaked move/up on window.
      removeListeners();
      const pointerId = e.pointerId;
      const axisCoord = orientation === "vertical" ? e.clientX : e.clientY;
      // Drag from the current effective size (0 while collapsed), so a drag can pull a collapsed
      // pane back open.
      dragRef.current = {
        startCoord: axisCoord,
        startSize: state.isCollapsed ? 0 : state.size,
      };
      e.preventDefault();

      const move = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId || !dragRef.current) return; // only the initiating pointer drives
        const coord = orientation === "vertical" ? ev.clientX : ev.clientY;
        const dir = invert ? -1 : 1;
        const rawSize = dragRef.current.startSize + (coord - dragRef.current.startCoord) * dir;
        const snapped = snapToStep(rawSize, stepPx);
        const result = resolveDragResult(snapped, {
          minSizePx,
          maxSizePx,
          collapsible,
          collapseThresholdPx,
        });
        setState((prev) => {
          if (prev.size === result.size && prev.isCollapsed === result.isCollapsed) return prev;
          // Collapsing via drag remembers the PRE-DRAG size so a later expand restores it (D5 fix). Use the
          // drag session's startSize, NOT prev.size — by the time a drag crosses the collapse threshold
          // prev.size has already been ratcheted down to minSizePx, which would lose the user's real width.
          const preCollapseSize = result.isCollapsed
            ? prev.isCollapsed
              ? prev.preCollapseSize
              : dragRef.current?.startSize ?? prev.size
            : null;
          return { size: result.isCollapsed ? prev.size : result.size, isCollapsed: result.isCollapsed, preCollapseSize };
        });
      };
      const up = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return; // ignore stray up/cancel from other pointers
        dragRef.current = null;
        removeListeners();
      };
      listenersRef.current = { move, up };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [
      orientation,
      invert,
      stepPx,
      minSizePx,
      maxSizePx,
      collapsible,
      collapseThresholdPx,
      state.isCollapsed,
      state.size,
      removeListeners,
    ],
  );

  // Tear down any live drag listeners on unmount — even mid-drag (the leak the D5 fix keeps closed).
  useEffect(() => removeListeners, [removeListeners]);

  const separatorProps: SeparatorProps = {
    role: "separator",
    "aria-orientation": orientation,
    "aria-valuenow": state.isCollapsed ? 0 : Math.round(state.size),
    "aria-valuemin": collapsible ? 0 : Math.round(minSizePx),
    ...(maxIsFinite ? { "aria-valuemax": Math.round(maxSizePx) } : {}),
    ...(options["aria-label"] ? { "aria-label": options["aria-label"] } : {}),
    tabIndex: 0,
    onKeyDown,
    onDoubleClick,
  };

  return {
    size: state.size,
    isCollapsed: state.isCollapsed,
    separatorProps,
    onDragStart,
    setCollapsed,
    toggle,
  };
}
