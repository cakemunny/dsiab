import { type ComponentProps } from "react";
import { CheckboxCards as RadixCheckboxCards } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";

/* CheckboxCards — a MULTI-select card picker: a grid of selectable cards where several can be picked at
 * once (value is a `string[]`), each card holding an icon + a title + a line of description. A thin wrapper
 * over Radix Themes' compound CheckboxCards: Root rides the uiSize control lane
 * (`useResolvedSize("control", size)`); everything else (including `variant`, which defaults to `surface`)
 * passes through unchanged — the same pass-through stance as its single-select sibling RadioCards.
 *
 * SELECTED TREATMENT — the one place this is NOT a pure pass-through. Radix gives a checked CheckboxCards
 * card no card-level treatment at all (only the inner checkbox fills), so `src/tokens/components.css`
 * (`Card pickers · the selected state`) paints the card itself: a slight `--ds-fill-accent-weak` wash on
 * `::before` under a 2px `--accent-indicator` outline on `::after`, the identical pair RadioCards carries ([[textless-part-fills]]),
 * so the two pickers read as one family. That fill is the ONE `--ds-*` role the card pickers declare;
 * everything else (surface, border, hover, disabled wash, focus ring, the checkbox's own accent fill)
 * is still Radix's own skin. Both roles are accent-aware, so the selected cue tracks the brand collision
 * shift with no override. See DECISIONS [[choice-controls]]. Each whole card is the click
 * target, so the ≥24px pointer-target size (WCAG 2.5.8) is satisfied by geometry. Reach for it over a plain
 * CheckboxGroup when each option earns more than a label. */
type RootProps = ComponentProps<typeof RadixCheckboxCards.Root>;
type CheckboxCardsRootProps = Omit<RootProps, "color"> & {
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). A card set given one paints what the same set
   *  paints on a page of that colour, the selected tint included. */
  color?: AccentColor;
};

function CheckboxCardsRoot({ size, color, ...props }: CheckboxCardsRootProps) {
  const resolvedSize = useResolvedSize("control", size) as RootProps["size"];
  return <RadixCheckboxCards.Root size={resolvedSize} {...accentColorProps(color)} {...props} />;
}

export const CheckboxCards = {
  Root: CheckboxCardsRoot,
  Item: RadixCheckboxCards.Item,
};
