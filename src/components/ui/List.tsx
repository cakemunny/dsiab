// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/List/List.tsx @ 88c95e4 (MIT, © Meta Platforms)
// Portions derived from facebook/astryx packages/core/src/List/ListItem.tsx @ 88c95e4 (MIT, © Meta Platforms)
// Portions derived from facebook/astryx packages/core/src/List/ListContext.tsx @ 88c95e4 (MIT, © Meta Platforms)

import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useMemo,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Item } from "./Item";

/* =============================================================================
 * List / ListItem — the passive semantic list wrapper (D13 / DECISIONS [[item-row-primitive]])
 * -----------------------------------------------------------------------------
 * List = a passive <ul> (or <ol> when listStyle='decimal'); ListItem delegates the
 * row anatomy to `Item as="li"` and only builds the custom marker. Density,
 * dividers, and the marker style flow ListItem-ward through ListContext.
 *
 * Ported from Astryx List/ListItem/ListContext ([[catalog-as-specification]] @ 88c95e4). Normalized:
 * StyleX → `--ds-*` (tokens/components.css), CSS counter renamed `ds-list`,
 * `mergeProps`/`themeProps` dropped.
 * ============================================================================= */

export type ListDensity = "compact" | "balanced" | "spacious";
/** 'none' + 'disc'/'circle' → <ul>; 'decimal' → <ol>. */
export type ListStyle = "none" | "disc" | "circle" | "decimal";

interface ListContextValue {
  density: ListDensity;
  hasDividers: boolean;
  listStyle: ListStyle;
}
const ListContext = createContext<ListContextValue | null>(null);
ListContext.displayName = "ListContext";

// =============================================================================
// List
// =============================================================================

export interface ListProps {
  ref?: React.Ref<HTMLUListElement | HTMLOListElement>;
  /** The list items — ListItem components. */
  children: ReactNode;
  /** Spacing density, pushed to every ListItem. @default 'balanced' */
  density?: ListDensity;
  /** Show hairline dividers between items (removes the gap + item rounding). @default false */
  hasDividers?: boolean;
  /** Content rendered above the list, associated via aria-labelledby. */
  header?: ReactNode;
  /** Marker style. 'decimal' → an <ol> with a CSS-counter marker; else a <ul>. @default 'none' */
  listStyle?: ListStyle;
  /** Starting number for an ordered list — seeds the CSS counter. @default 1 */
  start?: number;
  className?: string;
  style?: CSSProperties;
}

export const List = forwardRef<HTMLUListElement | HTMLOListElement, ListProps>(function List(
  { children, density = "balanced", hasDividers = false, header, listStyle = "none", start, className, style },
  ref,
) {
  const headerId = useId();
  const isOrdered = listStyle === "decimal";
  const Tag = isOrdered ? "ol" : "ul";

  const contextValue = useMemo(
    () => ({ density, hasDividers, listStyle }),
    [density, hasDividers, listStyle],
  );

  // <ol start> is only emitted for a genuinely custom start (not 1) — a redundant start=1 is noise.
  const hasCustomStart = start != null && start !== 1;
  // Seed the CSS counter at start-1 so the first counter-increment lands ON `start` (see components.css).
  const seededStyle: CSSProperties | undefined = hasCustomStart
    ? { counterReset: `ds-list ${start - 1}` }
    : undefined;

  const listElement = (
    <Tag
      ref={ref as React.Ref<HTMLUListElement & HTMLOListElement>}
      className="rt-ds-list"
      style={{ ...seededStyle, ...style }}
      data-density={density}
      data-list-style={listStyle}
      data-dividers={hasDividers ? "" : undefined}
      aria-labelledby={header != null ? headerId : undefined}
      // Safari strips list semantics when list-style:none — re-assert role="list" for the unordered,
      // marker-less case (an <ol> and disc/circle markers keep their native semantics).
      role={listStyle === "none" && !isOrdered ? "list" : undefined}
      {...(hasCustomStart ? { start } : {})}
    >
      {children}
    </Tag>
  );

  if (header == null) {
    return (
      <ListContext.Provider value={contextValue}>
        {className != null ? <div className={className}>{listElement}</div> : listElement}
      </ListContext.Provider>
    );
  }

  return (
    <ListContext.Provider value={contextValue}>
      <div className={["rt-ds-list-shell", className].filter(Boolean).join(" ")}>
        <div id={headerId} className="rt-ds-list-header">
          {header}
        </div>
        {listElement}
      </div>
    </ListContext.Provider>
  );
});

// =============================================================================
// ListItem
// =============================================================================

export interface ListItemProps {
  ref?: React.Ref<HTMLLIElement>;
  /** Primary label. String → single-line truncation; ReactNode → child controls its own wrapping. */
  label: ReactNode;
  /** Secondary description below the label. */
  description?: ReactNode;
  /** Content before the item (icon, avatar, checkbox). */
  startContent?: ReactNode;
  /** Content after the item (badge, action button, chevron). */
  endContent?: ReactNode;
  /** Click handler — enables the invisible-button interactive row (hover/press/focus ring). */
  onClick?: (e: MouseEvent) => void;
  /** URL — enables the invisible-anchor interactive row. */
  href?: string;
  /** Link target. Only with href. */
  target?: "_blank" | "_self";
  /** Link relationship. */
  rel?: string;
  /** Disabled state. @default false */
  isDisabled?: boolean;
  /** Selected state. @default false */
  isSelected?: boolean;
  className?: string;
  style?: CSSProperties;
}

export const ListItem = forwardRef<HTMLLIElement, ListItemProps>(function ListItem(
  { label, description, startContent, endContent, onClick, href, target, rel, isDisabled = false, isSelected = false, className, style },
  ref,
) {
  const ctx = useContext(ListContext);
  const density = ctx?.density ?? "balanced";
  const listStyle = ctx?.listStyle ?? "none";

  // Custom marker: dot/hollow-circle spans for disc/circle; a counter ::before for decimal (the number
  // comes from CSS — components.css). Marker-less ('none') renders nothing.
  const marker =
    listStyle === "disc" ? (
      <span className="rt-ds-list-marker">
        <span className="rt-ds-list-dot" />
      </span>
    ) : listStyle === "circle" ? (
      <span className="rt-ds-list-marker">
        <span className="rt-ds-list-circle" />
      </span>
    ) : listStyle === "decimal" ? (
      <span className="rt-ds-list-number" aria-hidden />
    ) : null;

  return (
    <Item
      as="li"
      ref={ref as React.Ref<HTMLElement>}
      marker={marker}
      startContent={startContent}
      label={label}
      description={description}
      endContent={endContent}
      onClick={onClick}
      href={href}
      target={target}
      rel={rel}
      isDisabled={isDisabled}
      isSelected={isSelected}
      density={density}
      className={className}
      style={style}
    />
  );
});
