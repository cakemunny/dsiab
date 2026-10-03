import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { Tooltip as RadixTooltip } from "@radix-ui/themes";

/* Tooltip — a short, supplementary hint tied to a trigger. A THIN wrap over Radix Themes' Tooltip:
 * Radix already portals + positions the panel, keeps it on its own solid skin ([[floating-surface-fill]] — opaque, no
 * translucent variant), and is retimed by the global overlay-motion rule (`.rt-TooltipContent` on the
 * popper tier, components.css). So this wrap adds nothing but a friendlier default open delay — no
 * hand-rolled popover, no new CSS, no new tokens, no `--ds-*` roles of its own (it reuses Radix's skin).
 *
 * `content` (required) is the hint; `children` is the trigger. `side`/`align`/`delayDuration` and every
 * other Radix Tooltip prop pass through. It is the System home the shared Field soft-disable affordance
 * (`DisabledReasonTooltip`, DECISIONS [[disabled-reason]]) now composes, replacing its former raw-Radix Tooltip. */
export type TooltipProps = ComponentPropsWithoutRef<typeof RadixTooltip>;

// Open a touch sooner than Radix's 700ms primitive default — a supplementary hint should feel
// responsive on hover without being twitchy. Keyboard-focus open is immediate (unaffected by this).
const DEFAULT_DELAY_MS = 400;

export const Tooltip = forwardRef<ElementRef<typeof RadixTooltip>, TooltipProps>(
  function Tooltip({ delayDuration = DEFAULT_DELAY_MS, ...props }, ref) {
    return <RadixTooltip ref={ref} delayDuration={delayDuration} {...props} />;
  },
);
