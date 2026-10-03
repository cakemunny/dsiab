/* useChatStreamScroll.logic.test.ts — node-lane coverage for the PURE half of the chat stream-scroll
 * engine: the spring integration step and every lock/unlock predicate it drives (settle, re-lock,
 * button visibility, resize + synthetic-scroll detection). The rAF loop and the
 * scroll/scrollend/wheel/touch/key listeners are the DOM half, exercised by the _internal Chat plays.
 * These cases would FAIL if the spring constants were retuned, if the distance-from-bottom yardstick
 * drifted back to `offsetHeight`, or if the synthetic-scroll guard went back to swallowing every
 * upward move that lands on a resized frame. */

import { describe, it, expect } from "vitest";
import {
  maxScrollTop,
  distanceFromBottom,
  springTickDelta,
  springStep,
  isSpringSettled,
  shouldRelock,
  isScrollButtonVisible,
  isResizeScroll,
  isUserScrollUp,
  isSyntheticScroll,
  SIXTY_FPS_MS,
  type ScrollGeometry,
} from "./useChatStreamScroll";

/** A 1600px transcript in a 600px viewport — max scroll 1000. */
const at = (scrollTop: number): ScrollGeometry => ({ scrollTop, clientHeight: 600, scrollHeight: 1600 });

describe("maxScrollTop / distanceFromBottom", () => {
  it("distance is measured against the spring's own target (scrollHeight - clientHeight)", () => {
    expect(maxScrollTop(at(0))).toBe(1000);
    expect(distanceFromBottom(at(0))).toBe(1000);
    expect(distanceFromBottom(at(900))).toBe(100);
  });

  it("reads exactly 0 at rest — the value the spring settles on", () => {
    expect(distanceFromBottom(at(1000))).toBe(0);
  });

  it("content that fits is already at the bottom (no negative max scroll)", () => {
    const short: ScrollGeometry = { scrollTop: 0, clientHeight: 600, scrollHeight: 400 };
    expect(maxScrollTop(short)).toBe(0);
    expect(distanceFromBottom(short)).toBe(0);
  });
});

describe("springTickDelta", () => {
  it("the first tick of a run counts as one frame", () => {
    expect(springTickDelta(1234.5, undefined)).toBe(1);
  });
  it("normalises the elapsed time to 60fps frames", () => {
    expect(springTickDelta(SIXTY_FPS_MS, 0)).toBe(1);
    expect(springTickDelta(SIXTY_FPS_MS * 2, 0)).toBe(2); // a dropped frame
    expect(springTickDelta(SIXTY_FPS_MS / 2, 0)).toBe(0.5); // a 120Hz display
  });
});

describe("springStep — damping 0.7 / stiffness 0.05 / mass 1.25", () => {
  it("accelerates from rest by stiffness × distance ÷ mass", () => {
    // (0.7 × 0 + 0.05 × 100) / 1.25 = 4
    expect(springStep(0, 100, 1)).toEqual({ velocity: 4, delta: 4 });
    // (0.7 × 0 + 0.05 × 25) / 1.25 = 1 — mass really divides.
    expect(springStep(0, 25, 1).velocity).toBe(1);
  });

  it("carries the damped previous velocity into the next tick", () => {
    // (0.7 × 4 + 0.05 × 96) / 1.25 = 6.08
    expect(springStep(4, 96, 1)).toEqual({ velocity: 6.08, delta: 6.08 });
    // With no distance left, only the damped velocity survives: 0.7 × 2 / 1.25 = 1.12.
    expect(springStep(2, 0, 1).velocity).toBeCloseTo(1.12, 10);
  });

  it("pulls back UP when the target is above the current position", () => {
    expect(springStep(0, -40, 1)).toEqual({ velocity: -1.6, delta: -1.6 });
  });

  it("tickDelta scales the px moved, never the velocity", () => {
    expect(springStep(4, 96, 2)).toEqual({ velocity: 6.08, delta: 12.16 }); // a dropped frame
    expect(springStep(4, 96, 0.5)).toEqual({ velocity: 6.08, delta: 3.04 }); // 120Hz
  });
});

describe("isSpringSettled — close enough AND slow enough", () => {
  it("settles inside half a px while barely moving", () => {
    expect(isSpringSettled(0.4, 0.05)).toBe(true);
    expect(isSpringSettled(-0.4, -0.05)).toBe(true); // both bounds are absolute
  });
  it("does not settle while still far out", () => {
    expect(isSpringSettled(0.5, 0.05)).toBe(false);
    expect(isSpringSettled(20, 0)).toBe(false);
  });
  it("does not settle mid-flight through the target (fast, but close)", () => {
    expect(isSpringSettled(0.1, 3)).toBe(false);
  });
});

describe("shouldRelock — the 10px re-lock threshold", () => {
  it("re-locks at the bottom and within 10px of it", () => {
    expect(shouldRelock(0)).toBe(true);
    expect(shouldRelock(10)).toBe(true); // inclusive
  });
  it("leaves a deliberate scroll-up alone", () => {
    expect(shouldRelock(10.5)).toBe(false);
    expect(shouldRelock(400)).toBe(false);
  });
  it("honours a caller's threshold", () => {
    expect(shouldRelock(40, 50)).toBe(true);
    expect(shouldRelock(60, 50)).toBe(false);
  });
});

describe("isScrollButtonVisible — the 100px button threshold", () => {
  it("stays hidden at and under 100px from the bottom", () => {
    expect(isScrollButtonVisible(0)).toBe(false);
    expect(isScrollButtonVisible(100)).toBe(false); // exclusive
  });
  it("shows once the reader is past 100px", () => {
    expect(isScrollButtonVisible(100.5)).toBe(true);
    expect(isScrollButtonVisible(1000)).toBe(true);
  });
  it("honours a caller's threshold", () => {
    expect(isScrollButtonVisible(150, 200)).toBe(false);
  });
});

describe("isResizeScroll — did the container's own geometry change", () => {
  it("a pure scroll is not a resize", () => {
    expect(isResizeScroll(at(0), at(300))).toBe(false);
  });
  it("content growth is (streaming)", () => {
    expect(isResizeScroll(at(1000), { scrollTop: 1000, clientHeight: 600, scrollHeight: 1700 })).toBe(true);
  });
  it("a viewport change is too (the on-screen keyboard)", () => {
    expect(isResizeScroll(at(1000), { scrollTop: 1000, clientHeight: 340, scrollHeight: 1600 })).toBe(true);
  });
});

describe("isUserScrollUp — direction, minus what a shrink can explain", () => {
  it("scrolling down is never an up-scroll", () => {
    expect(isUserScrollUp(at(300), at(500))).toBe(false);
    expect(isUserScrollUp(at(300), at(300))).toBe(false); // standing still
  });
  it("moving up on unchanged geometry is the user", () => {
    expect(isUserScrollUp(at(1000), at(940))).toBe(true);
  });
  it("a clamp forced by a shrinking max scroll is NOT the user", () => {
    // 200px of content removed: max scroll 1000 → 800, so the browser clamps scrollTop 1000 → 800.
    const shrunk: ScrollGeometry = { scrollTop: 800, clientHeight: 600, scrollHeight: 1400 };
    expect(isUserScrollUp(at(1000), shrunk)).toBe(false);
  });
  it("but any movement BEYOND that clamp is", () => {
    // Same 200px shrink, and the reader dragged 60px further up on top of it.
    const shrunkAndScrolled: ScrollGeometry = { scrollTop: 740, clientHeight: 600, scrollHeight: 1400 };
    expect(isUserScrollUp(at(1000), shrunkAndScrolled)).toBe(true);
  });
});

describe("isSyntheticScroll — the streaming-content guard", () => {
  it("growth alone is synthetic: the transcript must not unlock itself", () => {
    const grown: ScrollGeometry = { scrollTop: 1000, clientHeight: 600, scrollHeight: 1700 };
    expect(isSyntheticScroll(at(1000), grown)).toBe(true);
  });

  it("a scroll with no geometry change is never synthetic", () => {
    expect(isSyntheticScroll(at(1000), at(900))).toBe(false);
    expect(isSyntheticScroll(at(300), at(500))).toBe(false);
  });

  it("an upward move on a GROWING frame belongs to the user (the swallowed-scroll defect)", () => {
    // Content grew 100px in the same frame the reader dragged the scrollbar 60px up. The source's
    // guard returned early here and never unlocked — during streaming that is every frame.
    const grownAndScrolled: ScrollGeometry = { scrollTop: 940, clientHeight: 600, scrollHeight: 1700 };
    expect(isSyntheticScroll(at(1000), grownAndScrolled)).toBe(false);
    expect(isUserScrollUp(at(1000), grownAndScrolled)).toBe(true);
  });

  it("a shrink-forced clamp stays synthetic (no false unlock)", () => {
    const shrunk: ScrollGeometry = { scrollTop: 800, clientHeight: 600, scrollHeight: 1400 };
    expect(isSyntheticScroll(at(1000), shrunk)).toBe(true);
  });
});
