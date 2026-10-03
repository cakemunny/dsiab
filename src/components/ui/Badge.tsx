import { Children, isValidElement, useEffect, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { Badge as RadixBadge } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";

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

type RadixBadgeProps = ComponentProps<typeof RadixBadge>;

/** Accent-aware semantic families (the [data-tone] bridge). */
export type BadgeTone = "error" | "warning" | "success" | "info";

// Badge is a DISPLAY marker ONLY — a flat `soft` tint, no edge, no interactivity (GUIDELINES §5a / [[soft-variant-scope]]).
// The moment a chip is clickable, navigable, or removable it is a **Token**, not a Badge: the surface EDGE
// is the honest signal that a chip is a control rather than a label. Badge therefore carries no `onRemove`,
// no interactive/asChild body, and no trailing ✕ — those all live on Token (see Token.tsx, DECISIONS [[badge-scope]]).
export interface BadgeProps extends Omit<RadixBadgeProps, "variant" | "asChild" | "color"> {
  /** A categorical colour: Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). A badge given one paints
   *  what the same badge paints on a page of that colour. */
  color?: AccentColor;
  /** Accent-aware semantic tone; stamps `data-tone` for the CSS bridge. WINS over `color`: the
   *  `[data-tone]` bridge has specificity (0,3,0), outranking Radix's `data-accent-color` paint, so
   *  `tone` and `color` are effectively mutually exclusive ("tone wins"). Untoned = neutral / brand accent. */
  tone?: BadgeTone;
  /** Optional identification glyph before the label (fixed-width slot). */
  leadingIcon?: ReactNode;
  /** Optional trailing display glyph after the label (fixed-width slot). NOT an interactive affordance —
   *  a caret/✕ that promises an action belongs on a Token, not a Badge. */
  trailingIcon?: ReactNode;
  /** Refused, per [[badge-scope]]: a Badge is a display marker, and `asChild` is how the old interactive body was
   *  reached. Declared rather than merely omitted so the refusal is a type error a reader can see, and
   *  destructured away below so a spread from untyped JavaScript is IGNORED. Before that, it reached
   *  Radix's `Slot`, which threw on the lead/label/trail trio this component always renders. */
  asChild?: never;
}

const affixStyle = { display: "inline-flex", alignItems: "center", flexShrink: 0 } as const;

/** True when children include any non-empty text (string/number) descendant — the visible label. */
function hasVisibleText(children: ReactNode): boolean {
  let found = false;
  Children.forEach(children, (c) => {
    if (typeof c === "string" && c.trim() !== "") found = true;
    else if (typeof c === "number") found = true;
    else if (isValidElement(c)) {
      const el = c as ReactElement<{ children?: ReactNode }>;
      if (hasVisibleText(el.props.children)) found = true;
    }
  });
  return found;
}

export function Badge({
  tone,
  leadingIcon,
  trailingIcon,
  size,
  color,
  radius = "full",
  children,
  asChild: _refusedAsChild,
  ...rest
}: BadgeProps) {
  const resolvedSize = useResolvedSize("text", size);

  const ariaLabel = (rest as Record<string, unknown>)["aria-label"];
  useEffect(() => {
    if (!DEV_WARN) return;
    const iconOnly = !hasVisibleText(children) && (leadingIcon != null || trailingIcon != null);
    if (iconOnly && ariaLabel == null) {
      console.warn("Badge: an icon-only badge needs `aria-label` for an accessible name (WCAG 4.1.2).");
    }
  }, [children, leadingIcon, trailingIcon, ariaLabel]);

  const lead = leadingIcon != null ? <span aria-hidden style={affixStyle}>{leadingIcon}</span> : null;
  const trail = trailingIcon != null ? <span aria-hidden style={affixStyle}>{trailingIcon}</span> : null;

  return (
    <RadixBadge variant="soft" size={resolvedSize} radius={radius} data-tone={tone} {...accentColorProps(color)} {...rest}>
      {lead}
      {children}
      {trail}
    </RadixBadge>
  );
}
