// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/SideNav/SideNav.tsx @ d7c9a39b (MIT, © Meta Platforms)
// Portions derived from facebook/astryx packages/core/src/SideNav/SideNavItem.tsx @ d7c9a39b (MIT, © Meta Platforms)
// Portions derived from facebook/astryx packages/core/src/SideNav/SideNavCollapseButton.tsx @ d7c9a39b (MIT, © Meta Platforms)
//
//   The three item regimes (expanded row / collapsed-rail icon+tooltip /
//   collapsed-with-children flyout), the nested animated group, and the manual-collapse model are
//   lifted (plan D10) onto our substrate: rows compose the Item primitive ([[item-row-primitive]]), the flyout rides the
//   @radix-ui/react-popover recipe (the MultiSelect/Typeahead pattern, D1), the nested group animates
//   through the [[collapsible-and-accordion]] collapsible keyframes, and the semantics are upgraded from Astryx's role="menu"
//   link-lists to a labelled `nav` of links with aria-current="page" (D2). SideNavCollapseButton gains
//   aria-expanded (upstream has none); the dead `collapsible.buttonLabel` sub-prop is dropped.
import {
  Children,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import * as Popover from "@radix-ui/react-popover";
import { Theme } from "@radix-ui/themes";
import { CaretRight, CaretDoubleLeft } from "@phosphor-icons/react";
import { Item, SelectionIconWeight } from "./Item";
import { IconButton } from "./IconButton";
import { useLinkComponent, type LinkComponent } from "./Link";
import { Tooltip } from "./Tooltip";
import { ResizeHandle } from "./ResizeHandle";
import { useResizable } from "../../hooks/useResizable";
import { useListFocus, nextFocusIndex } from "../../hooks/useListFocus";
import { useIsomorphicLayoutEffect } from "../../hooks/useIsomorphicLayoutEffect";
import { observeResize, unobserveResize } from "../../utils/sharedResizeObserver";
import { useSideNavRenderMode, type NavRenderMode } from "./appShellContext";
import { useResolvedSize } from "../../theme/SizeContext";

/* =============================================================================
 * SideNav — a collapsible primary-navigation rail (plan D10).
 * -----------------------------------------------------------------------------
 * Container semantics: a labelled `nav` landmark whose rows are links (D2 — NOT
 * role="menu"; the current destination carries aria-current="page"). Collapse is
 * USER/STATE-driven (an icon rail), never breakpoint-driven — a narrow viewport
 * instead swaps the whole rail into the mobile drawer (a different axis; both are
 * documented). SideNav reads `useSideNavRenderMode()` and branches: "default" = the
 * desktop rail (collapsible + optionally resizable); any drawer mode = the in-drawer
 * layout (always expanded, no collapse/resize).
 *
 * Three item regimes (SideNavItem picks one from collapsed-state × has-children):
 *   1. expanded leaf        — an Item link row (icon + label + optional endContent),
 *                             aria-current="page" when active.
 *   2. expanded parent      — a disclosure <button aria-expanded aria-controls> that
 *                             toggles a nested role="group" subtree; the subtree is
 *                             INERT while collapsed (kept mounted → non-focusable) and
 *                             animates through the [[collapsible-and-accordion]] collapsible keyframes (the height
 *                             var is self-measured via sharedResizeObserver).
 *   3. collapsed-rail leaf  — an icon-only Item link + a System Tooltip for the label.
 *   4. collapsed-rail parent— an icon-only trigger opening a popover FLYOUT (the
 *                             MultiSelect recipe) that re-provides the expanded context.
 *
 * Keyboard: ArrowUp/Down/Home/End rove focus among the visible rows (the active row is
 * the sole tab stop — an imperative roving tabindex, skipping the inert collapsed
 * subtrees) via useListFocus's pure `nextFocusIndex`; a parent discloses on Enter/Space
 * (a native <button>). The flyout has its own 1D roving (useListFocus). Semantics stay
 * nav+links (no role=tree), so the roving is component-owned, not a tree hook.
 *
 * A note on the split-action chevron (a deliberate simplification of D10, stated in
 * History): a parent is a SINGLE disclosure control (aria-expanded lives on the row
 * button — the correct a11y for expand/collapse), not a split navigate+toggle row.
 * Leaves navigate; parents disclose. Composing Item — whose interactivity lives on an
 * inner body that cannot carry aria-expanded — yields one honest disclosure button.
 * ============================================================================= */

/** The focusable row controls the roving walks over: leaf link bodies, parent disclosure buttons, and
 *  collapsed-rail flyout triggers. */
const SIDENAV_FOCUSABLE =
  ".rt-ds-item-body, .rt-ds-sidenav-disclosure, .rt-ds-sidenav-railtrigger, .rt-ds-sidenav-raillink";

/* ---- context ------------------------------------------------------------- */
interface SideNavContextValue {
  /** Effective collapse (always false in a drawer render mode). */
  collapsed: boolean;
  /** The resolved render mode (default vs a drawer variant). */
  mode: NavRenderMode;
  /** id of the nav landmark — SideNavCollapseButton points aria-controls at it. */
  navId: string;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
}
const SideNavContext = createContext<SideNavContextValue | null>(null);
const useSideNavContext = (): SideNavContextValue => {
  const ctx = useContext(SideNavContext);
  if (!ctx) throw new Error("SideNav.* must be rendered inside <SideNav>");
  return ctx;
};

/* ---- chevron indicator (aria-hidden; state conveyed by aria-expanded) ----- */
const DisclosureChevron = ({ open }: { open: boolean }) => (
  <CaretRight aria-hidden weight="bold" data-ds-chevron data-open={open || undefined} className="rt-ds-sidenav-chevron" />
);

/* ======================================================================== */
/* SideNavItem                                                              */
/* ======================================================================== */
export interface SideNavItemProps {
  /** Primary text identifying the destination/section. Required. */
  label: ReactNode;
  /** Leading icon (Item's startContent). Shown alone in the collapsed rail. */
  icon?: ReactNode;
  /** Destination href — routes through Item's pluggable link (a framework Link via `linkComponent`). */
  href?: string;
  /** Click handler for a non-link leaf action. */
  onClick?: (event: MouseEvent) => void;
  /** Framework Link component for the href body (overrides the ambient LinkProvider). */
  linkComponent?: LinkComponent;
  /** Active destination → paints selected + emits aria-current="page" (on a link). */
  isSelected?: boolean;
  /** Disabled row. */
  isDisabled?: boolean;
  /** Trailing content on an expanded leaf — a Badge/count. Hidden in the collapsed rail. */
  endContent?: ReactNode;
  /** Controlled expansion (parent rows). */
  expanded?: boolean;
  /** Uncontrolled initial expansion (parent rows). @default false */
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Nested SideNavItems → this row becomes a disclosure parent. */
  children?: ReactNode;
  [key: `data-${string}`]: unknown;
}

export function SideNavItem({
  label,
  icon,
  href,
  onClick,
  linkComponent,
  isSelected = false,
  isDisabled = false,
  endContent,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  children,
  ...dataRest
}: SideNavItemProps) {
  const { collapsed, mode } = useSideNavContext();
  const hasChildren = Children.count(children) > 0;

  // Disclosure expansion is resolved HERE (not inside SideNavDisclosure) so it SURVIVES the regime switch
  // between the collapsed-rail flyout and the expanded inline disclosure: SideNavItem stays mounted across a
  // collapse toggle, but SideNavDisclosure unmounts/remounts — state held there would reset to
  // defaultExpanded on every collapse↔expand. SideNavDisclosure is therefore a fully-controlled child.
  const isExpandedControlled = expanded !== undefined;
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(defaultExpanded);
  const resolvedExpanded = isExpandedControlled ? expanded : uncontrolledExpanded;
  const handleExpandedChange = useCallback(
    (next: boolean) => {
      if (!isExpandedControlled) setUncontrolledExpanded(next);
      onExpandedChange?.(next);
    },
    [isExpandedControlled, onExpandedChange],
  );

  // ---- collapsed rail, WITH children → popover flyout (regime 4) ----------
  if (hasChildren && collapsed) {
    return (
      <SideNavRailFlyout label={label} icon={icon} isDisabled={isDisabled} mode={mode} {...dataRest}>
        {children}
      </SideNavRailFlyout>
    );
  }

  // ---- expanded, WITH children → inline disclosure + animated group (regime 2) ----
  if (hasChildren && !collapsed) {
    return (
      <SideNavDisclosure
        label={label}
        icon={icon}
        isDisabled={isDisabled}
        expanded={resolvedExpanded}
        onExpandedChange={handleExpandedChange}
        {...dataRest}
      >
        {children}
      </SideNavDisclosure>
    );
  }

  // ---- collapsed rail leaf (regime 3) → a real IconButton -------------------
  // In the rail the row IS the control, so render the System IconButton rather than an expanded row
  // squeezed down to its icon slot. A rail Item kept its row layout (flex + gap + a residual zero-width
  // content span after the icon), so it measured 39x30 with the glyph pushed ~4.5px off centre;
  // IconButton is square by construction and centres its own glyph. The step comes off the TEXT lane —
  // the lane the expanded rows read (Item resolves it, and so does SideNavCollapseButton) — because a
  // rail button is a NAV ROW in icon form, not a control-lane button ([[nav-row-ladder]]); components.css then derives
  // its box from that step the way an Item row derives its own. The System Tooltip still supplies the
  // label on hover/focus.
  if (collapsed) {
    return (
      <Tooltip content={label} side="right">
        <SideNavRailLeaf
          label={label}
          icon={icon}
          href={href}
          onClick={onClick}
          linkComponent={linkComponent}
          isSelected={isSelected}
          isDisabled={isDisabled}
          {...dataRest}
        />
      </Tooltip>
    );
  }

  // ---- expanded leaf (regime 1) -------------------------------------------
  return (
    <Item
      startContent={icon}
      label={label}
      href={href}
      onClick={onClick}
      linkComponent={linkComponent}
      isSelected={isSelected}
      isDisabled={isDisabled}
      endContent={endContent}
      aria-current={isSelected && href != null ? "page" : undefined}
      className="rt-ds-sidenav-row rt-ds-sidenav-leaf"
      {...dataRest}
    />
  );
}

/* ---- collapsed rail leaf (regime 3) -------------------------------------- */
interface RailLeafProps {
  label: ReactNode;
  icon?: ReactNode;
  href?: string;
  onClick?: (event: MouseEvent) => void;
  linkComponent?: LinkComponent;
  isSelected: boolean;
  isDisabled: boolean;
  [key: `data-${string}`]: unknown;
}
/** The icon-only rail destination: a System IconButton that IS the link/button (no wrapper element), so
 *  `aria-current="page"` lands on the control a user actually navigates to. `forwardRef` because the
 *  Tooltip above registers its trigger by ref — a plain function component would drop it and the hint
 *  would never open. */
const SideNavRailLeaf = forwardRef<HTMLElement, RailLeafProps>(function SideNavRailLeaf(
  { label, icon, href, onClick, linkComponent, isSelected, isDisabled, ...dataRest },
  ref,
) {
  const providerLink = useLinkComponent();
  // The nav's own lane, stated rather than inherited from IconButton's control-lane default ([[nav-row-ladder]]). The
  // two lanes resolve the same step at every tier today, so this changes no number — it makes the rail
  // read its size from the lane it belongs to, which is what the CSS derivation is keyed off.
  const size = useResolvedSize<"1" | "2" | "3">("text", undefined);
  const name = typeof label === "string" ? label : undefined;
  // aria-label wins whenever the label is a string; the visually-hidden span carries the accessible
  // name for a ReactNode label (same belt-and-braces the rail flyout trigger uses). The rail button is
  // the row in icon form, so its icon takes the row's selection weight ([[selected-row-cue]]), as Item's start slot does.
  const content = (
    <>
      <SelectionIconWeight isSelected={isSelected}>{icon}</SelectionIconWeight>
      <span className="rt-ds-sidenav-visually-hidden">{label}</span>
    </>
  );
  // ghost priority = a transparent rest state, matching the expanded rows; components.css repaints its
  // hover/press/selected onto the same neutral row vocabulary the Item rows use.
  const shared = {
    priority: "tertiary" as const,
    size,
    className: "rt-ds-sidenav-row rt-ds-sidenav-leaf rt-ds-sidenav-raillink",
    "data-selected": isSelected ? "" : undefined,
    ...dataRest,
  };

  if (href != null) {
    // `asChild` so the rendered element is the anchor itself — IconButton's box and skin, real link
    // semantics, and aria-current on the <a>. The tag is the framework Link when one is supplied
    // (prop wins over the ambient LinkProvider), exactly as the expanded Item row resolves it.
    const A = linkComponent ?? providerLink;
    // The ref rides IconButton: with `asChild` Radix's Slot forwards it onto the anchor, and
    // LinkComponent (like Item's own href branch) takes no ref prop of its own.
    return (
      <IconButton asChild ref={ref as React.Ref<HTMLButtonElement>} {...shared}>
        <A
          href={href}
          aria-label={name}
          aria-current={isSelected ? "page" : undefined}
          aria-disabled={isDisabled || undefined}
          tabIndex={isDisabled ? -1 : undefined}
          onClick={isDisabled ? (e: MouseEvent) => e.preventDefault() : undefined}
        >
          {content}
        </A>
      </IconButton>
    );
  }
  return (
    <IconButton
      ref={ref as React.Ref<HTMLButtonElement>}
      aria-label={name}
      disabled={isDisabled}
      onClick={onClick}
      {...shared}
    >
      {content}
    </IconButton>
  );
});

/* ---- expanded disclosure parent (regime 2) ------------------------------- */
interface DisclosureProps {
  label: ReactNode;
  icon?: ReactNode;
  isDisabled: boolean;
  /** Controlled by SideNavItem (which owns the state so it survives regime switches — see #23). */
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  children: ReactNode;
  [key: `data-${string}`]: unknown;
}
function SideNavDisclosure({ label, icon, isDisabled, expanded, onExpandedChange, children, ...dataRest }: DisclosureProps) {
  const isExpanded = expanded;
  // Suppress the height animation on the first paint (a group that renders closed must not animate open
  // on view — the docs-story no-flash rule). Enabled after the first user toggle.
  const [animate, setAnimate] = useState(false);

  const groupId = useId();
  const groupRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // Feed the EXISTING [[collapsible-and-accordion]] keyframes (ds-collapsible-open/close read --radix-collapsible-content-height):
  // measure the group's natural height off its inner wrapper and publish it as that var. The subtree
  // stays MOUNTED (inert while collapsed), so measurement works in either state (the inner overflows the
  // height:0 group). sharedResizeObserver = the reused singleton (fires once sync on register).
  useIsomorphicLayoutEffect(() => {
    const inner = innerRef.current;
    const group = groupRef.current;
    if (!inner || !group) return;
    const update = () => group.style.setProperty("--radix-collapsible-content-height", `${inner.getBoundingClientRect().height}px`);
    observeResize(inner, update);
    return () => unobserveResize(inner);
  }, []);

  const toggle = useCallback(() => {
    setAnimate(true);
    onExpandedChange(!isExpanded);
  }, [isExpanded, onExpandedChange]);

  return (
    <div className="rt-ds-sidenav-item" {...dataRest}>
      <button
        type="button"
        className="rt-ds-sidenav-disclosure rt-ds-sidenav-row"
        aria-expanded={isExpanded}
        aria-controls={groupId}
        disabled={isDisabled}
        onClick={toggle}
      >
        {/* Item renders the row's visual anatomy presentationally (as a span) — the button owns the
            semantics + aria-expanded (Item's own inner body can't carry it). No nested interactive. */}
        <Item as="span" startContent={icon} label={label} endContent={<DisclosureChevron open={isExpanded} />} />
      </button>
      <div
        ref={groupRef}
        id={groupId}
        role="group"
        aria-label={typeof label === "string" ? label : undefined}
        className="rt-ds-sidenav-group"
        data-state={isExpanded ? "open" : "closed"}
        data-animate={animate || undefined}
        inert={!isExpanded || undefined}
      >
        <div ref={innerRef} className="rt-ds-sidenav-group-inner">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ---- collapsed rail parent → flyout (regime 4) --------------------------- */
interface RailFlyoutProps {
  label: ReactNode;
  icon?: ReactNode;
  isDisabled: boolean;
  mode: NavRenderMode;
  children: ReactNode;
  [key: `data-${string}`]: unknown;
}
function SideNavRailFlyout({ label, icon, isDisabled, mode, children, ...dataRest }: RailFlyoutProps) {
  const [open, setOpen] = useState(false);
  const flyoutId = useId();
  // 1D roving over the expanded child rows inside the portaled flyout — leaf link bodies AND any nested
  // disclosure buttons (the flyout re-provides the EXPANDED context, so a nested parent renders as a
  // disclosure that must also receive initial focus + participate in the arrow-key roving).
  const itemSelector = ".rt-ds-item-body, .rt-ds-sidenav-disclosure";
  const { listRef, handleKeyDown } = useListFocus<HTMLDivElement>({ orientation: "vertical", itemSelector });
  // Same lane as the rail's leaves ([[nav-row-ladder]]) — a flyout trigger stands in the same column of nav rows.
  const size = useResolvedSize<"1" | "2" | "3">("text", undefined);
  const name = typeof label === "string" ? label : undefined;

  const focusFirst = () => {
    listRef.current?.querySelector<HTMLElement>(itemSelector)?.focus();
  };

  return (
    <div className="rt-ds-sidenav-item" {...dataRest}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          {/* The SAME square IconButton the rail's leaves render, so a collapsed rail is one column of
              identically-sized targets whether a row navigates or opens a flyout. IconButton forwards
              its ref, which Popover.Trigger asChild needs to anchor the flyout. */}
          <IconButton
            type="button"
            priority="tertiary"
            size={size}
            className="rt-ds-sidenav-railtrigger rt-ds-sidenav-row"
            aria-label={name}
            disabled={isDisabled}
          >
            {/* A parent row is never the selected destination, so its icon keeps the outline weight ([[selected-row-cue]]). */}
            <span className="rt-ds-sidenav-railicon">
              <SelectionIconWeight isSelected={false}>{icon}</SelectionIconWeight>
            </span>
            {/* Preserve an accessible name even when `label` is a ReactNode (then `name` is undefined and
                aria-label alone would leave the icon-only trigger unnamed). aria-label wins for a string
                label, so this is a no-op there and the visually-hidden text carries the JSX-label case. */}
            <span className="rt-ds-sidenav-visually-hidden">{label}</span>
          </IconButton>
        </Popover.Trigger>
        <Popover.Portal>
          {/* The primitive Popover portals outside the .radix-themes root: wrap the Content in <Theme>
              (same node → COMPOUND selector .radix-themes.rt-ds-sidenav-flyout-panel) so the token scales
              resolve. Content is role="dialog" (name it); the real nav landmark lives inside. */}
          <Popover.Content
            asChild
            side="right"
            align="start"
            sideOffset={8}
            aria-label={name ?? "Navigation group"}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              focusFirst();
            }}
          >
            <Theme className="rt-ds-sidenav-flyout-panel">
              <div className="rt-ds-sidenav-flyout">
                {label != null && <div className="rt-ds-sidenav-flyout-title">{label}</div>}
                {/* Always name the nested nav — a non-string label (an icon/JSX) leaves `name` undefined,
                    so fall back to the same string the dialog wrapper uses. */}
                <nav aria-label={name ?? "Navigation group"} className="rt-ds-sidenav-flyout-nav">
                  <div ref={listRef} onKeyDown={handleKeyDown} className="rt-ds-sidenav-flyout-items">
                    {/* Re-provide the EXPANDED context so the children render as full rows, not icons. */}
                    <SideNavContext.Provider value={{ collapsed: false, mode, navId: flyoutId, toggleCollapsed: () => {}, setCollapsed: () => {} }}>
                      {children}
                    </SideNavContext.Provider>
                  </div>
                </nav>
              </div>
            </Theme>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

/* ======================================================================== */
/* SideNavSection / SideNavHeading                                          */
/* ======================================================================== */
export interface SideNavSectionProps {
  children: ReactNode;
  className?: string;
  /**
   * Draw a rule above this section, separating it from the one before.
   *
   * Sections group by whitespace alone by default — 8px between them — which reads as one list with
   * uneven spacing rather than as distinct groups once the rows are dense. The report on the
   * assistant recreation was exactly that: the TODAY and PREVIOUS 7 DAYS sections were not really
   * differentiated, and needed more visual separation to be perceived as a different grouping
   * ([[side-nav-section-divider]]).
   *
   * Opt-in rather than default, because a two-section rail with a heading on each is legible on
   * whitespace and a rule there is noise. Reach for this when the sections are adjacent lists of the
   * same shape, which is when whitespace stops carrying the boundary. No effect on the FIRST section
   * in a rail — there is nothing above it to separate from.
   * @default false
   */
  divided?: boolean;
  [key: `data-${string}`]: unknown;
}
export function SideNavSection({ children, className, divided = false, ...rest }: SideNavSectionProps) {
  const base = divided ? "rt-ds-sidenav-section rt-ds-sidenav-section--divided" : "rt-ds-sidenav-section";
  return (
    <div className={className ? `${base} ${className}` : base} {...rest}>
      {children}
    </div>
  );
}

export interface SideNavHeadingProps {
  children: ReactNode;
}
/** A section label. Shown inline when expanded; collapsed → a divider rule with the text kept for AT. */
export function SideNavHeading({ children }: SideNavHeadingProps) {
  const { collapsed } = useSideNavContext();
  if (collapsed) {
    return (
      <div className="rt-ds-sidenav-heading-rule" role="presentation">
        <span className="rt-ds-sidenav-visually-hidden">{children}</span>
      </div>
    );
  }
  return <div className="rt-ds-sidenav-heading">{children}</div>;
}

/* ======================================================================== */
/* SideNavCollapseButton                                                    */
/* ======================================================================== */
export interface SideNavCollapseButtonProps {
  /** Accessible name override (defaults track the state: "Collapse/Expand navigation"). */
  label?: string;
  className?: string;
  [key: `data-${string}`]: unknown;
}
/** The imperative collapse toggle. Carries aria-expanded={!collapsed} (upstream has none — an a11y
 *  upgrade) + aria-controls at the nav. Renders nothing in a drawer mode (no collapse rail there). */
export function SideNavCollapseButton({ label, className, ...rest }: SideNavCollapseButtonProps) {
  const { collapsed, toggleCollapsed, mode, navId } = useSideNavContext();
  // The rail's rows read the TEXT lane (that is the lane `Item` resolves), and this button is a member
  // of the rail rather than a control standing on its own — so it reads the SAME lane and the CSS
  // derives its box from the row's line box. A plain <button> is not a `.rt-BaseButton`, so it cannot
  // read the vendor's `--base-button-height`; stamping the step is how a non-button element joins a
  // ladder here (the same stamping Calendar, FileInput and Pagination use).
  const size = useResolvedSize<string>("text", undefined);
  if (mode !== "default") return null;
  return (
    <button
      type="button"
      data-size={size}
      className={className ? `rt-ds-sidenav-collapse-btn ${className}` : "rt-ds-sidenav-collapse-btn"}
      aria-expanded={!collapsed}
      aria-controls={navId}
      aria-label={label ?? (collapsed ? "Expand navigation" : "Collapse navigation")}
      onClick={toggleCollapsed}
      {...rest}
    >
      <CaretDoubleLeft aria-hidden weight="bold" data-collapsed={collapsed || undefined} className="rt-ds-sidenav-collapse-icon" />
    </button>
  );
}

/* ======================================================================== */
/* SideNav (root)                                                           */
/* ======================================================================== */
export interface SideNavProps {
  /** Controlled collapse (icon rail). */
  collapsed?: boolean;
  /** Uncontrolled initial collapse. @default false */
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Enable drag-to-resize on the rail (reads the D5 useResizable engine). @default false */
  resizable?: boolean;
  /** Initial expanded width in px (resizable mode). @default 240 */
  defaultWidth?: number;
  /** Smallest resizable width in px. @default 180 */
  minWidth?: number;
  /** Largest resizable width in px. @default 420 */
  maxWidth?: number;
  /** Accessible name for the nav landmark (required for a labelled nav). @default "Main" */
  "aria-label"?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  [key: `data-${string}`]: unknown;
}

const SideNavRoot = forwardRef<HTMLDivElement, SideNavProps>(function SideNav(
  {
    collapsed: collapsedProp,
    defaultCollapsed = false,
    onCollapsedChange,
    resizable = false,
    defaultWidth = 240,
    minWidth = 180,
    maxWidth = 420,
    // Default "Main" — distinct from TopNav's "Primary" default, so an AppShell composing both does not
    // emit two identically-labelled <nav> landmarks (unnamed-duplicate-landmark a11y failure).
    "aria-label": ariaLabel = "Main",
    children,
    className,
    style,
    ...rest
  },
  ref,
) {
  const mode = useSideNavRenderMode();
  const inDrawer = mode !== "default";

  const isControlled = collapsedProp !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultCollapsed);
  const userCollapsed = isControlled ? collapsedProp : uncontrolled;
  // A drawer render is ALWAYS expanded — collapse is a desktop-rail affordance, a different axis.
  const collapsed = inDrawer ? false : userCollapsed;

  const setCollapsed = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolled(next);
      onCollapsedChange?.(next);
    },
    [isControlled, onCollapsedChange],
  );
  const toggleCollapsed = useCallback(() => setCollapsed(!userCollapsed), [setCollapsed, userCollapsed]);

  const navId = useId();

  // ---- roving focus over the visible rows (component-owned; nav+links semantics, no role=tree) ------
  // The focusable row controls: leaf link bodies, parent disclosure buttons, rail flyout triggers.
  const navRef = useRef<HTMLElement>(null);
  const allRows = useCallback(
    (): HTMLElement[] => Array.from(navRef.current?.querySelectorAll<HTMLElement>(SIDENAV_FOCUSABLE) ?? []),
    [],
  );
  const enabledRows = useCallback(
    (): HTMLElement[] =>
      allRows().filter(
        (el) =>
          el.closest("[inert]") == null && // skip the inert (collapsed) subtrees
          el.getAttribute("aria-disabled") !== "true" &&
          (el as HTMLButtonElement).disabled !== true,
      ),
    [allRows],
  );
  // Make `target` the sole tab stop (0); the rest -1. Owns tabindex imperatively (React sets none on
  // these, so the two never fight), repaired on every render (rows mount/unmount as groups toggle).
  const setTabStop = useCallback(
    (target: HTMLElement | null) => {
      for (const el of allRows()) {
        const t = el === target ? "0" : "-1";
        if (el.getAttribute("tabindex") !== t) el.setAttribute("tabindex", t);
      }
    },
    [allRows],
  );
  useIsomorphicLayoutEffect(() => {
    const enabled = enabledRows();
    if (enabled.length === 0) return;
    const existing = enabled.find((el) => el.getAttribute("tabindex") === "0");
    // Seed the tab stop on the current destination. aria-current="page" sits on the leaf link body itself
    // (the row's <a>) — `closest` matches the element or an ancestor, so this resolves for the row's own
    // body and for a body nested under a marked row. Else fall back to the first enabled row.
    const current = enabled.find((el) => el.closest('[aria-current="page"]') != null);
    setTabStop(existing ?? current ?? enabled[0]);
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // React bubbles events through the REACT tree, so a keydown inside a portaled flyout (a React
      // descendant of this nav) would reach here too — ignore anything not in THIS nav's DOM subtree,
      // so the flyout's own roving isn't overridden.
      if (!navRef.current?.contains(e.target as Node)) return;
      const items = enabledRows();
      if (items.length === 0) return;
      const active = document.activeElement as HTMLElement | null;
      const current = active ? items.indexOf(active) : -1;
      const next = nextFocusIndex(current, items.length, e.key, { orientation: "vertical", wrap: false });
      if (next == null) return; // not a navigation key — Enter/Space fall through to the native <button>
      e.preventDefault();
      const target = items[next];
      if (target) {
        setTabStop(target);
        target.focus();
      }
    },
    [enabledRows, setTabStop],
  );
  // Keep the tab stop pointing at whatever ended up focused (Tab-in / click).
  const handleFocusCapture = useCallback(
    (e: React.FocusEvent) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>(SIDENAV_FOCUSABLE);
      if (row && navRef.current?.contains(row)) setTabStop(row);
    },
    [setTabStop],
  );

  // Resize engine — always instantiated (hooks are unconditional); its output is applied only when the
  // rail is resizable, expanded, and not in a drawer.
  const resize = useResizable({
    defaultSize: defaultWidth,
    minSizePx: minWidth,
    maxSizePx: maxWidth,
    orientation: "vertical",
    side: "start",
    "aria-label": `Resize ${ariaLabel} navigation`,
  });
  const showResize = resizable && !collapsed && !inDrawer;
  const width = showResize ? resize.size : undefined;

  // Memoized like its AppShell/Layout/FormLayout peers — during a resize drag the root re-renders per
  // pointermove frame, and a fresh ctx object would re-render every row for an unchanged value.
  const ctx = useMemo<SideNavContextValue>(
    () => ({ collapsed, mode, navId, toggleCollapsed, setCollapsed }),
    [collapsed, mode, navId, toggleCollapsed, setCollapsed],
  );

  return (
    <SideNavContext.Provider value={ctx}>
      <div
        ref={ref}
        className={className ? `rt-ds-sidenav ${className}` : "rt-ds-sidenav"}
        data-collapsed={collapsed || undefined}
        data-mode={mode}
        data-resizable={showResize || undefined}
        style={width != null ? { ...style, width } : style}
        {...rest}
      >
        <nav
          id={navId}
          aria-label={ariaLabel}
          ref={navRef}
          onKeyDown={handleKeyDown}
          onFocusCapture={handleFocusCapture}
          className="rt-ds-sidenav-nav"
        >
          {children}
        </nav>
        {showResize && (
          <ResizeHandle separatorProps={resize.separatorProps} onDragStart={resize.onDragStart} className="rt-ds-sidenav-resize" />
        )}
      </div>
    </SideNavContext.Provider>
  );
});

/* Dot-access (SideNav.Item / .Section / .Heading / .CollapseButton) is the form the docs teach, so it must
 * be the form the TYPE carries — the exported binding IS the compound (the Table.tsx shape). `Object.assign`
 * mutates the forwardRef object in place, so this is the same single object it always was. */
export const SideNav = Object.assign(SideNavRoot, {
  Item: SideNavItem,
  Section: SideNavSection,
  Heading: SideNavHeading,
  CollapseButton: SideNavCollapseButton,
});

/* Kept alongside the named export — four story files import this module's default. */
export default SideNav;
