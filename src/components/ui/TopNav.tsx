// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/TopNav/TopNav.tsx @ d7c9a39b (MIT, © Meta Platforms)
// Portions derived from facebook/astryx packages/core/src/TopNav/TopNavHeading.tsx @ d7c9a39b (MIT, © Meta Platforms)
//
//   The slot bar layout (flex ↔ 1fr auto 1fr grid when centered) and the
//   Heading "interaction boundary" decision tree are lifted (plan D11) onto our substrate: the menu +
//   mega flyouts ride the @radix-ui/react-popover recipe (the MultiSelect/SideNav pattern, D1 — the
//   navigation-menu primitive was REJECTED), hover-intent comes from the lifted useMenuHover (150/200ms
//   show/hide + click-latch), roving inside a panel from useListFocus, rows compose the Item primitive
//   ([[item-row-primitive]]), and the semantics are upgraded from Astryx's role="menu" link-lists to labelled `nav` regions
//   of links with aria-current="page" (D2 — INCLUDING keyboard roving on the mega, which Astryx lacks).
//   The mega trigger gains aria-controls (upstream omits); the FeaturedCard's hard-appended "→" glyph is
//   replaced with a proper Phosphor ArrowRight. Single-open coordination is deliberately NOT added
//   (Astryx menus open independently — a named deferral); the docs' "More menu overflow" is upstream
//   vaporware and NOT built (our useOverflow is the engine if ever wanted — a named deferral).
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import * as Popover from "@radix-ui/react-popover";
import { Theme } from "@radix-ui/themes";
import { CaretDown, ArrowRight } from "@phosphor-icons/react";
import { Item, SelectionIconWeight } from "./Item";
import { Separator } from "./Separator";
import { useLinkComponent, type LinkComponent } from "./Link";
import { useResolvedSize } from "../../theme/SizeContext";
import { useListFocus } from "../../hooks/useListFocus";
import { useMenuHover } from "../../hooks/useMenuHover";
import { useIsomorphicLayoutEffect } from "../../hooks/useIsomorphicLayoutEffect";
import { observeResize, unobserveResize } from "../../utils/sharedResizeObserver";
import { useTopNavRenderMode, type NavRenderMode } from "./appShellContext";

/* =============================================================================
 * TopNav — the top application bar (plan D11).
 * -----------------------------------------------------------------------------
 * Container semantics: a labelled `nav` landmark (D2). Slot layout — the leading
 * cluster (brand + primary nav) is `children`; `center` + `end` are optional slots.
 * The bar is a flex row by default; passing a `center` slot switches it to a
 * `1fr auto 1fr` grid so the middle region is TRULY centered (the Toolbar [[toolbar-slots]]
 * precedent). TopNav reads `useTopNavRenderMode()` and branches its markup via
 * `data-mode`: "default" = the desktop bar, "mobile-bar" = a condensed bar, any
 * drawer mode = the vertical in-drawer stack.
 *
 * Menus (TopNavMenu / TopNavMegaMenu) are popover flyouts on @radix-ui/react-popover
 * (the MultiSelect recipe, D1 — the navigation-menu primitive was rejected). They
 * open on HOVER-INTENT (useMenuHover: 150ms show / 200ms hide, (hover:hover)-gated,
 * click-latch) and their panels are labelled `nav` regions of LINKS (D2 — NOT
 * role="menu"), arrow-roved via useListFocus. Menus open INDEPENDENTLY — single-open
 * coordination is a deliberate named deferral (Astryx has none). The mega panel is
 * anchored FULL-WIDTH to the bar (not the trigger) via a fixed Popover.Anchor at the
 * bar's measured rect; the FeaturedCard is presentational. Paints from --ds-* only;
 * no new tokens (D14); scoped .radix-themes; no !important; SSR-safe.
 * ============================================================================= */

/* ---- context ------------------------------------------------------------- */
interface TopNavContextValue {
  /** Live bar geometry in viewport coords — published for the full-width MegaMenu anchor. */
  barRect: { left: number; top: number; width: number; height: number } | null;
  /** The resolved render mode (desktop bar / mobile-bar / drawer). */
  mode: NavRenderMode;
}
const TopNavContext = createContext<TopNavContextValue | null>(null);
const useTopNav = (): TopNavContextValue => {
  const ctx = useContext(TopNavContext);
  if (!ctx) throw new Error("TopNav.* must be rendered inside <TopNav>");
  return ctx;
};

/* ======================================================================== */
/* TopNav (root)                                                            */
/* ======================================================================== */
export interface TopNavProps {
  /** Accessible name for the nav landmark (each nav landmark must be labelled). @default "Primary" */
  "aria-label"?: string;
  /** Leading cluster — the brand + primary nav items/menus. The slot most bars need. */
  children?: ReactNode;
  /** Optional centered region. When present the bar becomes a `1fr auto 1fr` grid so it is truly centered. */
  center?: ReactNode;
  /** Trailing region — actions (search, avatar, buttons). Pinned to the far end. */
  end?: ReactNode;
  className?: string;
  style?: CSSProperties;
  [key: `data-${string}`]: unknown;
}

const TopNavRoot = forwardRef<HTMLElement, TopNavProps>(function TopNav(
  { "aria-label": ariaLabel = "Primary", children, center, end, className, style, ...rest },
  ref,
) {
  const mode = useTopNavRenderMode();
  const navRef = useRef<HTMLElement | null>(null);
  const [barRect, setBarRect] = useState<TopNavContextValue["barRect"]>(null);

  // Publish the bar geometry for the full-width MegaMenu anchor. Reuse the SHARED ResizeObserver (one per
  // bar; fires sync on register so barRect is set before paint — no null-flash) and read position off the
  // element. SSR-safe (effect-only, no browser API at module/render time).
  useIsomorphicLayoutEffect(() => {
    const bar = navRef.current;
    if (!bar) return;
    const update = () => {
      const r = bar.getBoundingClientRect();
      setBarRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    };
    observeResize(bar, update);
    // The ResizeObserver only fires on SIZE changes. The bar can also MOVE without resizing — page/ancestor
    // scroll, a sticky offset, a layout shift above it — and the full-width MegaMenu anchor reads left/top,
    // so those go stale and mis-position the panel. Keep them fresh on scroll (capture:true also catches a
    // scrolling ANCESTOR, since scroll doesn't bubble) and on viewport resize. Passive; torn down on cleanup.
    window.addEventListener("scroll", update, { passive: true, capture: true });
    window.addEventListener("resize", update);
    return () => {
      unobserveResize(bar);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, []);

  const setNavRef = useCallback(
    (node: HTMLElement | null) => {
      navRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = node;
    },
    [ref],
  );

  const hasCenter = center != null && center !== false;
  const hasEnd = end != null && end !== false;

  return (
    <TopNavContext.Provider value={{ barRect, mode }}>
      <nav
        ref={setNavRef}
        aria-label={ariaLabel}
        className={["rt-ds-topnav", className].filter(Boolean).join(" ")}
        data-mode={mode}
        data-has-center={hasCenter ? "" : undefined}
        style={style}
        {...rest}
      >
        <div className="rt-ds-topnav-slot rt-ds-topnav-start">{children}</div>
        {/* In grid (has-center) mode all three columns are always present so the center truly centers. */}
        {hasCenter && <div className="rt-ds-topnav-slot rt-ds-topnav-center">{center}</div>}
        {(hasCenter || hasEnd) && <div className="rt-ds-topnav-slot rt-ds-topnav-end">{end}</div>}
      </nav>
    </TopNavContext.Provider>
  );
});

/* ======================================================================== */
/* TopNavHeading — the brand/title (interaction-boundary decision tree)     */
/* ======================================================================== */
export interface TopNavHeadingProps {
  /** The brand title text. */
  children: ReactNode;
  /** Leading brand mark (a logo / icon), rendered before the title. */
  logo?: ReactNode;
  /** Destination — makes the brand a routed link (the usual "home" link). */
  href?: string;
  /** Click handler — makes the brand a button (e.g. a menu opener) when there is no href. */
  onClick?: (event: MouseEvent) => void;
  /** Framework Link component for the href (overrides the ambient LinkProvider). */
  linkComponent?: LinkComponent;
  className?: string;
  [key: `data-${string}`]: unknown;
}

/** The brand/title. The "interaction boundary" decision tree is lifted as logic: an `href` → a routed
 *  link; else an `onClick` → a button; else static text (the page owns its own `<h1>` — the brand is a
 *  landmark label, not a heading). */
export function TopNavHeading({ children, logo, href, onClick, linkComponent, className, ...rest }: TopNavHeadingProps) {
  const providerLink = useLinkComponent();
  const base = ["rt-ds-topnav-heading", className].filter(Boolean).join(" ");
  const inner = (
    <>
      {logo != null && <span className="rt-ds-topnav-heading-logo">{logo}</span>}
      <span className="rt-ds-topnav-heading-label">{children}</span>
    </>
  );

  if (href != null) {
    const A = linkComponent ?? providerLink;
    return (
      <A href={href} className={`${base} rt-ds-topnav-heading-interactive`} {...rest}>
        {inner}
      </A>
    );
  }
  if (onClick != null) {
    return (
      <button type="button" onClick={onClick} className={`${base} rt-ds-topnav-heading-interactive`} {...rest}>
        {inner}
      </button>
    );
  }
  return (
    <span className={base} {...rest}>
      {inner}
    </span>
  );
}

/* ======================================================================== */
/* TopNavItem — a top-level nav link in the bar                             */
/* ======================================================================== */
export interface TopNavItemProps {
  /** Row text (required). */
  label: ReactNode;
  /** Optional leading icon (Item's startContent). */
  icon?: ReactNode;
  /** Destination — routes through Item's pluggable link (a framework Link via `linkComponent`). */
  href?: string;
  /** Click handler for a non-link action item. */
  onClick?: (event: MouseEvent) => void;
  /** Framework Link component for the href body (overrides the ambient LinkProvider). */
  linkComponent?: LinkComponent;
  /** The current destination → paints selected and emits `aria-current="page"` on the link (D2). */
  isSelected?: boolean;
  /** Disabled item. */
  isDisabled?: boolean;
  [key: `data-${string}`]: unknown;
}

/** A top-level nav link — composes the Item primitive (never a re-anatomized row). The current
 *  destination carries `aria-current="page"` (D2 — nav + links, not role="menu"). */
export function TopNavItem({
  label,
  icon,
  href,
  onClick,
  linkComponent,
  isSelected = false,
  isDisabled = false,
  ...dataRest
}: TopNavItemProps) {
  return (
    <Item
      startContent={icon}
      label={label}
      href={href}
      onClick={onClick}
      linkComponent={linkComponent}
      isSelected={isSelected}
      isDisabled={isDisabled}
      aria-current={isSelected && href != null ? "page" : undefined}
      className="rt-ds-topnav-item"
      {...dataRest}
    />
  );
}

/* ======================================================================== */
/* Shared flyout controller (hover-intent + roving + latch, for both menus) */
/* ======================================================================== */
interface FlyoutController {
  panelId: string;
  /** Unique id on the trigger button — the panel + its nested nav name themselves from it via
   *  aria-labelledby (works for JSX labels, and keeps independently-opened landmarks distinguishable). */
  triggerId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  listRef: React.RefObject<HTMLDivElement | null>;
  triggerProps: { onPointerEnter: (e: React.PointerEvent) => void; onPointerLeave: (e: React.PointerEvent) => void };
  panelProps: { onPointerEnter: (e: React.PointerEvent) => void; onPointerLeave: (e: React.PointerEvent) => void };
  onTriggerClick: () => void;
  onTriggerKeyDown: (e: React.KeyboardEvent) => void;
  onPanelKeyDown: (e: React.KeyboardEvent) => void;
  onOpenAutoFocus: (e: Event) => void;
  onEscapeKeyDown: () => void;
  onInteractOutside: (e: { target: EventTarget | null; preventDefault: () => void }) => void;
  onNavigate: (e: React.MouseEvent) => void;
  requestClose: (next: boolean) => void;
}

/** The hover-intent + click-latch + roving state machine shared by TopNavMenu and TopNavMegaMenu. The
 *  Popover is driven CONTROLLED off useMenuHover's `open`; the trigger is a Popover.Anchor (NOT a
 *  Popover.Trigger — which would auto-toggle and fight the latch), so click owns the latch and the
 *  Content exempts the trigger from outside-dismiss (the DateRangeInput anchor-exempt pattern). */
function useFlyoutController(itemSelector: string): FlyoutController {
  const panelId = useId();
  const triggerId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const focusOnOpenRef = useRef(false);
  const { open, isLatched, setLatched, triggerProps, panelProps, close } = useMenuHover();
  const { listRef, handleKeyDown } = useListFocus<HTMLDivElement>({ orientation: "vertical", itemSelector });

  const focusFirst = useCallback(() => {
    listRef.current?.querySelector<HTMLElement>(itemSelector)?.focus();
  }, [listRef, itemSelector]);

  const onTriggerClick = useCallback(() => {
    // Click toggles the latch: unlatched → pin open; latched → unlatch + close.
    if (isLatched) close();
    else setLatched(true);
  }, [isLatched, close, setLatched]);

  const onTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!open) {
          focusOnOpenRef.current = true; // the onOpenAutoFocus lands focus on the first item
          setLatched(true);
        } else {
          focusFirst();
        }
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
      }
    },
    [open, setLatched, close, focusFirst],
  );

  // Radix Popover.Content's onOpenAutoFocus fires on EVERY open (hover, click, keyboard). Prevent its
  // default focus-steal so a HOVER-open never yanks focus; only a keyboard-open (ArrowDown) lands focus
  // on the first item. This is "the Radix popover's own focus, minus the hover-steal" (no hand trap, D11).
  const onOpenAutoFocus = useCallback(
    (e: Event) => {
      e.preventDefault();
      if (focusOnOpenRef.current) {
        focusFirst();
        focusOnOpenRef.current = false;
      }
    },
    [focusFirst],
  );

  const onEscapeKeyDown = useCallback(() => {
    close();
    triggerRef.current?.focus();
  }, [close]);

  const onInteractOutside = useCallback((e: { target: EventTarget | null; preventDefault: () => void }) => {
    // The trigger is an Anchor (not a Trigger), so a click on it reads as "outside" — exempt it, else the
    // dismiss layer and the click-latch fight over the same click.
    if (triggerRef.current?.contains(e.target as Node)) e.preventDefault();
  }, []);

  const onNavigate = useCallback(
    (e: React.MouseEvent) => {
      // Activating a link in the panel closes the flyout (real navigation would unmount it anyway).
      if ((e.target as HTMLElement).closest(".rt-ds-item-body, a")) close();
    },
    [close],
  );

  const requestClose = useCallback(
    (next: boolean) => {
      if (!next) close();
    },
    [close],
  );

  return {
    panelId,
    triggerId,
    triggerRef,
    open,
    listRef,
    triggerProps,
    panelProps,
    onTriggerClick,
    onTriggerKeyDown,
    onPanelKeyDown: handleKeyDown,
    onOpenAutoFocus,
    onEscapeKeyDown,
    onInteractOutside,
    onNavigate,
    requestClose,
  };
}

/** The shared trigger button — brand caret + hover-intent handlers + manual aria (aria-expanded +
 *  aria-controls, the disclosure pattern; NO aria-haspopup="menu" — the panel is nav+links, not a menu). */
function FlyoutTrigger({
  f,
  icon,
  label,
  isDisabled,
  variant,
}: {
  f: FlyoutController;
  icon?: ReactNode;
  label: ReactNode;
  isDisabled: boolean;
  variant: "menu" | "mega";
}) {
  // The trigger rides the CONTROL size lane, exactly as the TopNavItems beside it do (Item publishes the
  // same step on the text lane, and control/text share a step at every tier). Without this the trigger was
  // pinned to one hardcoded height and the bar carried three different row heights at the large tier.
  const size = useResolvedSize("control", undefined);
  return (
    <button
      ref={f.triggerRef}
      id={f.triggerId}
      type="button"
      data-size={size}
      className={`rt-ds-topnav-trigger rt-ds-topnav-${variant}-trigger`}
      aria-expanded={f.open}
      aria-controls={f.open ? f.panelId : undefined}
      data-state={f.open ? "open" : "closed"}
      disabled={isDisabled}
      onClick={f.onTriggerClick}
      onKeyDown={f.onTriggerKeyDown}
      onPointerEnter={f.triggerProps.onPointerEnter}
      onPointerLeave={f.triggerProps.onPointerLeave}
    >
      {/* The trigger draws its icon outside Item. It is never the selected destination, so its icon
          keeps the outline weight ([[selected-row-cue]]), as an unselected Item row's does. */}
      {icon != null && (
        <span className="rt-ds-topnav-trigger-icon">
          <SelectionIconWeight isSelected={false}>{icon}</SelectionIconWeight>
        </span>
      )}
      <span className="rt-ds-topnav-trigger-label">{label}</span>
      <CaretDown aria-hidden weight="bold" className="rt-ds-topnav-caret" data-open={f.open || undefined} />
    </button>
  );
}

/* ======================================================================== */
/* TopNavMenu — a trigger + a popover flyout of nav links                   */
/* ======================================================================== */
export interface TopNavMenuProps {
  /** Trigger text (also the flyout's accessible name). */
  label: ReactNode;
  /** Optional leading icon on the trigger. */
  icon?: ReactNode;
  /** Disable the trigger. */
  isDisabled?: boolean;
  /** The flyout rows — TopNavItem link rows (or any Item link). */
  children: ReactNode;
}

/** A trigger + a popover flyout (the MultiSelect recipe) of nav links. Hover-intent opens it; the panel
 *  is a labelled `nav` region of LINKS (D2), arrow-roved via useListFocus. */
export function TopNavMenu({ label, icon, isDisabled = false, children }: TopNavMenuProps) {
  const f = useFlyoutController(".rt-ds-item-body");

  return (
    <Popover.Root open={f.open} onOpenChange={f.requestClose}>
      {/* Anchor (not Trigger) → positioning only, no auto-toggle; the click-latch owns opening. */}
      <Popover.Anchor asChild>
        <FlyoutTrigger f={f} icon={icon} label={label} isDisabled={isDisabled} variant="menu" />
      </Popover.Anchor>
      <Popover.Portal>
        {/* The primitive Popover portals outside .radix-themes: wrap Content in <Theme> on the SAME node →
            the COMPOUND selector .radix-themes.rt-ds-topnav-menu-panel (the [[select-selected-row]] trap). Content is
            role="dialog" — name it FROM THE TRIGGER (aria-labelledby) so a JSX/icon label still resolves and
            every independently-opened landmark stays uniquely named; the real nav landmark + links live inside. */}
        <Popover.Content
          asChild
          id={f.panelId}
          align="start"
          sideOffset={6}
          aria-labelledby={f.triggerId}
          onOpenAutoFocus={f.onOpenAutoFocus}
          onEscapeKeyDown={f.onEscapeKeyDown}
          onInteractOutside={f.onInteractOutside}
          onPointerEnter={f.panelProps.onPointerEnter}
          onPointerLeave={f.panelProps.onPointerLeave}
        >
          {/* Radix Popover.Content (asChild) sets data-state="open"/"closed" on THIS node itself, which the
              compound panel CSS reads for the enter/exit animation — do not set it by hand (it would fight). */}
          <Theme className="rt-ds-topnav-menu-panel">
            {/* The nested nav names itself from the trigger too (unique + JSX-safe). */}
            <nav aria-labelledby={f.triggerId} className="rt-ds-topnav-flyout-nav" onClick={f.onNavigate}>
              <div ref={f.listRef} onKeyDown={f.onPanelKeyDown} className="rt-ds-topnav-flyout-items">
                {children}
              </div>
            </nav>
          </Theme>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ======================================================================== */
/* TopNavMegaMenu — a full-width panel anchored to the bar                   */
/* ======================================================================== */
export interface TopNavMegaMenuProps {
  /** Trigger text (also the panel's accessible name). */
  label: ReactNode;
  /** Optional leading icon on the trigger. */
  icon?: ReactNode;
  /** Disable the trigger. */
  isDisabled?: boolean;
  /** Column count for the mega item grid. @default 3 */
  columns?: number;
  /** Optional presentational featured card (a TopNavMegaMenuFeaturedCard) in the trailing column. */
  featured?: ReactNode;
  /** The mega items — TopNavMegaMenuItem rows. */
  children: ReactNode;
}

/** A full-width mega panel anchored to the nav bar (not the trigger): a grid of items + an optional
 *  presentational FeaturedCard. Same popover recipe + hover-intent + roving + nav semantics; the trigger
 *  gains aria-controls (upstream omits). Full-width is a fixed Popover.Anchor at the bar's measured rect,
 *  so `--radix-popover-trigger-width` equals the bar width (CSS reads it) — JS measurement, since CSS
 *  anchor-positioning is a named deferral. */
export function TopNavMegaMenu({
  label,
  icon,
  isDisabled = false,
  columns = 3,
  featured,
  children,
}: TopNavMegaMenuProps) {
  const { barRect } = useTopNav();
  const f = useFlyoutController(".rt-ds-item-body, .rt-ds-topnav-featured-link");

  const anchorStyle: CSSProperties = {
    position: "fixed",
    left: barRect?.left ?? 0,
    top: barRect?.top ?? 0,
    width: barRect?.width ?? 0,
    height: barRect?.height ?? 0,
    pointerEvents: "none",
  };

  return (
    <Popover.Root open={f.open} onOpenChange={f.requestClose}>
      {/* Full-width anchor: a fixed, non-interactive span matching the BAR's rect. The panel then spans the
          bar width (var(--radix-popover-trigger-width)) and left-aligns to the bar — not the trigger. */}
      <Popover.Anchor asChild>
        <span aria-hidden style={anchorStyle} />
      </Popover.Anchor>
      <FlyoutTrigger f={f} icon={icon} label={label} isDisabled={isDisabled} variant="mega" />
      <Popover.Portal>
        <Popover.Content
          asChild
          id={f.panelId}
          side="bottom"
          align="start"
          sideOffset={6}
          // Exact bar width from the measured rect (full-width to the bar, not the trigger); the CSS
          // var(--radix-popover-trigger-width) is the fallback until the first measurement lands.
          style={barRect ? { width: barRect.width } : undefined}
          aria-labelledby={f.triggerId}
          onOpenAutoFocus={f.onOpenAutoFocus}
          onEscapeKeyDown={f.onEscapeKeyDown}
          onInteractOutside={f.onInteractOutside}
          onPointerEnter={f.panelProps.onPointerEnter}
          onPointerLeave={f.panelProps.onPointerLeave}
        >
          <Theme className="rt-ds-topnav-mega-panel">
            {/* The nested nav names itself from the trigger (unique + JSX-safe). */}
            <nav aria-labelledby={f.triggerId} className="rt-ds-topnav-mega" onClick={f.onNavigate}>
              {/* The roving container must span BOTH the item grid and the featured link (which was a
                  sibling of the grid, outside the old listRef, so arrow-keys never reached it). A
                  display:contents wrapper carries listRef + onKeyDown without adding a layout box — the grid
                  and featured keep their flex placement under .rt-ds-topnav-mega. */}
              <div ref={f.listRef} onKeyDown={f.onPanelKeyDown} style={{ display: "contents" }}>
                <div
                  className="rt-ds-topnav-mega-grid"
                  style={{ "--topnav-mega-cols": columns } as CSSProperties}
                >
                  {children}
                </div>
                {featured != null && <div className="rt-ds-topnav-mega-featured">{featured}</div>}
              </div>
            </nav>
          </Theme>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* ---- TopNavMegaMenuItem — a mega grid cell (a link row) ------------------- */
export interface TopNavMegaMenuItemProps {
  /** Item title (required). */
  label: ReactNode;
  /** Supporting description under the title. */
  description?: ReactNode;
  /** Leading icon. */
  icon?: ReactNode;
  /** Destination — routes through Item's pluggable link. */
  href?: string;
  /** Click handler for a non-link action. */
  onClick?: (event: MouseEvent) => void;
  /** Framework Link component for the href body. */
  linkComponent?: LinkComponent;
  /** The current destination → paints selected + emits `aria-current="page"`. */
  isSelected?: boolean;
  /** Disabled item. */
  isDisabled?: boolean;
  [key: `data-${string}`]: unknown;
}

/** A mega-menu grid cell — composes Item (icon · title · description). Routes + aria-current like every
 *  other nav row. */
export function TopNavMegaMenuItem({
  label,
  description,
  icon,
  href,
  onClick,
  linkComponent,
  isSelected = false,
  isDisabled = false,
  ...dataRest
}: TopNavMegaMenuItemProps) {
  return (
    <Item
      startContent={icon}
      label={label}
      description={description}
      href={href}
      onClick={onClick}
      linkComponent={linkComponent}
      isSelected={isSelected}
      isDisabled={isDisabled}
      align="start"
      aria-current={isSelected && href != null ? "page" : undefined}
      className="rt-ds-topnav-mega-item"
      {...dataRest}
    />
  );
}

/* ---- TopNavMegaMenuFeaturedCard — a presentational promo card ------------- */
export interface TopNavMegaMenuFeaturedCardProps {
  /** Card title. */
  title: ReactNode;
  /** Supporting description. */
  description?: ReactNode;
  /** Leading media/icon (a logo, thumbnail, or illustration). */
  media?: ReactNode;
  /** Call-to-action text beside the ArrowRight affordance. @default "Learn more" */
  cta?: ReactNode;
  /** When set, the whole card becomes a routed link; else it is presentational (static). */
  href?: string;
  /** Framework Link component for the href (overrides the ambient LinkProvider). */
  linkComponent?: LinkComponent;
  [key: `data-${string}`]: unknown;
}

/** The presentational featured card in a mega panel. The hard-appended "→" glyph Astryx used is replaced
 *  with a proper Phosphor `ArrowRight` (D11). Optionally a routed link (a promo CTA); else static. */
export function TopNavMegaMenuFeaturedCard({
  title,
  description,
  media,
  cta = "Learn more",
  href,
  linkComponent,
  ...dataRest
}: TopNavMegaMenuFeaturedCardProps) {
  const providerLink = useLinkComponent();
  // The card's type tracks the text lane like the Item rows beside it (title = the label step,
  // weight carries the hierarchy; desc/cta = the ruled secondary tier). It was pinned flat and
  // INVERTED its relationship to the rows across the tiers (larger at small, smaller at large).
  const size = useResolvedSize("text", undefined);
  const inner = (
    <>
      {media != null && <span className="rt-ds-topnav-featured-media">{media}</span>}
      <span className="rt-ds-topnav-featured-title">{title}</span>
      {description != null && <span className="rt-ds-topnav-featured-desc">{description}</span>}
      <span className="rt-ds-topnav-featured-cta">
        {cta}
        <ArrowRight aria-hidden weight="bold" className="rt-ds-topnav-featured-arrow" />
      </span>
    </>
  );

  if (href != null) {
    const A = linkComponent ?? providerLink;
    return (
      <A href={href} className="rt-ds-topnav-featured rt-ds-topnav-featured-link" data-size={size} {...dataRest}>
        {inner}
      </A>
    );
  }
  return (
    <div className="rt-ds-topnav-featured" data-size={size} {...dataRest}>
      {inner}
    </div>
  );
}

/* Dot-access (TopNav.Item / .Heading / .Menu / .MegaMenu / …) is the form the docs teach, so it must be
 * the form the TYPE carries — the exported binding IS the compound (the Table.tsx shape), not a bare
 * component the members are bolted onto afterwards. `Object.assign` mutates the forwardRef object in
 * place, so this is the same single object it always was; only its declared type changed. The bar
 * dividers reuse the System Separator verbatim (TopNav.Separator = Separator). */
export const TopNav = Object.assign(TopNavRoot, {
  Item: TopNavItem,
  Heading: TopNavHeading,
  Menu: TopNavMenu,
  MegaMenu: TopNavMegaMenu,
  MegaMenuItem: TopNavMegaMenuItem,
  MegaMenuFeaturedCard: TopNavMegaMenuFeaturedCard,
  Separator,
});

/* Kept alongside the named export — four story files import this module's default. */
export default TopNav;
