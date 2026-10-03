/* reorderGesture. The pointer gesture behind the reorder capability: the session a press opens, the
 * two things that decide whether that press is a click or a drag, and the two suppressions a whole
 * item drag needs once it is one.
 *
 * IT EXISTS BECAUSE THE ITEM BECAME THE DRAG SOURCE. While a handle owned the drag none of this was
 * needed: a grip does exactly one job, so a press on it could lift immediately and a release could
 * mean nothing else. An item usually does something else as well. Every card on the project board
 * is a link, so a press on one has to stay a link press until it has travelled far enough, or been
 * held long enough, that no reader would still call it a click.
 *
 * EVERY NUMBER HERE IS A THRESHOLD SEPARATING INTENT FROM NOISE, and each one says what it was
 * derived from rather than asserting a value. They are the only figures the capability cannot read
 * off a token, because they describe a hand rather than a layout.
 *
 * It holds no React state. What it installs outside React is pushed onto the session's own
 * `cleanup` list and torn down exactly once, when the gesture ends.
 */

import type { PointerEvent as ReactPointerEvent } from "react";

/**
 * How far a press travels before it stops being a click and becomes a drag, in CSS pixels.
 *
 * FIVE, AND IT IS A MEASUREMENT OF A HAND RATHER THAN A STYLE CHOICE. A press that never moves is
 * a click; a press that crosses a room is a drag; the number is where a still hand's tremor ends.
 * Below about five pixels a press on a touchpad or a mouse regularly drifts without the reader
 * intending anything, and above it almost nothing drifts by accident. It is deliberately the
 * capability's ONE statement of that fact: the drop indicator's boundary band reuses this same
 * constant rather than inventing a second number for the same hand.
 */
export const DRAG_THRESHOLD_PX = 5;

/**
 * How long a touch is held before it starts a drag, in milliseconds.
 *
 * A touch drag and a page scroll are the same gesture until something separates them, and the only
 * thing that can separate them at the moment of contact is time. 120ms is short enough that a
 * deliberate press does not feel like waiting, and long enough that a flick — which is over in
 * well under that — is never mistaken for a lift. Longer reads as lag on a card the reader meant
 * to move; shorter starts stealing scrolls.
 */
export const TOUCH_LONG_PRESS_MS = 120;

/** Stamped on `<html>` for the life of a POINTER drag, and the hook for the grabbing cursor that
 *  follows the hand out of the item it started in. Deliberately not set by the keyboard or click
 *  route: nothing is being held under a pointer there, so the page has no business claiming it is. */
const DRAGGING_ATTR = "data-ds-reorder-dragging";

/** An in-flight pointer gesture. `dragging` is what separates a drag from a click on the same item. */
export interface PointerSession {
  pointerId: number;
  /** The item this press is about: the item pressed, or the item a pressed handle moves. */
  itemId: string;
  /** Where the press landed, so the threshold measures from the press and not from the last frame. */
  originX: number;
  originY: number;
  /** Whether this is a touch, which decides both how the drag starts and what it has to suppress. */
  touch: boolean;
  /** The group element the gesture captures on. Read at press time, because the timer that starts a
   *  touch drag has no event of its own to read it from. */
  group: HTMLElement;
  /** Whether the press has become a drag: past the distance, or past the hold. */
  dragging: boolean;
  /** The pending touch hold, as `window.setTimeout` numbers it. While it is set the press is still
   *  a candidate scroll rather than a drag. */
  hold: number | null;
  /** Everything installed outside React, torn down once when the gesture ends. */
  cleanup: (() => void)[];
}

/**
 * The slice of the machine a gesture touches. Deliberately narrower than the full `Engine`: a
 * gesture can lift, drop and cancel, and it has no business naming an item or reading the preview.
 * Declaring the slice here rather than importing `Engine` is also what keeps the two modules
 * acyclic, since the getters import this file and this file imports nothing of theirs.
 */
export interface GestureEngine {
  lift: { id: string } | null;
  activate: (itemId: string) => void;
  dropAtTarget: () => void;
  cancel: () => void;
  handled: { current: boolean };
  session: { current: PointerSession | null };
}

/**
 * Axis by axis rather than by distance: a press is a drag once `|dx| >= 5 || |dy| >= 5`. The two
 * are not the same test — a radius of 5 and a square of 5 disagree on the diagonal, where a
 * diagonal drift of 4 and 4 measures 5.7 and would trip a radius while a reader would still call
 * it a still hand. The square is the forgiving one, so it is the one used.
 */
export function crossedThreshold(session: PointerSession, x: number, y: number): boolean {
  return Math.abs(x - session.originX) >= DRAG_THRESHOLD_PX || Math.abs(y - session.originY) >= DRAG_THRESHOLD_PX;
}

/**
 * Kill the click that a completed drag leaves behind.
 *
 * ON THE DOCUMENT, IN THE CAPTURE PHASE. A whole item drag makes this load bearing rather than
 * tidy: the item is often a link, and a link whose default action survives the drag navigates away
 * the moment the card is dropped. Bubble phase is too late, because the item's own handlers and
 * the anchor's default action are both reached before it.
 *
 * Removal is deferred by one turn. The click is dispatched in the same task as the `pointerup` that
 * ended the gesture, so tearing the listener down synchronously would let exactly the click it
 * exists for through.
 */
function blockNextClick(session: PointerSession): void {
  const swallow = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };
  document.addEventListener("click", swallow, { capture: true, once: true });
  session.cleanup.push(() => {
    setTimeout(() => document.removeEventListener("click", swallow, { capture: true }), 0);
  });
}

/**
 * Stop the page scrolling under a touch drag.
 *
 * React has attached `touchmove` PASSIVELY at the root since React 17, so `preventDefault` from a
 * React handler is a no-op and the board scrolls out from under the card. A raw non-passive
 * listener is the only thing that can refuse the scroll, and it is installed only once a drag has
 * actually started: before that the press is still a candidate scroll and blocking the move would
 * break scrolling for everyone who never meant to drag.
 */
function blockTouchScroll(session: PointerSession): void {
  const swallow = (event: TouchEvent) => event.preventDefault();
  window.addEventListener("touchmove", swallow, { passive: false });
  session.cleanup.push(() => window.removeEventListener("touchmove", swallow));
}

/**
 * THE GRABBING CURSOR HAS TO BE THE DOCUMENT'S, not the item's, and the reason is geometric rather
 * than stylistic. A drag holds pointer capture on the GROUP, so the pointer routinely sits over a
 * neighbouring card, the column gutter or the page chrome while the gesture is still live — and
 * every one of those paints its own cursor. An item-scoped `cursor: grabbing` is therefore visible
 * for roughly the first five pixels of a drag and never again. Measured before this existed:
 * `getComputedStyle(document.body).cursor` read `auto` throughout a live drag.
 *
 * The affordance is two states, not one: an open hand over something that CAN be picked up, and a
 * closed hand for as long as something IS being held. The second belongs to the whole page,
 * because that is where the hand is.
 *
 * An ATTRIBUTE on the document element, painted in tokens/components.css, rather than an inline
 * `document.body.style.cursor`: an inline write would have to be saved and restored around whatever
 * the consumer already had there, and it cannot be overridden by a theme. Removal rides
 * `session.cleanup`, so pointerup, pointercancel and Escape all undo it through one path.
 */
function markDocumentDragging(session: PointerSession): void {
  const root = document.documentElement;
  root.setAttribute(DRAGGING_ATTR, "");
  session.cleanup.push(() => root.removeAttribute(DRAGGING_ATTR));
}

/**
 * The threshold crossing: the one point where a press becomes a drag. Everything that has to happen
 * exactly once per gesture happens here, which is why it is one function rather than three flags
 * read in three places.
 *
 * THE LIFT DOES NOT MOVE THE ITEM, and it must not: the press has just travelled five pixels to
 * prove itself, and a card that jumped by those five pixels at the moment of lifting would read
 * as a glitch rather than as a pickup. A lift records the item's own slot as both origin and
 * target, so the rendered order only changes once a hit test names a different slot.
 */
export function beginDrag(engine: GestureEngine, session: PointerSession): void {
  if (session.dragging) return;
  session.dragging = true;
  if (session.hold) window.clearTimeout(session.hold);
  session.hold = null;
  // An item press has not lifted yet. A handle press already did, on the press itself.
  if (!engine.lift) engine.activate(session.itemId);
  // The capture-phase blocker below now owns the trailing click, so the flag that would otherwise
  // eat it in a React handler has to be cleared: two claims on one click leave the second armed,
  // and the next real click anywhere then dies silently.
  engine.handled.current = false;
  // A whole item drag otherwise smears a selection across everything it crosses. Both libraries
  // clear the selection at this moment rather than banning selection in CSS, which would cost a
  // reader the ability to copy anything out of a card.
  document.getSelection()?.removeAllRanges();
  // Capture belongs on the GROUP, never on the item. Measured in real Chrome with it on the moving
  // element: the first retarget reordered the list, React moved the node, Chrome read that as the
  // capture target leaving the document and released capture, and the drag died after one move.
  session.group.setPointerCapture(session.pointerId);
  markDocumentDragging(session);
  blockNextClick(session);
  if (session.touch) blockTouchScroll(session);
}

/**
 * Open a session for this press. `holdForTouch` is false for a handle, which has `touch-action:
 * none` and therefore cannot be confused with a scroll, and true for an item, which can.
 */
export function openSession(
  engine: GestureEngine,
  itemId: string,
  event: ReactPointerEvent,
  holdForTouch: boolean,
): void {
  const group = (event.currentTarget as HTMLElement).closest<HTMLElement>("[data-ds-reorder-group]");
  if (!group) return;
  const session: PointerSession = {
    pointerId: event.pointerId,
    itemId,
    originX: event.clientX,
    originY: event.clientY,
    touch: event.pointerType === "touch",
    group,
    dragging: false,
    hold: null,
    cleanup: [],
  };
  engine.session.current = session;
  if (!holdForTouch || !session.touch) return;
  session.hold = window.setTimeout(() => {
    session.hold = null;
    beginDrag(engine, session);
  }, TOUCH_LONG_PRESS_MS);
}

/** End the gesture and undo everything it installed. Returns the session it closed, for the caller
 *  to read `dragging` off, or `null` when there was nothing open. */
export function endSession(engine: GestureEngine): PointerSession | null {
  const session = engine.session.current;
  if (!session) return null;
  engine.session.current = null;
  if (session.hold) window.clearTimeout(session.hold);
  session.hold = null;
  for (const undo of session.cleanup) undo();
  session.cleanup.length = 0;
  return session;
}
