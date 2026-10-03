import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { Progress as RadixProgress } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";

/* Progress — a horizontal bar that shows how far along a task is. A THIN wrap over Radix Themes'
 * Progress: it rides the uiSize CONTROL lane (an unset `size` follows the global tier, small → 1) and
 * passes everything else straight through, so a progress bar lines up with the Buttons and inputs beside
 * it. Radix draws the track and the filled indicator itself, and the indicator paints from
 * `--accent-track`, the shade every part without text paints ([[textless-part-fills]]: the text fill in light on the
 * colours theme.css deepens, Radix's step 9 otherwise), so the fill is already accent-aware and follows
 * the brand's collision shift. It therefore declares no `--ds-*` roles of its own (it reuses the Radix
 * skin, the Slider / Separator precedent).
 *
 * Two modes, chosen by whether `value` is passed:
 *   • DETERMINATE — `value` set (0…`max`): the fill scales to the fraction and `role="progressbar"`
 *     carries aria-valuenow / -valuemin / -valuemax, so the amount done is both seen and announced. Pair
 *     it with a percentage label for a known-length task.
 *   • INDETERMINATE — `value` omitted: an animated sweep for a task of unknown length (no percentage to
 *     show). The sweep is an AMBIENT loop — its cadence lives on Radix's own `--progress-duration`
 *     (default 5s), a deliberate literal OUTSIDE the `--ds-duration` ladder, the same stance the
 *     StatusDot ambient pulse takes — so no motion CSS is added here.
 *
 * Reduced motion: Radix does NOT itself silence the indeterminate sweep under `prefers-reduced-motion`,
 * and the project's `--ds-duration` clamp can't reach Radix's `--progress-duration`, so the quiet-sweep
 * (→ a static bar) override is owned CENTRALLY in the token layer, never in this wrapper.
 *
 * Focus is not a concern — a progress bar is non-interactive (`pointer-events: none`, no tab stop).
 *
 * `size` (1–3), `variant` (surface | classic), `color`, `highContrast`, `radius`, `value`, `max` and
 * `duration` all pass through to Radix. `soft` is not offered: its pale bar read 1.64:1 against the
 * light page on yellow, and a bar given it is a type error ([[colour-prop-and-high-contrast]], [[published-aschild-props]]). A bar given `color` or
 * `highContrast` takes the same edge as the default bar ([[colour-prop-and-high-contrast]]). */
export type ProgressProps = Omit<ComponentPropsWithoutRef<typeof RadixProgress>, "variant" | "color"> & {
  /** Radix track and indicator treatment. `soft` is not offered ([[colour-prop-and-high-contrast]]). @default "surface" */
  variant?: "surface" | "classic";
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). */
  color?: AccentColor;
};

export const Progress = forwardRef<ElementRef<typeof RadixProgress>, ProgressProps>(function Progress(
  { size, color, ...props },
  ref,
) {
  const resolvedSize = useResolvedSize("control", size) as ProgressProps["size"];
  return <RadixProgress ref={ref} size={resolvedSize} {...accentColorProps(color)} {...props} />;
});
