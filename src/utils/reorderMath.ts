/* reorderMath. The pure decision logic behind `useReorder` ([[reorder-capability]]): the data model plus the index
 * arithmetic, the key resolution and the announcement copy. No React, no DOM, no state, which is
 * what lets the node lane prove it in `src/hooks/useReorder.logic.test.ts`.
 *
 * Extracted for the same reason `resizableMath` is: the hook composes this with React state and the
 * DOM, and the half that can be proven without a browser should be.
 *
 * ONE CONVENTION RUNS THROUGH EVERYTHING HERE: an index is the item's FINAL index after the move.
 * That single choice is what keeps the off-by-one in one place, `clampDropIndex`, instead of at
 * every call site.
 */

/** One container of ordered item ids. `label` is the human name announcements use, falling back to `id`. */
export interface ReorderGroup {
  id: string;
  label?: string;
  items: string[];
}

/** Where an item sits: its group, and its index in that group's final order. */
export interface ReorderPosition {
  group: string;
  index: number;
}

/** A committed move, reported once per drop. */
export interface ReorderChange {
  id: string;
  from: ReorderPosition;
  to: ReorderPosition;
}

/** The group and index an item currently occupies, or `null` when no group holds it. */
export function findPosition(groups: readonly ReorderGroup[], itemId: string): ReorderPosition | null {
  for (const group of groups) {
    const index = group.items.indexOf(itemId);
    if (index !== -1) return { group: group.id, index };
  }
  return null;
}

/**
 * Clamp a wanted destination index to a slot the item can actually land in.
 *
 * THE OFF BY ONE lives here, and it is the bug every reorder implementation ships once. A move
 * inside one group removes the item before reinserting it, so the last reachable slot is
 * `length - 1`. A move into another group removes nothing from that group, so the last reachable
 * slot is `length`, one past its final item. Reading both bounds as `length` is what makes an item
 * moved one place DOWN inside its own group stay exactly where it started.
 */
export function clampDropIndex(
  groups: readonly ReorderGroup[],
  from: ReorderPosition,
  toGroup: string,
  wanted: number,
): number {
  const target = groups.find((group) => group.id === toGroup);
  if (!target) return 0;
  const last = toGroup === from.group ? target.items.length - 1 : target.items.length;
  if (last <= 0) return 0;
  return Math.min(Math.max(wanted, 0), last);
}

/**
 * Apply a move. `to.index` is the item's FINAL index, so the removal happens first and no call site
 * has to adjust for it. Only the touched groups are replaced, so an untouched column keeps its
 * object identity and a memoised consumer can skip it.
 */
export function moveItem(
  groups: readonly ReorderGroup[],
  from: ReorderPosition,
  to: ReorderPosition,
): ReorderGroup[] {
  const next = groups.slice();
  const fromAt = next.findIndex((group) => group.id === from.group);
  const toAt = next.findIndex((group) => group.id === to.group);
  if (fromAt === -1 || toAt === -1) return next;
  const moving = next[fromAt].items[from.index];
  if (moving === undefined) return next;

  const index = clampDropIndex(groups, from, to.group, to.index);
  const fromItems = next[fromAt].items.slice();
  fromItems.splice(from.index, 1);
  next[fromAt] = { ...next[fromAt], items: fromItems };
  // Within one group the post-removal array IS the destination, which is the whole reason the bound
  // above differs by one between the two cases.
  const toItems = fromAt === toAt ? fromItems : next[toAt].items.slice();
  toItems.splice(index, 0, moving);
  next[toAt] = { ...next[toAt], items: toItems };
  return next;
}

/**
 * Resolve a key press to the next target position, or `null` when the press changes nothing (the
 * edge of a group, the outermost group, or a key this machine does not own). `from` is the ORIGIN of
 * the lift and `at` is the pending target, both in committed coordinates.
 *
 * Vertical keys move within the group. Horizontal keys move to the adjacent group and keep the
 * index, clamped into that group. Neither axis wraps: an edge press is a no-op, because a silent
 * jump from the last column back to the first is indistinguishable from a bug.
 */
export function resolveKeyMove(
  groups: readonly ReorderGroup[],
  from: ReorderPosition,
  at: ReorderPosition,
  key: string,
): ReorderPosition | null {
  if (key === "ArrowUp" || key === "ArrowDown") {
    const index = clampDropIndex(groups, from, at.group, at.index + (key === "ArrowUp" ? -1 : 1));
    return index === at.index ? null : { group: at.group, index };
  }
  if (key === "ArrowLeft" || key === "ArrowRight") {
    const current = groups.findIndex((group) => group.id === at.group);
    if (current === -1) return null;
    const next = current + (key === "ArrowLeft" ? -1 : 1);
    if (next < 0 || next >= groups.length) return null;
    const id = groups[next].id;
    return { group: id, index: clampDropIndex(groups, from, id, at.index) };
  }
  return null;
}

/**
 * WHERE THE INSERTION MARKER GOES, and it is not `at`.
 *
 * `at` is the item's FINAL index, counted in a list the item has already been removed from. The
 * consumer renders the COMMITTED order, where the lifted item is still sitting in its origin slot
 * as a ghost (the minimal reorder pattern, [[reorder-capability]] as amended), so the two coordinate systems differ
 * by one for every downward move inside a single group. Reading `at` straight onto the rendered
 * list is the off-by-one that puts the marker one slot short of where the item actually lands.
 *
 *   [A B C D], lift A, at.index 2  ->  final [B C A D]  ->  the marker belongs before D, index 3.
 *
 * A cross-group move removes nothing from the destination, so there the two agree.
 *
 * It resolves to an ELEMENT BINDING rather than a bare index because a pseudo-element cannot be
 * inserted between two siblings: the DOM half hangs the marker off one item's edge, and only falls
 * back to the group itself when the group holds no item to hang it on.
 */
export interface ReorderDropMarker {
  /** The slot in the committed order the lifted item will occupy: `0 … group.items.length`. */
  at: ReorderPosition;
  /** The item the marker hangs off, or `null` when the group is empty. */
  item: string | null;
  /** Which edge of `item`. `after` only ever lands on a group's final item. */
  edge: "before" | "after";
}

export function resolveDropMarker(
  groups: readonly ReorderGroup[],
  from: ReorderPosition,
  at: ReorderPosition,
): ReorderDropMarker | null {
  const group = groups.find((entry) => entry.id === at.group);
  if (!group) return null;
  // Within one group, every slot below the origin shifts by the removal; `at.index === from.index`
  // is the unchanged case and points at the ghost's own leading edge, which is exactly right.
  const index =
    at.group === from.group && at.index > from.index ? at.index + 1 : at.index;
  const slot = { group: group.id, index };
  if (group.items.length === 0) return { at: slot, item: null, edge: "before" };
  if (index >= group.items.length) {
    return { at: slot, item: group.items[group.items.length - 1], edge: "after" };
  }
  return { at: slot, item: group.items[index], edge: "before" };
}

/**
 * The position stated in human terms for a live announcement: "Refine the empty state, position 2 of
 * 5 in Review". Call it with the PREVIEW order (what the list would be if dropped now), so the total
 * counts the lifted item where it is going rather than where it came from. The group clause is
 * dropped for a single group set, where naming the only list adds nothing.
 */
export function describePosition(
  groups: readonly ReorderGroup[],
  at: ReorderPosition,
  itemLabel: string,
): string {
  const group = groups.find((entry) => entry.id === at.group);
  if (!group) return itemLabel;
  const where = groups.length > 1 ? ` in ${group.label ?? group.id}` : "";
  return `${itemLabel}, position ${at.index + 1} of ${group.items.length}${where}`;
}
