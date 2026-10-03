// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Link/useLinkComponent.ts @ d7c9a39b (MIT, © Meta Platforms)

import {
  createContext,
  forwardRef,
  useContext,
  type AnchorHTMLAttributes,
  type ComponentPropsWithoutRef,
  type ComponentType,
  type ReactNode,
} from "react";
import { Link as RadixLink } from "@radix-ui/themes";
import { accentColorProps, useAccentColorRef, type AccentColor } from "../../theme/Provider";

/* =============================================================================
 * Link — the System text link + the routing adapter (Content · lite tier)
 * -----------------------------------------------------------------------------
 * `Link` is a thin wrap over Radix Themes' `Link` ([[catalog-as-specification]] — the Radix name wins). It
 * reuses Radix's link skin, so it declares NO parallel colour of its own. Note
 * the skin paints the ALPHA step `--accent-a11`, not the solid `--accent-11`
 * that `--ds-text-link` aliases — measured, not assumed. Over the page they
 * composite to the same colour, which is why this comment claimed they were the
 * same for months; over a TINTED surface the alpha step takes the tint and the
 * solid one does not, so they are not interchangeable. The one system override
 * lives in tokens/components.css: the [[focus-ring]] focus ring replaces
 * Radix's accent-8 focus outline (which fails WCAG 1.4.11, like every other
 * Radix control the system re-rings). `underline` defaults to `always` (Radix's
 * own default is `auto` = underline on HOVER only, which leaves an inline link
 * with no rest-state distinction — accent-11 vs body text is < 3:1, so axe's
 * `link-in-text-block` fails; a persistent underline is the accessible default).
 * `size` is left unset so an inline link inherits the surrounding text size.
 *
 * `LinkProvider` / `useLinkComponent` are the pluggable-Link seam. An app wraps
 * its tree once in `<LinkProvider component={NextLink}>` and every System nav row
 * (the `Item` primitive, and the nav components built on it) that carries an
 * `href` routes through that framework Link instead of a full-page `<a>`. With no
 * provider the hook returns the native `"a"` tag, so the default is a zero-config
 * plain anchor and existing consumers are unchanged. (The adapter concept is
 * reimplemented from the Astryx `useLinkComponent` hook named in the header.)
 * ============================================================================= */

type RadixLinkProps = ComponentPropsWithoutRef<typeof RadixLink>;

export interface LinkProps extends Omit<RadixLinkProps, "color"> {
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). */
  color?: AccentColor;
}

/** System text link — Radix Themes `Link` on the `--ds-text-link` skin + the [[focus-ring]] focus ring.
 *  Defaults `underline` to `always` (accessible inline distinction; override per Radix). Radix writes
 *  data-accent-color on the anchor after the rest of its props, so oxblood reaches that same anchor
 *  through the ref ([[part-colour-parity]]). */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ underline = "always", color, ...props }, ref) {
  const own = useAccentColorRef<HTMLAnchorElement>(color, ref);
  return <RadixLink ref={own} underline={underline} color={accentColorProps(color).color} {...props} />;
});
Link.displayName = "Link";

/* ---- Routing adapter (the pluggable-Link seam) --------------------------- */

/**
 * A framework link component: anything that accepts `href` plus the standard anchor
 * attributes (Next's `Link`, React Router's `Link`, or a custom wrapper). The native
 * `"a"` tag also satisfies this shape and is the default when no provider is present.
 */
export type LinkComponent = ComponentType<{ href: string } & AnchorHTMLAttributes<HTMLAnchorElement>>;

const LinkComponentContext = createContext<LinkComponent | undefined>(undefined);

/**
 * The native `<a>`, typed as a `LinkComponent`. React renders the `"a"` string as an
 * anchor element; the string-tag escape hatch is the standard way to use an intrinsic
 * tag polymorphically (a string is not structurally a `ComponentType`, but every caller
 * only ever spreads anchor props onto it, which the tag accepts).
 */
const NATIVE_ANCHOR = "a" as unknown as LinkComponent;

/** Provide the app's framework Link to every System nav row below. Omit `component` ⇒ native `<a>`. */
export function LinkProvider({
  component,
  children,
}: {
  component?: LinkComponent;
  children: ReactNode;
}) {
  return <LinkComponentContext.Provider value={component}>{children}</LinkComponentContext.Provider>;
}

/** Read the provided framework Link (defaults to the native `"a"` tag). Usable as `const A = useLinkComponent(); <A href … />`. */
export function useLinkComponent(): LinkComponent {
  return useContext(LinkComponentContext) ?? NATIVE_ANCHOR;
}
