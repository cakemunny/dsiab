import { type ComponentProps, type ReactNode } from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import * as Accordion from "@radix-ui/react-accordion";
import { CaretDown } from "@phosphor-icons/react";

/* Collapsible — a single disclosure: an always-visible `trigger` header + `children` content that
 * expands/collapses. Built on @radix-ui/react-collapsible.
 *
 * D4 — DEFAULT CLOSED (Radix/platform convention; Astryx defaults OPEN — the divergence is noted in
 *   History). Controlled (`open`/`onOpenChange`) or uncontrolled (`defaultOpen`). Adds `disabled`
 *   (Astryx lacks it). The aria wiring is inherited free from the primitive — the Trigger carries
 *   `aria-expanded` + `aria-controls` pointing at the Content id (Astryx OMITS these; closing that gap
 *   is a stated win, asserted in the _internal behavior play).
 *
 * D5 — HEIGHT ANIMATION (an intentional upgrade; Astryx uses a display:none toggle, no motion). The
 *   Content node exposes `--radix-collapsible-content-height`; components.css animates height 0 ↔ that
 *   value keyed on the content's [data-state], with a chevron rotation on the trigger. Expand rides the
 *   moderate tier + entry ease; collapse rides the fast tier + exit ease. Reduced-motion comes free —
 *   motion.css clamps the --ds-duration-* tokens to ~0.
 *
 * A chevron indicator (CaretDown) is appended to the trigger automatically and rotates 180° on open;
 * it carries [data-ds-chevron] so the CSS can rotate it, and aria-hidden (the state is already conveyed
 * by aria-expanded). The trigger is a raw primitive <button> (not a Radix Themes Button), so its reset,
 * hover, disabled, and the [[focus-ring]] focus ring all live in components.css.
 */

const Chevron = () => <CaretDown data-ds-chevron aria-hidden weight="bold" />;

export interface CollapsibleProps
  extends Pick<
    ComponentProps<typeof CollapsiblePrimitive.Root>,
    "open" | "defaultOpen" | "onOpenChange" | "disabled"
  > {
  /** The always-visible header content. A rotating chevron indicator is appended automatically. */
  trigger: ReactNode;
  /** The collapsible body, revealed on open. Hidden by default (D4 — default closed). */
  children?: ReactNode;
  /** Refused. The disclosure is a trigger plus a content region, two children of the Radix root, and
   *  `children` is already spoken for as the body, so there is no element to hand the root to.
   *  Declared rather than merely left out of the `Pick` above so the refusal is a type error a reader
   *  can see, and destructured away below so a spread from untyped JavaScript is IGNORED instead of
   *  reaching `Primitive.div` and throwing. */
  asChild?: never;
}

export function Collapsible({ trigger, children, asChild: _refusedAsChild, ...rest }: CollapsibleProps) {
  return (
    <CollapsiblePrimitive.Root className="rt-ds-collapsible" {...rest}>
      <CollapsiblePrimitive.Trigger className="rt-ds-collapsible-trigger">
        {trigger}
        <Chevron />
      </CollapsiblePrimitive.Trigger>
      <CollapsiblePrimitive.Content className="rt-ds-collapsible-content">
        <div className="rt-ds-collapsible-content-inner">{children}</div>
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}

/* CollapsibleGroup — an accordion of Collapsibles, on @radix-ui/react-accordion.
 *
 * D6 — `collapsible` is FORCED true for `type="single"` so a single-mode item is always closable to
 *   none (Radix defaults it false, which would silently regress Astryx's always-closable single mode).
 *   `type` single|multiple + `value`/`defaultValue`/`onValueChange` map 1:1 to Astryx; `defaultValue`
 *   is uncontrolled. `dividers` ("between" | "all" | "none") is OUR CSS (borders between / around items).
 *   Accordion's arrow-key roving nav between triggers is a free a11y upgrade. We do NOT port Astryx's
 *   `useCollapsible` dispatch-order bug (onOpenChange-before-internal-state) — Radix's lifecycle is
 *   correct as-is. Each item reuses the same height animation as Collapsible (accordion exposes
 *   `--radix-accordion-content-height`).
 */

type DividerMode = "between" | "all" | "none";
type AccordionRootProps = ComponentProps<typeof Accordion.Root>;

export type CollapsibleGroupRootProps = AccordionRootProps & {
  /** Border rules drawn by our CSS: "between" (rule between items), "all" (also the outer edges), "none". */
  dividers?: DividerMode;
};

function CollapsibleGroupRoot({ dividers = "none", ...rest }: CollapsibleGroupRootProps) {
  // D6: force collapsible=true for single mode (always closable to none). `collapsible` is only valid on
  // the single variant; multiple-mode items are independently collapsible already. Cast because
  // destructuring `dividers` off the discriminated union widens `rest`.
  const rootProps = (
    rest.type === "single" ? { ...rest, collapsible: true } : rest
  ) as AccordionRootProps;
  return <Accordion.Root className="rt-ds-accordion" data-dividers={dividers} {...rootProps} />;
}

export interface CollapsibleGroupItemProps {
  /** Unique key identifying this item in the group's open-state value. */
  value: string;
  /** The always-visible header for this item. A rotating chevron indicator is appended automatically. */
  trigger: ReactNode;
  /** Disable just this item (kept out of roving focus, not openable). */
  disabled?: boolean;
  /** The collapsible body for this item. */
  children?: ReactNode;
}

function CollapsibleGroupItem({ value, trigger, disabled, children }: CollapsibleGroupItemProps) {
  return (
    <Accordion.Item value={value} disabled={disabled} className="rt-ds-accordion-item">
      <Accordion.Header className="rt-ds-accordion-header">
        <Accordion.Trigger className="rt-ds-collapsible-trigger">
          {trigger}
          <Chevron />
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="rt-ds-accordion-content">
        <div className="rt-ds-accordion-content-inner">{children}</div>
      </Accordion.Content>
    </Accordion.Item>
  );
}

export const CollapsibleGroup = {
  Root: CollapsibleGroupRoot,
  Item: CollapsibleGroupItem,
};
