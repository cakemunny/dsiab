import { type ComponentProps, type ComponentRef, forwardRef } from "react";
import { IconButton as RadixIconButton } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";

type RadixIconButtonProps = ComponentProps<typeof RadixIconButton>;
export type IconButtonPriority = "primary" | "secondary" | "tertiary";

// Priority -> Radix variant.
//  primary   = solid   — the single most consequential action; ONE per page.
//  secondary = surface — the default; stands distinct from the bg (border + fill).
//  tertiary  = ghost   — lowest priority; accent text + hover feedback only.
// `soft`, `outline`, and `classic` are intentionally not exposed.
const PRIORITY_VARIANT = {
  primary: "solid",
  secondary: "surface",
  tertiary: "ghost",
} satisfies Record<IconButtonPriority, RadixIconButtonProps["variant"]>;

/** Semantic valence, orthogonal to priority ([[destructive-tone]]). Single-valued by design. */
export type IconButtonTone = "danger";

export interface IconButtonProps extends Omit<RadixIconButtonProps, "variant" | "color"> {
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). An icon button given one paints what the
   *  same icon button paints on a page of that colour. */
  color?: AccentColor;
  /** UI-priority grade. Defaults to `secondary` so `primary` (solid) is deliberate. */
  priority?: IconButtonPriority;
  /** In-field tertiary control (clear, reveal). Forces ghost variant AND step 1 (the 24×24 target,
   *  WCAG 2.5.8) and sets `data-inset` — an explicit `size` is ignored, exactly as `priority` is. */
  inset?: boolean;
  /** Destructive intent — re-paints the grade from the accent-aware error family ([[destructive-tone]]).
   *  Never use Radix's `color` for destructive actions: it bypasses collision avoidance. */
  tone?: IconButtonTone;
}

// forwardRef so the ref reaches the underlying Radix icon-button element. Load-bearing for any Slot/`asChild`
// composition over IconButton (a `Toolbar.Button asChild`, a Tooltip trigger): those primitives register the
// DOM node via a ref — a plain function component drops it, which silently breaks Toolbar's roving
// arrow-navigation (the focused item can't be found in the roving collection). Mirrors Button.tsx and Radix's
// own IconButton, both of which forward their ref for the same reason.
export const IconButton = forwardRef<ComponentRef<typeof RadixIconButton>, IconButtonProps>(function IconButton(
  { priority = "secondary", size, inset, tone, color, ...rest },
  ref,
) {
  // `inset` decides the STEP as well as the variant. An in-field ✕ is a step-1 24×24 target whatever
  // step the field around it claims: `.rt-IconButton[data-inset]` floors its box at a flat 24px, so a
  // button that claimed step 2 or 3 rendered a box that disagreed with its own size class (measured on
  // Callout's dismiss at the large tier: 34×34, against the 40 its `rt-r-size-3` claims and the 24 the
  // inset floor gives it). Every other inset call site in the system already spelled the contract as
  // `size="1"` — Select, MultiSelect, DateInput, DateRangeInput, NumberInput, Typeahead, FileInput,
  // Token, all eight of them — so deciding it here makes it unforgettable instead of re-typed, and the
  // two sites that had forgotten it (Callout's dismiss, the press-scale fixture) come back on the box.
  const resolvedSize = useResolvedSize("control", inset ? "1" : size);
  return (
    <RadixIconButton
      ref={ref}
      variant={PRIORITY_VARIANT[inset ? "tertiary" : priority]}
      size={resolvedSize}
      data-inset={inset || undefined}
      data-tone={tone}
      {...accentColorProps(color)}
      {...rest}
    />
  );
});
