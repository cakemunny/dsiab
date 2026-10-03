// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// Portions derived from facebook/astryx packages/core/src/Chat/useChatStreamScroll.ts @ d7c9a39b
// (MIT, © Meta Platforms) — the rAF spring that keeps a streaming transcript pinned to its bottom
// edge, unlocking on ANY upward scroll (direction is read from `scrollTop`, so scrollbar drag and
// keys count, not just wheel/touch) and re-locking once the scroll settles within `lockThreshold`
// of the bottom. Five deliberate divergences from the source, each marked below: a named
// SCROLLEND_FALLBACK_MS timer (browsers that never fire `scrollend` otherwise stay unlocked
// forever), `clientHeight` everywhere instead of a mixed `offsetHeight`/`clientHeight`, a
// reduced-motion short-circuit to an instant jump, named spring constants, and an integrator that
// owns the sub-pixel position instead of reading it back off `scrollTop`.
//
// The spring integration + every lock/unlock predicate are EXTRACTED as pure functions for the node
// lane (useChatStreamScroll.logic.test.ts); the rAF loop and the scroll/wheel/touch/key listeners
// are the DOM half, exercised by the _internal Chat plays.

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useMediaQuery } from "./useMediaQuery";

/** A scroll container's live geometry, as read from the DOM by the hook. */
export interface ScrollGeometry {
  scrollTop: number;
  /** The PADDING-box height — see `distanceFromBottom` for why never `offsetHeight`. */
  clientHeight: number;
  scrollHeight: number;
}

// --- Spring constants (DIVERGENCE d: named + documented, not bare defaults) -------------------
// The values are the source's, unchanged — retuning them is a system decision, not a per-call one,
// so they are module constants rather than hook options.

/** Fraction of the previous velocity carried into the next tick — the brake. Lower = settles sooner. */
export const SPRING_DAMPING = 0.7;
/** How hard the remaining distance pulls on the velocity — the accelerator. Higher = snappier start. */
export const SPRING_STIFFNESS = 0.05;
/** Divides the whole force. Higher = heavier, slower to get moving AND slower to stop. */
export const SPRING_MASS = 1.25;
/** One frame at 60fps. The spring is integrated per-frame, so every tick is normalised against it —
 *  on a 120Hz display `tickDelta` is 0.5 and the motion lands in the same wall-clock time. */
export const SIXTY_FPS_MS = 1000 / 60;
/** The spring is done when it is within this many px of the target … */
export const SETTLE_DISTANCE_PX = 0.5;
/** … AND slower than this many px per frame. Both, or a fast pass through the target would end it. */
export const SETTLE_VELOCITY_PX = 0.1;

/** Distance from the bottom (px) within which a settled scroll re-locks. Small on purpose, so a
 *  user who nudged the list a few px is not yanked back down. */
export const LOCK_THRESHOLD_PX = 10;
/** Distance from the bottom (px) beyond which the scroll-to-bottom button shows. */
export const BUTTON_THRESHOLD_PX = 100;
/** How long to wait for `scrollend` before re-locking anyway (ms). Not every engine fires the event;
 *  without this backstop those browsers would leave the transcript unlocked permanently. */
const SCROLLEND_FALLBACK_MS = 1200;

/**
 * The container's maximum `scrollTop` — the spring's target, and the yardstick every distance below
 * is measured against. Clamped at 0 so a container whose content fits reads as "already at bottom".
 */
export function maxScrollTop(geometry: ScrollGeometry): number {
  return Math.max(0, geometry.scrollHeight - geometry.clientHeight);
}

/**
 * How far the container still is from the bottom, in px.
 *
 * DIVERGENCE 1: the source measures this with `offsetHeight` while the spring targets
 * `scrollHeight - clientHeight`. The two disagree by the horizontal scrollbar plus the top/bottom
 * borders (`offsetHeight` is the border box and includes both; `clientHeight` is the padding box and
 * includes neither), so on any bordered or h-scrolling container the source's distance is UNDERSTATED
 * by that amount: the re-lock fires while the user is still up to that many px above the bottom
 * (yanking them down), and the scroll button appears that many px late. Normalised to `clientHeight`
 * so "distance" is exactly "how far the spring still has to travel", and reads 0 at rest.
 */
export function distanceFromBottom(geometry: ScrollGeometry): number {
  return maxScrollTop(geometry) - geometry.scrollTop;
}

/** Frames elapsed since the last tick, normalised to 60fps. The first tick of a run counts as 1. */
export function springTickDelta(now: number, lastTick: number | undefined): number {
  return lastTick === undefined ? 1 : (now - lastTick) / SIXTY_FPS_MS;
}

/** One spring tick: the new velocity, and the px to add to `scrollTop` this frame. */
export interface SpringStep {
  velocity: number;
  delta: number;
}

/** Integrate one frame of the spring: damp the velocity, add the pull of the remaining distance. */
export function springStep(velocity: number, diff: number, tickDelta: number): SpringStep {
  const next = (SPRING_DAMPING * velocity + SPRING_STIFFNESS * diff) / SPRING_MASS;
  return { velocity: next, delta: next * tickDelta };
}

/** Whether the spring has arrived: close enough AND slow enough (both, or it ends mid-flight). */
export function isSpringSettled(diff: number, velocity: number): boolean {
  return Math.abs(diff) < SETTLE_DISTANCE_PX && Math.abs(velocity) < SETTLE_VELOCITY_PX;
}

/** Whether a settled scroll is close enough to the bottom to re-take the lock. */
export function shouldRelock(distance: number, lockThreshold = LOCK_THRESHOLD_PX): boolean {
  return distance <= lockThreshold;
}

/** Whether the scroll-to-bottom button should be visible at this distance. */
export function isScrollButtonVisible(distance: number, buttonThreshold = BUTTON_THRESHOLD_PX): boolean {
  return distance > buttonThreshold;
}

/** Whether the container RESIZED between two scroll events — the raw signal behind the guard below. */
export function isResizeScroll(previous: ScrollGeometry, next: ScrollGeometry): boolean {
  return previous.scrollHeight !== next.scrollHeight || previous.clientHeight !== next.clientHeight;
}

/**
 * Whether the user genuinely scrolled UP between two samples.
 *
 * An upward move is user intent UNLESS a shrinking max-scroll fully explains it: when content is
 * removed (or the container grows), the browser clamps `scrollTop` down by exactly the amount the
 * max scroll lost, and scroll anchoring moves it by the height change of the content above. Either
 * way the drop is ≤ the max-scroll drop, so anything BEYOND that came from the user.
 */
export function isUserScrollUp(previous: ScrollGeometry, next: ScrollGeometry): boolean {
  const moved = previous.scrollTop - next.scrollTop;
  if (moved <= 0) return false;
  const clamped = Math.max(0, maxScrollTop(previous) - maxScrollTop(next));
  return moved > clamped;
}

/**
 * Whether a scroll event came from a content resize rather than the user. Chrome fires `scroll` when
 * `scrollHeight`/`clientHeight` change (streaming growth, the on-screen keyboard) — without this
 * guard a streaming transcript unlocks itself on its own growth.
 *
 * DIVERGENCE 2: the source's guard swallows the FIRST real scroll after a resize. During streaming
 * the geometry changes on nearly every frame, so "resized ⇒ ignore" discards every upward move the
 * user makes — and the wheel/touch pre-empts do NOT cover the gap (a scrollbar drag or a PageUp
 * fires neither). So the guard now only claims the moves a resize can actually account for: an
 * upward move the shrink cannot explain is the user's, resize or not.
 */
export function isSyntheticScroll(previous: ScrollGeometry, next: ScrollGeometry): boolean {
  return isResizeScroll(previous, next) && !isUserScrollUp(previous, next);
}

export interface UseChatStreamScrollOptions {
  /** Ref to the scrollable transcript container. */
  scrollRef: RefObject<HTMLElement | null>;
  /** Whether the scroll engine is attached at all. @default true */
  enabled?: boolean;
  /** Distance from the bottom (px) within which a settled scroll re-locks. @default 10 */
  lockThreshold?: number;
  /** Distance from the bottom (px) beyond which `isScrolledUp` turns on. @default 100 */
  buttonThreshold?: number;
}

export interface UseChatStreamScrollReturn {
  /** Whether the user is scrolled up past `buttonThreshold` (drives the scroll-to-bottom button). */
  isScrolledUp: boolean;
  /** Whether auto-scroll is locked — i.e. the transcript is following its own growth. */
  isLocked: boolean;
  /**
   * Scroll to the bottom and re-lock. Deliberately works EVEN when the user has scrolled up: the
   * consumer asked for the bottom, and a control that silently no-ops is a control that lies.
   */
  scrollToBottom: () => void;
  /** Take the auto-scroll lock and ride the content down. Same action as `scrollToBottom`. */
  lock: () => void;
  /** Release the auto-scroll lock and stop the spring. */
  unlock: () => void;
  /** Scroll to the bottom only if still locked — call on every content resize while streaming. */
  scrollIfLocked: () => void;
}

/** Read the container's geometry (DOM half of `ScrollGeometry`). */
function readGeometry(el: HTMLElement): ScrollGeometry {
  return { scrollTop: el.scrollTop, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight };
}

/**
 * Spring-based scroll-to-bottom with lock/unlock for a streaming chat transcript. Locked by default:
 * content growth pulls the view down through a rAF spring. Any upward scroll unlocks; settling back
 * within `lockThreshold` of the bottom re-locks. Reduced motion replaces the spring with an instant
 * jump. All DOM access is inside the effect/callbacks, so the hook is SSR-safe.
 *
 * @example
 * const scrollRef = useRef<HTMLDivElement>(null);
 * const { isScrolledUp, isLocked, scrollToBottom, scrollIfLocked } = useChatStreamScroll({ scrollRef });
 */
export function useChatStreamScroll({
  scrollRef,
  enabled = true,
  lockThreshold = LOCK_THRESHOLD_PX,
  buttonThreshold = BUTTON_THRESHOLD_PX,
}: UseChatStreamScrollOptions): UseChatStreamScrollReturn {
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [isLocked, setIsLocked] = useState(true);

  // DIVERGENCE 3: reduced motion is read LIVE through the repo's own subscription hook (the
  // preference can flip mid-session), then mirrored into a ref so the rAF callback sees the current
  // value without being re-created — the animation must never restart just because the OS setting changed.
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  const lockedRef = useRef(true);
  const velocityRef = useRef(0);
  // DIVERGENCE 4: the spring's own position, in floating point. See `animate` — `scrollTop` is
  // quantised to whole pixels, so it cannot be the integrator's state.
  const positionRef = useRef(0);
  const animatingRef = useRef(false);
  const lastTickRef = useRef<number | undefined>(undefined);
  // Pending rAF ids (0 = none) and the `scrollend` fallback timer id — every one of them is torn
  // down on cleanup, so an unmount mid-animation leaves nothing running.
  const frameRef = useRef(0);
  const initialFrameRef = useRef(0);
  const fallbackRef = useRef(0);
  // The geometry the previous scroll event saw — direction + synthetic-scroll detection read from it.
  const lastGeometryRef = useRef<ScrollGeometry>({ scrollTop: 0, clientHeight: 0, scrollHeight: 0 });

  // --- Spring ---------------------------------------------------------------------------------

  /** Park the spring: no frame pending, no residual velocity, the next run starts from rest. */
  const stopSpring = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    animatingRef.current = false;
    lastTickRef.current = undefined;
    velocityRef.current = 0;
  }, []);

  const clearFallback = useCallback(() => {
    if (fallbackRef.current) {
      window.clearTimeout(fallbackRef.current);
      fallbackRef.current = 0;
    }
  }, []);

  /** Re-take the lock IF the container has settled within `lockThreshold` of the bottom. */
  const relockIfAtBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (shouldRelock(distanceFromBottom(readGeometry(el)), lockThreshold)) {
      lockedRef.current = true;
      setIsLocked(true);
    }
  }, [scrollRef, lockThreshold]);

  /** DIVERGENCE (a): arm the `scrollend` backstop when a programmatic scroll starts. Left armed if
   *  already running, so the timer measures from the START of the scroll, not from its last frame. */
  const armFallback = useCallback(() => {
    if (fallbackRef.current) return;
    fallbackRef.current = window.setTimeout(() => {
      fallbackRef.current = 0;
      relockIfAtBottom();
    }, SCROLLEND_FALLBACK_MS);
  }, [relockIfAtBottom]);

  const animate = useCallback(() => {
    frameRef.current = 0;
    const el = scrollRef.current;
    // The lock can be released mid-flight (wheel/touch/scroll-up) — drop the frame when it is.
    if (!el || !lockedRef.current || el.scrollHeight <= el.clientHeight) {
      clearFallback(); // an aborted flight must not leave its backstop armed
      stopSpring();
      return;
    }

    const target = maxScrollTop(readGeometry(el));

    /* DIVERGENCE 4: THE INTEGRATOR OWNS THE POSITION — `scrollTop` cannot.
     *
     * A scroll offset is quantised to whole pixels (writing 100.5 and reading it back gives 101),
     * so the source's `el.scrollTop += delta` throws away the fraction of every step. That is
     * harmless while the spring is moving fast and fatal as it arrives: the step is ~0.09 × the
     * remaining distance, so within about 5px of the target every write rounds to no movement at
     * all. The distance then stops shrinking, the arrival test (`< 0.5px`) is never satisfied,
     * `stopSpring` is never called — and the transcript rests a few pixels short of its newest
     * message with a frame callback running forever behind it. Measured in the browser lane before
     * this fix: 419 of 422, 375 of 378, 30166 of 30170, in a loop that never ended.
     *
     * So the spring integrates in floating point and merely PRESENTS each frame to `scrollTop`.
     * The element is re-read only when the two disagree by more than rounding can explain — which
     * is the browser clamping at an edge, or the reader taking the scroll over. */
    if (Math.abs(el.scrollTop - positionRef.current) > 1) positionRef.current = el.scrollTop;
    const diff = target - positionRef.current;

    if (isSpringSettled(diff, velocityRef.current)) {
      el.scrollTop = target;
      positionRef.current = target;
      stopSpring();
      clearFallback(); // the programmatic scroll ended on its own — nothing left for the backstop
      return;
    }

    const now = performance.now();
    const tickDelta = springTickDelta(now, lastTickRef.current);
    lastTickRef.current = now;

    const step = springStep(velocityRef.current, diff, tickDelta);
    velocityRef.current = step.velocity;
    positionRef.current += step.delta;
    el.scrollTop = positionRef.current;

    frameRef.current = requestAnimationFrame(animate);
  }, [scrollRef, stopSpring, clearFallback]);

  const startAnimation = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !lockedRef.current) return;
    if (reducedMotionRef.current) {
      // DIVERGENCE 3: no rAF spring under reduced motion — one instant jump to the bottom edge.
      stopSpring();
      clearFallback();
      positionRef.current = maxScrollTop(readGeometry(el));
      el.scrollTop = positionRef.current;
      return;
    }
    if (animatingRef.current) return;
    animatingRef.current = true;
    // A fresh run starts from where the element actually is — the integrator's own value is from
    // the last run and may be a scroll or a resize out of date.
    positionRef.current = el.scrollTop;
    lastTickRef.current = undefined;
    armFallback();
    frameRef.current = requestAnimationFrame(animate);
  }, [scrollRef, animate, armFallback, clearFallback, stopSpring]);

  // --- Public API -----------------------------------------------------------------------------

  // `lock` and `scrollToBottom` are ONE action under two names — taking the lock IS scrolling to the
  // bottom. The pair exists because the call sites read differently (a button press vs. a mode change).
  const lockAndScrollToBottom = useCallback(() => {
    lockedRef.current = true;
    setIsLocked(true);
    setIsScrolledUp(false);
    startAnimation();
  }, [startAnimation]);

  const unlock = useCallback(() => {
    lockedRef.current = false;
    stopSpring();
    clearFallback(); // a pending re-lock must never overrule an explicit unlock
    setIsLocked(false);
  }, [stopSpring, clearFallback]);

  const scrollIfLocked = useCallback(() => {
    if (!enabled) return;
    if (lockedRef.current) startAnimation();
  }, [enabled, startAnimation]);

  // --- Listeners ------------------------------------------------------------------------------

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enabled) return;

    lastGeometryRef.current = readGeometry(el);

    const onScroll = () => {
      const previous = lastGeometryRef.current;
      const geometry = readGeometry(el);
      lastGeometryRef.current = geometry;

      // A locked programmatic flight fires a scroll event per spring frame; recomputing visibility
      // from those frames re-mounts the control the press just dismissed, mid-flight. But ONLY the
      // spring's own (non-upward) frames are suppressed — a user scrolling UP during the flight's
      // tail must still surface the control, because that same event is about to release the lock
      // and no later scroll event will come to run the recompute for it.
      const springFrame =
        animatingRef.current && lockedRef.current && !isUserScrollUp(previous, geometry);
      if (!springFrame) {
        setIsScrolledUp(isScrollButtonVisible(distanceFromBottom(geometry), buttonThreshold));
      }

      if (isSyntheticScroll(previous, geometry)) return; // content resize, not the user — hold the lock
      if (!isUserScrollUp(previous, geometry)) return; // scrolling down: `scrollend` decides the lock

      clearFallback(); // an active user always beats a pending re-lock
      if (lockedRef.current) {
        lockedRef.current = false;
        stopSpring();
        setIsLocked(false);
      }
    };

    const onScrollEnd = () => {
      clearFallback();
      relockIfAtBottom();
    };

    // Wheel-up and touchmove fire BEFORE the scroll position updates, so they pre-empt the spring a
    // frame earlier than direction detection can. Any of the three also disarms the backstop: the
    // re-lock must never win a race against a user who is currently working the list.
    const onWheel = (e: WheelEvent) => {
      clearFallback();
      if (e.deltaY < 0 && animatingRef.current) {
        lockedRef.current = false;
        stopSpring();
        setIsLocked(false);
      }
    };

    const onTouchMove = () => {
      clearFallback();
      if (animatingRef.current) {
        lockedRef.current = false;
        stopSpring();
        setIsLocked(false);
      }
    };

    // Keys only scroll the list when it (or a descendant) has focus, so the element-scoped binding
    // catches exactly the keydowns that can move it. The move itself unlocks via `onScroll`.
    const onKeyDown = () => clearFallback();

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scrollend", onScrollEnd);
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("keydown", onKeyDown);

    // First paint lands at the bottom with NO animation — a transcript never scrolls itself into view.
    initialFrameRef.current = requestAnimationFrame(() => {
      initialFrameRef.current = 0;
      const geometry = readGeometry(el);
      if (geometry.scrollHeight > geometry.clientHeight) {
        el.scrollTop = maxScrollTop(geometry);
        lastGeometryRef.current = readGeometry(el);
      }
    });

    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", onScrollEnd);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("keydown", onKeyDown);
      if (initialFrameRef.current) {
        cancelAnimationFrame(initialFrameRef.current);
        initialFrameRef.current = 0;
      }
      stopSpring();
      clearFallback();
    };
  }, [scrollRef, enabled, buttonThreshold, clearFallback, relockIfAtBottom, stopSpring]);

  // Belt-and-braces for `enabled: false`, where the listener effect (and its cleanup) never ran but
  // `lock`/`scrollToBottom` can still have started a spring.
  useEffect(
    () => () => {
      stopSpring();
      clearFallback();
    },
    [stopSpring, clearFallback],
  );

  return {
    isScrolledUp,
    isLocked,
    scrollToBottom: lockAndScrollToBottom,
    lock: lockAndScrollToBottom,
    unlock,
    scrollIfLocked,
  };
}
