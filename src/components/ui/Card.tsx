import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { Card as RadixCard } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";

/* Card — a surface that groups the content of ONE entity (a project, an invoice, a person) and sets it
 * apart from the page around it. A thin wrap over Radix Themes' Card that rides the uiSize CONTAINER lane
 * (small → 2 — a surface reads a notch roomier than a control, the same lane the Dialog panel uses).
 *
 * THE VARIANT MODEL ([[card-variants]]). Radix's own `surface | classic | ghost` is a GENERIC cross-component skin
 * vocabulary — the same three words appear on Badge, Callout, Select, Switch, Table — not card semantics,
 * and it fails the only test a variant has to pass: at the default theme `surface` and `classic` differ
 * only by border alpha (gray-a5 ≈12% vs gray-a3 ≈6%) plus a ~5% drop, so they read as the same box; and
 * `ghost` is `--card-border-width: 0` with negative margins cancelling its own padding — an optical
 * alignment device, a de-carded card. So this wrap does NOT expose them. It exposes the industry-standard
 * trio instead, where each variant moves a DIFFERENT property, which is what makes them tellable apart:
 *
 *   outlined (default) — a 1px edge on the translucent panel fill. The everyday card.
 *   elevated           — that same edge and fill, lifted off the page with the system's Raised shadow
 *                        (`--ds-shadow-2`, the [[elevation-model]] elevation ladder — reuse, not a new shadow).
 *   filled             — a tonal block on `--ds-fill-weak` with the edge REMOVED. The fill is what
 *                        separates it from the page, so an edge on top would say the same thing
 *                        twice; dropping it is also what makes the trio tellable apart at a glance.
 *                        The role is an ALPHA step on purpose: it darkens a light page and lightens
 *                        a dark one, so one token holds the separation in both appearances. An
 *                        opaque surface step could not — `--ds-bg-subtle` (gray-2) lands on exactly
 *                        the colour the translucent panel composites to in dark, which made filled
 *                        and outlined the same interior differing only by the 1px edge: the "same
 *                        box twice" failure this variant model exists to prevent.
 *
 * outlined and elevated share one boundary treatment and differ by lift; filled differs by SURFACE.
 *
 * Elevation is a MEANING, not decoration: lift a card only when it genuinely floats above the page (a
 * dragged card, a card over a busy canvas). A wall of elevated cards is noise — see the docs page.
 *
 * For a card whose whole job is navigation, reach for `ClickableCard` (the stretched-link build on this
 * one). For card-shaped PICKERS, reach for `RadioCards` / `CheckboxCards` — a Card is not a form control. */
export type CardVariant = "outlined" | "elevated" | "filled";

type RadixCardProps = ComponentPropsWithoutRef<typeof RadixCard>;

export interface CardProps extends Omit<RadixCardProps, "variant"> {
  /** The card skin: `outlined` (a 1px edge on the panel fill) · `elevated` (that same edge, plus the
   *  [[elevation-model]] Raised shadow) · `filled` (a tonal fill one step off the page with the edge removed — the
   *  fill does the separating, so it needs no border). */
  variant?: CardVariant;
}

export const Card = forwardRef<ElementRef<typeof RadixCard>, CardProps>(function Card(
  { size, variant = "outlined", ...props },
  ref,
) {
  const resolvedSize = useResolvedSize("container", size) as RadixCardProps["size"];
  // Every variant starts from Radix's `surface` skin; our scoped CSS in tokens/components.css reads
  // `data-ds-card` to add the Raised shadow (elevated) or swap the fill AND drop the edge (filled).
  // Keeping ONE Radix variant underneath means the BOX — radius, padding, size lane — is identical
  // across the trio; what changes is the boundary treatment (edge / edge+lift / fill-no-edge).
  return (
    <RadixCard ref={ref} variant="surface" size={resolvedSize} data-ds-card={variant} {...props} />
  );
});
