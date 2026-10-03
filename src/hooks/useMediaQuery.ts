// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// Portions derived from facebook/astryx packages/core/src/hooks/useMediaQuery.ts @ d7c9a39b
// (MIT, © Meta Platforms) — the SSR-safe media-query subscription behind AppShell's mode-swap
// (DECISIONS [[catalog-as-specification]], D7), LIFTED under the port doctrine. Built on `useSyncExternalStore` so it hydrates
// without a layout flash: the server snapshot returns the caller's default, and `matchMedia` is
// called ONLY inside the subscribe / getSnapshot closures — never at module eval or during render.

import { useCallback, useSyncExternalStore } from "react";

/**
 * Track a CSS media query, SSR-safe. Returns whether `query` currently matches. During SSR (and the
 * first hydration paint) it returns `serverDefault` instead of touching `matchMedia`, so the server
 * and client agree on the first render — pass the value you rendered server-side to avoid a flash.
 *
 * @example const isWide = useMediaQuery("(min-width: 1024px)");
 */
export function useMediaQuery(query: string, serverDefault = false): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return () => {};
      }
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return serverDefault;
    }
    return window.matchMedia(query).matches;
  }, [query, serverDefault]);

  const getServerSnapshot = useCallback(() => serverDefault, [serverDefault]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Named nav breakpoint. `"none"` disables the mobile mode-swap entirely. */
export type NavBreakpoint = "sm" | "md" | "lg" | "none";

/** Pixel widths for the named nav breakpoints (AppShell mode-swaps to mobile BELOW these). */
export const NAV_BREAKPOINTS: Record<Exclude<NavBreakpoint, "none">, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
};

/** A query that never matches — used so the hook is still called unconditionally when the breakpoint
 * is `"none"` (Rules of Hooks) while resolving to a stable `false`. */
const NEVER_QUERY = "(width < 0px)";

/**
 * Resolve a nav breakpoint to an `isMobile` boolean for AppShell (D7). AppShell swaps its sidenav /
 * topnav into the mobile drawer when the viewport is BELOW `breakpoint`. `defaultIsMobile` seeds the
 * SSR snapshot so a mobile client does not layout-flash from desktop→drawer after hydration.
 *
 * `breakpoint: "none"` opts out (always `false`). The hook is always called (never conditionally),
 * so switching breakpoints at runtime is safe.
 */
export function useIsMobile(breakpoint: NavBreakpoint = "md", defaultIsMobile = false): boolean {
  const disabled = breakpoint === "none";
  // Mobile when the viewport is strictly narrower than the breakpoint.
  const query = disabled ? NEVER_QUERY : `(max-width: ${NAV_BREAKPOINTS[breakpoint] - 0.02}px)`;
  const matches = useMediaQuery(query, disabled ? false : defaultIsMobile);
  return disabled ? false : matches;
}
