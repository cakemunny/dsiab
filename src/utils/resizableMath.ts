// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Resizable/useResizable.ts @ d7c9a39b (MIT, © Meta Platforms)
//
// The pure resize arithmetic (clamp / snap / collapse-threshold /
// key-step deltas), EXTRACTED from the hook body under the port doctrine (DECISIONS [[catalog-as-specification]]) so it can
// be exercised on the node lane WITHOUT a DOM. The DOM/pointer/localStorage wiring lives in
// `../hooks/useResizable.ts`, which composes these functions.
//
// This module also encodes the D5 FIX to the upstream collapse/expand math: expanding a collapsed
// pane restores the remembered `preCollapseSize`, NOT `minSizePx` (upstream's bug). See
// `restoreSize` / `toggleCollapse` below and their red/green cases in `resizableMath.logic.test.ts`.

/** Keyboard resize step (WAI window-splitter): a bare arrow moves the separator this many px. */
export const ARROW_STEP = 10;
/** Keyboard resize step with Shift held: a larger jump per the window-splitter contract. */
export const SHIFT_ARROW_STEP = 50;

/** The separator's axis, matching its `aria-orientation`. A `"vertical"` separator divides two
 * side-by-side panes (resizes WIDTH → Left/Right arrows); a `"horizontal"` separator divides two
 * stacked panes (resizes HEIGHT → Up/Down arrows). */
export type ResizeOrientation = "vertical" | "horizontal";

/** Clamp a size into `[minSizePx, maxSizePx]`. `maxSizePx` may be `Infinity` (unbounded), in which
 * case only the lower bound applies. */
export function clampSize(size: number, minSizePx: number, maxSizePx: number): number {
  return Math.min(Math.max(size, minSizePx), maxSizePx);
}

/** Snap a raw size to the nearest multiple of `stepPx`. A missing / non-positive step is a no-op
 * (the size passes through unchanged), so callers can opt out by leaving `stepPx` undefined. */
export function snapToStep(size: number, stepPx?: number): number {
  if (!stepPx || stepPx <= 0) return size;
  return Math.round(size / stepPx) * stepPx;
}

/** The per-shift step size: `SHIFT_ARROW_STEP` (50) when Shift is held, else `ARROW_STEP` (10). */
export function stepForShift(shiftKey: boolean): number {
  return shiftKey ? SHIFT_ARROW_STEP : ARROW_STEP;
}

/**
 * The signed px delta an arrow key produces for a separator, or `null` for a non-arrow key.
 *
 * Standard mapping (`invert = false`, a start-docked pane that grows toward the end):
 * - `"vertical"` separator → `ArrowRight` = +step, `ArrowLeft` = -step (Up/Down ignored → null).
 * - `"horizontal"` separator → `ArrowDown` = +step, `ArrowUp` = -step (Left/Right ignored → null).
 *
 * `invert` flips the sign for an end-docked pane (e.g. a right-docked panel grows on `ArrowLeft`),
 * keeping the arrow that points toward the pane's growth intuitive on both sides.
 */
export function deltaForKey(
  key: string,
  shiftKey: boolean,
  orientation: ResizeOrientation,
  invert = false,
): number | null {
  const step = stepForShift(shiftKey);
  const sign = invert ? -1 : 1;
  if (orientation === "vertical") {
    if (key === "ArrowRight") return step * sign;
    if (key === "ArrowLeft") return -step * sign;
    return null;
  }
  if (key === "ArrowDown") return step * sign;
  if (key === "ArrowUp") return -step * sign;
  return null;
}

/** The state a keyboard/collapse transition reads and produces. `preCollapseSize` remembers the
 * expanded size while collapsed so an expand can restore it (the D5 fix). */
export interface ResizeState {
  /** The pane's expanded pixel size, always kept within `[minSizePx, maxSizePx]`. */
  size: number;
  /** Whether the pane is collapsed (its `aria-valuenow` reads 0). */
  isCollapsed: boolean;
  /** The size to restore on expand; `null` when the pane has never been collapsed. */
  preCollapseSize: number | null;
}

/** Bounds passed to the size-transition helpers. */
export interface ResizeBounds {
  minSizePx: number;
  /** May be `Infinity`; the hook substitutes the measured container extent for Home/End + clamps. */
  maxSizePx: number;
}

/**
 * The size to restore when EXPANDING a collapsed pane.
 *
 * THE D5 FIX: restores the remembered `preCollapseSize` (clamped to bounds), falling back to
 * `minSizePx` only when nothing was remembered (the pane was never collapsed from an expanded
 * state). Upstream Astryx incorrectly restored to `minSizePx` unconditionally, losing the user's
 * sizing — this is the bug we do NOT carry.
 */
export function restoreSize(
  preCollapseSize: number | null,
  { minSizePx, maxSizePx }: ResizeBounds,
): number {
  const target = preCollapseSize ?? minSizePx;
  return clampSize(target, minSizePx, maxSizePx);
}

/**
 * Toggle the collapsed state, returning the next `ResizeState`.
 * - COLLAPSE (expanded → collapsed): remembers the current `size` as `preCollapseSize`.
 * - EXPAND (collapsed → expanded): restores `preCollapseSize` via `restoreSize` (the D5 fix), then
 *   clears the remembered size.
 *
 * Pure — the hook and Enter/double-click handlers compose this; `localStorage` is written from the
 * committed result, not here.
 */
export function toggleCollapse(state: ResizeState, bounds: ResizeBounds): ResizeState {
  if (state.isCollapsed) {
    return {
      size: restoreSize(state.preCollapseSize, bounds),
      isCollapsed: false,
      preCollapseSize: null,
    };
  }
  return { size: state.size, isCollapsed: true, preCollapseSize: state.size };
}

/** Options for `resolveDragResult`. */
export interface DragResolveOptions extends ResizeBounds {
  /** Whether the pane can collapse when dragged below the collapse threshold. */
  collapsible: boolean;
  /** Drag the raw size below this many px and (when collapsible) the pane snaps closed. */
  collapseThresholdPx: number;
}

/**
 * Resolve a raw pointer-drag size into a committed `{ size, isCollapsed }`.
 *
 * When the pane is collapsible and the raw size falls below `collapseThresholdPx`, it snaps closed
 * (`isCollapsed: true`); the reported `size` floors at `minSizePx` so the pane has a sane size to
 * expand back into if the caller does not remember a `preCollapseSize`. Otherwise the raw size is
 * clamped into `[minSizePx, maxSizePx]` and the pane stays open.
 */
export function resolveDragResult(
  rawSize: number,
  { minSizePx, maxSizePx, collapsible, collapseThresholdPx }: DragResolveOptions,
): { size: number; isCollapsed: boolean } {
  if (collapsible && rawSize < collapseThresholdPx) {
    return { size: minSizePx, isCollapsed: true };
  }
  return { size: clampSize(rawSize, minSizePx, maxSizePx), isCollapsed: false };
}

/**
 * The new pane size produced by a resize KEY (arrows, Home, End), or `null` when the key is not a
 * resize key (e.g. Enter — the hook treats that as a collapse toggle, not a size change).
 *
 * - Arrows step from the pane's CURRENT effective size (0 while collapsed, so an increase arrow
 *   expands it up to `minSizePx`), clamped to bounds.
 * - `Home` → `minSizePx` (valuemin); `End` → `maxSizePx` (valuemax). The hook substitutes the
 *   measured container extent for an `Infinity` max before calling, so `End` lands on a real size.
 */
export function resizeByKey(
  key: string,
  shiftKey: boolean,
  state: Pick<ResizeState, "size" | "isCollapsed">,
  { minSizePx, maxSizePx, orientation, invert = false }: ResizeBounds & {
    orientation: ResizeOrientation;
    invert?: boolean;
  },
): number | null {
  if (key === "Home") return clampSize(minSizePx, minSizePx, maxSizePx);
  if (key === "End") return clampSize(maxSizePx, minSizePx, maxSizePx);
  const delta = deltaForKey(key, shiftKey, orientation, invert);
  if (delta == null) return null;
  // A collapsed pane cannot shrink further — a decrease arrow is a no-op (it must stay closed at 0, never
  // jump to minSizePx via the clamp below). `delta` already accounts for `invert`, so this holds on both
  // docks. An increase arrow (delta > 0) still expands it from 0 up to minSizePx (see below).
  if (state.isCollapsed && delta < 0) return null;
  const current = state.isCollapsed ? 0 : state.size;
  return clampSize(current + delta, minSizePx, maxSizePx);
}
