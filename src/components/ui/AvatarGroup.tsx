import { Children, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { useResolvedAvatarSize, type AvatarSize } from "../../theme/SizeContext";
import { Avatar } from "./Avatar";
import { VisuallyHidden } from "./VisuallyHidden";

const cx = (...xs: (string | false | undefined)[]) => xs.filter(Boolean).join(" ");

export interface AvatarGroupProps extends Omit<ComponentProps<"span">, "children"> {
  children: ReactNode;
  /**
   * Group size — all children render at this box (overrides any per-child size). Unset, it tracks the
   * global uiSize on the PORTRAIT ramp (small→md 24 · medium→lg 30 · large→xl 40), not the beside-text
   * ramp a standalone Avatar rides: a stack is an identity, and overlapped discs need a face-sized box.
   */
  size?: AvatarSize | number | "inherit";
  /** Show at most this many avatars; the rest collapse into a neutral, same-size "+N" counter disc. */
  max?: number;
  /**
   * Accessible name for the group as a whole — a screen reader announces one "group" with this name
   * (e.g. "4 team members") instead of N separate avatars + a "+N" badge. Defaults to "{count} avatars".
   */
  label?: string;
}

/**
 * A tight, horizontally overlapped stack of avatars with a consistent --ds-bg-base ring so the overlaps
 * read. `max` caps the visible avatars and folds the remainder into a neutral "+N" counter that REUSES
 * `Avatar`, so the surplus indicator is the same diameter and circular shape as every other disc,
 * never a shorter pill. The counter occupies a slot in the same overlapped run as the faces, so a
 * different shape or diameter breaks the row's rhythm at its end, which is the one place the eye
 * stops and reads the shape rather than the texture.
 * Every child renders at the group's size via the .rt-ds-avatar-group descendant
 * rule in components.css. The root is a `role="group"` with an accessible name, so a screen reader
 * announces the stack as ONE unit.
 *
 * Unset, the box comes off the PORTRAIT ramp (24 / 30 / 40) rather than the beside-text ramp a
 * standalone Avatar takes (16 / 20 / 24): the discs overlap by 40% of the box, so an inline-sized
 * stack shows only a sliver of each person and reads as texture instead of as a set of faces.
 */
export function AvatarGroup({ children, size, max, label, className, style, ...rest }: AvatarGroupProps) {
  const resolved = useResolvedAvatarSize(size, "portrait");
  const sizeClass = typeof resolved === "string" ? `rt-ds-avatar-${resolved}` : undefined;
  const sizeVar =
    typeof resolved === "number" ? ({ "--ds-avatar-box": `${resolved}px` } as CSSProperties) : undefined;

  const items = Children.toArray(children);
  const limit = max != null && max < items.length ? max : items.length;
  const shown = items.slice(0, limit);
  const overflow = items.length - limit;

  // Announce the stack as one unit (role="group" + a name) rather than N avatars + a "+N" badge.
  const groupLabel = label ?? `${items.length} ${items.length === 1 ? "avatar" : "avatars"}`;

  return (
    <span
      role="group"
      aria-label={groupLabel}
      className={cx("rt-ds-avatar-group", sizeClass, className)}
      style={{ ...sizeVar, ...style }}
      {...rest}
    >
      {shown}
      {overflow > 0 && (
        // Reuse Avatar so the surplus counter is the SAME circular disc as the stack — identical
        // diameter/shape, overlapping like the rest (no gap). A STRONGER neutral fill (rt-ds-avatar-count
        // in components.css) so "+N" reads as a count, not a person — the pale soft-accent discs sit too
        // close to a pale gray on low-chroma accents (iris/slate).
        //
        // The name is carried INSIDE the fallback, not by an `aria-label` on the Avatar: Radix routes any
        // unrecognized prop onto the inner <img>, which never mounts on a src-less avatar, so an
        // `aria-label` here silently evaporated (measured null in the DOM). So the glyph is marked
        // decorative and the announced text sits beside it — a screen reader says "3 more" rather than
        // spelling out "plus three". A node fallback also drops Radix's rt-one-letter/rt-two-letters
        // font-size class, which the .rt-ds-avatar-count rule in components.css re-declares from the same
        // Radix var (and which was already unset for a 3-character "+10").
        <Avatar
          color="gray"
          className="rt-ds-avatar-count"
          fallback={
            <>
              <span aria-hidden>+{overflow}</span>
              <VisuallyHidden>{overflow} more</VisuallyHidden>
            </>
          }
        />
      )}
    </span>
  );
}
