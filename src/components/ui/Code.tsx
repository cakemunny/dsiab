import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { Code as RadixCode } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";

/* Code — an inline code chip for a token, command, filename, or value set in flowing prose. A THIN
 * wrap over Radix Themes' Code: it rides the uiSize TEXT lane (an unset `size` follows the global
 * tier, small → 1) and passes everything else straight through. Inline code sits in running text, so
 * it tracks the text step the way `Text` and `Kbd` do — never dragging its own default — and stays in
 * rhythm with the sentence around it.
 *
 * Radix draws the chip itself, and its default `soft` skin is an accent-tinted chip: the fill paints
 * from `--accent-a3` under `--accent-a11` text, exactly what `--ds-fill-accent-weak` aliases — so the
 * chip is already accent-aware and follows the brand collision shift. It therefore declares no
 * `--ds-*` roles of its own; it reuses the Radix skin, the Separator/Kbd precedent. The drift-proof
 * docs read that chip colour LIVE off the DOM rather than hand-typing it.
 *
 * The `solid` skin is repainted in prose ([[textless-part-fills]], `src/tokens/components.css`). Radix fills it
 * `--accent-a9` under `--accent-contrast`, which misses 4.5:1 or APCA Lc 60 on 16 of 27 colours, so it
 * paints the solid Button's pair instead: `--ds-fill-accent` under `--on-accent`, with the button's
 * hover overlay on a linked chip. A chip given its own `color` paints that pair in its own colour, the
 * pair the same chip paints on a page of that colour ([[part-colour-parity]]). A `highContrast` chip keeps Radix's paint.
 *
 * `size` (1–9), `variant` (solid | soft | outline | ghost, default soft), `color` (Radix's 26 colours
 * or the oxblood preset, [[part-colour-parity]]), `weight`, `truncate`, and `wrap` all pass through to Radix. */
export type CodeProps = Omit<ComponentPropsWithoutRef<typeof RadixCode>, "color"> & {
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). */
  color?: AccentColor;
};

export const Code = forwardRef<ElementRef<typeof RadixCode>, CodeProps>(function Code(
  { size, color, ...props },
  ref,
) {
  const resolvedSize = useResolvedSize("text", size) as CodeProps["size"];
  return <RadixCode ref={ref} size={resolvedSize} {...accentColorProps(color)} {...props} />;
});
