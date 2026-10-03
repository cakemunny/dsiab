/* useReorderProps. The DOM half of the reorder capability: the prop getters a consumer spreads and
 * the hit test that feeds them. It knows about events and element attributes and holds no state of
 * its own, so every decision it reaches is made by the machine in useReorder.ts and every gesture
 * it opens is run by reorderGesture.ts. The seam is one directional: this file imports TYPES from
 * the machine and FUNCTIONS from the gesture, and neither imports anything of this file's.
 *
 * THE ATTRIBUTES ARE THE CONTRACT. `data-ds-reorder-group` and `data-ds-reorder-item` are how a
 * pointer route finds its destination, so any markup carrying them is reorderable and the capability
 * needs no refs, no element registry and no measurement pass.
 *
 * ONE RESOLUTION RULE SERVES ALL THREE ROUTES: hitting an item means taking the slot that item
 * occupies, and hitting a group anywhere else means the end of that group. A drag, a destination
 * click and a key press therefore cannot disagree about where an item lands, which is the whole
 * argument for the 2.5.7 route being real rather than a parallel implementation (DECISIONS [[reorder-single-pointer-path]]).
 *
 * THE ITEM IS THE DRAG SOURCE AND THE HANDLE IS THE EXCEPTION. Ruled after review of the
 * first cut: a whole card is dragged whole, and a drag handle is for
 * precise handling or for confirming that an item is draggable where that is not already apparent. The rule that follows from it:
 * a whole entity is draggable by default, and a handle is what an entity earns when it contains
 * other interactive parts that a whole-entity drag would fight.
 *
 * So `getItemProps` carries the pointer route, the keyboard route and the destination click, and a
 * consumer who never renders a handle still gets every one of them. `getHandleProps` stays as a
 * second entrance to the same machine. A press or a key on a handle bubbles into its item, which
 * stands aside rather than acting twice.
 */

import type {
  DragEvent as ReactDragEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import type { LiftState } from "./useReorder";
import type { ReorderDropMarker, ReorderGroup, ReorderPosition } from "../utils/reorderMath";
import type { DropPresentation } from "./reorderIndicator";
import {
  type PointerSession,
  DRAG_THRESHOLD_PX,
  beginDrag,
  crossedThreshold,
  endSession,
  openSession,
} from "./reorderGesture";
import { fromHandle, handleKeyDown, itemKeyDown } from "./reorderKeyboard";

export type { PointerSession } from "./reorderGesture";

/**
 * Spread on the container element of one group. It carries the drag as well as the destination
 * click, and that split is a MEASURED requirement rather than a preference.
 *
 * A drag used to capture the pointer on the handle itself. Measured in real Chrome: the first
 * retarget reordered the list, React moved the handle's node with `insertBefore`, Chrome read that
 * as the capture target leaving the document and implicitly released capture, and every later
 * `pointermove` and the `pointerup` went nowhere. A drag could therefore make exactly one move and
 * then died, still lifted. The group container does not move while its children reorder, so capture
 * belongs here: it survives an item remounting into another group, and it keeps receiving events
 * even when the pointer leaves every group.
 */
export interface ReorderGroupProps {
  "data-ds-reorder-group": string;
  /** Present only while an item is lifted, so a group can paint itself as a live destination. */
  "data-ds-reorder-target"?: "true";
  /**
   * WHICH MARK, on the ONE group the pending slot is in. `"between"` is the insertion caret and
   * `"empty"` is the card-shaped placeholder, and they are two different statements rather than
   * one statement at two coordinates — see `dropPresentation` in `reorderIndicator.ts`, which also
   * says when the honest answer is no attribute at all.
   *
   * The library paints both from `tokens/components.css`, off this attribute plus the geometry the
   * hook measures onto the same element. Nothing is asked of the consumer beyond spreading these
   * props; the group only has to tolerate being the indicator's containing block, which the CSS
   * arranges with `position: relative`.
   *
   * A GROUP MAY CONTAIN CHROME, and neither mark assumes otherwise. Marking a whole column —
   * heading, count badge and cards — is a reasonable thing to do and the first build broke on it:
   * the placeholder was a leading pseudo-element and landed above the heading, shoving it down the
   * column. The caret is measured off the ITEMS, so it was never affected; the placeholder now
   * anchors to the END of the group's content, which is what an empty list's only slot is anyway
   * (it is the position the group's own destination click resolves to, `placeAtEndOf`).
   */
  "data-ds-reorder-drop"?: DropPresentation;
  onClick: (event: ReactMouseEvent) => void;
  onPointerMove: (event: ReactPointerEvent) => void;
  onPointerUp: (event: ReactPointerEvent) => void;
  onPointerCancel: (event: ReactPointerEvent) => void;
}

/**
 * Spread on one item element. Since the item became the drag source this is the whole integration:
 * the item is the drag source, the keyboard route and the drop destination at once, and a list that
 * spreads only this and `getGroupProps` is complete.
 */
export interface ReorderItemProps {
  "data-ds-reorder-item": string;
  /** The held item. Painted as a GHOST rather than moved: the minimal pattern keeps it in its slot
   *  so the reader keeps the original order in view while deciding (see the useReorder header). */
  "data-ds-reorder-lifted"?: "true";
  /**
   * The insertion marker. `"before"` on the item the held one would land in front of, `"after"` on
   * a group's final item when it would land past the end. Exactly one element in the document
   * carries it at a time, and it tracks all three input routes because all three move the same
   * `lift.at`.
   *
   * ON AN ATTRIBUTE, PAINTED BY THE LIBRARY. `tokens/components.css` draws the line from it, so a
   * consumer adopts the indicator by spreading the getter it already spreads, exactly as the grab
   * cursor arrives. `useReorder().dropAt` is the same answer as data, for markup a box-shadow
   * cannot reach.
   */
  "data-ds-reorder-drop"?: "before" | "after";
  /** The key map, the same node every handle names. Reaches a screen reader only for an item that
   *  is its own tab stop, which is the case `ref` below guarantees for a plain element. */
  "aria-describedby": string | undefined;
  /** Kills the browser's OWN drag, which would otherwise race this one. MEASURED in real Chrome
   *  before it existed: a press on a board card moved two pixels, the anchor under the pointer
   *  started a native HTML5 drag, Chrome fired `pointercancel` at the gesture, and the card never
   *  moved. `draggable={false}` on the item does not cover it, because the anchor inside carries
   *  its own default. [[reorder-capability]] already rejected the HTML5 drag API outright, and this is what
   *  enforcing that rejection costs. */
  onDragStart: (event: ReactDragEvent) => void;
  /** Supplies a tab stop when, and only when, the item does not already have one. See `ensureTabStop`. */
  ref: (node: HTMLElement | null) => void;
  onClick: (event: ReactMouseEvent) => void;
  onKeyDown: (event: ReactKeyboardEvent) => void;
  /** Opens the gesture. The rest of it is the group's, for the reason `ReorderGroupProps` states. */
  onPointerDown: (event: ReactPointerEvent) => void;
}

/** Spread on the item's handle. `DragHandle` takes these verbatim. */
export interface ReorderHandleProps {
  "aria-label": string;
  "aria-describedby": string | undefined;
  /** The item this handle moves. It is how the machine finds the handle again after a cross-group
   *  move replaces its DOM node, which is the only way focus can survive that move. */
  "data-ds-reorder-handle": string;
  "data-ds-reorder-lifted"?: "true";
  tabIndex: 0;
  onClick: (event: ReactMouseEvent) => void;
  onKeyDown: (event: ReactKeyboardEvent) => void;
  /** Starts the gesture. The rest of it is the group's, for the reason `ReorderGroupProps` states. */
  onPointerDown: (event: ReactPointerEvent) => void;
}

/** Spread on one hidden element per list, the target of every item's and handle's `aria-describedby`. */
export interface ReorderInstructionsProps {
  id: string;
  hidden: true;
  ref: (node: HTMLElement | null) => void;
}

/** What the machine in useReorder.ts hands this file. Internal: it is not part of the public surface. */
export interface Engine {
  lift: LiftState | null;
  /** The order the consumer is RENDERING — the committed one, since the minimal pattern stopped
   *  previewing the move into the DOM. Every hit test and every destination resolves in it, so the
   *  geometry a drag reads cannot change as a consequence of the drag reading it. */
  order: readonly ReorderGroup[];
  /** Where the insertion marker hangs, already resolved to an item id (or `null` for an empty
   *  group) so a getter answers with one comparison rather than a scan. */
  marker: ReorderDropMarker | null;
  /** Which mark the marked group wears, or `null` for the slot that needs none. Resolved once per
   *  render in `useReorder` so the attribute here and the measured geometry cannot disagree. */
  presentation: DropPresentation | null;
  instructionsId: string | undefined;
  /** The handle's accessible name for this item, lifted state included. */
  name: (itemId: string) => string;
  /** Space, Enter, or a click on this item's handle. Lifts, drops, or places on another item. */
  activate: (itemId: string) => void;
  /** Place the lifted item on this item's slot. Ignored when nothing is lifted. */
  placeOn: (itemId: string) => void;
  /** Place the lifted item last in this group. */
  placeAtEndOf: (groupId: string) => void;
  /** An arrow key while lifted. Returns whether the key was consumed. */
  moveByKey: (key: string) => boolean;
  /** Move the pending target without announcing, which is what a drag does on every frame. */
  retarget: (position: ReorderPosition) => void;
  /** Commit at the pending target. */
  dropAtTarget: () => void;
  cancel: () => void;
  session: { current: PointerSession | null };
  /** Set when a gesture already decided the outcome, so its trailing click is ignored. */
  handled: { current: boolean };
}

const LIFTED = "true" as const;

/** Anything that already takes focus. An item holding one of these does not need a tab stop of its own. */
const FOCUSABLE =
  "a[href],button:not([disabled]),input:not([disabled]),select:not([disabled])," +
  "textarea:not([disabled]),[tabindex]:not([tabindex='-1'])";

/** Anything with a click action of its own. A click that lands on one of these belongs to it, so
 *  the item's single-pointer lift stands aside. Deliberately NOT the `FOCUSABLE` list: an item the
 *  hook gave a tab stop to carries `tabindex` and is not thereby one of its own nested controls. */
const INTERACTIVE = "a[href],button,input,select,textarea,[role='button'],[role='link'],[role='menuitem']";

/**
 * HOW FAR PAST A SLOT BOUNDARY THE HAND HAS TO GO BEFORE THE ANSWER CHANGES, in CSS pixels.
 *
 * DERIVED, NOT PICKED: it is `DRAG_THRESHOLD_PX`, the distance this capability already uses to
 * decide that a press has stopped being a click and become a drag. That constant is the one place
 * the system states how far a hand moves without meaning to, and a boundary is the same question
 * asked again mid-gesture — "did they mean to cross that, or is this the same unsteady hand?".
 * Two different numbers for one physical fact would be two numbers to keep true of the same hand,
 * so there is one. It yields a 10px sticky zone straddling each boundary, which is comfortably
 * inside the --ds-space-12 gap a reorderable list carries.
 */
const BOUNDARY_BAND_PX = DRAG_THRESHOLD_PX;

/** The y each slot boundary sits at: the midline of every rendered item in this group, in order.
 *  Read from the DOM rather than from the model, because the question is where the HAND is. */
function slotBoundaries(group: HTMLElement): number[] {
  const out: number[] = [];
  for (const node of group.querySelectorAll<HTMLElement>("[data-ds-reorder-item]")) {
    const rect = node.getBoundingClientRect();
    out.push(rect.top + rect.height / 2);
  }
  return out;
}

/**
 * WHERE THE POINTER IS POINTING. Geometry, not "whichever item is under the cursor", and the
 * difference is the defect this replaced. The old test read the item under the pointer and used
 * its index; a pointer in the GAP between two cards therefore hit no item at all and fell through
 * to "the end of this list", so a hand crossing a 12px gutter flung the mark to the bottom of the
 * column. Review found the snap position offering only the top or the bottom, with a cursor
 * parked in the middle to avoid both and the move still being forced.
 *
 * THE LIFTED ITEM'S OWN SLOT IS A VALID OUTCOME, and it is the second half of that report. The old
 * test returned `null` over the held item, which does not mean "put it back" — it means "no new
 * answer", so whatever the mark last said stayed on screen and the gesture had no way to resolve
 * to unchanged. Escape worked; the drag itself had no neutral. It has one now, and it is large: in
 * a three-item column every position from the first card's midline to the last card's midline
 * resolves to the ghost's own slot, because those are exactly the positions that mean "between the
 * cards either side of where it already is". The drop then announces "… Unchanged" through the
 * path that already existed.
 *
 * The band is hysteresis, nothing more: within `BOUNDARY_BAND_PX` of the boundary it is about to
 * cross, the answer holds rather than flickering under a hand that is merely resting.
 *
 * Slots are counted in the RENDERED list, where the held item is still sitting in its own slot as
 * a ghost, and returned as the FINAL index the machine works in — the same one-slot difference
 * `resolveDropMarker` undoes in the other direction. No model code is involved: this reads rects
 * and returns a position, and every clamp and every move stays where it was.
 */
function positionFromHit(engine: Engine, x: number, y: number): ReorderPosition | null {
  const lift = engine.lift;
  if (!lift) return null;
  const element = document.elementFromPoint(x, y);
  const node = element?.closest<HTMLElement>("[data-ds-reorder-group]") ?? null;
  const groupId = node?.dataset.dsReorderGroup;
  if (!node || !groupId || !engine.order.some((entry) => entry.id === groupId)) return null;

  const boundaries = slotBoundaries(node);
  const slot = boundaries.filter((boundary) => boundary < y).length;
  const sameGroup = groupId === lift.from.group;
  const index = sameGroup && slot > lift.from.index ? slot - 1 : slot;
  if (groupId === lift.at.group && index === lift.at.index) return lift.at;

  const above = slot > 0 ? y - boundaries[slot - 1] : Infinity;
  const below = slot < boundaries.length ? boundaries[slot] - y : Infinity;
  if (Math.min(above, below) < BOUNDARY_BAND_PX) return null;
  return { group: groupId, index };
}

/**
 * THE KEYBOARD ROUTE NEEDS A TAB STOP, AND ONLY SOME ITEMS ALREADY HAVE ONE. A board card is a
 * link, a settings row is often a button, and both are reached by Tab before this capability says
 * anything. A bare `<li>` is not reachable at all, and while a handle existed the handle was the
 * tab stop. With the handle optional the hook owes one.
 *
 * MEASURED OFF THE MOUNTED NODE RATHER THAN GUESSED FROM PROPS, because the hook is handed prop
 * getters and never sees the markup. If the item is focusable itself, or holds anything focusable,
 * it is left alone: adding a second stop to a card that already has a link would put two tab stops
 * on every card. Otherwise the item becomes one. Set on the node instead of returned as a prop so
 * the answer costs no render, and re-evaluated on every attach so markup that gains a control later
 * is read again.
 */
function ensureTabStop(node: HTMLElement | null): void {
  if (!node || node.tabIndex >= 0) return;
  if (node.querySelector(FOCUSABLE)) return;
  node.tabIndex = 0;
}

/** Whether the click landed on something inside the item with a click action of its own. */
function interactiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(INTERACTIVE) !== null;
}

/**
 * Opens a pointer session, and deliberately does NOT take capture yet.
 *
 * A HANDLE LIFTS ON THE PRESS, where an item waits. That difference is the whole reason a handle is
 * still worth rendering for a precise move: a grip does nothing else, so it can commit sooner and
 * needs neither the distance threshold nor the touch hold.
 *
 * Measured in real Chrome with capture taken here: a plain click on the handle lifted the item and
 * then dropped it at the END of its group, in one click. Capture retargets the `pointerup`, so the
 * browser computed the trailing `click` against the capturing group and the handle's own click
 * handler never ran. Capture is therefore taken when the gesture becomes a drag.
 */
function onHandlePointerDown(engine: Engine, itemId: string, event: ReactPointerEvent): void {
  if (event.button !== 0) return;
  if (!engine.lift) {
    engine.activate(itemId);
    // A fresh lift IS this gesture's outcome, so the trailing click must not drop it again.
    engine.handled.current = true;
  } else if (engine.lift.id !== itemId) {
    return;
  }
  openSession(engine, itemId, event, false);
}

/**
 * The item's own press. It does not lift: an item that is also a link has to stay a link until the
 * pointer has travelled far enough, or been held long enough, to mean something else.
 */
function onItemPointerDown(engine: Engine, itemId: string, event: ReactPointerEvent): void {
  if (event.button !== 0) return;
  // A handle inside this item opened the session on its own pointerdown, and that press bubbles to
  // here. Two sessions for one press would lift twice and drop twice.
  if (fromHandle(event.target) || engine.session.current) return;
  // Pressing a DIFFERENT item while one is lifted is the destination click route, and onClick owns
  // it. Opening a drag session here would re-lift the item under the pointer instead of placing.
  if (engine.lift && engine.lift.id !== itemId) return;
  openSession(engine, itemId, event, true);
}

/**
 * Whether this click is the trailing click of a gesture that already decided the outcome, in which
 * case it is consumed and nothing else happens. Called FIRST by all three getters, and it always
 * clears the flag.
 *
 * It covers the two routes that decide an outcome WITHOUT dragging: a handle press that lifts, and
 * a cancelled gesture. A completed drag is not one of them. Its trailing click never reaches a
 * React handler at all, because the gesture blocks it on the document in the capture phase, which
 * is the only place early enough to stop a link navigating.
 */
function takeTrailingClick(engine: Engine): boolean {
  const consumed = engine.handled.current;
  engine.handled.current = false;
  return consumed;
}

export function handleProps(engine: Engine, itemId: string): ReorderHandleProps {
  return {
    "aria-label": engine.name(itemId),
    "aria-describedby": engine.instructionsId,
    "data-ds-reorder-handle": itemId,
    "data-ds-reorder-lifted": engine.lift?.id === itemId ? LIFTED : undefined,
    tabIndex: 0,
    onClick: (event) => {
      // The handle sits inside its item, whose own click is a drop target.
      event.stopPropagation();
      // detail is 0 for a click a browser synthesised from a key press, which onKeyDown has already
      // acted on. Filtering it here lets the key route work on any markup, native button or not,
      // without the two routes toggling each other back.
      if (event.detail === 0) return;
      if (takeTrailingClick(engine)) return;
      engine.activate(itemId);
    },
    onKeyDown: (event) => handleKeyDown(engine, itemId, event),
    onPointerDown: (event) => onHandlePointerDown(engine, itemId, event),
  };
}

export function itemProps(engine: Engine, itemId: string): ReorderItemProps {
  return {
    "data-ds-reorder-item": itemId,
    "data-ds-reorder-lifted": engine.lift?.id === itemId ? LIFTED : undefined,
    "data-ds-reorder-drop": engine.marker?.item === itemId ? engine.marker.edge : undefined,
    "aria-describedby": engine.instructionsId,
    onDragStart: (event) => {
      // Only while this item holds the press. A gesture that never opened a session did not start
      // on the drag surface, so whatever the browser wants to drag there is none of this hook's
      // business.
      if (engine.session.current?.itemId === itemId) event.preventDefault();
    },
    ref: ensureTabStop,
    onClick: (event) => {
      if (takeTrailingClick(engine)) {
        // A handle press already lifted, or a cancel already fired. Either way this click is the
        // tail of a gesture that decided its own outcome, and an item that is a link would
        // otherwise navigate on the way out of it.
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (engine.lift) {
        // Something is held, so every click in the list is a placement: on this item's slot, or a
        // drop where the click lands on the held item itself. Where the item is a link, placing is
        // emphatically not navigating, so the default action goes with the propagation.
        event.preventDefault();
        event.stopPropagation();
        engine.activate(itemId);
        return;
      }
      // Nothing is held, so this click is the single-pointer LIFT (WCAG 2.5.7, [[reorder-single-pointer-path]]) that the
      // handle used to own. It is offered only where the item has no click action of its own: a
      // click that landed on a link, a button or a field belongs to that control, and stealing it
      // would break the item's primary job. It is the same rule the drag itself follows, read
      // across onto the click route: an entity with its own interactive parts hands the reorder
      // to a handle rather than claiming the whole surface.
      //
      // KNOWN GAP, and it is the reason a board card needs move outcomes in its own menu: an item
      // that IS a link therefore has no single-pointer lift at all, and a drag alone does not
      // discharge 2.5.7.
      if (event.detail === 0 || interactiveTarget(event.target)) return;
      event.stopPropagation();
      engine.activate(itemId);
    },
    onKeyDown: (event) => itemKeyDown(engine, itemId, event),
    onPointerDown: (event) => onItemPointerDown(engine, itemId, event),
  };
}

export function groupProps(engine: Engine, groupId: string): ReorderGroupProps {
  return {
    "data-ds-reorder-group": groupId,
    "data-ds-reorder-target": engine.lift ? LIFTED : undefined,
    // The ONE group the pending slot is in, and only when that slot has something to say. The
    // choice between the caret and the placeholder is `dropPresentation`'s, not this getter's.
    "data-ds-reorder-drop":
      engine.marker?.at.group === groupId ? engine.presentation ?? undefined : undefined,
    onClick: () => {
      if (takeTrailingClick(engine) || !engine.lift) return;
      engine.placeAtEndOf(groupId);
    },
    onPointerMove: (event) => {
      const session = engine.session.current;
      if (!session || session.pointerId !== event.pointerId) return;
      if (session.hold) {
        // Still inside the touch hold, so this press is a candidate scroll. Movement settles it
        // as one — a finger that has already started travelling was never asking to pick anything
        // up, and the same distance that promotes a mouse press to a drag abandons this one.
        if (crossedThreshold(session, event.clientX, event.clientY)) endSession(engine);
        return;
      }
      if (!session.dragging) {
        if (!crossedThreshold(session, event.clientX, event.clientY)) return;
        beginDrag(engine, session);
        // The lift is a state write, so `engine` still reads unlifted for the rest of this event.
        // The next move resolves its hit against a machine that knows what it is holding.
        return;
      }
      const next = positionFromHit(engine, event.clientX, event.clientY);
      // Silent on purpose. A drag reports itself visually, and announcing every row it crosses
      // would flood the one live region the system owns.
      if (next) engine.retarget(next);
    },
    onPointerUp: (event) => {
      if (engine.session.current?.pointerId !== event.pointerId) return;
      const session = endSession(engine);
      // A press that never became a drag is a click: on a handle it leaves the item lifted and
      // waiting for a destination click, and on a plain item it was never a drag at all.
      if (session?.dragging) engine.dropAtTarget();
    },
    onPointerCancel: () => {
      const session = endSession(engine);
      // A press that decided nothing leaves nothing to undo and no trailing click to eat. Touch
      // fires one of these whenever the browser claims the gesture for scrolling.
      if (!session?.dragging) return;
      engine.handled.current = true;
      engine.cancel();
    },
  };
}
