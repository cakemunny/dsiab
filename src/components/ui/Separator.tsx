import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { Separator as RadixSeparator } from "@radix-ui/themes";

/* Separator — a thin rule dividing content or controls (horizontal or vertical). A THIN wrap over
 * Radix Themes' Separator: its default skin already paints from `--gray-a6`, which is exactly what
 * `--ds-stroke-weak` aliases, so a bare separator matches the system's subtle-divider role with no new
 * CSS and no new tokens. It declares no `--ds-*` roles of its own (it reuses the Radix skin).
 *
 * `orientation` (horizontal | vertical), `size` (1–4 length step), and `decorative` pass through to
 * Radix. `decorative` (Radix default true) is purely visual → no role, invisible to AT; a SEMANTIC
 * separator (`decorative={false}`) is exposed → role="separator". Radix Themes' own Separator omits
 * `aria-orientation` entirely, so this wrap adds it for a semantic VERTICAL rule (horizontal is the ARIA
 * default and needs no statement) — a small, honest a11y upgrade over the Radix component.
 * `color` is deliberately NOT exposed — the divider is bound to the neutral stroke role and must not be
 * repainted from a raw Radix scale (the DropdownMenu `Item` precedent: never a raw Radix colour). */
export type SeparatorProps = Omit<ComponentPropsWithoutRef<typeof RadixSeparator>, "color">;

export const Separator = forwardRef<ElementRef<typeof RadixSeparator>, SeparatorProps>(
  function Separator({ orientation, decorative, ...props }, ref) {
    // Only a SEMANTIC (decorative === false) vertical rule needs an explicit aria-orientation; the
    // horizontal case matches role="separator"'s ARIA default. Responsive orientation objects are left
    // to Radix (an aria value can't be statically chosen from a breakpoint map).
    const ariaOrientation =
      decorative === false && orientation === "vertical" ? "vertical" : undefined;
    return (
      <RadixSeparator
        ref={ref}
        orientation={orientation}
        decorative={decorative}
        aria-orientation={ariaOrientation}
        {...props}
      />
    );
  },
);
