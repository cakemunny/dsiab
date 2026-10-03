/* useScrollSpy.logic.test.ts — node-lane coverage for the PURE scroll-spy pick logic
 * (resolveActiveId + its atBottom/top-edge guards), the extracted core of useScrollSpy
 * (DECISIONS [[catalog-as-specification]], D6). The rAF loop + scroll/wheel/scrollend listeners are the DOM half, exercised by
 * the _internal Outline plays. These cases would FAIL if the "last heading whose top has passed its
 * activation line" rule, the atBottom guard, or the top-edge guard regressed. */

import { describe, it, expect } from "vitest";
import {
  resolveActiveId,
  activationPoint,
  isAtBottom,
  type HeadingPosition,
  type ScrollState,
} from "./useScrollSpy";

// Three headings at 100 / 400 / 800 down the content, each with a 20px scroll-margin-top.
const headings: HeadingPosition[] = [
  { id: "a", offsetTop: 100, scrollMarginTop: 20 },
  { id: "b", offsetTop: 400, scrollMarginTop: 20 },
  { id: "c", offsetTop: 800, scrollMarginTop: 20 },
];
// A tall-enough page so a mid-scroll is NOT at the bottom.
const page = (scrollTop: number): ScrollState => ({ scrollTop, clientHeight: 600, scrollHeight: 1600 });

describe("activationPoint", () => {
  it("is the heading top minus its scroll-margin-top minus 1px", () => {
    expect(activationPoint(headings[0])).toBe(79); // 100 - 20 - 1
    expect(activationPoint(headings[1])).toBe(379);
  });
});

describe("resolveActiveId — the last-passed rule", () => {
  it("returns null above the first heading (top-edge guard)", () => {
    expect(resolveActiveId(headings, page(0))).toBeNull();
    expect(resolveActiveId(headings, page(78))).toBeNull(); // still 1px shy of a's line (79)
  });

  it("activates the first heading once its line is passed", () => {
    expect(resolveActiveId(headings, page(79))).toBe("a"); // exactly on a's activation line
    expect(resolveActiveId(headings, page(200))).toBe("a"); // past a, before b (379)
  });

  it("picks the LAST heading whose line has passed (mid-scroll)", () => {
    expect(resolveActiveId(headings, page(379))).toBe("b"); // on b's line, before c (779)
    expect(resolveActiveId(headings, page(500))).toBe("b");
    expect(resolveActiveId(headings, page(779))).toBe("c"); // on c's line
  });
});

describe("resolveActiveId — atBottom guard", () => {
  it("the last heading wins at the bottom even if its line was never reached", () => {
    // A short trailing section: c at 1500, page bottom at scrollTop 900 (900 + 600 = 1500 = height).
    const shortTail: HeadingPosition[] = [
      { id: "a", offsetTop: 100, scrollMarginTop: 20 },
      { id: "b", offsetTop: 400, scrollMarginTop: 20 },
      { id: "c", offsetTop: 1499, scrollMarginTop: 20 }, // its line (1478) is below the max scrollTop
    ];
    const atBottom: ScrollState = { scrollTop: 900, clientHeight: 600, scrollHeight: 1500 };
    // Without the guard the last-passed would be "b" (c's line 1478 > 900); the guard forces "c".
    expect(isAtBottom(atBottom)).toBe(true);
    expect(resolveActiveId(shortTail, atBottom)).toBe("c");
  });

  it("is NOT at the bottom mid-page", () => {
    expect(isAtBottom(page(500))).toBe(false);
  });
});

describe("resolveActiveId — guards", () => {
  it("returns null for an empty heading list", () => {
    expect(resolveActiveId([], page(500))).toBeNull();
  });
  it("a single heading activates once passed and wins at the bottom", () => {
    const one: HeadingPosition[] = [{ id: "solo", offsetTop: 50, scrollMarginTop: 0 }];
    expect(resolveActiveId(one, page(0))).toBeNull(); // 0 < 49
    expect(resolveActiveId(one, page(49))).toBe("solo"); // 50 - 0 - 1
    expect(resolveActiveId(one, { scrollTop: 1000, clientHeight: 600, scrollHeight: 1600 })).toBe("solo");
  });
});
