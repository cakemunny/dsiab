import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Text } from "@radix-ui/themes";
import { AppShell } from "./AppShell";
import { Button } from "./Button";
import { Item } from "./Item";
import { useSideNavRenderMode, useTopNavRenderMode } from "./appShellContext";

/* Test-only behavior for AppShell — kept OUT of the docs stories (System/Layout/AppShell). The mode-swap
   is FORCED via config (a "none" breakpoint asserts desktop; a very-wide numeric breakpoint asserts the
   drawer regime at any viewport) — NEVER by resizing the viewport, which is not reliably drivable from a
   browser-mode play (the docs viewport is 1200px, wider than every named breakpoint). Underscore-prefixed
   → registry / story-order / category guard-exempt, grouped under _internal. Hand-rolled (no
   @storybook/test): local sleep + waitFor poll, native driving, throw-on-fail. */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 3000): Promise<T> {
  const t0 = performance.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (performance.now() - t0 > timeout) throw new Error("waitFor: timed out");
    await sleep(16);
  }
}
const gone = async (sel: string, timeout = 3000) => {
  const t0 = performance.now();
  while (document.querySelector(sel)) {
    if (performance.now() - t0 > timeout) throw new Error(`still present: ${sel}`);
    await sleep(16);
  }
};
const q = (root: ParentNode, sel: string) => root.querySelector<HTMLElement>(sel);

/* Probe nav content — stamps its resolved render MODE onto the DOM so the mode-swap is directly
   observable (SideNav/TopNav land later; these stand in). */
function ProbeTopNav() {
  const mode = useTopNavRenderMode();
  return <div data-testid="topnav" data-mode={mode}>Top</div>;
}
function ProbeSideNav({ label = "Main" }: { label?: string }) {
  const mode = useSideNavRenderMode();
  return (
    <nav aria-label={label} data-testid="sidenav" data-mode={mode}>
      <Item href="#alpha" label="Alpha" />
    </nav>
  );
}

const headerToggle = (shell: HTMLElement) => q(shell, ".rt-ds-appshell-header button[aria-controls]") as HTMLButtonElement | null;

const meta: Meta<typeof AppShell> = {
  title: "_internal/AppShell behavior",
  component: AppShell,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof AppShell>;

/* -------------------------------------------------------------------------- */
/** breakpoint:"none" forces DESKTOP: the rail is visible (mode "default"), the topNav is "default", and
    there is no hamburger / no drawer. */
export const DesktopModeForcedByConfig: Story = {
  render: () => (
    <AppShell data-testid="shell" mobileNav={{ breakpoint: "none" }} topNav={<ProbeTopNav />} sideNav={<ProbeSideNav label="Desk" />} footer={<Text size="1">Footer</Text>}>
      <Box>Content</Box>
    </AppShell>
  ),
  play: async ({ canvasElement }) => {
    const shell = await waitFor(() => q(canvasElement, '[data-testid="shell"]'));
    const rail = q(shell, ".rt-ds-appshell-rail");
    if (!rail) throw new Error("desktop shell must render the side rail");
    if (rail.hidden) throw new Error("the desktop rail must be visible (not hidden)");
    if (q(rail, '[data-testid="sidenav"]')?.getAttribute("data-mode") !== "default")
      throw new Error("the desktop rail sideNav must render in 'default' mode");
    if (q(shell, '.rt-ds-appshell-header [data-testid="topnav"]')?.getAttribute("data-mode") !== "default")
      throw new Error("the desktop topNav must render in 'default' mode");
    if (headerToggle(shell)) throw new Error("desktop mode must NOT render a hamburger toggle");
    if (document.querySelector(".rt-ds-mobilenav")) throw new Error("desktop mode must not open a drawer");
    // The single main landmark is present + programmatically focusable.
    const main = q(shell, "main.rt-ds-appshell-main");
    if (!main || main.tabIndex !== -1) throw new Error("shell must emit a single <main> with tabIndex=-1");
  },
};

/* -------------------------------------------------------------------------- */
/** A very-wide numeric breakpoint forces the MOBILE mode-swap at the 1200px docs viewport: the desktop
    rail is kept mounted-but-hidden, a hamburger appears, the topNav condenses to "mobile-bar", and
    opening the drawer RE-RENDERS the sideNav/topNav in "drawer" mode. */
export const MobileModeSwapForcedByConfig: Story = {
  render: () => (
    <AppShell data-testid="shell" mobileNav={{ breakpoint: 4000 }} topNav={<ProbeTopNav />} sideNav={<ProbeSideNav label="Rail" />}>
      <Box>Content</Box>
    </AppShell>
  ),
  play: async ({ canvasElement }) => {
    const shell = await waitFor(() => q(canvasElement, '[data-testid="shell"]'));

    // The off-screen desktop rail is kept MOUNTED but hidden (the D7 keep-mounted mechanism).
    const rail = q(shell, ".rt-ds-appshell-rail");
    if (!rail) throw new Error("the desktop rail must stay mounted in mobile mode");
    if (!rail.hidden) throw new Error("the desktop rail must be hidden (kept mounted) in mobile mode");
    if (q(rail, '[data-testid="sidenav"]')?.getAttribute("data-mode") !== "default")
      throw new Error("the mounted-but-hidden rail keeps 'default' mode");

    // The top bar condenses: a hamburger + the topNav in 'mobile-bar' mode.
    const toggle = headerToggle(shell);
    if (!toggle) throw new Error("mobile mode must render a hamburger toggle");
    if (toggle.getAttribute("aria-expanded") !== "false") throw new Error("the toggle must start collapsed");
    if (q(shell, '.rt-ds-appshell-header [data-testid="topnav"]')?.getAttribute("data-mode") !== "mobile-bar")
      throw new Error("the mobile topNav must render in 'mobile-bar' mode");

    // Open the drawer: the sideNav + topNav RE-RENDER in 'drawer' mode inside the drawer panel.
    toggle.focus();
    toggle.click();
    const panel = await waitFor(() => document.querySelector<HTMLElement>(".rt-ds-mobilenav"));
    const drawerSide = await waitFor(() => q(panel, '[data-testid="sidenav"]'));
    if (drawerSide.getAttribute("data-mode") !== "drawer") throw new Error("the drawer sideNav must render in 'drawer' mode");
    if (q(panel, '[data-testid="topnav"]')?.getAttribute("data-mode") !== "drawer") throw new Error("the drawer topNav must render in 'drawer' mode");
    if (toggle.getAttribute("aria-expanded") !== "true") throw new Error("the toggle must read expanded while open");

    // Clean up.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await gone(".rt-ds-mobilenav");
  },
};

/* -------------------------------------------------------------------------- */
/** The skip link targets the main, and the main is programmatically focusable (tabIndex=-1) — the two
    halves of the D7 fix. NOTE: the play does NOT actually CLICK the skip link — a real `#fragment`
    navigation hijacks Storybook's URL-based routing and reloads the test page. The browser's
    focus-on-fragment behaviour is browser-owned; AppShell's contribution is the href + the tabIndex=-1
    (which is why the fragment target CAN receive focus), and both are asserted directly. */
export const SkipLinkFocusesMain: Story = {
  render: () => (
    <AppShell data-testid="shell" mobileNav={{ breakpoint: "none" }}>
      <Box>Content</Box>
    </AppShell>
  ),
  play: async ({ canvasElement }) => {
    const shell = await waitFor(() => q(canvasElement, '[data-testid="shell"]'));
    const skip = q(shell, "a.rt-ds-appshell-skiplink") as HTMLAnchorElement | null;
    const main = q(shell, "main.rt-ds-appshell-main");
    if (!skip) throw new Error("AppShell must render a skip link");
    if (!main) throw new Error("AppShell must emit a <main>");
    if (main.tabIndex !== -1) throw new Error(`main must have tabIndex=-1 (the skip-target fix); got ${main.tabIndex}`);
    if (skip.getAttribute("href") !== `#${main.id}`) throw new Error(`skip link must target #${main.id}; got ${skip.getAttribute("href")}`);
    if (!skip.textContent?.trim()) throw new Error("the skip link must have a discernible name");

    // main is programmatically focusable ONLY BECAUSE of tabIndex=-1 (a plain <main> is not) — this is
    // what makes the browser's fragment focus land there. Focusing it proves the fix is wired.
    main.focus();
    if (document.activeElement !== main) throw new Error("main must be programmatically focusable (tabIndex=-1)");
    main.blur();
  },
};

/* -------------------------------------------------------------------------- */
/** Controlled contract: the drawer follows the `open` prop (not internal state). A wired harness opens
    on the toggle + closes on an external control; a FROZEN controlled shell (open pinned false, handler
    doesn't update) fires onOpenChange but never opens. */
function ControlledHarness() {
  const [open, setOpen] = useState(false);
  const [frozenClicks, setFrozenClicks] = useState(0);
  return (
    <Box>
      <AppShell data-testid="live" mainLabel="Live" mobileNav={{ breakpoint: 4000 }} open={open} onOpenChange={setOpen} sideNav={<ProbeSideNav label="Live" />}>
        <Box>Content</Box>
      </AppShell>
      <span data-testid="frozen-clicks">{frozenClicks}</span>
      <AppShell data-testid="frozen" mainLabel="Frozen" mobileNav={{ breakpoint: 4000 }} open={false} onOpenChange={() => setFrozenClicks((c) => c + 1)} sideNav={<ProbeSideNav label="Frozen" />}>
        <Box>Content</Box>
      </AppShell>
      {/* The "external control" the contract is about — a real Button, not a bare UA <button>: a raw
          <button> lays out to its text (47×21 here), under the 24px pointer-target floor, so a shape
          that could never ship was gating a contract that has nothing to do with buttons. It sits AFTER
          both shells because each shell parks its hidden skip link in the space immediately above
          itself, and a control placed there is overlapped by it. */}
      <Button data-testid="ext-close" onClick={() => setOpen(false)}>Close menu</Button>
    </Box>
  );
}

export const ControlledDrawerFollowsProp: Story = {
  // Two shells in one harness → two <main> landmarks (a test artifact). Scope off the duplicate-main rule.
  parameters: { a11y: { config: { rules: [{ id: "landmark-no-duplicate-main", enabled: false }] } } },
  render: () => <ControlledHarness />,
  play: async ({ canvasElement }) => {
    const live = await waitFor(() => q(canvasElement, '[data-testid="live"]'));
    const frozen = await waitFor(() => q(canvasElement, '[data-testid="frozen"]'));

    // Controlled: the internal toggle drives onOpenChange → the parent sets open=true → the drawer opens.
    const liveToggle = headerToggle(live)!;
    liveToggle.focus();
    liveToggle.click();
    await waitFor(() => document.querySelector('.rt-ds-mobilenav nav[aria-label="Live"]'));
    if (liveToggle.getAttribute("aria-expanded") !== "true") throw new Error("controlled toggle must read expanded once the parent opens it");

    // The drawer follows the PROP: an external control that flips `open` false closes it.
    (q(canvasElement, '[data-testid="ext-close"]') as HTMLButtonElement).click();
    await gone(".rt-ds-mobilenav");

    // Frozen controlled: open is pinned false; clicking the toggle fires onOpenChange but never opens.
    const frozenToggle = headerToggle(frozen)!;
    if (frozenToggle.getAttribute("aria-expanded") !== "false") throw new Error("frozen toggle must start collapsed");
    frozenToggle.click();
    await waitFor(() => q(canvasElement, '[data-testid="frozen-clicks"]')?.textContent === "1");
    await sleep(60); // give any (incorrect) drawer time to appear
    if (document.querySelector('.rt-ds-mobilenav nav[aria-label="Frozen"]')) throw new Error("a controlled shell with open=false must NOT open on toggle");
    if (frozenToggle.getAttribute("aria-expanded") !== "false") throw new Error("frozen toggle must stay collapsed (follows the prop)");
  },
};

/* -------------------------------------------------------------------------- */
/** The header height is published as --ds-appshell-header-height on the shell root (shared ResizeObserver). */
export const HeaderHeightVarPublished: Story = {
  render: () => (
    <AppShell data-testid="shell" mobileNav={{ breakpoint: "none" }} topNav={<ProbeTopNav />}>
      <Box>Content</Box>
    </AppShell>
  ),
  play: async ({ canvasElement }) => {
    const shell = await waitFor(() => q(canvasElement, '[data-testid="shell"]'));
    const value = await waitFor(() => shell.style.getPropertyValue("--ds-appshell-header-height") || false);
    if (!/^\d+(\.\d+)?px$/.test(value)) throw new Error(`--ds-appshell-header-height must be a px length; got "${value}"`);
    if (parseFloat(value) <= 0) throw new Error(`--ds-appshell-header-height must be > 0; got "${value}"`);
  },
};
