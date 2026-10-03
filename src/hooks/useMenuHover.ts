// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// Portions derived from facebook/astryx packages/core/src/hooks/useMenuHover.ts @ d7c9a39b
// (MIT, © Meta Platforms) — hover-intent for nav flyouts (TopNavMenu/MegaMenu, SideNav collapsed
// flyout) per D11, LIFTED under the port doctrine (DECISIONS [[catalog-as-specification]]). Opens after a sustained hover,
// closes after a sustained leave, and is gated to fine (hover-capable) pointers so it NO-OPs on
// touch — callers still get click-to-open. A click-latch pins the menu open regardless of hover.
//
// This hook has no pure core (its behavior is timers + pointer intent), so it is play-tested by its
// consumer (TopNav B5, hover-intent + click-latch _internal play) rather than on the node lane.

import { useCallback, useEffect, useRef, useState } from "react";

/** Show after this many ms of sustained hover on the trigger/panel (D11). */
const DEFAULT_SHOW_DELAY_MS = 150;
/** Hide after this many ms of sustained leave (D11). */
const DEFAULT_HIDE_DELAY_MS = 200;

export interface UseMenuHoverOptions {
  /** Ms of sustained hover before opening. @default 150 */
  showDelayMs?: number;
  /** Ms of sustained leave before closing. @default 200 */
  hideDelayMs?: number;
  /** Notified whenever the open state changes (from hover intent, latch, or `close`). */
  onOpenChange?: (open: boolean) => void;
}

/** Pointer handlers to spread on the trigger or the panel. Attach the SAME pair to both so moving
 * the pointer from trigger to panel (across the gap) does not trip the hide timer. */
export interface MenuHoverHandlers {
  onPointerEnter: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
}

export interface UseMenuHoverReturn {
  /** Whether the menu is open. */
  open: boolean;
  /** Whether a click has latched the menu open (hover-leave will not close it while latched). */
  isLatched: boolean;
  /** Latch/unlatch the menu open — wire the trigger's click to `setLatched(!isLatched)` (or `true`). */
  setLatched: (latched: boolean) => void;
  /** Pointer handlers for the TRIGGER. */
  triggerProps: MenuHoverHandlers;
  /** Pointer handlers for the PANEL. */
  panelProps: MenuHoverHandlers;
  /** Force-close and unlatch (Escape, route change, outside click). */
  close: () => void;
}

/** Whether the primary pointer can hover (a mouse), so hover-intent should run. Called at event time
 * (SSR-safe) — `matchMedia` is never touched at module eval. */
function canHover(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: hover)").matches
  );
}

/**
 * Hover-intent state machine for a nav flyout. Returns `open`, the click-latch (`isLatched` /
 * `setLatched`), pointer handlers for the trigger + panel, and a `close`. No-ops on touch (callers
 * open via click). All timers are cleared on unmount, so nothing leaks.
 */
export function useMenuHover(options: UseMenuHoverOptions = {}): UseMenuHoverReturn {
  const {
    showDelayMs = DEFAULT_SHOW_DELAY_MS,
    hideDelayMs = DEFAULT_HIDE_DELAY_MS,
    onOpenChange,
  } = options;

  const [open, setOpen] = useState(false);
  const [isLatched, setIsLatched] = useState(false);

  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const latchedRef = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  const clearTimers = useCallback(() => {
    if (showTimer.current != null) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (hideTimer.current != null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const commitOpen = useCallback((next: boolean) => {
    setOpen((prev) => {
      if (prev !== next) onOpenChangeRef.current?.(next);
      return next;
    });
  }, []);

  const onPointerEnter = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch" || !canHover()) return; // touch → no hover-open (click still works)
      if (hideTimer.current != null) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      if (open || showTimer.current != null) return;
      showTimer.current = window.setTimeout(() => {
        showTimer.current = null;
        commitOpen(true);
      }, showDelayMs);
    },
    [open, showDelayMs, commitOpen],
  );

  const onPointerLeave = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch" || !canHover()) return;
      if (showTimer.current != null) {
        window.clearTimeout(showTimer.current);
        showTimer.current = null;
      }
      if (latchedRef.current) return; // a click has pinned it open — leave does not close
      if (hideTimer.current != null) return;
      hideTimer.current = window.setTimeout(() => {
        hideTimer.current = null;
        commitOpen(false);
      }, hideDelayMs);
    },
    [hideDelayMs, commitOpen],
  );

  const setLatched = useCallback(
    (latched: boolean) => {
      latchedRef.current = latched;
      setIsLatched(latched);
      if (latched) {
        clearTimers();
        commitOpen(true); // a click pins the menu open immediately, bypassing the show delay
      }
      // Unlatching leaves the menu open; the next sustained leave closes it normally.
    },
    [clearTimers, commitOpen],
  );

  const close = useCallback(() => {
    clearTimers();
    latchedRef.current = false;
    setIsLatched(false);
    commitOpen(false);
  }, [clearTimers, commitOpen]);

  // Clear any pending timers on unmount — no leaked setTimeouts (D11 / Rule 6 leak guard).
  useEffect(() => clearTimers, [clearTimers]);

  const handlers: MenuHoverHandlers = { onPointerEnter, onPointerLeave };

  return {
    open,
    isLatched,
    setLatched,
    triggerProps: handlers,
    panelProps: handlers,
    close,
  };
}
