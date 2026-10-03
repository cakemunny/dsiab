import { forwardRef, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { Flex, Slottable } from "@radix-ui/themes";
import { Heading } from "./Heading";
import { Text } from "./Text";
import { ButtonGroup } from "./ButtonGroup";
import { useResolvedSize } from "../../theme/SizeContext";
import { checkAsChild } from "../../foundations/asChildContract";

/* =============================================================================
 * EmptyState — the calm zero / first-run placeholder for a container (D11)
 * -----------------------------------------------------------------------------
 * A NET-NEW System composition — Radix Themes ships no empty-state primitive, so
 * this stacks existing System roles rather than inventing new skin: a muted icon,
 * a Heading title, a weak-toned Text description, and a ButtonGroup action row.
 *
 * It orients a user standing in front of an empty list / board / result set and
 * offers ONE clear next step. Conventions it bakes in:
 *   • icon — a REGULAR-weight glyph (the consumer's own icon element supplies the
 *     weight), painted the muted neutral-icon role `--ds-icon-neutral` and sized
 *     modestly (`--ds-icon-h3`). Decorative, so it is `aria-hidden`.
 *   • title — a System `Heading` on the strong text role (the focal line).
 *   • description — a System `Text` on the weak/muted role, capped at the reading
 *     measure so one or two lines never run wide.
 *   • actions — routed through `ButtonGroup`, so the primary (solid) anchors per
 *     the global `buttonOrder` and the DOM/tab order follows the visual order.
 *     At most ONE solid primary ([[button-priority]]). Centred under the copy. Optional.
 *   • layout — vertically stacked, centre-aligned, and max-width capped so the
 *     block reads as a calm column, never spanning the whole container.
 *   • element — a `div` by default. `asChild` hands the root over: the consumer's element receives
 *     the whole composition as its children (via `Slottable`), which is how this block becomes a
 *     `section`, an `li`, or the `td` of an empty table without owning the file. It carries no
 *     `children` otherwise — the content is the four props above, and one route to content is the
 *     point — so the prop is typed as the slot target and nothing else.
 *
 * Copy is blameless by contract — "No projects yet", never "You haven't created
 * any projects." The wrapper can't enforce tone, but every specimen models it.
 * ============================================================================= */

type FlexProps = ComponentProps<typeof Flex>;

interface EmptyStateBaseProps extends Omit<FlexProps, "title" | "children" | "maxWidth" | "asChild"> {
  /** A regular-weight glyph, painted the muted neutral-icon role. Decorative (aria-hidden). Optional. */
  icon?: ReactNode;
  /** The focal line — concise, blameless ("No projects yet"). Rendered as a System Heading. Required. */
  title: ReactNode;
  /**
   * The heading element the title renders as (document structure, not size — the size is the heading
   * lane's). An empty state usually stands in for a section's content, so h3 is the default; give it
   * the level the surrounding page actually needs, or its heading skips a rung of that page's tree.
   * Mirrors `ClickableCard`'s prop of the same name.
   * @default "h3"
   */
  headingAs?: "h2" | "h3" | "h4" | "h5" | "h6";
  /**
   * The block's scale — icon and title together, because they are one visual unit and sizing only
   * the heading leaves a large glyph over small copy.
   *
   * `"3"` is the default and is what the component has always rendered: the title on the ambient
   * heading lane, the glyph at `--ds-icon-h3`. Step down when the empty state stands inside a
   * SMALL container rather than a page. The case that prompted this: an empty column on a kanban
   * board, 264px wide, where the lane-sized title outranked the column's own `h2` and inverted the
   * hierarchy the heading levels declared.
   *
   * This is size, not structure. `headingAs` still decides the heading LEVEL, and the two are
   * deliberately independent — an `h3` that looks smaller than the `h2` above it is correct, and an
   * `h3` that looks bigger is the defect this prop exists to fix.
   * @default "3"
   */
  size?: "1" | "2" | "3";
  /** One or two muted lines that orient the user. Rendered as a System Text, capped at the reading measure. */
  description?: ReactNode;
  /** The action row — Button children, wrapped in a ButtonGroup (primary anchors per buttonOrder; one solid primary, [[button-priority]]). Optional. */
  actions?: ReactNode;
  /**
   * Max-width cap on the whole block so short copy never spans a wide container. A relative measure
   * (there is no narrower measure token than the 65ch reading measure); override per instance.
   * @default "min(100%, 40ch)"
   */
  maxWidth?: string | number;
}

/** `asChild` and `children` move together: the child IS the element the block renders as, so it is
 *  required with `asChild` and rejected without it. Typing them as one union keeps a stray child
 *  from quietly becoming a fifth region of a composition whose content is its props. */
export type EmptyStateProps = EmptyStateBaseProps &
  (
    | {
        /** Render as the child element instead of a `div`, merging the block's classes and style onto it. */
        asChild: true;
        /** The element the block renders as. Receives the icon, title, description and actions as its children. */
        children: ReactElement;
      }
    | { asChild?: false; children?: never }
  );

/** The block's scale, as one row per step so icon and title never drift apart.
 *  `heading: undefined` on step 3 means "take the ambient heading lane", which is what the
 *  component rendered before this prop existed — so the default is byte-identical. */
const EMPTY_STATE_ICON = {
  "1": "var(--ds-icon-h5)",
  "2": "var(--ds-icon-h4)",
  "3": "var(--ds-icon-h3)",
} as const satisfies Record<"1" | "2" | "3", string>;

/* Steps 1 and 2 used to pin LITERAL heading steps ("2" and "3"), which made them tier-inert and
 * produced an inversion: at the large tier the title rendered 14px under a 16px description, so the
 * component contradicted its own hierarchy. They now ride the chromeHeading lane, which is the
 * text lane + 1 and therefore steps with the tier ([[chrome-heading-lane]]). Step 3 still takes the PAGE heading lane,
 * because that step is the full-page empty state and that is the right ladder for it. */

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  {
    icon,
    title,
    headingAs = "h3",
    size = "3",
    description,
    actions,
    direction = "column",
    align = "center",
    gap = "3",
    py = "6",
    px = "4",
    maxWidth = "min(100%, 40ch)",
    style,
    asChild,
    children,
    ...rest
  },
  ref,
) {
  // Step 3 is a PAGE empty state and keeps the page heading lane. Steps 1 and 2 are a heading
  // inside chrome, so they ride chromeHeading and step with the tier ([[chrome-heading-lane]]).
  // ONE LANE PER STEP, so the three sizes stay distinct AND all ride the tier. The first pass at
  // [[chrome-heading-lane]] put steps 1 and 2 both on chromeHeading, which made them identical (14/14/20 at small) —
  // a ladder with two equal rungs is not a ladder, and the regression suite caught it.
  const textStep = useResolvedSize<string>("text", undefined);
  const chromeStep = useResolvedSize<string>("chromeHeading", undefined);
  const pageStep = useResolvedSize<string>("heading", undefined);
  const headingSize = (size === "1" ? textStep : size === "2" ? chromeStep : pageStep) as ComponentProps<
    typeof Heading
  >["size"];
  const iconSize = EMPTY_STATE_ICON[size];
  // Dev-only. The union type already refuses a missing or non-element child at compile time, so
  // this is for the caller who reached the component from untyped JavaScript or through a cast. It
  // names the block rather than leaving Radix's Slot to throw anonymously from inside node_modules.
  if (asChild) checkAsChild("EmptyState", children, { element: "div" });
  return (
    <Flex
      ref={ref}
      asChild={asChild}
      direction={direction}
      align={align}
      gap={gap}
      py={py}
      px={px}
      // Self-centring so the capped column sits centred even in a plain block container; textAlign
      // centres the wrapped title/description lines. An explicit style wins.
      style={{ maxWidth, marginInline: "auto", textAlign: "center", ...style }}
      {...rest}
    >
      {/* The slot target, when there is one. `Slottable` tells Slot WHICH child is the consumer's
          element; everything beside it becomes that element's children, so the composition below
          lands inside the `section` / `li` / `td` rather than fighting it for the root. */}
      {asChild ? <Slottable>{children}</Slottable> : null}
      {icon != null && (
        <span
          aria-hidden
          style={{ display: "flex", color: "var(--ds-icon-neutral)", fontSize: iconSize }}
        >
          {icon}
        </span>
      )}
      <Heading as={headingAs} size={headingSize} style={{ color: "var(--ds-text-strong)" }}>
        {title}
      </Heading>
      {description != null && (
        <Text as="p" style={{ color: "var(--ds-text-weak)", maxWidth: "var(--ds-text-measure)", lineHeight: 1.6 }}>
          {description}
        </Text>
      )}
      {actions != null && (
        <ButtonGroup justify="center" mt="1">
          {actions}
        </ButtonGroup>
      )}
    </Flex>
  );
});
