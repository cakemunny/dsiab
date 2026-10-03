// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Outline/useScrollSpy.ts @ d7c9a39b (MIT, © Meta Platforms)
//
// The rAF scroll-spy engine behind Outline (DECISIONS [[catalog-as-specification]], D6). Research
// falsified IntersectionObserver: this is a PASSIVE scroll listener + rAF, and the active id is the
// LAST heading whose top has passed its activation line (its own `scroll-margin-top` + 1px), with an
// `atBottom` guard (the last item wins at page bottom) and a top-edge guard (nothing active above
// the first heading). Click-suppression pins `lockActiveId` until `scrollend` (or a 1200ms fallback),
// released early on user wheel/touch/key. A controlled `activeId` disables the spy entirely.
//
// The pick logic is EXTRACTED to the pure `resolveActiveId` (+ its guards) for the node lane
// (useScrollSpy.logic.test.ts); the rAF loop and listeners are the DOM half, exercised by the
// _internal Outline plays.

import { useCallback, useEffect, useRef, useState } from "react";

/** A heading's geometry within the scroll content, as read from the DOM by the hook. */
export interface HeadingPosition {
  id: string;
  /** Distance from the top of the scroll content to the heading's top, in px. */
  offsetTop: number;
  /** The heading's own `scroll-margin-top`, in px (the offset its activation line sits below). */
  scrollMarginTop: number;
}

/** The scroll container's live geometry. */
export interface ScrollState {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
}

/**
 * The active heading id for a given scroll position — PURE (no DOM).
 *
 * Active = the LAST heading (in document order) whose top has passed its activation line
 * (`offsetTop - scrollMarginTop - 1` ≤ `scrollTop`). Two guards:
 * - **atBottom**: within 1px of the bottom the LAST heading always wins, so a final section too
 *   short to ever reach the activation line still highlights when the user reaches page end.
 * - **top-edge**: when nothing has been scrolled past yet, the result is `null` (no active item).
 */
export function resolveActiveId(headings: HeadingPosition[], scroll: ScrollState): string | null {
  if (headings.length === 0) return null;

  if (isAtBottom(scroll)) return headings[headings.length - 1].id;

  let activeId: string | null = null;
  for (const h of headings) {
    if (scroll.scrollTop >= activationPoint(h)) {
      activeId = h.id; // keep advancing — the last passed heading wins
    } else {
      break; // headings are in document order; once one hasn't passed, neither have the rest
    }
  }
  return activeId; // null → top-edge guard (above the first heading's activation line)
}

/** The scroll position at which a heading becomes active (its activation line, in content coords). */
export function activationPoint(h: HeadingPosition): number {
  return h.offsetTop - h.scrollMarginTop - 1;
}

/** Whether the container is scrolled to within 1px of the bottom. */
export function isAtBottom(scroll: ScrollState): boolean {
  return scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 1;
}

/** How long to keep a click-locked active id pinned if no `scrollend` event arrives (ms). */
const SCROLLEND_FALLBACK_MS = 1200;

export interface UseScrollSpyOptions {
  /** Heading element ids to observe, in document order. */
  ids: string[];
  /**
   * Controlled active id. When provided (including `null`), the spy is DISABLED and this value is
   * returned verbatim — the consumer owns the active state.
   */
  activeId?: string | null;
  /** The scroll container. Defaults to the document scrolling element (window scroll). */
  getContainer?: () => HTMLElement | null;
}

export interface UseScrollSpyReturn {
  /** The current active heading id (or `null`). */
  activeId: string | null;
  /**
   * Pin `id` active until the click-initiated smooth-scroll settles (`scrollend`, or a 1200ms
   * fallback), released early if the user scrolls by wheel/touch/key. Call from an outline link's
   * click handler so the target lights up immediately without the spy fighting the animation.
   */
  lockActiveId: (id: string) => void;
}

/** Read a heading element's position relative to the scroll container. */
function readHeadingPosition(id: string, container: HTMLElement | null): HeadingPosition | null {
  const el = document.getElementById(id);
  if (!el) return null;
  const style = window.getComputedStyle(el);
  const scrollMarginTop = parseFloat(style.scrollMarginTop) || 0;
  if (container) {
    const offsetTop = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
    return { id, offsetTop, scrollMarginTop };
  }
  return { id, offsetTop: el.getBoundingClientRect().top + window.scrollY, scrollMarginTop };
}

/** Read the scroll container's geometry (window scroll when `container` is null). */
function readScrollState(container: HTMLElement | null): ScrollState {
  if (container) {
    return {
      scrollTop: container.scrollTop,
      clientHeight: container.clientHeight,
      scrollHeight: container.scrollHeight,
    };
  }
  const doc = document.documentElement;
  return { scrollTop: window.scrollY, clientHeight: window.innerHeight, scrollHeight: doc.scrollHeight };
}

/**
 * Scroll-spy for a set of heading ids. Returns the `activeId` and a `lockActiveId` for click
 * suppression. Passive listener + rAF; SSR-safe (all DOM access is inside the effect). Pass a
 * controlled `activeId` to disable the spy and drive it yourself.
 */
export function useScrollSpy(options: UseScrollSpyOptions): UseScrollSpyReturn {
  const { ids, activeId: controlledActiveId, getContainer } = options;
  const controlled = controlledActiveId !== undefined;

  const [activeId, setActiveId] = useState<string | null>(null);

  // Collision-safe key over the ordered ids — JSON, not `join("|")`: a `|` inside an id would alias two
  // distinct id arrays to the same key and skip a needed re-subscription. Drives the effect below.
  const idsKey = JSON.stringify(ids);
  const lockRef = useRef<{ id: string; timer: number } | null>(null);

  const clearLock = useCallback(() => {
    if (lockRef.current) {
      window.clearTimeout(lockRef.current.timer);
      lockRef.current = null;
    }
  }, []);

  const lockActiveId = useCallback(
    (id: string) => {
      if (controlled) return;
      clearLock();
      setActiveId(id);
      const timer = window.setTimeout(() => {
        lockRef.current = null;
      }, SCROLLEND_FALLBACK_MS);
      lockRef.current = { id, timer };
    },
    [controlled, clearLock],
  );

  useEffect(() => {
    if (controlled || typeof window === "undefined") return;

    // Resolve the container from the LATEST getContainer (it is in the deps below) so a changed getter
    // tears down the old scroll listeners and re-binds to the new container. A consumer passing an inline
    // getter should memoise it to avoid re-subscribing each render; the default (undefined → window) is stable.
    const container = getContainer?.() ?? null;
    // Typed as EventTarget so add/removeEventListener resolve to the single string-typed signature
    // (a raw HTMLElement | Window union has incompatible per-member overloads).
    const scrollTarget: EventTarget = container ?? window;
    let frame = 0;

    const update = () => {
      frame = 0;
      if (lockRef.current) return; // click-lock in effect → don't fight the smooth-scroll
      const positions = ids
        .map((id) => readHeadingPosition(id, container))
        .filter((p): p is HeadingPosition => p !== null);
      const next = resolveActiveId(positions, readScrollState(container));
      setActiveId((prev) => (prev === next ? prev : next));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    // A real user gesture releases the click-lock early (they took over navigation).
    const releaseLock = () => clearLock();
    const onScrollEnd = () => clearLock();

    scrollTarget.addEventListener("scroll", onScroll, { passive: true });
    scrollTarget.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("wheel", releaseLock, { passive: true });
    window.addEventListener("touchmove", releaseLock, { passive: true });
    window.addEventListener("keydown", releaseLock);

    update(); // initial measurement

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      scrollTarget.removeEventListener("scroll", onScroll);
      scrollTarget.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("wheel", releaseLock);
      window.removeEventListener("touchmove", releaseLock);
      window.removeEventListener("keydown", releaseLock);
    };
    // idsKey captures the ids array identity for re-subscription; getContainer re-binds on a new container.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlled, idsKey, clearLock, getContainer]);

  useEffect(() => clearLock, [clearLock]);

  return { activeId: controlled ? controlledActiveId! : activeId, lockActiveId };
}
