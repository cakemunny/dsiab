import { forwardRef, type ComponentPropsWithoutRef } from "react";

// Citation (D17) — a PURE inline leaf: a source reference that renders an `<a>` when the source is linked,
// else a plain `<span>`. Two variants: `label` (a bordered pill with an optional favicon + an
// ellipsis-truncated title) and `number` (a superscript accent-muted circle badge). No floating primitive
// (a hover source-preview card is a NAMED DEFERRAL awaiting a design). Paint is from --ds-* semantic
// tokens in tokens/components.css. See DECISIONS [[inline-citation]].
//
// A11Y POLARITY (preserved from upstream, which gets it right): `role="doc-noteref"` is a REFERENCE role
// valid only on the interactive LINK form — on a plain unlinked <span> it trips axe `aria-allowed-role`, so
// it's omitted there. The `aria-label` names the citation in BOTH forms regardless.

export interface CitationSource {
  /** The source's display title. Falls back to the number when absent. */
  title?: string;
  /** The source URL. Present → the citation is a link (`<a>`); absent → a plain `<span>`. */
  url?: string;
  /** A favicon URL for the `label` variant (decorative — `alt=""` `aria-hidden`). */
  icon?: string;
}

export interface CitationProps
  extends Omit<ComponentPropsWithoutRef<"a">, "href" | "color" | "children"> {
  /** Ref forwarded to the root element (`<a>` when linked, else `<span>`). */
  ref?: React.Ref<HTMLElement>;
  /** The cited source. */
  source: CitationSource;
  /** The citation ordinal (required — the visible number and part of the accessible name). */
  number: number;
  /**
   * `label` → a bordered pill (favicon + truncated title). `number` → a superscript circle badge.
   * @default 'label'
   */
  variant?: "label" | "number";
}

/**
 * An inline citation reference.
 *
 * @example
 * ```tsx
 * <Citation number={1} source={{ title: "Radix Themes", url: "https://radix-ui.com" }} />
 * <Citation number={2} variant="number" source={{ title: "RFC 3339", url: "https://ietf.org/rfc3339" }} />
 * <Citation number={3} source={{ title: "Internal memo" }} />   // unlinked → a <span>, no doc-noteref
 * ```
 */
export const Citation = forwardRef<HTMLElement, CitationProps>(function Citation(
  { source, number, variant = "label", className, ...rest },
  ref,
) {
  const displayTitle = source.title ?? String(number);
  const href = source.url;
  // Runtime tag is <a> (linked) or <span>; typed as "a" so the shared prop bag (href/target/rel, role,
  // data-*) checks against anchor attributes. Both extend HTMLElement, so the public ref stays HTMLElement.
  const Tag = (href ? "a" : "span") as "a";

  // doc-noteref is valid ONLY on the linked form (see the a11y note above).
  const noteRole = href ? "doc-noteref" : undefined;
  const linkProps = href
    ? { href, target: "_blank" as const, rel: "noopener noreferrer" as const }
    : {};

  const common = {
    ref: ref as React.Ref<HTMLAnchorElement>,
    role: noteRole,
    "aria-label": `Citation ${number}: ${displayTitle}`,
    // Native hover tooltip — surfaces the full title even when the pill ellipsis-truncates it. Only set
    // when there's a real title (a bare number needs no "1" tooltip). aria-label is the AT name regardless.
    title: source.title || undefined,
    className: ["rt-ds-citation", `rt-ds-citation--${variant}`, className].filter(Boolean).join(" "),
    "data-variant": variant,
    "data-linked": href ? "" : undefined,
    ...linkProps,
    ...rest,
  };

  if (variant === "number") {
    return <Tag {...common}>{number}</Tag>;
  }

  return (
    <Tag {...common}>
      {source.icon && (
        <span className="rt-ds-citation__favicon" aria-hidden="true">
          <img src={source.icon} alt="" aria-hidden="true" className="rt-ds-citation__img" />
        </span>
      )}
      <span className="rt-ds-citation__label">{displayTitle}</span>
    </Tag>
  );
});
