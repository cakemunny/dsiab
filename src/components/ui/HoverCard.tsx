import { type ComponentProps } from "react";
import { HoverCard as RadixHoverCard } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";

/* HoverCard — a rich preview card tied to a link, opened on hover or keyboard focus. A THIN wrap over
 * Radix Themes' compound HoverCard, the same shape as DropdownMenu: Content rides the uiSize control
 * lane (so a HoverCard sizes with the Button and Text beside it), Root/Trigger pass through untouched.
 * It keeps Radix's own solid preview-panel skin — an opaque, elevated surface ([[floating-surface-fill]]) — and declares NO
 * --ds-* roles of its own (it reuses that skin, exactly like Tooltip). Motion is inherited for FREE:
 * Content carries the shared `.rt-PopperContent` base class, which the overlay-motion rule already
 * retimes onto the ds motion ladder (--ds-duration-moderate/--ds-ease-entry in, faster out;
 * components.css) — so this wrap adds ZERO motion CSS, no new tokens, no hand-rolled popover.
 *
 * D13 — the supplementary-preview stance (Tooltip's big sibling). A HoverCard opens ONLY on hover or
 * keyboard focus, so it is INVISIBLE on touch and easy to miss. It is a supplementary preview, NEVER
 * the sole way to reach its content: the Trigger is a real anchor (a link), and that link must itself
 * navigate to somewhere carrying the full content. Same "never must-know, never sole path" rule as a
 * Tooltip — just a richer card (an avatar, a summary) instead of a terse text hint. */
type ContentProps = ComponentProps<typeof RadixHoverCard.Content>;

function HoverCardContent({ size, ...props }: ContentProps) {
  const resolvedSize = useResolvedSize("control", size) as ContentProps["size"];
  return <RadixHoverCard.Content size={resolvedSize} {...props} />;
}

export const HoverCard = {
  Root: RadixHoverCard.Root,
  Trigger: RadixHoverCard.Trigger,
  Content: HoverCardContent,
};
