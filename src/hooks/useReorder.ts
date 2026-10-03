/* useReorder. The headless reorder capability: one state machine, no opinion about what it moves.
 *
 * Items are ids grouped by container id, so a single vertical list and a multi column board are the
 * same problem with a different group count. The consumer spreads prop getters onto markup it
 * already owns, which is what lets List, TreeList, a board column or a settings panel adopt
 * reordering without any of them learning a new element. Nothing here renders, measures or paints.
 *
 * THE ITEM IS THE DRAG SOURCE. `getGroupProps` plus `getItemProps` is the complete integration, and
 * `getHandleProps` is a third getter a consumer reaches for only when the item's own content would
 * fight a whole item drag, or when nothing about the item says it can be moved. Ruled after review:
 * a whole card is dragged whole, and a drag handle is for precise
 * handling or for confirming that an item is draggable where that is not already apparent. See useReorderProps.ts for how the two
 * entrances avoid each other.
 *
 * THREE INPUT ROUTES DRIVE THE SAME MACHINE, and that is the accessibility contract (DECISIONS [[reorder-single-pointer-path]]):
 *   1. Keyboard. Space lifts, arrow keys move (vertical within a group, horizontal between groups),
 *      Space or Enter drops, Escape cancels. That earns WCAG 2.1.1 and nothing more. Enter is left
 *      to the item while nothing is lifted, because an item is so often a link.
 *   2. A single pointer with no drag at all. Click an item to lift, then click the destination item
 *      or the destination group to place. WCAG 2.5.7 asks for exactly this, and [[dragging-movement-gaps]] records that a
 *      keyboard path never discharges it, so this route is the criterion, not a courtesy. It stands
 *      aside for an item whose surface already has a click action, which is a known gap.
 *   3. A pointer drag, built on Pointer Events. The HTML5 drag and drop API is deliberately unused:
 *      it has no keyboard story, poor touch support and an unstyleable drag image. A press becomes
 *      a drag at 5px, or after a 120ms hold on touch — see reorderGesture.ts for where both come
 *      from.
 *
 * THE FEEDBACK IS THE MINIMAL REORDER PATTERN, DELIBERATELY. There are two ways a reorder can
 * answer "where will this land". The MAXIMAL one shifts the list to open a real gap, so the item
 * genuinely appears to move into its new spot; the feedback is immediate and physical. The MINIMAL
 * one leaves the list alone, keeps the held item in place as a dimmed ghost, and marks the
 * destination with an insertion caret.
 *
 * This capability ships MINIMAL, for three reasons:
 *   - Escape-to-cancel is a published part of the [[reorder-single-pointer-path]] contract. Once a list has visibly opened a
 *     gap and swallowed the item, backing out with nothing changed stops reading as possible —
 *     which would undercut a route we promise.
 *   - One visual language for three input routes. A keyboard lift has no pointer to follow and no
 *     gap to open under a finger; a ghost plus an indicator is the same picture for all of them.
 *   - The hit test gets a STABLE coordinate system. Under the maximal preview the rendered list
 *     reflowed beneath the pointer, so the row under the cursor changed as a consequence of the
 *     cursor being there — the classic reorder oscillation. Resolving hits against the committed
 *     order removes the feedback loop entirely.
 *
 * THE COMMITTED ORDER IS NOT TOUCHED UNTIL THE DROP, and since the minimal pattern it is also what
 * gets rendered: `groups` is the committed array at every moment. A lift records the origin plus a
 * moving target and paints the difference (`data-ds-reorder-lifted`, `data-ds-reorder-drop`) rather
 * than applying it. Escape therefore restores the origin by construction rather than by a second
 * reverse move that can drift from the first, and a controlled consumer sees exactly one onReorder
 * per completed move.
 *
 * WHERE THE SEAM FALLS. This file owns the model, the pure decision logic and the machine. Three
 * modules hold the DOM half, none of which knows anything about state: useReorderProps.ts (the prop
 * getters and the hit test), reorderGesture.ts (the pointer session, the threshold, the touch hold)
 * and reorderKeyboard.ts (the key routes and the key map prose). The pure half is unit tested in
 * useReorder.logic.test.ts, the same split useListFocus and useScrollSpy use.
 */

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { useAnnounce } from "../components/ui/useAnnounce";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";
import {
  type ReorderChange,
  type ReorderDropMarker,
  type ReorderGroup,
  type ReorderPosition,
  clampDropIndex,
  describePosition,
  findPosition,
  moveItem,
  resolveDropMarker,
  resolveKeyMove,
} from "../utils/reorderMath";
import {
  type Engine,
  type ReorderGroupProps,
  type ReorderHandleProps,
  type ReorderInstructionsProps,
  type ReorderItemProps,
  groupProps,
  handleProps,
  itemProps,
} from "./useReorderProps";
import type { PointerSession } from "./reorderGesture";
import { type DropPresentation, dropPresentation, useDropIndicator } from "./reorderIndicator";
import { KEYS_MANY_GROUPS, KEYS_ONE_GROUP } from "./reorderKeyboard";

// Re-exported so one module publishes the whole capability: a prop-getter shape that appears in
// UseReorderReturn and is reachable only from a second import path would be a wart (DECISIONS [[registry-module-paths]]).
export type {
  ReorderGroupProps,
  ReorderHandleProps,
  ReorderInstructionsProps,
  ReorderItemProps,
} from "./useReorderProps";

// The model and the arithmetic come from the util module, the same split useResizable draws with
// resizableMath. The TYPES are re-exported here because they appear in this hook's own signatures,
// and a type withheld from a public signature is a wart (DECISIONS [[registry-module-paths]]). The pure FUNCTIONS are
// deliberately not re-exported: a consumer gets the resulting order from onReorder and the pending
// slot from `dropAt`, and has no need of the engine's arithmetic — adding an export later is safe
// where removing one is breaking.
export type { ReorderGroup, ReorderPosition, ReorderChange } from "../utils/reorderMath";

/* ---- the hook ------------------------------------------------------------- */

export interface UseReorderOptions {
  /** Controlled order. Pass it with `onReorder` to own the array yourself. */
  groups?: ReorderGroup[];
  /** Uncontrolled seed. The hook then owns the order and still reports every move. */
  defaultGroups?: ReorderGroup[];
  /** Called once per completed move, with the change and the resulting order. */
  onReorder?: (change: ReorderChange, groups: ReorderGroup[]) => void;
  /** Human name for an item id, used in announcements and in the handle's accessible name. */
  itemLabel?: (id: string) => string;
}

export interface UseReorderReturn {
  /**
   * The order to render. It is the COMMITTED order, lift or no lift: the lifted item keeps its slot
   * and paints as a ghost while a drop indicator marks where it would land, which is the minimal
   * reorder pattern ([[reorder-capability]] as amended — see the pattern note in the file header).
   */
  groups: ReorderGroup[];
  /** The lifted item id, or `null` when nothing is lifted. */
  liftedId: string | null;
  /** The lifted item's pending FINAL position — the index it will hold once the drop removes it
   *  from its origin. This is the announcement's coordinate system, not the rendered list's. */
  liftedAt: ReorderPosition | null;
  /** Where the insertion marker sits in the RENDERED list: `{ group, index }` with `index` running
   *  `0 … group.items.length`. The library paints the marker itself from the attributes the getters
   *  write, so this is here for markup those attributes cannot reach (a table row, a canvas), and
   *  for reading the pending slot out. `null` when nothing is lifted. */
  dropAt: ReorderPosition | null;
  /** The group container: the drop destination, and where a drag's pointer capture lives. */
  getGroupProps: (groupId: string) => ReorderGroupProps;
  /** One item: the drag source, the keyboard route and the drop destination. Spread this and the
   *  reorder is complete. */
  getItemProps: (itemId: string) => ReorderItemProps;
  /** OPTIONAL. A grip that lifts on the press rather than on the threshold, for an item whose own
   *  content would fight a whole item drag or whose shape does not say it can be moved. */
  getHandleProps: (itemId: string) => ReorderHandleProps;
  getInstructionsProps: () => ReorderInstructionsProps;
  /** The key map prose the instructions element renders. Adapts to a single group set. */
  instructions: string;
}

/** The lift in flight: what is held, where it came from, and where it currently points. */
export interface LiftState {
  id: string;
  from: ReorderPosition;
  at: ReorderPosition;
}

/** The one control to hand focus back to inside an item that is not itself a tab stop. */
const RESTORE_FOCUSABLE = "a[href],button:not([disabled]),[tabindex]:not([tabindex='-1'])";

/**
 * FOCUS SURVIVES A CROSS-GROUP MOVE, AND THE SYSTEM SUPPLIES THAT, not the browser.
 *
 * Within one group the lifted item's DOM node is REORDERED, so focus rides along and nothing has to
 * happen. Across groups the item unmounts from one container and mounts in another, so React
 * destroys the focused element and focus falls to the body. Measured in real Chromium before this
 * existed: lift a card, press ArrowRight once and it moved, then every later key was dead, because
 * the node holding the gesture no longer existed. A keyboard user could neither finish the move nor
 * cancel it.
 *
 * So the machine re-finds the moved item by the id it stamps on it and restores focus — the same
 * obligation [[focus-return-on-close]] accepted for modal close-focus, and the same one any move that relocates the thing
 * a reader is standing on owes them: focus follows the item, never the hole it left.
 * Two guards stop it stealing focus: it acts only when focus actually fell to the body, so a
 * deliberate Tab away is respected, and only for an item that just acted.
 *
 * IT LOOKS FOR THE HANDLE FIRST AND THE ITEM SECOND, because the handle is now optional. Where
 * there is no grip the item itself held the gesture, and the thing to focus is the item when the
 * item is a tab stop, or the one control inside it that is. Both are found by scanning the stamped
 * attribute rather than through a selector, because an item id is arbitrary consumer data and has
 * no business being escaped into a query.
 */
function useFocusRestore(restoreTo: { current: string | null }): void {
  useIsomorphicLayoutEffect(() => {
    const id = restoreTo.current;
    if (!id) return;
    restoreTo.current = null;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    for (const node of document.querySelectorAll<HTMLElement>("[data-ds-reorder-handle]")) {
      if (node.dataset.dsReorderHandle === id) {
        node.focus();
        return;
      }
    }
    for (const node of document.querySelectorAll<HTMLElement>("[data-ds-reorder-item]")) {
      if (node.dataset.dsReorderItem !== id) continue;
      const target = node.tabIndex >= 0 ? node : node.querySelector<HTMLElement>(RESTORE_FOCUSABLE);
      target?.focus();
      return;
    }
  });
}

/** What the hook injects into the machine: the current order, the lift, and the writers. */
interface MachineIO {
  /** The committed order. Since the minimal pattern this is also the RENDERED order, which is why
   *  the hit test and every destination resolve against it. */
  base: ReorderGroup[];
  /** What the list would be if the lift dropped now. Announcements only — nothing renders it. */
  preview: ReorderGroup[];
  /** Where the insertion marker hangs, resolved to the element that wears the attribute. */
  marker: ReorderDropMarker | null;
  /** Which mark the marked group wears — see `dropPresentation`. Computed in the hook body so the
   *  attribute the getter writes and the geometry the effect measures cannot drift apart. */
  presentation: DropPresentation | null;
  lift: LiftState | null;
  setLift: (next: LiftState | null) => void;
  /** The uncontrolled write. Absent in controlled mode, where the consumer owns the array. */
  persist?: (next: ReorderGroup[]) => void;
  report?: (change: ReorderChange, groups: ReorderGroup[]) => void;
  announce: (message: string) => void;
  label: (id: string) => string;
  restoreTo: { current: string | null };
  instructionsId: string | undefined;
  session: { current: PointerSession | null };
  handled: { current: boolean };
}

/**
 * The machine itself: every action the three input routes can take, built fresh each render so it
 * always closes over the current order. It is a plain function rather than part of the hook body so
 * neither stays past the 100-line limit, and so the state it touches is visible in one signature.
 *
 * `restoreTo` is stamped by every action, which is what lets focus follow an item across a group
 * (see `useFocusRestore`).
 */
function createEngine(io: MachineIO): Engine {
  const { base, preview, lift, setLift, announce, label, restoreTo } = io;

  const settle = (position: ReorderPosition): ReorderPosition | null =>
    lift ? { group: position.group, index: clampDropIndex(base, lift.from, position.group, position.index) } : null;

  const place = (position: ReorderPosition) => {
    const at = settle(position);
    if (!lift || !at) return;
    restoreTo.current = lift.id;
    setLift(null);
    if (at.group === lift.from.group && at.index === lift.from.index) {
      announce(`${describePosition(base, lift.from, label(lift.id))}. Unchanged`);
      return;
    }
    const next = moveItem(base, lift.from, at);
    io.persist?.(next);
    io.report?.({ id: lift.id, from: lift.from, to: at }, next);
    announce(`Dropped ${describePosition(next, at, label(lift.id))}`);
  };

  // Resolved against `base`, which is what the consumer renders: a destination click names the slot
  // the clicked item occupies ON SCREEN, and under the minimal pattern the screen is the committed
  // order. This is the one place the maximal preview used to make the two disagree.
  const placeOn = (itemId: string) => {
    const position = findPosition(base, itemId);
    if (position) place(position);
  };

  return {
    lift,
    order: base,
    marker: io.marker,
    presentation: io.presentation,
    instructionsId: io.instructionsId,
    name: (itemId) =>
      lift?.id === itemId
        ? `Lifted. ${describePosition(preview, lift.at, label(itemId))}`
        : `Reorder ${label(itemId)}`,
    activate: (itemId) => {
      if (lift) {
        if (lift.id === itemId) place(lift.at);
        else placeOn(itemId);
        return;
      }
      const from = findPosition(base, itemId);
      if (!from) return;
      restoreTo.current = itemId;
      setLift({ id: itemId, from, at: from });
      announce(`Lifted ${describePosition(base, from, label(itemId))}`);
    },
    placeOn,
    placeAtEndOf: (groupId) => {
      const group = base.find((entry) => entry.id === groupId);
      if (group) place({ group: groupId, index: group.items.length });
    },
    moveByKey: (key) => {
      if (!lift) return false;
      const next = resolveKeyMove(base, lift.from, lift.at, key);
      if (!next) return false;
      restoreTo.current = lift.id;
      setLift({ ...lift, at: next });
      announce(describePosition(moveItem(base, lift.from, next), next, label(lift.id)));
      return true;
    },
    retarget: (position) => {
      const at = settle(position);
      if (!lift || !at) return;
      restoreTo.current = lift.id;
      setLift({ ...lift, at });
    },
    dropAtTarget: () => {
      if (lift) place(lift.at);
    },
    cancel: () => {
      if (!lift) return;
      restoreTo.current = lift.id;
      setLift(null);
      announce(`Cancelled. ${describePosition(base, lift.from, label(lift.id))}`);
    },
    session: io.session,
    handled: io.handled,
  };
}

/**
 * The reorder capability. Controlled by passing `groups` plus `onReorder`, uncontrolled by passing
 * `defaultGroups`. Render the `groups` this returns, never the array you passed in: in controlled
 * mode they are the same array, and in uncontrolled mode the hook owns it.
 *
 * Items need stable React keys. Nothing moves in the DOM during a lift — the minimal pattern leaves
 * the held item in its slot — but the DROP does move it, and across groups it remounts, so a keyed
 * node is what lets focus survive the commit.
 *
 * TWO NOTES THAT WOULD OTHERWISE SIT IN THE BODY. `aria-describedby` is emitted only once the
 * consumer's instructions element actually exists, because a reference to a missing id tells
 * assistive tech nothing and fails axe. And every destination passes through `settle` first, so a
 * raw index from a hit test or a group end is clamped once, and every comparison and announcement
 * after it can be trusted.
 *
 * @example
 * const reorder = useReorder({ defaultGroups: [{ id: "list", items: ["a", "b"] }] });
 * <ul {...reorder.getGroupProps("list")}>
 *   {reorder.groups[0].items.map((id) => (
 *     // No handle. The row itself drags, lifts by keyboard and takes a destination click.
 *     <li key={id} {...reorder.getItemProps(id)}>{label(id)}</li>
 *   ))}
 * </ul>
 * <span {...reorder.getInstructionsProps()}>{reorder.instructions}</span>
 */
export function useReorder(options: UseReorderOptions = {}): UseReorderReturn {
  const { groups: controlled, defaultGroups, onReorder, itemLabel } = options;
  const [own, setOwn] = useState<ReorderGroup[]>(() => defaultGroups ?? []);
  const [lift, setLift] = useState<LiftState | null>(null);
  // aria-describedby waits for the instructions node (see the docblock).
  const [described, setDescribed] = useState(false);
  const announce = useAnnounce();
  const instructionsId = useId();
  const session = useRef<PointerSession | null>(null);
  const handled = useRef(false);
  const restoreTo = useRef<string | null>(null);
  useFocusRestore(restoreTo);

  const base = controlled ?? own;
  const label = useCallback((id: string) => itemLabel?.(id) ?? id, [itemLabel]);
  const preview = useMemo(() => (lift ? moveItem(base, lift.from, lift.at) : base), [base, lift]);
  // One resolution per render, so a getter's answer is an identity check rather than a scan of the
  // whole board per item.
  const marker = useMemo(
    () => (lift ? resolveDropMarker(base, lift.from, lift.at) : null),
    [base, lift],
  );
  // PRESENTATION, decided once and read by both halves: the group getter writes the attribute that
  // selects the mark, and the effect below measures where that mark goes. Both have to agree, so
  // neither owns the rule.
  const presentation = dropPresentation(base, marker, lift?.id ?? null);
  useDropIndicator(presentation, marker, lift?.id ?? null);

  const engine = createEngine({
    base,
    preview,
    marker,
    presentation,
    lift,
    setLift,
    persist: controlled ? undefined : setOwn,
    report: onReorder,
    announce,
    label,
    restoreTo,
    instructionsId: described ? instructionsId : undefined,
    session,
    handled,
  });

  return {
    groups: base,
    liftedId: lift?.id ?? null,
    liftedAt: lift?.at ?? null,
    dropAt: marker?.at ?? null,
    getGroupProps: (groupId) => groupProps(engine, groupId),
    getItemProps: (itemId) => itemProps(engine, itemId),
    getHandleProps: (itemId) => handleProps(engine, itemId),
    getInstructionsProps: () => ({
      id: instructionsId,
      hidden: true,
      ref: (node) => {
        setDescribed(node !== null);
      },
    }),
    instructions: base.length > 1 ? KEYS_MANY_GROUPS : KEYS_ONE_GROUP,
  };
}
