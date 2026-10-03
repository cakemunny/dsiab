/* reorderKeyboard. The keyboard route of the reorder capability, and the prose that describes it.
 *
 * It moved out of the prop getters when the ITEM became the drag source, because that is when the
 * route stopped being one handler on a button and became two: a handle owns every key it is given,
 * where an item has to share its keyboard with whatever else the item already does.
 *
 * THE MAP IS THE CONVENTIONAL ONE, AND EVERY KEY IN IT IS EARNED. Space lifts, the arrow keys move,
 * Space drops, Escape cancels. Space is the pick-up because it is the one activation key a link or a
 * card does not already own. The arrows move because a list has a direction and they are already how
 * a reader travels along it. Escape cancels because Escape cancels every other transient mode in this
 * system, and a lift is a transient mode. One other shape exists and was weighed: cycle the drop
 * targets with Tab, which needs no screen-reader mode change and no sense of which way "left" is.
 *
 * ARROW-KEY DRAGGING IS A CONSCIOUS REJECTION OF THAT SHAPE, not an oversight. The case against
 * directional keys is real: a JAWS user has to leave browse mode to send one, a long move costs many
 * keystrokes, and "one to the left" means little to somebody who cannot see the layout. The system
 * keeps them because the alternative is a menu of explicit outcomes ("Move to top", "Move to Done")
 * and this hook does not ship one. Arrows are the keyboard route it has, and the honest comparison is
 * against no keyboard route at all. DECISIONS [[reorder-single-pointer-path]] records that.
 */

import type { KeyboardEvent as ReactKeyboardEvent } from "react";

/**
 * The slice of the machine a key press touches. Narrower than the full `Engine` on purpose, and
 * declared here rather than imported so the keyboard route and the prop getters stay acyclic.
 */
export interface KeyEngine {
  lift: { id: string } | null;
  activate: (itemId: string) => void;
  moveByKey: (key: string) => boolean;
  cancel: () => void;
}

/** Controls that own the space bar themselves, so the item's keyboard lift must stand aside.
 *  A LINK is deliberately absent: Space on an anchor scrolls the page and does nothing else, which
 *  is precisely why an item can take Space while the link it contains keeps Enter. */
const SPACE_OWNERS = "button,input,select,textarea,[role='button'],[role='checkbox'],[role='switch']";

/** Whether this event started inside a handle, whose own listener has already acted on it. Shared
 *  with the pointer route, which has to ask the identical question about a press. */
export function fromHandle(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("[data-ds-reorder-handle]") !== null;
}

/** Whether the key press belongs to a control inside the item rather than to the reorder. */
function ownsSpaceBar(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.closest(SPACE_OWNERS) !== null;
}

/** Escape and the arrow keys, which read identically from a handle and from the item itself. */
function onLiftedKeyDown(engine: KeyEngine, itemId: string, event: ReactKeyboardEvent): void {
  if (!engine.lift) return;
  if (event.key === "Escape") {
    // Escape reaches the lift from ANY item or handle, not only the lifted one, so tabbing away
    // mid gesture is not a dead end. stopPropagation keeps a cancel from also closing an enclosing
    // surface. The POINTER route cancels on Escape too, inherited for free by going through this
    // same machine rather than by carrying its own key handling.
    event.preventDefault();
    event.stopPropagation();
    engine.cancel();
    return;
  }
  if (engine.lift.id === itemId && engine.moveByKey(event.key)) event.preventDefault();
}

/** The route as a HANDLE carries it. A grip does nothing else, so it can have both activation keys. */
export function handleKeyDown(engine: KeyEngine, itemId: string, event: ReactKeyboardEvent): void {
  if (event.key === " " || event.key === "Enter") {
    // preventDefault stops Space scrolling the page, and stops a native button synthesising the
    // click that the `detail` check in the handle's onClick is the second line of defence against.
    event.preventDefault();
    engine.activate(itemId);
    return;
  }
  onLiftedKeyDown(engine, itemId, event);
}

/**
 * The route as the ITEM carries it, which is the default case now that a handle is optional.
 *
 * SPACE LIFTS AND ENTER IS LEFT WHERE IT WAS, and that split is forced rather than chosen. An item
 * is very often already interactive: every card on the project board is a link, and Enter is that
 * link's own activation, so taking Enter would break the item's primary job. Space on a link does
 * nothing but scroll, so Space is the one activation key free to mean something new here. Once an
 * item IS lifted the reorder owns the mode, so Enter drops there as well, which is what the third
 * rule of ARIA asks for.
 *
 * The handle line is drawn once and read from both sides. A grip's own listener acts first and the
 * press then bubbles to the item, so without a guard one key would be handled twice and the lift
 * would toggle straight back off. `fromHandle` is that guard read from the item's side, and
 * `handleKeyDown` is the same line read from the grip's.
 */
export function itemKeyDown(engine: KeyEngine, itemId: string, event: ReactKeyboardEvent): void {
  if (fromHandle(event.target) || ownsSpaceBar(event.target)) return;
  if (event.key === " " || (event.key === "Enter" && engine.lift)) {
    event.preventDefault();
    engine.activate(itemId);
    return;
  }
  onLiftedKeyDown(engine, itemId, event);
}

/** The key map prose one group set carries. The cross-list clause is earned by a second group, never
 *  assumed: telling a reader of a single sortable list about left and right is a lie about the UI.
 *
 *  Space rather than "Space or Enter" to lift, because the item is the drag source and an item that
 *  is a link owes Enter to the link. Enter still drops, where the reorder owns the mode. */
export const KEYS_ONE_GROUP =
  "Press the space bar to lift this item, then the up and down arrow keys to move it, space or " +
  "Enter to drop it, or Escape to cancel. You can also click the item to lift it and then click a " +
  "destination to place it.";
export const KEYS_MANY_GROUPS =
  "Press the space bar to lift this item, then the up and down arrow keys to move it within its " +
  "list and the left and right arrow keys to move it to another list, space or Enter to drop it, " +
  "or Escape to cancel. You can also click the item to lift it and then click a destination to " +
  "place it.";
