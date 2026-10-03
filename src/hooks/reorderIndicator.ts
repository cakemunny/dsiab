/* reorderIndicator. WHERE the drop indicator is drawn, in pixels. The reorder machine says which
 * slot an item would land in; this file turns that answer into the four custom properties
 * `tokens/components.css` paints the mark from, and it is the ONLY part of the capability that
 * touches geometry.
 *
 * WHY THE GROUP OWNS THE MARK AND NOT THE ITEM. The first cut hung the indicator off the item, as
 * an outer `box-shadow` with a negative spread, precisely to avoid a measurement pass. Review
 * rejected the result: the dropzone affordance landed in the wrong spot every time, tied to an
 * existing element so that it read as the item being grouped into another object. That finding
 * holds, and the failure is structural rather than a matter of a few pixels — a shadow is clipped to the
 * OUTSIDE of its own element's border box, so it can only ever start at that element's edge, which
 * is the one place an insertion mark must never be. An insertion mark has to read as BETWEEN two
 * things.
 *
 * SO WHY NOT A PSEUDO-ELEMENT ON THE ITEM, which is the obvious build — absolutely position a mark
 * inside a relatively positioned item. Measured in this repo before choosing:
 * Radix's `.rt-BaseCard` — the item shape the flagship board uses — carries `overflow: hidden` AND
 * `contain: paint`, and spends BOTH pseudos, `::before` on the surface and `::after` on the border
 * ring. Nothing an item that is a Card can paint escapes its own box. An item is arbitrary consumer
 * markup, so the only element guaranteed to be a plain container is the GROUP, which is also the
 * element that owns the gaps the mark lives in.
 *
 * WHAT THAT COSTS, STATED PLAINLY: one `getBoundingClientRect` pass per retarget, and the group
 * becomes the indicator's containing block. What it buys is one mark for every item shape — a bare
 * `<li>` and a skinned `Card` get the identical caret — placed in the gap rather than on an edge.
 */

import type { ReorderDropMarker, ReorderGroup } from "../utils/reorderMath";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

/** The two marks, which answer two different questions. See `dropPresentation` at the foot. */
export type DropPresentation = "between" | "empty";

/** Half the terminus. The mark is centred on the gap, so this is how far it reaches either way. */
const HALF_MARK = 4;

/** The gap to assume at the ends of a list, where there is no second item to measure against and
 *  the container reports no `row-gap` (a block list spacing itself with margins). --ds-space-12 is
 *  the gap both shipped surfaces use, and the minimum an 8px terminus fits inside. */
const FALLBACK_GAP = 12;

/** Written on the group element, read by the reorder block in tokens/components.css. */
const PROPERTIES = [
  "--ds-reorder-drop-y",
  "--ds-reorder-drop-x",
  "--ds-reorder-drop-w",
  "--ds-reorder-drop-h",
  "--ds-reorder-drop-r",
] as const;

/** Scanned rather than queried, because an item id is arbitrary consumer data and has no business
 *  being escaped into a selector — the same rule `useReorder`'s focus restore already follows. */
function findByData(root: ParentNode, selector: string, key: string, value: string): HTMLElement | null {
  for (const node of root.querySelectorAll<HTMLElement>(selector)) {
    if (node.dataset[key] === value) return node;
  }
  return null;
}

/** The group's PADDING box in viewport coordinates, which is what an absolutely positioned
 *  pseudo-element of the group resolves against. */
function paddingBox(group: HTMLElement): { top: number; left: number; height: number } {
  const rect = group.getBoundingClientRect();
  const styles = getComputedStyle(group);
  const top = parseFloat(styles.borderTopWidth) || 0;
  const bottom = parseFloat(styles.borderBottomWidth) || 0;
  return {
    top: rect.top + top,
    left: rect.left + (parseFloat(styles.borderLeftWidth) || 0),
    height: rect.height - top - bottom,
  };
}

/** Half the row gap, and the fallback is the whole reason this is named: a block list spacing
 *  itself with margins reports `row-gap: normal`, which parses to NaN rather than to 0. */
function halfGap(group: HTMLElement): number {
  const gap = parseFloat(getComputedStyle(group).rowGap);
  return (Number.isFinite(gap) && gap > 0 ? gap : FALLBACK_GAP) / 2;
}

/**
 * THE LINE, centred in the gap. The gap is measured between the two items that bound it rather
 * than read off `row-gap`, so a list that spaces itself with margins, or one whose rows are not all
 * the same height, still gets a mark exactly halfway between the two things it separates.
 *
 * The x and the width come from the ITEM, not from the group: a group with a scrollbar gutter (the
 * board's columns carry one) has a padding box wider than its cards, and a mark that ran the full
 * padding box would overhang them. Matching the item makes "full width of the list" literal.
 *
 * The clamp is the ends of the list. A group with no padding has no gap above its first item or
 * below its last, and half the mark would then be drawn outside the group — which inside a scroll
 * container means clipped away entirely. The clamp keeps it visible; the shipped surfaces carry
 * --ds-space-12 of padding at both ends so it never fires.
 */
function paintLine(group: HTMLElement, item: HTMLElement, edge: "before" | "after"): void {
  const box = paddingBox(group);
  const rect = item.getBoundingClientRect();
  const siblings = Array.from(group.querySelectorAll<HTMLElement>("[data-ds-reorder-item]"));
  const index = siblings.indexOf(item);
  const neighbour = edge === "before" ? siblings[index - 1] : siblings[index + 1];
  const adjacent = neighbour?.getBoundingClientRect();
  const centre =
    edge === "before"
      ? (adjacent ? (adjacent.bottom + rect.top) / 2 : rect.top - halfGap(group))
      : (adjacent ? (rect.bottom + adjacent.top) / 2 : rect.bottom + halfGap(group));
  const limit = Math.max(box.height - HALF_MARK, HALF_MARK);
  const y = Math.min(Math.max(centre - box.top, HALF_MARK), limit);
  group.style.setProperty("--ds-reorder-drop-y", `${Math.round(y)}px`);
  group.style.setProperty("--ds-reorder-drop-x", `${Math.round(rect.left - box.left)}px`);
  group.style.setProperty("--ds-reorder-drop-w", `${Math.round(rect.width)}px`);
}

/**
 * THE EMPTY CONTAINER, which is not the same component with different coordinates. Review of the
 * first build found this the worst case: it shows where the thing will land and nothing else. A
 * highlight indicator works when it is placed relative to other things, and with nothing else in
 * the container the coloured line says nothing. A line is a RELATIVE mark — the items
 * either side are what give it meaning — so in an empty container it degrades to a coloured stripe.
 *
 * The honest answer there is the SHAPE OF THE OUTCOME: a slot the size of the card that will land
 * in it. Height and corner radius are measured off the item actually in hand, so the placeholder is
 * the dragged card's own silhouette rather than a guess. With nothing lifted — a frozen docs
 * specimen — the CSS fallbacks stand in.
 */
function paintSlot(group: HTMLElement, lifted: HTMLElement | null): void {
  if (!lifted) return;
  group.style.setProperty("--ds-reorder-drop-h", `${Math.round(lifted.getBoundingClientRect().height)}px`);
  group.style.setProperty("--ds-reorder-drop-r", getComputedStyle(lifted).borderRadius);
}

export function clearDropIndicator(group: HTMLElement): void {
  for (const name of PROPERTIES) group.style.removeProperty(name);
}

/** One placement. `item` is the element the slot hangs off, or `null` for an empty container. */
export function paintDropIndicator(
  group: HTMLElement,
  item: HTMLElement | null,
  edge: "before" | "after",
  lifted: HTMLElement | null,
): void {
  if (item) paintLine(group, item, edge);
  else paintSlot(group, lifted);
}

/**
 * Paint, then keep painting while the layout moves under it. A column reflows mid-drag whenever the
 * window resizes or a card's own content settles, and a mark left at a stale offset lands between
 * the wrong two rows. The observer watches at most three elements and lives only as long as the
 * lift does. Returns the teardown, which also wipes the properties back off the group.
 */
export function observeDropIndicator(
  group: HTMLElement,
  item: HTMLElement | null,
  edge: "before" | "after",
  lifted: HTMLElement | null,
): () => void {
  const repaint = () => paintDropIndicator(group, item, edge, lifted);
  repaint();
  const observer = new ResizeObserver(repaint);
  observer.observe(group);
  if (item) observer.observe(item);
  if (lifted && lifted !== item) observer.observe(lifted);
  return () => {
    observer.disconnect();
    clearDropIndicator(group);
  };
}

/**
 * WHICH MARK A GROUP WEARS, and the third answer is "none". A line and a placeholder are NOT one
 * component with different coordinates: the line says "between these two", the placeholder says
 * "this shape, here", and a container with nothing in it can only honour the second.
 *
 * The `null` case is the one worth reading twice. When the destination holds nothing but the GHOST
 * of the item in hand there is no second item for a line to be relative to — and the ghost is
 * already a dashed, card-shaped placeholder sitting in exactly the slot a drop would restore. A
 * line above it, or a second placeholder drawn over it, would both be marking a position the
 * reader can already see. This is also the shape of the old accent RING, which said "drop INTO
 * this card" when it meant "unchanged": both are answers to a question nobody asked.
 */
export function dropPresentation(
  order: readonly ReorderGroup[],
  marker: ReorderDropMarker | null,
  liftedId: string | null,
): DropPresentation | null {
  if (!marker) return null;
  if (marker.item === null) return "empty";
  const group = order.find((entry) => entry.id === marker.at.group);
  if (group && group.items.length === 1 && group.items[0] === liftedId) return null;
  return "between";
}

/**
 * The hook half: re-place the mark whenever the machine's answer changes. Deliberately keyed on the
 * marker's PRIMITIVES rather than on the marker object, which is rebuilt every render — a drag
 * retargets on every frame it crosses a row, and re-measuring on frames where the answer did not
 * change would force a layout for nothing.
 */
export function useDropIndicator(
  presentation: DropPresentation | null,
  marker: ReorderDropMarker | null,
  liftedId: string | null,
): void {
  const groupId = presentation === null ? null : marker?.at.group ?? null;
  const itemId = presentation === "between" ? marker?.item ?? null : null;
  const edge = marker?.edge ?? "before";
  useIsomorphicLayoutEffect(() => {
    if (groupId === null) return;
    const group = findByData(document, "[data-ds-reorder-group]", "dsReorderGroup", groupId);
    if (!group) return;
    const item = itemId === null ? null : findByData(group, "[data-ds-reorder-item]", "dsReorderItem", itemId);
    const lifted = liftedId === null ? null : findByData(document, "[data-ds-reorder-item]", "dsReorderItem", liftedId);
    return observeDropIndicator(group, item, edge, lifted);
  }, [groupId, itemId, edge, liftedId]);
}
