import { type ComponentProps } from "react";
import { RadioCards as RadixRadioCards } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";

/* RadioCards — a single-select card picker. One choice out of a small set where each option earns more
 * room than a radio row: an icon, a title, a line of description, maybe a price. A thin wrapper over Radix
 * Themes' compound RadioCards whose Root rides the uiSize CONTROL lane (a card set sizes with the Buttons
 * and inputs around it), leaving the rest of Radix's own card skin intact. Single-select — the value is a
 * `string`, exactly one card wins.
 *
 * SELECTED TREATMENT — the one place this is NOT a pure pass-through. Radix gives a selected card an
 * accent-indicator outline and nothing else, which reads as white-with-a-stroke, so
 * `src/tokens/components.css` (`Card pickers · the selected state`) adds a slight `--ds-fill-accent-weak`
 * wash on `::before` beneath it. That fill is the ONE `--ds-*` role this component declares; the outline,
 * surface, hover, disabled wash and focus ring are all still Radix's. CheckboxCards paints the identical
 * pair, so the two card pickers read as one family, and both halves are accent-aware — the cue follows the
 * brand collision shift with no override. See DECISIONS [[choice-controls]].
 *
 * `variant` / `color` / `highContrast` / `columns` (responsive) / `gap` pass through; `Item`
 * (one card) is a direct passthrough. For a multi-select card set reach for CheckboxCards instead. */
type RootProps = ComponentProps<typeof RadixRadioCards.Root>;
type RadioCardsRootProps = Omit<RootProps, "color"> & {
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). A card set given one paints what the same set
   *  paints on a page of that colour, the selected tint included. */
  color?: AccentColor;
};

function RadioCardsRoot({ size, color, ...props }: RadioCardsRootProps) {
  const resolvedSize = useResolvedSize("control", size) as RootProps["size"];
  return <RadixRadioCards.Root size={resolvedSize} {...accentColorProps(color)} {...props} />;
}

export const RadioCards = {
  Root: RadioCardsRoot,
  Item: RadixRadioCards.Item,
};
