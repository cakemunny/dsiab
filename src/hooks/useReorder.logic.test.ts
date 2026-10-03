/* Node-lane logic suite for the PURE half of useReorder: the index arithmetic, the key resolution
 * and the announcement copy ([[reorder-capability]]). The DOM half (pointer capture, elementFromPoint hit testing,
 * live announcements, focus) is the DragHandle story's job, the same split useListFocus and
 * useScrollSpy draw.
 *
 * THE CASE THAT EARNS THIS FILE is the off-by-one a same-list move introduces. An index here always
 * means the item's FINAL index, so the removal happens before the insert: within one list the last
 * reachable slot is length - 1, and into another list it is length. An implementation that reads
 * both bounds as length moves an item down one place and lands it back where it started, which
 * looks like a dead drag rather than a bug. Every expectation below would fail if that collapsed.
 */

import { describe, it, expect } from "vitest";
import {
  type ReorderGroup,
  clampDropIndex,
  describePosition,
  findPosition,
  moveItem,
  resolveKeyMove,
} from "../utils/reorderMath";

/** Two lists of unequal length, so a cross-list move has somewhere to clamp. */
const board = (): ReorderGroup[] => [
  { id: "todo", label: "To do", items: ["a", "b", "c", "d"] },
  { id: "review", label: "Review", items: ["x", "y"] },
];
const single = (): ReorderGroup[] => [{ id: "list", items: ["a", "b", "c"] }];
/** The order of ids in one group, which is what every move assertion is actually about. */
const order = (groups: readonly ReorderGroup[], id: string) => groups.find((g) => g.id === id)!.items;

describe("findPosition", () => {
  it("finds an item in whichever group holds it", () => {
    expect(findPosition(board(), "a")).toEqual({ group: "todo", index: 0 });
    expect(findPosition(board(), "d")).toEqual({ group: "todo", index: 3 });
    expect(findPosition(board(), "y")).toEqual({ group: "review", index: 1 });
  });
  it("returns null for an id no group holds", () => {
    expect(findPosition(board(), "nope")).toBeNull();
    expect(findPosition([], "a")).toBeNull();
  });
});

describe("clampDropIndex — the two bounds that differ by one", () => {
  const from = { group: "todo", index: 0 };

  it("stops one slot short of the end within the SAME group", () => {
    // todo holds 4, and the item is one of them, so the last slot it can occupy is 3.
    expect(clampDropIndex(board(), from, "todo", 3)).toBe(3);
    expect(clampDropIndex(board(), from, "todo", 4)).toBe(3);
    expect(clampDropIndex(board(), from, "todo", 99)).toBe(3);
  });

  it("reaches one PAST the end of another group, because that group grows", () => {
    // review holds 2 and does not hold the item, so index 2 appends it after y.
    expect(clampDropIndex(board(), from, "review", 2)).toBe(2);
    expect(clampDropIndex(board(), from, "review", 3)).toBe(2);
  });

  it("floors at zero and tolerates a negative", () => {
    expect(clampDropIndex(board(), from, "todo", -1)).toBe(0);
    expect(clampDropIndex(board(), from, "review", -5)).toBe(0);
  });

  it("collapses to zero for an empty destination and for a single-item source", () => {
    const groups: ReorderGroup[] = [{ id: "one", items: ["a"] }, { id: "empty", items: [] }];
    expect(clampDropIndex(groups, { group: "one", index: 0 }, "one", 1)).toBe(0);
    expect(clampDropIndex(groups, { group: "one", index: 0 }, "empty", 4)).toBe(0);
  });

  it("returns zero for a group that does not exist", () => {
    expect(clampDropIndex(board(), from, "ghost", 2)).toBe(0);
  });
});

describe("moveItem — within one group", () => {
  it("moving DOWN one place actually moves it (the off-by-one)", () => {
    // Remove-then-insert: a naive splice into the un-removed array leaves [a, b, c, d] unchanged.
    const next = moveItem(board(), { group: "todo", index: 0 }, { group: "todo", index: 1 });
    expect(order(next, "todo")).toEqual(["b", "a", "c", "d"]);
  });

  it("moving DOWN several places lands on the stated final index", () => {
    const next = moveItem(board(), { group: "todo", index: 0 }, { group: "todo", index: 2 });
    expect(order(next, "todo")).toEqual(["b", "c", "a", "d"]);
    expect(findPosition(next, "a")).toEqual({ group: "todo", index: 2 });
  });

  it("moving DOWN past the end clamps to last, never off the end", () => {
    const next = moveItem(board(), { group: "todo", index: 1 }, { group: "todo", index: 9 });
    expect(order(next, "todo")).toEqual(["a", "c", "d", "b"]);
  });

  it("moving UP needs no adjustment and is the plain case", () => {
    const next = moveItem(board(), { group: "todo", index: 3 }, { group: "todo", index: 1 });
    expect(order(next, "todo")).toEqual(["a", "d", "b", "c"]);
  });

  it("a move and its reverse restore the original order (what Escape relies on)", () => {
    const start = board();
    const moved = moveItem(start, { group: "todo", index: 0 }, { group: "todo", index: 3 });
    const back = moveItem(moved, { group: "todo", index: 3 }, { group: "todo", index: 0 });
    expect(order(back, "todo")).toEqual(order(start, "todo"));
  });
});

describe("moveItem — between groups", () => {
  it("inserts at the stated index and shifts the incumbent down", () => {
    const next = moveItem(board(), { group: "todo", index: 1 }, { group: "review", index: 0 });
    expect(order(next, "todo")).toEqual(["a", "c", "d"]);
    expect(order(next, "review")).toEqual(["b", "x", "y"]);
  });

  it("appends at length, the slot a same-group move cannot use", () => {
    const next = moveItem(board(), { group: "todo", index: 0 }, { group: "review", index: 2 });
    expect(order(next, "review")).toEqual(["x", "y", "a"]);
  });

  it("empties a group without breaking it", () => {
    const groups: ReorderGroup[] = [{ id: "one", items: ["a"] }, { id: "two", items: [] }];
    const next = moveItem(groups, { group: "one", index: 0 }, { group: "two", index: 0 });
    expect(order(next, "one")).toEqual([]);
    expect(order(next, "two")).toEqual(["a"]);
  });

  it("leaves an untouched group's object identity alone", () => {
    const groups: ReorderGroup[] = [...board(), { id: "done", items: ["z"] }];
    const next = moveItem(groups, { group: "todo", index: 0 }, { group: "review", index: 0 });
    expect(next[2]).toBe(groups[2]);
    expect(next[0]).not.toBe(groups[0]);
  });
});

describe("moveItem — guards", () => {
  it("returns the order unchanged when the source or destination is unknown", () => {
    expect(order(moveItem(board(), { group: "ghost", index: 0 }, { group: "todo", index: 1 }), "todo"))
      .toEqual(["a", "b", "c", "d"]);
    expect(order(moveItem(board(), { group: "todo", index: 0 }, { group: "ghost", index: 0 }), "todo"))
      .toEqual(["a", "b", "c", "d"]);
  });
  it("returns the order unchanged when the source index holds nothing", () => {
    expect(order(moveItem(board(), { group: "todo", index: 7 }, { group: "todo", index: 0 }), "todo"))
      .toEqual(["a", "b", "c", "d"]);
  });
});

describe("resolveKeyMove — vertical, within the group", () => {
  const from = { group: "todo", index: 1 };

  it("ArrowDown and ArrowUp step one slot", () => {
    expect(resolveKeyMove(board(), from, from, "ArrowDown")).toEqual({ group: "todo", index: 2 });
    expect(resolveKeyMove(board(), from, from, "ArrowUp")).toEqual({ group: "todo", index: 0 });
  });

  it("returns null at both ends instead of wrapping", () => {
    expect(resolveKeyMove(board(), from, { group: "todo", index: 0 }, "ArrowUp")).toBeNull();
    expect(resolveKeyMove(board(), from, { group: "todo", index: 3 }, "ArrowDown")).toBeNull();
  });

  it("steps from a position the item reached in ANOTHER group, where the bound is looser", () => {
    // Held from todo and currently pointing into review, which can take index 2 (append).
    expect(resolveKeyMove(board(), from, { group: "review", index: 1 }, "ArrowDown"))
      .toEqual({ group: "review", index: 2 });
    expect(resolveKeyMove(board(), from, { group: "review", index: 2 }, "ArrowDown")).toBeNull();
  });
});

describe("resolveKeyMove — horizontal, between groups", () => {
  const from = { group: "todo", index: 3 };

  it("ArrowRight moves to the next group and clamps the index into it", () => {
    // Index 3 cannot survive in review, which accepts 0 to 2 for an incoming item.
    expect(resolveKeyMove(board(), from, from, "ArrowRight")).toEqual({ group: "review", index: 2 });
  });

  it("ArrowLeft returns to the origin group, where the bound tightens again", () => {
    expect(resolveKeyMove(board(), from, { group: "review", index: 2 }, "ArrowLeft"))
      .toEqual({ group: "todo", index: 2 });
  });

  it("returns null at the outer groups instead of wrapping", () => {
    expect(resolveKeyMove(board(), from, { group: "todo", index: 0 }, "ArrowLeft")).toBeNull();
    expect(resolveKeyMove(board(), from, { group: "review", index: 0 }, "ArrowRight")).toBeNull();
  });

  it("returns null for a single-group set, where sideways means nothing", () => {
    const at = { group: "list", index: 1 };
    expect(resolveKeyMove(single(), at, at, "ArrowLeft")).toBeNull();
    expect(resolveKeyMove(single(), at, at, "ArrowRight")).toBeNull();
  });
});

describe("resolveKeyMove — keys it does not own", () => {
  it("returns null so the consumer's own handlers still see the key", () => {
    const at = { group: "todo", index: 1 };
    for (const key of ["Enter", " ", "Escape", "Tab", "Home", "End", "a"]) {
      expect(resolveKeyMove(board(), at, at, key), key).toBeNull();
    }
  });
  it("returns null when the target group is gone", () => {
    const at = { group: "ghost", index: 0 };
    expect(resolveKeyMove(board(), at, at, "ArrowRight")).toBeNull();
  });
});

describe("describePosition — the announcement copy", () => {
  it("states a one-based position, the total, and the group", () => {
    expect(describePosition(board(), { group: "review", index: 1 }, "Card two"))
      .toBe("Card two, position 2 of 2 in Review");
  });
  it("falls back to the group id when a group carries no label", () => {
    const groups: ReorderGroup[] = [{ id: "todo", items: ["a"] }, { id: "review", items: ["x"] }];
    expect(describePosition(groups, { group: "review", index: 0 }, "X")).toBe("X, position 1 of 1 in review");
  });
  it("drops the group clause for a single list, where naming it adds nothing", () => {
    expect(describePosition(single(), { group: "list", index: 2 }, "Third")).toBe("Third, position 3 of 3");
  });
  it("counts the item where the PREVIEW puts it, not where it came from", () => {
    const preview = moveItem(board(), { group: "todo", index: 0 }, { group: "review", index: 0 });
    expect(describePosition(preview, { group: "review", index: 0 }, "A")).toBe("A, position 1 of 3 in Review");
  });
  it("returns the bare label when the position names no group", () => {
    expect(describePosition(board(), { group: "ghost", index: 0 }, "Orphan")).toBe("Orphan");
  });
});
