// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Resizable/ResizeHandle.tsx @ d7c9a39b (MIT, © Meta Platforms)
//
// The visible splitter handle + grab pill, LIFTED under the port doctrine
// (DECISIONS [[catalog-as-specification]]). The resize BEHAVIOUR is NOT re-implemented here: this is a presentational shell that
// renders the `useResizable` engine's `separatorProps` (the WAI window-splitter role/aria/keyboard
// contract, with the D5 fixes) and its `onDragStart` pointer handler. The consumer owns the
// `useResizable` call and hands this handle its props — matching Layout ([[brand-props-on-provider]]) / SideNav (B3), which read
// the engine's `size`/`isCollapsed` for their own panels (integration contract §1d).

import { forwardRef } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { SeparatorProps } from "../../hooks/useResizable";
import type { ResizeOrientation } from "../../utils/resizableMath";

export interface ResizeHandleProps {
  /**
   * The engine's `separatorProps` — spread verbatim onto the root so the handle IS the
   * WAI window-splitter separator (`role`, `aria-orientation`, `aria-valuenow/min[/max]`, `tabIndex`,
   * `onKeyDown`, `onDoubleClick`). Obtain it from `useResizable(...).separatorProps`.
   */
  separatorProps: SeparatorProps;
  /**
   * The engine's pointer-drag start handler — wired to `onPointerDown`. Kept distinct from
   * `separatorProps` per the §1d seam. Obtain it from `useResizable(...).onDragStart`.
   */
  onDragStart: (e: ReactPointerEvent) => void;
  /**
   * Visual orientation (drives the cursor + the pill/track axis). Defaults to
   * `separatorProps["aria-orientation"]`, so a correctly-wired engine needs no explicit value; pass it
   * only to override. `"vertical"` = a column handle between side-by-side panes (`col-resize`);
   * `"horizontal"` = a row handle between stacked panes (`row-resize`).
   */
  orientation?: ResizeOrientation;
  /**
   * Accessible name for the separator. A nameless splitter is opaque to AT, so provide one HERE when
   * the engine wasn't given an `aria-label`; if the engine already carries one (via
   * `useResizable({ "aria-label" })`), this falls back to it.
   */
  "aria-label"?: string;
  /** Extra class(es) appended after `rt-ds-resize-handle`. */
  className?: string;
  style?: CSSProperties;
}

/**
 * ResizeHandle — the visible drag handle for a resizable pane: a thin flush track with a centered
 * grab pill that strengthens on hover/focus. Purely presentational — it renders the `useResizable`
 * engine's separator contract; the consumer owns the hook. See its History story for the API rationale.
 */
export const ResizeHandle = forwardRef<HTMLDivElement, ResizeHandleProps>(function ResizeHandle(
  { separatorProps, onDragStart, orientation, "aria-label": ariaLabel, className, style },
  ref,
) {
  const visualOrientation = orientation ?? separatorProps["aria-orientation"];
  return (
    <div
      ref={ref}
      {...separatorProps}
      aria-label={ariaLabel ?? separatorProps["aria-label"]}
      onPointerDown={onDragStart}
      data-orientation={visualOrientation}
      className={className ? `rt-ds-resize-handle ${className}` : "rt-ds-resize-handle"}
      style={style}
    >
      {/* The grab affordance — decorative; the separator semantics live on the root. */}
      <span className="rt-ds-resize-handle-pill" aria-hidden="true" />
    </div>
  );
});
