import { type ComponentProps, type ComponentRef, forwardRef } from "react";
import { Button as RadixButton } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";

type RadixButtonProps = ComponentProps<typeof RadixButton>;

/** UI-priority grade — the system's button vocabulary. */
export type ButtonPriority = "primary" | "secondary" | "tertiary";

// Priority -> Radix variant.
//  primary   = solid   — the single most consequential action; ONE per page.
//  secondary = surface — the default; stands distinct from the bg (border + fill).
//  tertiary  = ghost   — lowest priority; accent text + hover feedback only.
// `soft`, `outline`, and `classic` are intentionally not exposed.
const PRIORITY_VARIANT = {
  primary: "solid",
  secondary: "surface",
  tertiary: "ghost",
} satisfies Record<ButtonPriority, RadixButtonProps["variant"]>;

/** Semantic valence, orthogonal to priority ([[destructive-tone]]). Single-valued by design. */
export type ButtonTone = "danger";

export interface ButtonProps extends Omit<RadixButtonProps, "variant" | "color"> {
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). A button given one paints what the same
   *  button paints on a page of that colour. */
  color?: AccentColor;
  /** UI-priority grade. Defaults to `secondary` so `primary` (solid) is deliberate. */
  priority?: ButtonPriority;
  /** Destructive intent — re-paints the grade from the accent-aware error family ([[destructive-tone]]).
   *  Never use Radix's `color` for destructive actions: it bypasses collision avoidance. */
  tone?: ButtonTone;
}

// forwardRef so the ref reaches the underlying Radix button element. Load-bearing for any Slot/`asChild`
// composition over Button (ToggleButton's Toggle, ToggleButtonGroup's roving-focus Collection, a Tooltip
// trigger): those primitives register the DOM node via a ref — a plain function component drops it, which
// silently breaks roving arrow-navigation. Radix's own Button forwards its ref for the same reason.
export const Button = forwardRef<ComponentRef<typeof RadixButton>, ButtonProps>(function Button(
  { priority = "secondary", tone, size, color, ...rest },
  ref,
) {
  const resolvedSize = useResolvedSize("control", size);
  return (
    <RadixButton
      ref={ref}
      variant={PRIORITY_VARIANT[priority]}
      size={resolvedSize}
      data-tone={tone}
      {...accentColorProps(color)}
      {...rest}
    />
  );
});
