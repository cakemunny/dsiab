// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Resizable/ResizeHandle.tsx @ d7c9a39b (MIT, © Meta Platforms)
//
// The visible splitter handle + grab pill, LIFTED under the port doctrine
// (DECISIONS [[catalog-as-specification]]). The resize BEHAVIOUR is NOT re-implemented here: this is a presentational shell that
// renders the `useResizable` engine's `separatorProps` (the WAI window-splitter role/aria/keyboard
// contract, with the D5 fixes) and its `onDragStart` pointer handler. The consumer owns the
// `useResizable` call and hands this handle its props — matching Layout ([[brand-props-on-provider]]) / SideNav (B3), which read
// the engine's `size`/`isCollapsed` for their own panels (integration contract §1d).

import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import type { SeparatorProps } from "../../hooks/useResizable";
import type { ResizeOrientation } from "../../utils/resizableMath";
import { Kbd } from "./Kbd";

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

/* STEP KEYS ([[dragging-movement-gaps]], WCAG 2.5.7). A drag is not the only pointer route to a size. A hover, a focus or
 * a tap on the handle shows two keycap chips over the seam, ← and → (↑ and ↓ on a horizontal handle). A click
 * on a chip moves the seam by the Shift+arrow step, through the separator's own key handler, so the bounds,
 * the collapsed state and a pane docked at the end behave exactly as the keys do. The chips sit beside the
 * separator, not inside it: a focusable separator presents its children to assistive technology as plain
 * content, so a button inside it would not be announced as a button. A chip at its bound is aria-disabled and
 * keeps focus. The chips leave the tab order (tabIndex -1), because the separator already answers the keys. */

const STEP_KEYS: Record<ResizeOrientation, readonly [{ key: string; glyph: string; label: string }, { key: string; glyph: string; label: string }]> = {
  vertical: [
    { key: "ArrowLeft", glyph: "←", label: "Move the divider left" },
    { key: "ArrowRight", glyph: "→", label: "Move the divider right" },
  ],
  horizontal: [
    { key: "ArrowUp", glyph: "↑", label: "Move the divider up" },
    { key: "ArrowDown", glyph: "↓", label: "Move the divider down" },
  ],
};

// A press that moves less than this is a tap, which shows the chips. Anything further is the start of a drag.
const TAP_SLOP = 4;
// The chips stay this long after the pointer and focus leave, so a pointer can travel from the seam onto a chip.
const LINGER_MS = 200;

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
  const handle = useRef<HTMLDivElement | null>(null);
  const setHandle = useCallback(
    (node: HTMLDivElement | null) => {
      handle.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  // What keeps the chips on screen. Each flag clears on its own event, and the chips leave LINGER_MS after the last.
  const [engaged, setEngaged] = useState({ hover: false, focus: false, tap: false });
  const active = engaged.hover || engaged.focus || engaged.tap;
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (active) {
      setShown(true);
      return;
    }
    const t = window.setTimeout(() => setShown(false), LINGER_MS);
    return () => window.clearTimeout(t);
  }, [active]);
  const set = (flag: keyof typeof engaged, value: boolean) => setEngaged((s) => (s[flag] === value ? s : { ...s, [flag]: value }));

  const keys = useRef<HTMLDivElement | null>(null);
  // A tap shows the chips until the next press lands outside the handle and the chips.
  useEffect(() => {
    if (!engaged.tap) return;
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!handle.current?.contains(t) && !keys.current?.contains(t)) set("tap", false);
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [engaged.tap]);

  const handlePointerDown = (e: ReactPointerEvent) => {
    onDragStart(e);
    if (e.button !== 0) return;
    const { clientX: x0, clientY: y0, pointerId } = e;
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener("pointerup", up);
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < TAP_SLOP) set("tap", true);
    };
    window.addEventListener("pointerup", up);
  };

  // The chips centre on the seam. They are the handle's sibling, so both resolve against the same positioned ancestor.
  const [centre, setCentre] = useState<{ left: number; top: number } | null>(null);
  const now = separatorProps["aria-valuenow"];
  useLayoutEffect(() => {
    const node = handle.current;
    if (!shown || !node) return;
    const place = () => setCentre({ left: node.offsetLeft + node.offsetWidth / 2, top: node.offsetTop + node.offsetHeight / 2 });
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [shown, now]);

  // A chip moves the seam in its arrow's direction. The arrow that grows the pane depends on the dock side.
  const [toStart, toEnd] = STEP_KEYS[visualOrientation];
  const growKey = separatorProps["data-side"] === "end" ? toStart.key : toEnd.key;
  const max = separatorProps["aria-valuemax"] ?? Infinity;
  const min = Math.max(separatorProps["aria-valuemin"], separatorProps["data-min-size"] ?? 0);
  const atBound = (key: string) => (key === growKey ? now >= max : now === 0 || now <= min);
  const step = (key: string) => {
    if (atBound(key)) return;
    separatorProps.onKeyDown({ key, shiftKey: true, preventDefault() {} } as ReactKeyboardEvent);
  };

  return (
    <>
      <div
        ref={setHandle}
        {...separatorProps}
        aria-label={ariaLabel ?? separatorProps["aria-label"]}
        onPointerDown={handlePointerDown}
        onPointerEnter={() => set("hover", true)}
        onPointerLeave={() => set("hover", false)}
        onFocus={() => set("focus", true)}
        onBlur={() => set("focus", false)}
        data-orientation={visualOrientation}
        className={className ? `rt-ds-resize-handle ${className}` : "rt-ds-resize-handle"}
        style={style}
      >
        {/* The grab affordance — decorative; the separator semantics live on the root. */}
        <span className="rt-ds-resize-handle-pill" aria-hidden="true" />
      </div>
      {shown && centre && (
        <div
          ref={keys}
          className="rt-ds-resize-keys"
          data-orientation={visualOrientation}
          style={{ left: centre.left, top: centre.top }}
          onPointerEnter={() => set("hover", true)}
          onPointerLeave={() => set("hover", false)}
          onFocus={() => set("focus", true)}
          onBlur={() => set("focus", false)}
        >
          {[toStart, toEnd].map(({ key, glyph, label }) => (
            <button
              key={key}
              type="button"
              tabIndex={-1}
              className="rt-reset rt-ds-resize-key"
              aria-label={label}
              aria-keyshortcuts={`Shift+${key}`}
              aria-disabled={atBound(key) || undefined}
              data-disabled={atBound(key) ? "" : undefined}
              onClick={() => step(key)}
            >
              <Kbd size="1" aria-hidden>
                {glyph}
              </Kbd>
            </button>
          ))}
        </div>
      )}
    </>
  );
});
