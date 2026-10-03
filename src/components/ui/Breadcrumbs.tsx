// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Breadcrumbs/Breadcrumbs.tsx @ 88c95e4 (MIT, © Meta Platforms)
// Portions derived from facebook/astryx packages/core/src/Breadcrumbs/BreadcrumbItem.tsx @ 88c95e4 (MIT, © Meta Platforms)

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ElementType,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useResolvedSize } from "../../theme/SizeContext";

/* Breadcrumbs ([[breadcrumb-trail]] · D22) — a navigation trail: <nav aria-label="Breadcrumb"> › <ol> › <li> items with
 * a leading, decorative separator between them. Encodes the wave-3 plan's [[floating-surface-fill]] (D22, Astryx [[catalog-as-specification]] @ 88c95e4).
 *
 * AUTO-CURRENT (the lifted a11y fix, navigation-11): when NO item sets `isCurrent`, the LAST item's
 * CONTENT element (the link/button/span — NOT the <li>) gets aria-current="page" via a post-render DOM
 * scan of the <ol> children (no React child introspection). Lifting the DOM-scan useEffect — rather than
 * the plan's early "children introspection" guess — is deliberate: it lands aria-current on the actual
 * interactive element (even when the last crumb is a LINK) without cloning children, and is robust to any
 * child structure. See DECISIONS [[breadcrumb-trail]].
 *
 * NORMALIZED from Astryx ([[catalog-as-specification]]): StyleX *Vars → --ds-* (tokens/components.css); themeProps/mergeProps/
 * mergeRefs/stylex.props dropped (inline className merge + a callback ref); `useLinkComponent`/
 * `LinkComponentType` → a plain <a> styled from --ds-* (System Link is `planned` — the [[component-registry]] agent-gap
 * rule; a plain <a> takes the muted breadcrumb treatment without Radix Link's accent skin fighting it),
 * or a caller-supplied `as` component. Zero net-new tokens. */

export interface BreadcrumbsVariantMap {
  default: true;
  supporting: true;
}

/**
 * Visual variant for the trail.
 * - `default`: standard body text
 * - `supporting`: smaller, secondary text for supporting context
 */
export type BreadcrumbsVariant = keyof BreadcrumbsVariantMap;

/** @internal Context passing the variant + separator from Breadcrumbs down to each BreadcrumbItem. */
export interface BreadcrumbContextValue {
  variant: BreadcrumbsVariant;
  separator: ReactNode;
}

export const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  variant: "default",
  separator: "/",
});
BreadcrumbContext.displayName = "BreadcrumbContext";

// =============================================================================
// Breadcrumbs
// =============================================================================

export interface BreadcrumbsProps {
  /** Ref forwarded to the root <nav>. */
  ref?: React.Ref<HTMLElement>;
  /** BreadcrumbItem children to render as the trail. */
  children: ReactNode;
  /** Separator between items — decorative only (aria-hidden). @default '/' */
  separator?: ReactNode;
  /** Visual variant. @default 'default' */
  variant?: BreadcrumbsVariant;
  /** Accessible name for the nav landmark. @default 'Breadcrumb' */
  label?: string;
  /** Test id, forwarded to the root <nav>. */
  "data-testid"?: string;
}

/**
 * A navigation breadcrumb trail — `<nav>` + `<ol>` with `<li>` items and separators between them.
 *
 * @example
 * ```tsx
 * <Breadcrumbs>
 *   <BreadcrumbItem href="/">Home</BreadcrumbItem>
 *   <BreadcrumbItem href="/projects">Projects</BreadcrumbItem>
 *   <BreadcrumbItem isCurrent>My Project</BreadcrumbItem>
 * </Breadcrumbs>
 * ```
 */
export function Breadcrumbs({
  children,
  separator = "/",
  variant = "default",
  label = "Breadcrumb",
  "data-testid": testId,
  ref,
}: BreadcrumbsProps) {
  const ctxValue = useMemo<BreadcrumbContextValue>(
    () => ({ variant, separator }),
    [variant, separator],
  );
  // Trail text tracks the global text lane; `variant` (default/supporting) stays a relative emphasis offset.
  const size = useResolvedSize("text", undefined);

  return (
    <BreadcrumbContext.Provider value={ctxValue}>
      <nav ref={ref} aria-label={label} data-testid={testId} className="rt-ds-breadcrumbs-nav">
        <ol className="rt-ds-breadcrumbs" data-size={size}>{children}</ol>
      </nav>
    </BreadcrumbContext.Provider>
  );
}
Breadcrumbs.displayName = "Breadcrumbs";

// =============================================================================
// BreadcrumbItem
// =============================================================================

export interface BreadcrumbItemProps {
  /** Ref forwarded to the root <li>. */
  ref?: React.Ref<HTMLLIElement>;
  /**
   * Custom component to render instead of `<a>` for a linked item (e.g. a router Link). Must accept
   * `href`, `className`, `ref`, and `children`. Applies only to non-current linked items.
   */
  as?: ElementType;
  /** The label content of the item. */
  children: ReactNode;
  /** URL for the link. Omit for the current page or an onClick-only item. */
  href?: string;
  /** Click handler — works with or without `href`. */
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  /**
   * Marks this item as the current page — renders a `<span aria-current="page">` (no link). If unset on
   * every item, the last item is auto-detected as current. @default undefined
   */
  isCurrent?: boolean;
  /** Optional icon rendered before the label. */
  startIcon?: ReactNode;
  /** Test id, forwarded to the root <li>. */
  "data-testid"?: string;
}

/**
 * A single breadcrumb item — a link (`<a>` / `as`), a `<button>` (onClick-only), or a `<span>` (current
 * page). Each renders its own leading separator, hidden on `:first-child` via CSS.
 */
export function BreadcrumbItem({
  ref,
  as,
  children,
  href,
  onClick,
  isCurrent: isCurrentProp,
  startIcon,
  "data-testid": testId,
}: BreadcrumbItemProps) {
  const ctx = useContext(BreadcrumbContext);
  const liRef = useRef<HTMLLIElement>(null);
  // The element that holds this item's content (link/button/span). Auto-current sets aria-current on
  // THIS, not a guessed last child of the <li>, so it lands on the actual interactive element.
  const contentRef = useRef<HTMLElement>(null);

  const isCurrent = isCurrentProp === true;
  const isAutoCandidate = isCurrentProp == null;

  // Auto-detect: if no sibling already has aria-current="page" and this is the last item, set
  // aria-current on our content element. useEffect (not layout) — it only toggles an aria attribute,
  // no visual change. Runs every render so it re-checks when the trail changes (faithful to upstream).
  useEffect(() => {
    if (!isAutoCandidate) return;
    const li = liRef.current;
    const ol = li?.parentElement;
    if (!li || !ol) return;

    const items = Array.from(ol.children) as HTMLElement[];
    const isLast = items.length > 0 && items[items.length - 1] === li;
    const hasExplicit = ol.querySelector('[aria-current="page"]');

    if (isLast && !hasExplicit) {
      const target = contentRef.current ?? li;
      target.setAttribute("aria-current", "page");
      return () => target.removeAttribute("aria-current");
    }
  });

  // Merge the public ref and the internal liRef onto the <li>.
  const setLiRef = (node: HTMLLIElement | null) => {
    liRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.RefObject<HTMLLIElement | null>).current = node;
  };

  const content = (
    <>
      {startIcon && <span className="rt-ds-breadcrumb-icon">{startIcon}</span>}
      {children}
    </>
  );

  const liProps = {
    ref: setLiRef,
    className: "rt-ds-breadcrumb-item",
    "data-variant": ctx.variant,
    "data-testid": testId,
  };
  const separator = (
    <span aria-hidden="true" className="rt-ds-breadcrumb-sep">
      {ctx.separator}
    </span>
  );

  // Explicit current → a non-interactive span with aria-current="page".
  if (isCurrent) {
    return (
      <li {...liProps}>
        {separator}
        <span className="rt-ds-breadcrumb-current" aria-current="page">
          {content}
        </span>
      </li>
    );
  }

  // Linked (auto-candidate) → an <a> (or the `as` component). The effect adds aria-current when this is
  // the auto-detected last item — including on this link.
  if (href != null) {
    const LinkComp = (as ?? "a") as ElementType;
    return (
      <li {...liProps}>
        {separator}
        <LinkComp
          ref={contentRef}
          href={href}
          onClick={onClick}
          className="rt-ds-breadcrumb-link"
        >
          {content}
        </LinkComp>
      </li>
    );
  }

  // onClick-only → a reset <button> matching the link appearance.
  if (onClick != null) {
    return (
      <li {...liProps}>
        {separator}
        <button
          ref={contentRef as React.RefObject<HTMLButtonElement | null>}
          type="button"
          onClick={onClick}
          className="rt-ds-breadcrumb-link rt-ds-breadcrumb-button"
        >
          {content}
        </button>
      </li>
    );
  }

  // Neither linked nor clickable → a plain span (still an auto-current candidate for the last item).
  return (
    <li {...liProps}>
      {separator}
      <span ref={contentRef} className="rt-ds-breadcrumb-current">
        {content}
      </span>
    </li>
  );
}
BreadcrumbItem.displayName = "BreadcrumbItem";
