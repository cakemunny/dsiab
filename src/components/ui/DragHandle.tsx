import { forwardRef } from "react";
import type { ComponentRef } from "react";
import { DotsSix, DotsSixVertical } from "@phosphor-icons/react";
import { IconButton, type IconButtonProps } from "./IconButton";

/* DragHandle — the OPTIONAL grip for a reorderable item, and the one genuinely net-new surface the
 * reorder capability needed ([[reorder-capability]]). It is deliberately small: the glyph, the cursor, the hit target,
 * the focus ring and the accessible wiring. Every behaviour lives in `useReorder`, whose
 * `getHandleProps(id)` this takes verbatim.
 *
 * IT IS NOT THE MECHANISM, AND THAT IS THE CORRECTION. The item is the drag source: a consumer who
 * spreads only `getGroupProps` and `getItemProps` gets the pointer drag, the keyboard route and the
 * single-pointer click route with no grip anywhere. Ruled after review of the first cut:
 * a whole card is dragged whole, and a drag handle is for precise
 * handling or for confirming that an item is draggable where that is not already apparent. The row is the thing being moved, so the row is
 * the natural place to take hold of it, and a grip narrows a full-width target down to a few pixels of
 * glyph for no gain whenever nothing else on that row is competing for the same press.
 *
 * SO THERE ARE EXACTLY TWO REASONS TO RENDER ONE. Either the row holds buttons, links or fields that
 * a whole-row drag would fight, or nothing about the row says it can be moved and the grip is what
 * says so. A grip beside a row that has neither problem costs the row width and buys nothing the
 * grab cursor does not already give.
 *
 * IT IS A COMPOSITION, NOT A NEW CONTROL. The grip is a `tertiary` (ghost) System `IconButton`, the
 * same move `MoreMenu` makes for the overflow glyph, and it inherits four settled contracts rather
 * than re-deciding any of them: the [[control-box-per-step]] control box (so the target clears 24x24 at every tier, which
 * [[checkbox-target-size]] shows is not free), the control size lane (24 / 32 / 40 across small / medium / large), the
 * [[focus-ring]] focus ring swapped into Radix's own outline, and a real `<button>`, which is what
 * makes Space and Enter reach the handle without a hand-rolled key listener.
 *
 * THE GLYPH CARRIES A WEIGHT, and that is a ruling rather than a preference. `DotsSixVertical` and
 * `DotsSix` are both in the sparse-glyph register ([[optical-icon-weight]], guarded by sparse-glyph-weight.node-check),
 * so each declares `weight="bold"`: six small marks at `regular` read as disabled beside the dense
 * glyphs in the same row.
 *
 * `type="button"` is explicit. A sortable list is very often inside a form, and a grip that submits
 * it on the first click would be an expensive surprise.
 */

/** Which way the grip reads. `vertical` is the column of dots for a stacked list, `horizontal` the row. */
export type DragHandleOrientation = "vertical" | "horizontal";

export interface DragHandleProps
  extends Omit<IconButtonProps, "children" | "priority" | "inset" | "tone" | "type" | "asChild"> {
  /**
   * Accessible name. Spreading `useReorder().getHandleProps(id)` supplies one that states the lifted
   * state, so pass this only for a grip you drive yourself. It wins over a spread `aria-label`.
   */
  label?: string;
  /** Grip axis. Defaults to `vertical`, the stacked-list case. */
  orientation?: DragHandleOrientation;
  /** Refused, and measured before it was refused. `children` was already omitted above, so a consumer
   *  has no element to hand over: the grip's own glyph is the only child, and the JSX child below wins
   *  over a spread one. What `asChild` actually did was reach `IconButton` through the rest spread and
   *  slot the GLYPH. Server-rendered at 51bfa0b, `<DragHandle asChild>` emitted no `<button>` at all: an
   *  `<svg>` stood where the control had been, wearing `type="button"`, the `aria-label` and the whole
   *  `rt-reset rt-BaseButton rt-IconButton rt-ds-drag-handle` class list. Tab cannot reach it, Space and
   *  Enter do nothing, the [[control-box-per-step]] 24x24 box is gone and the [[focus-ring]] focus ring has nothing to paint, with
   *  no error and no type failure to say so. The release valve for a grip you want to build yourself is
   *  the one this component is documented as a convenience over: spread `getHandleProps(id)` onto any
   *  element you like. Declared rather than merely omitted so the refusal is a type error a reader can
   *  see, and destructured away below so a spread from untyped JavaScript is IGNORED. */
  asChild?: never;
}

export const DragHandle = forwardRef<ComponentRef<typeof IconButton>, DragHandleProps>(function DragHandle(
  { label, orientation = "vertical", className, "aria-label": ariaLabel, asChild: _refusedAsChild, ...rest },
  ref,
) {
  const Glyph = orientation === "vertical" ? DotsSixVertical : DotsSix;
  return (
    <IconButton
      ref={ref}
      type="button"
      priority="tertiary"
      aria-label={label ?? ariaLabel}
      data-orientation={orientation}
      className={className ? `rt-ds-drag-handle ${className}` : "rt-ds-drag-handle"}
      {...rest}
    >
      <Glyph weight="bold" aria-hidden />
    </IconButton>
  );
});
