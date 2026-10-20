import { createContext, useContext, useEffect, type ComponentProps, type CSSProperties } from "react";
import { Avatar as RadixAvatar } from "@radix-ui/themes";
import { useResolvedAvatarSize, type AvatarSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";
import { Buildings, User } from "@phosphor-icons/react";
import { StatusDot, type StatusDotVariant } from "./StatusDot";
import { VisuallyHidden } from "./VisuallyHidden";

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

/** True where a host sizes the avatar through CSS, so the avatar's own unset `size` says nothing about its
 *  box. AvatarGroup and the ChatMessage avatar slot provide it. Internal. */
export const AvatarHostSizedContext = createContext(false);

// INITIALS THAT CANNOT BE READ ARE NOT SHOWN ([[avatar-initials-floor]]). Two initials render at 0.44 of the
// box (components.css), so they clear the 12px floor only in a box of 12 / 0.44 = 27.3px or more. An avatar
// with no `size` takes the beside-text ramp, which is always 16, 20 or 24px, where they read 7.04, 8.8 or
// 10.56px. So an avatar with no size and a string fallback shows an icon: a person on a round avatar, a building
// on any other radius, the entity shape. The initials stay as hidden text, so a screen reader hears what it heard
// before, and the name beside the avatar carries who it is. An explicit `size`, a node fallback (any icon the
// caller picks) and a host-sized avatar keep what they had.

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
// sizing, and a stroke on top of the fill that darkens its rim ([[status-dot-edges]]). See DECISIONS [[status-dot]] (StatusDot).
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
   * Unset, a text `fallback` shows an icon, a person on a round avatar and a building on any other radius,
   * because two initials in those boxes render under 12px. Pass any icon as `fallback` to choose your own.
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
export function Avatar({ size, status, radius = "full", className, style, src, alt, color, fallback, ...rest }: AvatarProps) {
  const resolved = useResolvedAvatarSize(size);
  const hostSized = useContext(AvatarHostSizedContext);
  const iconFallback = size === undefined && !hostSized && typeof fallback === "string";
  const FallbackIcon = radius === "full" ? User : Buildings;

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
      fallback={
        iconFallback ? (
          <>
            <FallbackIcon aria-hidden className="rt-ds-avatar-icon" />
            <VisuallyHidden>{fallback}</VisuallyHidden>
          </>
        ) : typeof fallback === "string" ? (
          // A node fallback drops Radix's rt-one-letter / rt-two-letters size classes, so the span carries the
          // letter count and components.css re-applies the same two font-size variables.
          <span className="rt-ds-avatar-initials" data-letters={fallback.length}>{fallback}</span>
        ) : (
          fallback
        )
      }
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
