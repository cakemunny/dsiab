/* =============================================================================
 * appShellContext — the shared render-mode + mobile-drawer seams (Wave 4)
 * -----------------------------------------------------------------------------
 * The manager-owned integration contract between AppShell (the provider) and its
 * responsive children (MobileNav / MobileNavToggle / SideNav / TopNav, the
 * consumers). Kept in a standalone module so AppShell can import the providers
 * and each nav component can import the hooks WITHOUT a circular dependency and
 * WITHOUT AppShell depending on components built later in the wave.
 *
 * Contract (do not change the shapes without updating every consumer):
 *   • Render mode — SideNav/TopNav re-render into the mobile drawer rather than
 *     CSS-collapsing (plan D7). A component reads its own mode via the hook and
 *     branches its markup. "default" = the desktop slot; "mobile-bar" = the
 *     condensed top bar shown at mobile breakpoints; "drawer" = the full nav
 *     rendered inside the MobileNav drawer; "drawer-content" = nav content only
 *     (chrome supplied by the drawer). Absent provider ⇒ "default".
 *   • Mobile drawer — AppShell owns the open state machine (controlled OR
 *     uncontrolled) and publishes it here so MobileNav renders the drawer and
 *     MobileNavToggle drives aria-expanded / aria-controls off the SAME ids.
 *     Absent provider ⇒ null (a standalone MobileNav manages its own state).
 * ============================================================================= */
import { createContext, useContext, type ReactNode } from "react";

/* ---- render mode --------------------------------------------------------- */
export type NavRenderMode = "default" | "mobile-bar" | "drawer" | "drawer-content";

const SideNavRenderContext = createContext<NavRenderMode>("default");
const TopNavRenderContext = createContext<NavRenderMode>("default");

/** SideNav reads this to decide whether it renders in the desktop rail or the drawer. */
export const useSideNavRenderMode = (): NavRenderMode => useContext(SideNavRenderContext);
/** TopNav reads this to decide desktop bar vs mobile bar vs in-drawer. */
export const useTopNavRenderMode = (): NavRenderMode => useContext(TopNavRenderContext);

export const SideNavRenderProvider = ({ mode, children }: { mode: NavRenderMode; children: ReactNode }) => (
  <SideNavRenderContext.Provider value={mode}>{children}</SideNavRenderContext.Provider>
);
export const TopNavRenderProvider = ({ mode, children }: { mode: NavRenderMode; children: ReactNode }) => (
  <TopNavRenderContext.Provider value={mode}>{children}</TopNavRenderContext.Provider>
);

/* ---- mobile drawer state ------------------------------------------------- */
export interface AppShellMobileState {
  /** Whether the current viewport is below AppShell's breakpoint (drawer regime). */
  isMobile: boolean;
  /** Drawer open state. */
  open: boolean;
  /** Set/toggle the drawer. */
  setOpen: (open: boolean) => void;
  /** id of the drawer panel — MobileNavToggle points aria-controls at it. */
  drawerId: string;
  /** id of the toggle button — the drawer may reference it for labelling. */
  toggleId: string;
}

const AppShellMobileContext = createContext<AppShellMobileState | null>(null);

/** MobileNav / MobileNavToggle read AppShell's drawer state; null when standalone. */
export const useAppShellMobile = (): AppShellMobileState | null => useContext(AppShellMobileContext);

export const AppShellMobileProvider = ({ value, children }: { value: AppShellMobileState; children: ReactNode }) => (
  <AppShellMobileContext.Provider value={value}>{children}</AppShellMobileContext.Provider>
);
