import { forwardRef, type AnchorHTMLAttributes, type ComponentProps, type ReactNode } from "react";
import { Heading } from "./Heading";
import { Card, type CardProps } from "./Card";
import { useLinkComponent } from "./Link";
import { useResolvedSize } from "../../theme/SizeContext";

/* ClickableCard — a Card whose WHOLE job is navigation: a heading + a teaser that link somewhere. The
 * stretched-link pattern (D6): the card is `position: relative`, and an overlay link wrapping the heading
 * text carries an `::after` that covers the whole box (tokens/components.css) — so a pointer click
 * ANYWHERE on the card follows the link, while there is a SINGLE tab stop (the link) and one accessible
 * name (the heading text — name from content, no `aria-labelledby` indirection). The link routes through
 * `useLinkComponent()` ([[link-and-link-provider]]), so an app's framework Link is used when a `LinkProvider` is present, and a
 * plain `<a>` otherwise.
 *
 * Hover washes the card with the neutral `--ds-fill-hover`; keyboard focus draws the [[focus-ring]] focus ring
 * on the CARD box (the link's own ring is suppressed — the visible ring belongs to the card). Nested
 * interactives (a bookmark toggle, a menu) must sit ABOVE the overlay — give them `position: relative`
 * and a `z-index` (see `interactiveLayer` below) so they stay independently clickable and never trigger
 * the card's navigation.
 *
 * NAMED CONSTRAINT: the overlay eats text selection, so ClickableCard is ONLY for cards whose whole job
 * is navigation (a heading + a short teaser). Never put selectable / copyable content in one — reach for a
 * plain Card with an explicit link inside instead. */

const OVERLAY_CLASS = "rt-ds-clickable-card";
const LINK_CLASS = "rt-ds-clickable-card-link";

/** Spread onto a nested interactive inside a ClickableCard so it sits above the stretched-link overlay
 *  and stays independently clickable (D6). */
export const interactiveLayer = { position: "relative", zIndex: 1 } as const;

export interface ClickableCardProps extends Omit<CardProps, "asChild" | "title"> {
  /** Where the card navigates. Routed through `useLinkComponent()` (a framework Link when provided). */
  href: string;
  /** The card's heading — wrapped by the overlay link, so it is the whole card's accessible name. */
  title: ReactNode;
  /** The teaser / body below the heading. Keep it short and non-selectable (the overlay eats selection). */
  children?: ReactNode;
  /** Heading element + size (document structure). Defaults to an `h3` at size 3. */
  headingAs?: "h2" | "h3" | "h4" | "h5" | "h6";
  headingSize?: ComponentProps<typeof Heading>["size"];
  /** Extra attrs for the overlay link (`target`, `rel`, `onClick`, …); `href` is set from the prop above. */
  linkProps?: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;
  /** Refused. The stretched-link pattern (D6) needs the Card's own box to be the positioned container
   *  that the overlay `::after` covers, and the heading plus the teaser are two children, so there is
   *  no single element to hand over. Already absent from `CardProps` through the `Omit` above, and
   *  declared here as well so the refusal reads as a decision. Destructured away below so a spread
   *  from untyped JavaScript is IGNORED rather than reaching `Card`'s own `asChild` and throwing
   *  inside Radix's `Slot`. */
  asChild?: never;
}

export const ClickableCard = forwardRef<HTMLDivElement, ClickableCardProps>(function ClickableCard(
  { href, title, children, className, headingAs = "h3", headingSize, linkProps, asChild: _refusedAsChild, ...cardProps },
  ref,
) {
  const LinkComponent = useLinkComponent();
  const resolvedHeadingSize = useResolvedSize<ComponentProps<typeof Heading>["size"]>(
    "chromeHeading",
    headingSize,
  );
  return (
    <Card ref={ref} className={className ? `${OVERLAY_CLASS} ${className}` : OVERLAY_CLASS} {...cardProps}>
      {/* No literal default: a card title rides the chromeHeading lane (text + 1), so it steps
          with the tier instead of sitting at 16px forever. Pinned "3" before [[chrome-heading-lane]]. */}
      <Heading as={headingAs} size={resolvedHeadingSize} style={{ color: "var(--ds-text-strong)" }}>
        <LinkComponent href={href} className={LINK_CLASS} {...linkProps}>
          {title}
        </LinkComponent>
      </Heading>
      {children}
    </Card>
  );
});
