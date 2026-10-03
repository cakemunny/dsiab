import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { Spinner as RadixSpinner } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";

/* Spinner — an indeterminate loading indicator: a ring of eight fading leaves that cycles while work
 * of unknown shape is in flight. A THIN wrap over Radix Themes' Spinner: it rides the uiSize control
 * lane (an unset `size` follows the global tier, small → 1) and passes everything else straight
 * through. Radix draws the leaf ring itself and cycles it as an AMBIENT loop — a deliberate literal
 * OUTSIDE the intent-named `--ds-duration` ladder (the StatusDot breathe precedent, [[status-dot]]) — so this wrap
 * declares no `--ds-*` roles and adds no motion CSS of its own. The leaf inks from `currentColor`, so a
 * spinner takes the colour of the text it sits in rather than a fixed Radix scale; Button's own
 * `loading` prop already renders this same Radix spinner (skin reuse, no fork).
 *
 * Reduced motion: Radix Themes ships the leaf-fade with NO `prefers-reduced-motion` guard, so the
 * cycle does not stop on its own — unlike the StatusDot breathe, which [[status-dot]] silences. Settling it to a
 * static ring under `prefers-reduced-motion: reduce` therefore needs a CENTRAL rule (this wrap adds no
 * CSS); the ambient-loop stance matches StatusDot's.
 *
 * `size` (1–3, rides the control lane), `loading` (default true — false renders `children` in the
 * spinner's place), and the standard span / margin props all pass through to Radix. */
export type SpinnerProps = ComponentPropsWithoutRef<typeof RadixSpinner>;

export const Spinner = forwardRef<ElementRef<typeof RadixSpinner>, SpinnerProps>(function Spinner(
  { size, ...props },
  ref,
) {
  const resolvedSize = useResolvedSize("control", size) as SpinnerProps["size"];
  return <RadixSpinner ref={ref} size={resolvedSize} {...props} />;
});
