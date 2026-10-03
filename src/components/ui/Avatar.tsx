import { useEffect, type ComponentProps, type CSSProperties } from "react";
import { Avatar as RadixAvatar } from "@radix-ui/themes";
import { useResolvedAvatarSize, type AvatarSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";
import { StatusDot, type StatusDotVariant } from "./StatusDot";

// Dev-only accessibility warnings, resolved once at module load. A `try` rather than
// `typeof process !== "undefined" && …`: a bundler replaces the LITERAL `process.env.NODE_ENV`
// without defining a `process` global, so the typeof form reads "undefined" and silences the
// warning in exactly the dev build it exists for (measured here: typeof process = "undefined",
// literal replaced with "test"). The catch fires only when NOTHING replaced the literal and no
// `process` exists — the browser bundle that used to throw a ReferenceError — and stays silent.
const DEV_WARN = (() => {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
})();

type RadixAvatarProps = ComponentProps<typeof RadixAvatar>;

/** Presence/status shown as a bottom-right dot — paired with a text label (never colour-alone). */
export type AvatarStatus = "online" | "busy" | "away" | "offline";

const STATUS_LABEL: Record<AvatarStatus, string> = {
  online: "Online",
  busy: "Busy",
  away: "Away",
  offline: "Offline",
};

// The presence dot IS a StatusDot (one source of truth for the accent-aware colour + role/label + pulse).
// The avatar semantics map onto StatusDot's variants; the avatar context (CSS) re-adds the scale-with-box
// sizing and the --ds-bg-base cutout ring that StatusDot deliberately omits. See DECISIONS [[status-dot]] (StatusDot).
const STATUS_VARIANT: Record<AvatarStatus, StatusDotVariant> = {
  online: "success",
  busy: "error",
  away: "warning",
  offline: "neutral",
};

const cx = (...xs: (string | false | undefined)[]) => xs.filter(Boolean).join(" ");

export interface AvatarProps extends Omit<RadixAvatarProps, "size" | "variant" | "color"> {
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). An avatar given one paints what the same
   *  avatar paints on a page of that colour. */
  color?: AccentColor;
  /**
   * Avatar box size. A t-shirt name maps to the line-height ladder (xs 16 / sm 20 / md 24 / lg 30 /
   * xl 40); a raw number is a hero size in px (leaves the inline-with-text scale); unset tracks the
   * global uiSize (small→xs, medium→sm, large→md); "inherit" opts out (Radix's own default box).
   */
  size?: AvatarSize | number | "inherit";
  /** Presence dot. Carries a visually-hidden accessible name; colour comes from accent-aware --ds-fill-*. */
  status?: AvatarStatus;
}

/**
 * System avatar — a soft-variant Radix Avatar on the line-height size ladder, a circle by default.
 * `variant` is locked to `soft` (solid-fill initials failed the 3:1 floor that then held for text on a solid fill, which [[text-on-solid-fill-contrast]] later raised, and [[avatar-shape-perceptibility]] records the lock) and is
 * not exposed. `radius` stays open so an entity/org/bot avatar can opt to `"medium"` (rounded-square):
 * circle = person, rounded-square = entity/org/bot. `fallback` (Radix-required) is a documentation
 * convention: person → initials string; system/bot/team → a Phosphor icon node.
 */
export function Avatar({ size, status, radius = "full", className, style, src, alt, color, ...rest }: AvatarProps) {
  const resolved = useResolvedAvatarSize(size);

  // WCAG 1.1.1: an <img> avatar needs a text alternative. Warn (dev only) when `src` is set with no
  // `alt`; alt="" is the explicit decorative opt-out (redundant with adjacent text). Mirrors the
  // TextField/TextArea accessible-name warnings; stripped from prod by `process.env.NODE_ENV`.
  useEffect(() => {
    if (DEV_WARN && src != null && alt == null) {
      console.warn(
        'Avatar: an image `src` needs `alt` for a text alternative, or alt="" to mark it decorative (WCAG 1.1.1).',
      );
    }
  }, [src, alt]);

  const sizeClass = typeof resolved === "string" ? `rt-ds-avatar-${resolved}` : undefined;
  const sizeVar =
    typeof resolved === "number" ? ({ "--ds-avatar-box": `${resolved}px` } as CSSProperties) : undefined;
  // Skip the base class for "inherit" (resolved == null) so Radix's own default box governs.
  const base = resolved != null ? "rt-ds-avatar" : undefined;

  // Radix writes data-accent-color on the avatar's root span, and the avatar's other props reach the
  // image inside it. So oxblood reaches that root through `asChild`, on the span that becomes the root
  // ([[part-colour-parity]]). A caller's own `asChild` child replaces it.
  const own = color === "oxblood" ? { asChild: true, children: <span {...accentColorProps(color)} /> } : accentColorProps(color);
  const avatar = (
    <RadixAvatar
      variant="soft"
      radius={radius}
      src={src}
      alt={alt}
      // With a status shell the size lives on the shell (so the sibling dot can read --ds-avatar-box);
      // without one it lives on the avatar itself.
      className={cx(base, status ? undefined : sizeClass, className)}
      style={status ? style : { ...sizeVar, ...style }}
      {...own}
      {...rest}
    />
  );

  if (!status) return avatar;

  return (
    <span className={cx("rt-ds-avatar-shell", sizeClass)} style={sizeVar}>
      {avatar}
      <StatusDot variant={STATUS_VARIANT[status]} label={STATUS_LABEL[status]} className="rt-ds-avatar-status" />
    </span>
  );
}
