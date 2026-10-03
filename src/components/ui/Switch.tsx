import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { Switch as RadixSwitch } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";

/* Switch — an on/off toggle for a single setting that takes effect immediately. A THIN wrap over
 * Radix Themes' Switch: it rides the uiSize control lane (an unset `size` follows the global tier,
 * small → 1) and passes everything else straight through. Radix draws the track and thumb itself, and
 * its checked track paints from `--accent-track`, the shade every part without text paints ([[textless-part-fills]]), so the
 * ON state is already accent-aware and follows the brand collision shift. It therefore declares no
 * `--ds-*` roles of its own (it reuses the Radix skin, the Separator precedent).
 *
 * The thumb stays white on every colour. Where a light track leaves the white thumb under 3:1, the
 * checked thumb's 1px ring, Radix's `--accent-a4`, paints `--accent-thumb-stroke` instead: the lightest
 * deeper step of the same colour that clears 3:1 (theme.css keys it, components.css paints it).
 *
 * Focus is the system's own: on `:focus-visible` the track takes the keyboard-focus ring
 * ([[focus-ring]]), inherited from the system focus rule, not a per-component halo.
 *
 * `size` (1–3), `variant` (surface | classic), `color`, `highContrast`, `radius`, and the `checked` /
 * `defaultChecked` / `onCheckedChange` / `disabled` state props all pass through to Radix. `soft` is not
 * offered: its pale track read 1.24:1 against the light page on yellow, and a switch given it is a type
 * error ([[colour-prop-and-high-contrast]], [[published-aschild-props]]). A switch given `color` or `highContrast` takes the same stroke and edge as the
 * default switch ([[colour-prop-and-high-contrast]]). A Switch is never shipped bare: it is always paired with an adjacent text label
 * (the accessible name), the same labeled-row rule the Checkbox follows. */
export type SwitchProps = Omit<ComponentPropsWithoutRef<typeof RadixSwitch>, "variant" | "color"> & {
  /** The track's visual style. `soft` is not offered ([[colour-prop-and-high-contrast]]). @default "surface" */
  variant?: "surface" | "classic";
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). */
  color?: AccentColor;
};

export const Switch = forwardRef<ElementRef<typeof RadixSwitch>, SwitchProps>(function Switch(
  { size, color, ...props },
  ref,
) {
  const resolvedSize = useResolvedSize("control", size) as SwitchProps["size"];
  return <RadixSwitch ref={ref} size={resolvedSize} {...accentColorProps(color)} {...props} />;
});
