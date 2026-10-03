import { type ComponentProps, type ComponentType, type ReactNode } from "react";
import { Callout as RadixCallout, Flex } from "@radix-ui/themes";
import { WarningCircle, Warning, CheckCircle, Info, X, type IconProps } from "@phosphor-icons/react";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";
import { IconButton } from "./IconButton";

type RadixCalloutRootProps = ComponentProps<typeof RadixCallout.Root>;

/** How hard the callout presses for attention. */
export type CalloutUrgency = "passive" | "attention";
/** Accent-aware semantic families → the [data-tone] bridge. */
export type CalloutTone = "error" | "warning" | "success" | "info";
/** Where the trailing action sits. `below` = its own row under the body (default);
 *  `inline` = end-pinned on the first line's row. Use ONLY for short messages: an inline action
 *  competes with the text for the same row, so the moment the body wraps, the action reads as
 *  belonging to the first line rather than to the whole callout. */
export type CalloutActionPlacement = "inline" | "below";

// urgency -> Radix variant. passive = soft (fill only); attention = surface (fill + hairline border).
// `outline` is not exposed and Callout has no `solid`/`radius`. Mirrors Button's priority->variant.
const URGENCY_VARIANT = {
  passive: "soft",
  attention: "surface",
} satisfies Record<CalloutUrgency, RadixCalloutRootProps["variant"]>;

// Fixed per-tone glyph (Phosphor) — enforces colour-not-alone (WCAG 1.4.1): every semantic callout is
// icon-distinct, not per-instance judgement. Identical set to Field.tsx's TONE_ICON.
const TONE_ICON: Record<CalloutTone, ComponentType<IconProps>> = {
  error: WarningCircle,
  warning: Warning,
  success: CheckCircle,
  info: Info,
};

// Live-region role — Field parity (Field.tsx:137). Only error earns a baked-in role: the assertive
// `alert` a genuine error deserves. warning/success/info intentionally carry NO role — a static
// role="status" registers a *polite live region* on content that may already be on the page at load,
// which some AT re-announce or flag as a spurious region; a static role also can't distinguish the
// dynamic-insertion case (the only one that wants a polite announcement) from static page content.
// Opt into that case explicitly with `announce` (below). An explicit `role` prop always wins.
const TONE_ROLE: Partial<Record<CalloutTone, "alert">> = {
  error: "alert",
};

// `title` is Omitted from the base too: Radix's div props carry the HTML `title` (tooltip) attribute
// typed `string`, but the system's `title` is a bold content line (ReactNode, wider than string), so
// re-declaring it would illegally widen the inherited member. The wrapper renders it as a Callout.Text,
// never forwarding an HTML title attribute.
export interface CalloutProps extends Omit<RadixCalloutRootProps, "variant" | "size" | "title" | "asChild" | "color"> {
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). A callout given one paints what the same
   *  callout paints on a page of that colour. `tone` wins over it. */
  color?: AccentColor;
  /** How hard the callout presses for attention → soft / surface. Default "passive". */
  urgency?: CalloutUrgency;
  /** Semantic status → the accent-aware [data-tone] bridge + a default icon. */
  tone?: CalloutTone;
  /** Radix Callout size (1–3), or "inherit" to opt out of the global uiSize (text lane). */
  size?: RadixCalloutRootProps["size"] | "inherit";
  /** Override the default semantic icon; `null` suppresses the icon entirely. */
  icon?: ReactNode;
  /** Optional bold title line above the body. */
  title?: ReactNode;
  /** When set, renders a top-right dismiss ✕ (inset ghost). Consumer owns persistence. */
  onDismiss?: () => void;
  /** Accessible name for the dismiss control. Default "Dismiss". */
  dismissLabel?: string;
  /** Trailing action slot — use System/Button priority="secondary" (never primary, ruling [[button-priority]]). */
  actions?: ReactNode;
  /** Where the action sits: `below` (own row, default) or `inline` (end-pinned on the first line's
   *  row). Reach for `inline` only when the message is short (single line / not much taller than the
   *  button); a message that wraps to multiple lines should keep the action `below`. */
  actionPlacement?: CalloutActionPlacement;
  /** Opt a *dynamically-inserted* callout into a polite live region (role="status" + aria-live="polite").
   *  Off by default so a callout present on page load doesn't register a live region. */
  announce?: boolean;
  /** Refused, and measured before it was refused. Radix's `Callout.Root` renders its children inside a
   *  size Context.Provider, so `asChild` hands Radix's `Slot` that PROVIDER as its one element, the Slot
   *  clones it, and the `rt-CalloutRoot` div is never rendered at all. Server-rendered at 51bfa0b in all
   *  five content shapes, `rt-CalloutRoot` survives in none of them: the body shape leaves a bare
   *  `rt-CalloutText` paragraph as the root, and the toned, titled, actioned and dismissible shapes spill
   *  the icon, the title, the action row and the dismiss control into the PARENT as loose siblings. Tone
   *  paint, the urgency border and the `role="alert"` an error callout carries all go with the div, and
   *  the consumer's element does not become the root either: it lands inside the body paragraph, which
   *  for a `<section>` or an `<aside>` is invalid markup. There is nothing to hand over even in principle
   *  ([[aschild-or-type-error]]'s criterion): this component always renders more than one child into its own root, and its
   *  `children` is already spent on the body text, so a slot target would have to be a NEW prop. Declared
   *  rather than merely omitted so the refusal is a type error a reader can see, and destructured away
   *  below so a spread from untyped JavaScript is IGNORED instead of deleting the callout. */
  asChild?: never;
}

/** NOT A NAMESPACE, DELIBERATELY — `Callout.Root`, `Callout.Text` and `Callout.Icon` do not exist here,
 * and a Radix Themes snippet that uses them will throw "Element type is invalid". That is a ruling, not
 * an oversight. Radix's Callout is assembled by the caller; ours is ONE component that assembles itself:
 * it renders Root + Icon + Text (+ actions, + dismiss) from props. Two reasons the parts stay out —
 *
 *   1. A self-alias would be WRONG, not merely redundant. `children` are rendered INSIDE a
 *      `RadixCallout.Text` — the element below, which renders as a `<p …class="… rt-CalloutText">.
 *      So `<Callout.Root><Callout.Icon/><Callout.Text/></Callout.Root>` would put an icon `<div>`
 *      and a second `<p>` inside that `<p>` — invalid markup, and not what the copied snippet
 *      renders in Radix.
 *   2. The parts would open a second way to build a callout that bypasses every rule this wrapper
 *      exists to enforce: the tone → fixed-glyph pairing (WCAG 1.4.1, colour never the only signal),
 *      the `--ds-text-measure` cap on the body, the error → `role="alert"` decision (and `announce`
 *      for the polite case), and the dismiss control's inset geometry.
 *
 * The system equivalent of the Radix compound form is the flat one:
 *   Radix   <Callout.Root color="red"><Callout.Icon>…</Callout.Icon><Callout.Text>…</Callout.Text></Callout.Root>
 *   Ours    <Callout tone="error">…</Callout>          // icon + role come with the tone
 * Override the glyph with `icon`, suppress it with `icon={null}`, add a bold lead line with `title`. */
export function Callout({
  urgency = "passive", tone, size, icon, title,
  onDismiss, dismissLabel = "Dismiss", actions, actionPlacement = "below",
  announce = false, role, className, children, color, asChild: _refusedAsChild, ...rest
}: CalloutProps) {
  const resolvedSize = useResolvedSize("text", size);
  const ToneIcon = tone ? TONE_ICON[tone] : undefined;
  // icon override (incl. null to suppress) wins; else a toned callout gets its fixed glyph; untoned = none.
  const resolvedIcon = icon !== undefined ? icon : ToneIcon ? <ToneIcon weight="fill" aria-hidden /> : null;
  // error → alert (Field parity); else announce → polite status; else no role. Explicit role always wins.
  const resolvedRole = role ?? (tone ? TONE_ROLE[tone] : undefined) ?? (announce ? "status" : undefined);
  const ariaLive = !role && announce && resolvedRole === "status" ? "polite" : undefined;
  const inlineAction = actions != null && actionPlacement === "inline";
  const rootClassName =
    [
      onDismiss ? "rt-ds-callout-has-dismiss" : null,
      inlineAction ? "rt-ds-callout-action-inline" : null,
      className,
    ].filter(Boolean).join(" ") || undefined;
  return (
    <RadixCallout.Root
      data-tone={tone}
      variant={URGENCY_VARIANT[urgency]}
      size={resolvedSize}
      role={resolvedRole}
      aria-live={ariaLive}
      className={rootClassName}
      {...accentColorProps(color)}
      {...rest}
    >
      {resolvedIcon ? <RadixCallout.Icon>{resolvedIcon}</RadixCallout.Icon> : null}
      {title != null ? <RadixCallout.Text weight="bold">{title}</RadixCallout.Text> : null}
      {children != null ? (
        <RadixCallout.Text style={{ maxWidth: "var(--ds-text-measure)" }}>{children}</RadixCallout.Text>
      ) : null}
      {actions ? (
        <Flex className="rt-ds-callout-actions" gap="3" align="center" wrap="wrap">{actions}</Flex>
      ) : null}
      {onDismiss ? (
        <IconButton
          inset
          type="button"
          aria-label={dismissLabel}
          onClick={onDismiss}
          className="rt-ds-callout-dismiss"
        >
          <X weight="bold" />
        </IconButton>
      ) : null}
    </RadixCallout.Root>
  );
}
