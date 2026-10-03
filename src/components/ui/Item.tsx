// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Item/Item.tsx @ 88c95e4 (MIT, © Meta Platforms)

import {
  forwardRef,
  useContext,
  useMemo,
  type AriaAttributes,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { IconContext, type IconWeight } from "@phosphor-icons/react";
import { useLinkComponent, type LinkComponent } from "./Link";
import { useResolvedSize } from "../../theme/SizeContext";
import { truncationStyle } from "../../utils/truncation";

/* =============================================================================
 * Item — the shared row-anatomy primitive (_internal, D13 / DECISIONS [[item-row-primitive]])
 * -----------------------------------------------------------------------------
 * A building block, NOT a public System component (mirrors Field.tsx). It unifies
 * the "marker · startContent · label(+description) · endContent" row that List /
 * ListItem and (wave-3) TreeList rows all render, so that anatomy — and the
 * no-nested-interactives interactivity guard below — is written ONCE.
 *
 * Ported from Astryx `Item` ([[catalog-as-specification]] @ 88c95e4). Normalized to our system: StyleX
 * `*Vars` → `--ds-*` tokens (in tokens/components.css), `mergeProps`/`themeProps`
 * dropped (plain className merge). The `href` body routes through the pluggable
 * `useLinkComponent()` (from ./Link): an explicit `linkComponent` prop wins, else
 * the nearest `LinkProvider`, else the native `<a>` (the zero-config default) — so
 * nav rows route via a framework Link without re-anatomizing the row, and every
 * existing consumer (List / TreeList / Token) is byte-for-byte unchanged.
 *
 * THE INTERACTIVITY DUAL-MODEL (the whole point of Item):
 *   • Interactive (onClick/href) AND the parent passed NO explicit `role`:
 *       the label/description live inside an INVISIBLE <button>/<a> wrapper
 *       (`all:unset` + our focus ring via `:has(.rt-ds-item-body:focus-visible)`),
 *       so the row is a single real, keyboard-operable control. The root ALSO
 *       carries a container-click handler that IGNORES clicks landing on the
 *       nested body (or any nested button/a/input/select/textarea) — this is the
 *       EXTENDED HIT AREA (clicking the padding / marker / slots activates it)
 *       without double-firing when the body itself is clicked.
 *   • Interactive AND the parent DID pass a `role` (e.g. `menuitem`/`treeitem`):
 *       NO invisible wrapper (the parent owns keyboard + focus for its role).
 *       `onClick` rides the ROOT via the SAME container-click handler, so a click
 *       on a nested interactive control (an action button in endContent) never
 *       double-fires the row's onClick. Enforces "no nested interactives".
 * ============================================================================= */

export type ItemAlign = "center" | "start";
export type ItemDensity = "compact" | "balanced" | "spacious";

export interface ItemProps {
  /** Ref forwarded to the root element. */
  ref?: React.Ref<HTMLElement>;
  /** Root element. @default 'div' */
  as?: "div" | "li" | "span";
  /** Marker rendered as the first flex child (list bullets/counters with custom baseline alignment). */
  marker?: ReactNode;
  /** Content before the label/description area — a leading icon, avatar, or checkbox. */
  startContent?: ReactNode;
  /** Primary text identifying the item. Required. String → single-line truncation by default. */
  label: ReactNode;
  /** Secondary text — subtitle / description / supporting info. */
  description?: ReactNode;
  /** Content after the label/description area — a badge, timestamp, or action button. */
  endContent?: ReactNode;
  /** Vertical alignment of the slots. @default 'center' */
  align?: ItemAlign;
  /** Block-padding scale (~4/8/12px → --ds-space-*). @default 'balanced' */
  density?: ItemDensity;
  /** Max lines before the label truncates (1 = ellipsis; >1 = line-clamp). */
  labelLines?: number;
  /** Max lines before the description truncates. */
  descriptionLines?: number;
  /** Click handler — makes the item interactive (button semantics unless a `role` is set). */
  onClick?: (event: MouseEvent) => void;
  /** Link URL — makes the item a link via an invisible anchor (unless a `role` is set). */
  href?: string;
  /**
   * Framework Link component to render the `href` body with — a router `Link` (Next / React Router)
   * or any component accepting `href` + anchor attrs. Overrides the ambient `LinkProvider`; when both
   * are omitted the body is a native `<a>` (the default — every existing consumer is unchanged).
   */
  linkComponent?: LinkComponent;
  /** Link target. Only used with href. */
  target?: "_blank" | "_self";
  /** Link relationship. */
  rel?: string;
  /** Hover/keyboard-focus appearance. @default false */
  isHighlighted?: boolean;
  /** Selected state: the tint, a bold label in strong ink, and a solid start-slot icon ([[selected-row-cue]]). @default false */
  isSelected?: boolean;
  /** Disabled state. @default false */
  isDisabled?: boolean;
  /** An explicit ARIA role — signals the PARENT owns keyboard/focus (menuitem, treeitem, option…). */
  role?: string;
  /**
   * Explicit `aria-selected` tri-state for a selection-supporting role (treeitem / option / row).
   * When set, emits `aria-selected="true" | "false"`; when omitted, falls back to the legacy
   * `true | undefined` derived from `role` + `isSelected`. Lets a collection distinguish a
   * SELECTABLE row (unselected → `"false"`) from a pure-navigation row (no attribute) — TreeList
   * needs this (D12 / DECISIONS [[tree-list]]); List/menus pass nothing and keep the legacy behaviour.
   */
  ariaSelected?: boolean;
  /**
   * Render the interactive inner body (the `all:unset` `<a>`/`<button>`) with THIS tabIndex even
   * under a parent `role` — for collections (TreeList) where the ROW owns the single tab stop but
   * each row still needs a real inner control for activation + link semantics. Typically `-1`.
   * When omitted, a parent-role row renders a plain content span (the menu/List contract, unchanged).
   */
  bodyTabIndex?: number;
  /**
   * tabIndex on the ROOT element — for a collection that owns a roving tab stop on the row itself
   * (TreeList: exactly one treeitem is `tabIndex=0`). Omitted for List/menus (the body owns the stop).
   */
  tabIndex?: number;
  className?: string;
  style?: CSSProperties;
  /** Escape hatch for passthrough attributes (data-*, aria-*). */
  [key: `data-${string}`]: unknown;
  [key: `aria-${string}`]: unknown;
}

/** Truncation longhands — shared with Outline and anything else that grows a line budget, so
 *  `1` cannot come to mean two different things in two components. See src/utils/truncation.ts. */
const truncStyle = truncationStyle;

/** [[selected-row-cue]]. A selected row's icon takes Phosphor's solid weight and every other row's icon the outline
 *  weight, so the icon joins the bold label as a cue that does not rest on colour, and no consumer
 *  passes a weight. Phosphor reads `weight` from `IconContext` whenever the icon sets none of its own,
 *  so an icon that states its own `weight` keeps it. The unselected branch states `regular` rather than
 *  leaving the context alone, so a solid weight provided above the row cannot leak into it. The parent
 *  context is spread first, so an app-level `size`, `color` or `mirrored` still reaches the icon.
 *  Item wraps its start slot in this; a row that draws its icon outside Item (the SideNav rail, the
 *  CommandPalette option, a flyout trigger) wraps that icon itself. */
export function SelectionIconWeight({ isSelected, children }: { isSelected: boolean; children: ReactNode }) {
  const parent = useContext(IconContext);
  const weight: IconWeight = isSelected ? "fill" : "regular";
  const value = useMemo(() => ({ ...parent, weight }), [parent, weight]);
  return <IconContext.Provider value={value}>{children}</IconContext.Provider>;
}

export const Item = forwardRef<HTMLElement, ItemProps>(function Item(props, ref) {
  const {
    as: Component = "div",
    marker,
    startContent,
    label,
    description,
    endContent,
    align = "center",
    density = "balanced",
    labelLines,
    descriptionLines,
    onClick,
    href,
    linkComponent,
    target,
    rel,
    isHighlighted = false,
    isSelected = false,
    isDisabled = false,
    role,
    ariaSelected,
    bodyTabIndex,
    tabIndex,
    className,
    style,
    // aria-current belongs on the ACTUAL link/button a user navigates to, not the row wrapper — pull it
    // out of `...rest` (which lands on the root) so we can place it on the inner body when one is rendered.
    "aria-current": ariaCurrentRaw,
    ...rest
  } = props;
  const ariaCurrent = ariaCurrentRaw as AriaAttributes["aria-current"];

  // Hook — called unconditionally (React rule), read only in the href branch below. Default `"a"` when
  // no LinkProvider is in the tree, so a role-less `href` row renders the exact same native <a> as before.
  const providerLink = useLinkComponent();
  // Text tracks the global text lane so a row's label/description scale with the toolbar; `density`
  // stays an orthogonal axis (it controls padding/spacing, not font size). List/TreeList inherit this.
  const size = useResolvedSize("text", undefined);

  const isInteractive = onClick != null || href != null;
  // A parent-supplied role means the PARENT (menu/tree/listbox) owns keyboard + focus. In that mode we
  // do NOT wrap the content in an invisible button/anchor — onClick rides the root's container handler.
  const hasParentRole = role != null;
  const isStringLabel = typeof label === "string";
  const isStringDescription = typeof description === "string";

  // target="_blank" implies rel noopener noreferrer unless the caller set rel explicitly.
  const resolvedRel = target === "_blank" ? rel ?? "noopener noreferrer" : rel;

  // The clamp is computed once, because it is now read twice: as the inline style that DOES the
  // truncation, and as the `data-truncate` flag that tells a container-driven collection this text
  // will ellipse rather than widen the row (see the TreeList block in tokens/components.css). A node
  // label with no explicit budget carries neither: the caller composed it, so it is left alone (§8b).
  const labelClamp = truncStyle(labelLines, isStringLabel);
  const descriptionClamp = truncStyle(descriptionLines, isStringDescription);

  const labelAndDescription = (
    <>
      <span className="rt-ds-item-label" data-truncate={labelClamp != null ? "" : undefined} style={labelClamp}>
        {label}
      </span>
      {description != null && (
        <span
          className="rt-ds-item-description"
          data-truncate={descriptionClamp != null ? "" : undefined}
          style={descriptionClamp}
        >
          {description}
        </span>
      )}
    </>
  );

  // The no-nested-interactives guard. A click that lands on the invisible body — or ANY nested
  // button/a/input/select/textarea — is left to that control; only clicks elsewhere in the row
  // (padding, marker, slots = the extended hit area) fire the row's onClick.
  const handleContainerClick = (e: MouseEvent) => {
    if (isDisabled) return;
    if ((e.target as HTMLElement).closest("button, a, input, select, textarea")) return;
    onClick?.(e);
  };

  // A parent-role row renders a plain content span (parent owns keyboard) — UNLESS bodyTabIndex opts
  // it into a real inner control (TreeList: the ROW is the tab stop, but href/onClick rows still need
  // a genuine <a>/<button> for Enter/Space activation + native link semantics, tabbed out at -1).
  const renderInnerBody = bodyTabIndex !== undefined;
  // A real inner control (link/button) is rendered in the href / onClick branches below — UNLESS a parent
  // role suppresses it into a plain span. aria-current rides that body when it exists; otherwise it falls
  // back to the root (the only element there is).
  const bodyRendered = !(hasParentRole && !renderInnerBody) && (href != null || onClick != null);
  let contentRegion: ReactNode;
  if (hasParentRole && !renderInnerBody) {
    // Parent owns the role → plain, non-focusable content column (parent handles keyboard).
    contentRegion = <span className="rt-ds-item-content">{labelAndDescription}</span>;
  } else if (href != null) {
    // A plain, `all:unset` link body (like Token's [[token-chip]] invisible body) — NOT Radix Link, whose skin
    // would fight the reset. The container paints; the body only holds content + link semantics. The
    // tag is the app's framework Link when provided (prop wins over the ambient LinkProvider), else the
    // native `<a>` — so nav rows route client-side while the default stays a plain anchor.
    const A = linkComponent ?? providerLink;
    contentRegion = (
      <A
        className="rt-ds-item-body"
        href={href}
        target={target}
        rel={resolvedRel}
        aria-current={ariaCurrent}
        aria-disabled={isDisabled || undefined}
        tabIndex={isDisabled ? -1 : bodyTabIndex}
        onClick={isDisabled ? (e) => e.preventDefault() : undefined}
      >
        {labelAndDescription}
      </A>
    );
  } else if (onClick != null) {
    contentRegion = (
      <button type="button" className="rt-ds-item-body" aria-current={ariaCurrent} onClick={onClick} disabled={isDisabled} tabIndex={bodyTabIndex}>
        {labelAndDescription}
      </button>
    );
  } else {
    contentRegion = <span className="rt-ds-item-content">{labelAndDescription}</span>;
  }

  const Root = Component as "div";
  return (
    <Root
      ref={ref as React.Ref<HTMLDivElement>}
      className={["rt-ds-item", className].filter(Boolean).join(" ")}
      style={style}
      data-density={density}
      data-size={size}
      data-align={align}
      data-interactive={isInteractive ? "" : undefined}
      data-highlighted={isHighlighted ? "" : undefined}
      data-selected={isSelected ? "" : undefined}
      data-disabled={isDisabled ? "" : undefined}
      // aria-selected is NOT a global ARIA attribute — it's only valid on a selection-supporting role
      // (option / treeitem / row / tab / gridcell), which the PARENT collection supplies. An explicit
      // `ariaSelected` gives the tri-state a SELECTABLE collection needs (unselected → "false"); with
      // none, emit it only when a role is present (legacy true|undefined) — a role-less selected row
      // conveys selection visually (the tint) alone. aria-disabled IS global, so it's always safe.
      aria-selected={ariaSelected !== undefined ? ariaSelected : hasParentRole && isSelected ? true : undefined}
      // aria-current rides the inner link/button when one exists (so AT hears "current page" on the actual
      // navigable control); only a body-less row (plain-span parent-role / non-interactive) falls back to it here.
      aria-current={bodyRendered ? undefined : ariaCurrent}
      aria-disabled={isDisabled || undefined}
      role={role}
      tabIndex={tabIndex}
      onClick={isInteractive ? handleContainerClick : undefined}
      {...rest}
    >
      {marker}
      {startContent != null && (
        <span className="rt-ds-item-start">
          <SelectionIconWeight isSelected={isSelected}>{startContent}</SelectionIconWeight>
        </span>
      )}
      {contentRegion}
      {endContent != null && <span className="rt-ds-item-end">{endContent}</span>}
    </Root>
  );
});
