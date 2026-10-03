// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/AppShell/AppShell.tsx @ d7c9a39b (MIT, © Meta Platforms)
//
// The page-shell composition + the responsive mode-swap (the sidenav/topnav
// RE-RENDER into the drawer via render-mode contexts, rather than CSS-collapsing), LIFTED under the
// port doctrine (DECISIONS [[catalog-as-specification]], D7). The named D7 fixes are carried, NOT the upstream warts:
//   1. Mode-swap runs on the committed SSR-safe media-query engine (useSyncExternalStore over
//      matchMedia); `defaultIsMobile` seeds the server snapshot so a mobile client does not
//      layout-flash desktop→drawer after hydration.
//   2. The keep-mounted trick uses the `hidden` attribute (+ UA display:none), NOT `React.Activity`
//      (an experimental API) — the off-screen desktop rail stays mounted while the shell is mobile.
//   3. The skip link targets `main` with `tabIndex={-1}` added (upstream relies on fragment nav
//      alone, which does not move focus in every browser); `main` is the ONLY landmark AppShell
//      auto-emits (banner/contentinfo/complementary stay opt-in on Layout's slots).
//   4. Header height is published as the runtime var `--ds-appshell-header-height` via the SHARED
//      ResizeObserver (reuse — not a new observer); consumers read it with a `0px` fallback.
//   5. The six-knob `MobileNavConfig` (entirely undocumented upstream) is a real, documented API;
//      `mobileNav` is honestly tri-modal (`false | config | ReactNode`).

import {
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type Ref,
} from "react";
import { Layout, type LayoutPadding } from "./Layout";
import { MobileNav, MobileNavToggle, type MobileNavSide } from "./MobileNav";
import {
  AppShellMobileProvider,
  SideNavRenderProvider,
  TopNavRenderProvider,
  type AppShellMobileState,
} from "./appShellContext";
import { useIsMobile, useMediaQuery, type NavBreakpoint } from "../../hooks/useMediaQuery";
import { observeResize, unobserveResize } from "../../utils/sharedResizeObserver";

/** The shell surface variant — a ladder from the `--ds-bg-*` roles. Sets the shell canvas + main
 *  reading surface; the header/footer/rail chrome keep their own raised/subtle paint. */
export type AppShellVariant = "base" | "subtle" | "raised";

/**
 * The mobile-drawer configuration — every knob upstream ships UNDOCUMENTED. Pass a `MobileNavConfig`
 * object as `mobileNav` to tune the default drawer; pass `false` to disable it entirely; or pass a
 * `ReactNode` to supply fully custom drawer contents (the tri-modal `mobileNav` prop).
 */
export interface MobileNavConfig {
  /**
   * The breakpoint BELOW which the shell swaps to mobile — the sidenav/topnav re-render into the
   * drawer. A named nav breakpoint (`"sm"` 640 / `"md"` 768 / `"lg"` 1024) OR a custom min-width in
   * px (e.g. `900`); `"none"` disables the swap (always desktop). @default "md"
   */
  breakpoint?: NavBreakpoint | number;
  /** Which edge the drawer slides from (forwarded to `MobileNav`). `"auto"` picks the edge nearest
   *  the toggle at open. @default "auto" */
  side?: MobileNavSide;
  /** Drawer width in px — rendered honestly as `min(100vw, width)`. @default 320 */
  width?: number;
  /** Accessible name for the drawer dialog. @default "Navigation" */
  label?: string;
  /** Optional header slot pinned above the drawer's scrollable nav body (a title, brand, or close). */
  header?: ReactNode;
  /** Also render the `topNav` inside the drawer (in `"drawer"` render mode), above the sidenav. Set
   *  false to keep the topNav in the condensed mobile bar only. @default true */
  includeTopNav?: boolean;
}

export interface AppShellProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** The main page content — rendered inside the single `<main>` landmark AppShell guarantees. */
  children: ReactNode;
  /** The top navigation bar. Re-renders in `"default"` (desktop) / `"mobile-bar"` (mobile) modes. */
  topNav?: ReactNode;
  /** The side navigation rail. Shown in the desktop panel; on mobile it re-renders in the drawer
   *  (`"drawer"` mode) while the desktop rail stays mounted-but-hidden (keep-mounted, D7). */
  sideNav?: ReactNode;
  /** An optional footer bar (status, meta, secondary actions). */
  footer?: ReactNode;
  /**
   * The mobile navigation — TRI-MODAL. `false` disables the drawer + mode-swap entirely; a
   * `MobileNavConfig` tunes the default drawer (breakpoint / side / width / label / header /
   * includeTopNav); a `ReactNode` supplies fully custom drawer contents. @default {} (default drawer)
   */
  mobileNav?: false | MobileNavConfig | ReactNode;
  /** The shell surface variant. @default "base" */
  variant?: AppShellVariant;
  /**
   * The padding around `main` — the shell's own gutter, which is what turns the content into a
   * surface sitting on the shell canvas rather than a pane bleeding to the window edge.
   *
   * `"5"` (24px) is the default because that is the gutter the shell has always drawn, and it is
   * what the `variant` ladder was designed against. Set `"0"` for a flush, edge-to-edge app: a mail
   * client or an editor whose panes own their own chrome and should meet the window. Reuses
   * `Layout`'s own padding scale rather than minting a second vocabulary, so `"0"` through `"6"`
   * mean the same spacing here as they do on `Layout`.
   *
   * Added because the shell shipped a hardcoded 24px with no way out, and a mail-client recreation
   * had to be designed around the gutter rather than to its own archetype.
   * @default "5"
   */
  gutter?: LayoutPadding;
  /** Controlled drawer open state (pair with `onOpenChange`). Omit for uncontrolled. */
  open?: boolean;
  /** Fires when the drawer requests an open/close (toggle, Escape, backdrop). */
  onOpenChange?: (open: boolean) => void;
  /** Initial drawer open state when uncontrolled. @default false */
  defaultOpen?: boolean;
  /** SSR hint — seeds the server media-query snapshot so a mobile client does not layout-flash from
   *  desktop→drawer after hydration. Only affects the server/first-hydration render. @default false */
  defaultIsMobile?: boolean;
  /** id for the guaranteed `<main>` (the skip-link target). Auto-generated when omitted. */
  mainId?: string;
  /** Optional accessible name for the guaranteed `<main>` landmark. */
  mainLabel?: string;
  /** Text of the "skip to content" link. @default "Skip to content" */
  skipLinkLabel?: string;
  /** Ref forwarded to the shell root. */
  ref?: Ref<HTMLDivElement>;
}

/** A React portal (`createPortal(...)`) is a valid ReactNode but is NOT a React ELEMENT, so it slips past
 *  `isValidElement` — detect it explicitly so portal-valued `mobileNav` reads as custom drawer content. */
function isReactPortal(m: unknown): boolean {
  return (
    typeof m === "object" && m !== null && (m as { $$typeof?: symbol }).$$typeof === Symbol.for("react.portal")
  );
}

/** A `mobileNav` value is a config when it is a plain object that is NOT a React element, portal, or array
 *  (those are custom drawer content). `false` / `undefined` are handled by the caller. */
function isMobileNavConfig(m: AppShellProps["mobileNav"]): m is MobileNavConfig {
  return typeof m === "object" && m !== null && !isValidElement(m) && !isReactPortal(m) && !Array.isArray(m);
}

/**
 * Resolve the shell's mobile state through the committed SSR-safe media-query engine. A NAMED
 * breakpoint routes through `useIsMobile` (the [[radix-themes-substrate]] hook, verbatim); a NUMERIC breakpoint is a custom
 * min-width px threshold routed through the same underlying `useMediaQuery`. Both hooks are ALWAYS
 * called (never conditionally — rules of hooks), so a breakpoint can switch kinds at runtime.
 * `defaultIsMobile` seeds the server snapshot on whichever path is live.
 */
function useResolvedIsMobile(breakpoint: NavBreakpoint | number, defaultIsMobile: boolean): boolean {
  const isNumeric = typeof breakpoint === "number";
  const named = useIsMobile(isNumeric ? "none" : (breakpoint as NavBreakpoint), defaultIsMobile);
  const numericQuery = isNumeric ? `(max-width: ${breakpoint - 0.02}px)` : "(width < 0px)";
  const numeric = useMediaQuery(numericQuery, isNumeric ? defaultIsMobile : false);
  return isNumeric ? numeric : named;
}

/**
 * AppShell — the top-level page shell. It COMPOSES `Layout` (top bar → header, side rail → panel,
 * content → the guaranteed `main`, footer → footer), owns the responsive **mode-swap** (below the
 * breakpoint the sidenav/topnav re-render into a mobile drawer), and PROVIDES the app-shell contexts
 * (`AppShellMobileProvider` for the drawer state, `SideNavRenderProvider` / `TopNavRenderProvider`
 * for the render modes). It guarantees the single `main` landmark + a "skip to content" link, and
 * publishes the runtime `--ds-appshell-header-height` var via the shared ResizeObserver.
 */
export function AppShell({
  children,
  topNav,
  sideNav,
  footer,
  mobileNav,
  variant = "base",
  gutter = "5",
  open,
  onOpenChange,
  defaultOpen = false,
  defaultIsMobile = false,
  mainId: mainIdProp,
  mainLabel,
  skipLinkLabel = "Skip to content",
  className,
  ref,
  ...rest
}: AppShellProps) {
  const autoMainId = useId();
  const mainId = mainIdProp ?? autoMainId;
  const drawerId = useId();
  const toggleId = useId();

  // Tri-modal mobileNav resolution.
  const drawerDisabled = mobileNav === false;
  const config: MobileNavConfig = isMobileNavConfig(mobileNav) ? mobileNav : {};
  const customDrawer: ReactNode =
    !drawerDisabled && mobileNav !== undefined && !isMobileNavConfig(mobileNav) ? mobileNav : null;
  const includeTopNav = config.includeTopNav !== false;

  // Breakpoint mode-swap. `false` ⇒ "none" (always desktop). SSR-hinted via defaultIsMobile.
  const breakpoint: NavBreakpoint | number = drawerDisabled ? "none" : config.breakpoint ?? "md";
  const isMobile = useResolvedIsMobile(breakpoint, defaultIsMobile);

  // Drawer open state machine — controlled (open/onOpenChange) OR uncontrolled (defaultOpen). The drawer
  // only ever resolves OPEN while mobile: gating `resolvedOpen` on `isMobile` means a desktop shell never
  // renders an open drawer (focus trap / scrim / scroll lock) even for a beat before the effect below runs.
  const isControlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const requestedOpen = isControlled ? (open as boolean) : uncontrolledOpen;
  const resolvedOpen = isMobile && requestedOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  // Leaving mobile closes an OPEN drawer in BOTH modes — a controlled drawer is asked to close via
  // onOpenChange(false); an uncontrolled one resets its own state. Releases the modal trap/scrim/scroll-lock.
  useEffect(() => {
    if (!isMobile && requestedOpen) setOpen(false);
  }, [isMobile, requestedOpen, setOpen]);

  const mobileState: AppShellMobileState = useMemo(
    () => ({ isMobile, open: resolvedOpen, setOpen, drawerId, toggleId }),
    [isMobile, resolvedOpen, setOpen, drawerId, toggleId],
  );

  // Header-height var — observe the header via the SHARED ResizeObserver (no new observer). A callback
  // ref so cleanup fires when the header detaches (not an effect-return with a possibly-stale el). The
  // synthetic first fire reads the size off `el` directly (observeResize passes no contentRect there).
  const observedHeader = useRef<HTMLElement | null>(null);
  const observedRoot = useRef<HTMLElement | null>(null);
  const headerRef = useCallback((el: HTMLDivElement | null) => {
    const prev = observedHeader.current;
    if (prev) {
      unobserveResize(prev);
      observedHeader.current = null;
      // Clear the published height when the header detaches, so consumers fall back to the documented 0px
      // (a stale non-zero var would otherwise push content down under a now-absent header).
      observedRoot.current?.style.removeProperty("--ds-appshell-header-height");
      observedRoot.current = null;
    }
    if (el) {
      const root = el.closest<HTMLElement>("[data-ds-appshell]");
      observedHeader.current = el;
      observedRoot.current = root;
      observeResize(el, () => {
        root?.style.setProperty("--ds-appshell-header-height", `${el.getBoundingClientRect().height}px`);
      });
    }
  }, []);

  // Drawer content = the custom node, else the topnav (drawer mode) + sidenav (drawer mode) re-render.
  const drawerContent: ReactNode =
    customDrawer ?? (
      <>
        {topNav != null && includeTopNav && (
          <TopNavRenderProvider mode="drawer">{topNav}</TopNavRenderProvider>
        )}
        {sideNav != null && <SideNavRenderProvider mode="drawer">{sideNav}</SideNavRenderProvider>}
      </>
    );
  const hasDrawer =
    !drawerDisabled &&
    (customDrawer != null || sideNav != null || (topNav != null && includeTopNav));

  const showToggle = isMobile && hasDrawer;
  const showHeader = topNav != null || showToggle;

  return (
    <AppShellMobileProvider value={mobileState}>
      <div
        {...rest}
        ref={ref}
        data-ds-appshell=""
        data-variant={variant}
        className={className ? `rt-ds-appshell ${className}` : "rt-ds-appshell"}
      >
        {/* First focusable stop — visually hidden until focused (CSS), lands focus on the main below. */}
        <a href={`#${mainId}`} className="rt-ds-appshell-skiplink">
          {skipLinkLabel}
        </a>

        <Layout className="rt-ds-appshell-layout" padding="0" defaultHasDividers={false}>
          {showHeader && (
            <Layout.Header ref={headerRef} className="rt-ds-appshell-header">
              {showToggle && <MobileNavToggle />}
              {topNav != null && (
                <div className="rt-ds-appshell-topnav">
                  <TopNavRenderProvider mode={isMobile ? "mobile-bar" : "default"}>
                    {topNav}
                  </TopNavRenderProvider>
                </div>
              )}
            </Layout.Header>
          )}

          {sideNav != null && (
            // Desktop rail — kept MOUNTED (hidden) while mobile so its tree/state survives the swap (D7).
            <Layout.Panel className="rt-ds-appshell-rail" hidden={isMobile}>
              <SideNavRenderProvider mode="default">{sideNav}</SideNavRenderProvider>
            </Layout.Panel>
          )}

          <Layout.Content className="rt-ds-appshell-content">
            <main
              id={mainId}
              tabIndex={-1}
              aria-label={mainLabel}
              className="rt-ds-appshell-main"
              data-gutter={gutter}
            >
              {children}
            </main>
          </Layout.Content>

          {/* The footer seam is drawn through Layout's OWN divider mechanism (hasDivider overrides the
              shell's defaultHasDividers={false} for just this boundary) rather than a hand-rolled
              border — same Separator, same --ds-stroke-weak the top bar's own bottom rule paints, so
              the two chrome bars bracket the body symmetrically. Without it the footer sat on
              --ds-bg-raised against the shell's --ds-bg-base, a step too small to read as an edge. */}
          {footer != null && (
            <Layout.Footer hasDivider className="rt-ds-appshell-footer">
              {footer}
            </Layout.Footer>
          )}
        </Layout>

        {/* The mobile drawer — MobileNav reads the drawer state from the provider above. Rendered
            whenever a drawer exists; its content only mounts while open (Radix Dialog), and on desktop
            `open` is held false, so the sidenav renders once (rail) except when the drawer is open. */}
        {hasDrawer && (
          <MobileNav side={config.side} width={config.width} label={config.label} header={config.header}>
            {drawerContent}
          </MobileNav>
        )}
      </div>
    </AppShellMobileProvider>
  );
}
AppShell.displayName = "AppShell";
