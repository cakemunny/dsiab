import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { Gauge, ChartBar, Users, Sparkle } from "@phosphor-icons/react";
import {
  TopNav, TopNavItem, TopNavHeading, TopNavMenu, TopNavMegaMenu, TopNavMegaMenuItem, TopNavMegaMenuFeaturedCard,
} from "./TopNav";
import { TopNavRenderProvider } from "./appShellContext";
import { toHex } from "./_storyKit";

/* Test-only behavior for TopNav — kept OUT of the docs stories (System/Navigation/TopNav).
   Underscore-prefixed → registry / story-order / category guard-exempt, grouped under _internal. Driving
   here (hover-intent timers, the click-latch, the portaled flyouts, arrow roving, the mega anchor) would
   flash the docs page, so it lives here. Covers: hover-intent open (~150ms) + close (~200ms); click-latch
   pins open; keyboard arrow roving inside a menu; aria-current="page"; the mega panel full-width to the bar
   + aria-controls (+ OPAQUE over coloured content); the render-mode swap (forced via context); and menus
   opening INDEPENDENTLY (no single-open coordination). Hand-rolled (no @storybook/test): local sleep +
   waitFor poll, native driving, throw-on-fail. */

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
const q = <T extends HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel);
const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
// React derives onPointerEnter/Leave from pointerover/pointerout (they don't bubble natively), so drive the
// hover-intent by dispatching pointerover/out with a relatedTarget OUTSIDE the element (the pointer's from/to).
const pointer = (el: Element, type: "pointerover" | "pointerout", related: EventTarget | null = document.body) =>
  el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: "mouse", relatedTarget: related as Element | null }));
const hoverCapable = () => typeof window.matchMedia === "function" && window.matchMedia("(hover: hover)").matches;

/** A bar with a brand, an active leaf, one flyout Menu, and a MegaMenu with a featured card. */
function Bar({ label = "Primary", testid = "tn" }: { label?: string; testid?: string }) {
  return (
    <TopNav aria-label={label} data-testid={testid}>
      <TopNavHeading href="#home">Acme</TopNavHeading>
      <TopNavItem icon={<Gauge />} label="Dashboard" href="#dashboard" isSelected data-testid="current" />
      <TopNavMenu label="Products">
        <TopNavItem label="Automations" href="#products-automations" data-testid="menu-a" />
        <TopNavItem label="Sync" href="#products-sync" data-testid="menu-b" />
        <TopNavItem label="Security" href="#products-security" data-testid="menu-c" />
      </TopNavMenu>
      <TopNavMegaMenu
        label="Solutions"
        columns={2}
        featured={<TopNavMegaMenuFeaturedCard media={<Sparkle weight="fill" />} title="What's new" description="Latest updates." cta="Read more" href="#featured" />}
      >
        <TopNavMegaMenuItem icon={<ChartBar />} label="Analytics" description="Reporting" href="#sol-analytics" />
        <TopNavMegaMenuItem icon={<Users />} label="Teams" description="Collaboration" href="#sol-teams" />
      </TopNavMegaMenu>
    </TopNav>
  );
}

const meta: Meta<typeof TopNav> = {
  title: "_internal/TopNav behavior",
  component: TopNav,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof TopNav>;

/** The current destination carries aria-current="page" on the link (D2). */
export const ActiveIsAriaCurrentPage: Story = {
  render: () => <Bar />,
  play: async ({ canvasElement }) => {
    const bar = q(canvasElement, '[data-testid="tn"]')!;
    const current = bar.querySelectorAll('[aria-current="page"]');
    if (current.length !== 1) throw new Error(`exactly one item must be aria-current="page"; got ${current.length}`);
    if ((current[0].textContent ?? "").trim() !== "Dashboard") throw new Error(`the current item must be Dashboard; got "${current[0].textContent}"`);
  },
};

/** Hover-intent: a sustained hover OPENS after ~150ms (not immediately); a sustained leave CLOSES it. */
export const HoverIntentOpensAndCloses: Story = {
  render: () => <Bar />,
  play: async ({ canvasElement }) => {
    if (!hoverCapable()) throw new Error("this play requires a (hover:hover) environment (desktop Chromium)");
    const bar = q(canvasElement, '[data-testid="tn"]')!;
    const trigger = q<HTMLElement>(bar, ".rt-ds-topnav-menu-trigger")!;

    // Hover the trigger → the show timer is armed but the panel is NOT open yet (the ~150ms intent delay).
    pointer(trigger, "pointerover");
    if (document.querySelector(".rt-ds-topnav-menu-panel")) throw new Error("the menu must NOT open immediately on hover (150ms intent delay)");
    if (trigger.getAttribute("aria-expanded") !== "false") throw new Error("aria-expanded must still be false before the delay elapses");
    // …then it opens.
    const panel = await waitFor(() => q<HTMLElement>(document, ".rt-ds-topnav-menu-panel"));
    if (trigger.getAttribute("aria-expanded") !== "true") throw new Error("aria-expanded must be true once open");
    if (!panel.querySelector(".rt-ds-item-body")) throw new Error("the flyout must render its link rows");

    // Leave → the hide timer (~200ms) closes it.
    pointer(trigger, "pointerout");
    await gone(".rt-ds-topnav-menu-panel");
    if (trigger.getAttribute("aria-expanded") !== "false") throw new Error("aria-expanded must return to false after close");
  },
};

/** A click LATCHES the menu open — a subsequent leave does not close it; clicking again closes it. */
export const ClickLatchPinsOpen: Story = {
  render: () => <Bar />,
  play: async ({ canvasElement }) => {
    const bar = q(canvasElement, '[data-testid="tn"]')!;
    const trigger = q<HTMLElement>(bar, ".rt-ds-topnav-menu-trigger")!;

    // Click → opens IMMEDIATELY (no intent delay) and latches.
    trigger.click();
    await waitFor(() => q<HTMLElement>(document, ".rt-ds-topnav-menu-panel"));

    // Leaving does NOT close a latched menu.
    if (hoverCapable()) {
      pointer(trigger, "pointerout");
      await sleep(320); // longer than the 200ms hide delay
      if (!document.querySelector(".rt-ds-topnav-menu-panel")) throw new Error("a latched menu must stay open after the pointer leaves");
    }

    // Clicking again unlatches + closes.
    trigger.click();
    await gone(".rt-ds-topnav-menu-panel");
  },
};

/** ArrowDown from the trigger moves focus into the panel; arrows rove the links (useListFocus). */
export const KeyboardRovingInMenu: Story = {
  render: () => <Bar />,
  play: async ({ canvasElement }) => {
    const bar = q(canvasElement, '[data-testid="tn"]')!;
    const trigger = q<HTMLElement>(bar, ".rt-ds-topnav-menu-trigger")!;
    trigger.click();
    const panel = await waitFor(() => q<HTMLElement>(document, ".rt-ds-topnav-menu-panel"));
    const links = () => Array.from(panel.querySelectorAll<HTMLElement>(".rt-ds-item-body"));
    if (links().length < 3) throw new Error(`the flyout must render ≥3 links; got ${links().length}`);

    // ArrowDown from the trigger lands focus on the first link (onOpenAutoFocus is prevented, so a click/hover
    // never steals focus — only an explicit keyboard entry does).
    key(trigger, "ArrowDown");
    await waitFor(() => document.activeElement === links()[0]);
    // Arrows rove (the keydown bubbles to the flyout container's useListFocus handler).
    key(links()[0], "ArrowDown");
    await waitFor(() => document.activeElement === links()[1]);
    key(links()[1], "ArrowUp");
    await waitFor(() => document.activeElement === links()[0]);
    key(links()[0], "End");
    await waitFor(() => document.activeElement === links()[links().length - 1]);
    key(links()[0], "Home");
    await waitFor(() => document.activeElement === links()[0]);

    // Escape closes and restores focus to the trigger.
    key(document.body, "Escape");
    await gone(".rt-ds-topnav-menu-panel");
    await waitFor(() => document.activeElement === trigger);
  },
};

/** The mega panel spans the BAR width (not the trigger) + carries aria-controls; its panel is OPAQUE over
    coloured content (a transparent panel looks fine on a white canvas but not over the page). */
export const MegaFullWidthAndAriaControls: Story = {
  render: () => (
    <>
      <Box style={{ position: "fixed", inset: 0, background: "#c026d3", zIndex: 0 }} />
      <Box style={{ position: "relative", zIndex: 1, width: 600 }}>
        <Bar />
      </Box>
    </>
  ),
  play: async ({ canvasElement }) => {
    const bar = q<HTMLElement>(canvasElement, '[data-testid="tn"]')!;
    const trigger = q<HTMLElement>(bar, ".rt-ds-topnav-mega-trigger")!;
    trigger.click();
    const panel = await waitFor(() => q<HTMLElement>(document, ".rt-ds-topnav-mega-panel"));

    // aria-controls points at the panel (upstream omits it on the mega).
    if (trigger.getAttribute("aria-controls") !== panel.id) throw new Error("the mega trigger must carry aria-controls pointing at the panel");
    if (trigger.getAttribute("aria-expanded") !== "true") throw new Error("the mega trigger must be aria-expanded=true when open");

    // Anchored to the BAR, not the trigger: the panel's LEFT edge aligns to the bar's left (well left of
    // the trigger), and it spans ~the full bar width — far wider than the trigger. (Radix caps the content
    // to the available viewport width as a collision safety, so exact bar-width equality only holds when the
    // bar is comfortably inside the viewport — the alignment + span proof is the robust intent check.)
    const barR = bar.getBoundingClientRect();
    const panelR = panel.getBoundingClientRect();
    const trigR = trigger.getBoundingClientRect();
    if (Math.abs(panelR.left - barR.left) > 12) throw new Error(`the mega panel must left-align to the bar (${Math.round(barR.left)}); got ${Math.round(panelR.left)}`);
    if (panelR.left > trigR.left - 40) throw new Error("the mega panel must start well left of its trigger (bar-anchored, not trigger-anchored)");
    if (panelR.width < barR.width * 0.9) throw new Error(`the mega panel must span ~the bar width (${Math.round(barR.width)}px); got ${Math.round(panelR.width)}px`);
    if (panelR.width < trigR.width * 2) throw new Error(`the mega panel must be far wider than the trigger (not trigger-width); panel ${Math.round(panelR.width)} vs trigger ${Math.round(trigR.width)}`);

    // OPAQUE: the resolved background has no alpha (P3-safe rasterize → 7 chars) and occludes the backdrop.
    const bg = toHex(getComputedStyle(panel).backgroundColor);
    if (!/^#[0-9a-f]{6}$/.test(bg)) throw new Error(`the mega panel must be OPAQUE (no alpha); got ${bg}`);
    await waitFor(() => {
      const r = panel.getBoundingClientRect();
      const top = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
      return !!(top && panel.contains(top));
    });

    // The mega grid renders its items as links, plus the featured card link.
    if (panel.querySelectorAll(".rt-ds-item-body").length < 2) throw new Error("the mega grid must render its items as links");
    if (!panel.querySelector(".rt-ds-topnav-featured-link")) throw new Error("the featured card link must render");

    key(document.body, "Escape");
    await gone(".rt-ds-topnav-mega-panel");
  },
};

/** The render mode swaps the bar's markup: forced mobile-bar / drawer via the render-mode context. */
export const RenderModeSwap: Story = {
  render: () => (
    <>
      <TopNavRenderProvider mode="mobile-bar">
        <Bar label="Mobile bar" testid="tn-mobilebar" />
      </TopNavRenderProvider>
      <TopNavRenderProvider mode="drawer">
        <Bar label="Drawer nav" testid="tn-drawer" />
      </TopNavRenderProvider>
    </>
  ),
  play: async ({ canvasElement }) => {
    const mobile = q<HTMLElement>(canvasElement, '[data-testid="tn-mobilebar"]')!;
    const drawer = q<HTMLElement>(canvasElement, '[data-testid="tn-drawer"]')!;
    if (mobile.getAttribute("data-mode") !== "mobile-bar") throw new Error(`forced mobile-bar mode must set data-mode; got ${mobile.getAttribute("data-mode")}`);
    if (drawer.getAttribute("data-mode") !== "drawer") throw new Error(`forced drawer mode must set data-mode; got ${drawer.getAttribute("data-mode")}`);
    // The drawer render stacks vertically (a column), the desktop/mobile bar is a row.
    if (getComputedStyle(drawer).flexDirection !== "column") throw new Error("a drawer render must stack the bar vertically");
  },
};

/** Menus open INDEPENDENTLY — hovering a second open menu does not close the first (no single-open
    coordination was added; that would be an invention Astryx never had). */
export const MenusOpenIndependently: Story = {
  render: () => (
    <TopNav aria-label="Primary" data-testid="tn">
      <TopNavHeading href="#home">Acme</TopNavHeading>
      <TopNavMenu label="Products">
        <TopNavItem label="Automations" href="#a1" />
        <TopNavItem label="Sync" href="#a2" />
      </TopNavMenu>
      <TopNavMenu label="Resources">
        <TopNavItem label="Guides" href="#b1" />
        <TopNavItem label="API" href="#b2" />
      </TopNavMenu>
    </TopNav>
  ),
  play: async ({ canvasElement }) => {
    if (!hoverCapable()) throw new Error("this play requires a (hover:hover) environment (desktop Chromium)");
    const bar = q(canvasElement, '[data-testid="tn"]')!;
    const triggers = Array.from(bar.querySelectorAll<HTMLElement>(".rt-ds-topnav-menu-trigger"));
    if (triggers.length !== 2) throw new Error(`expected two menu triggers; got ${triggers.length}`);

    // Open the first menu by hover (no pointerdown → no outside-dismiss of anything).
    pointer(triggers[0], "pointerover");
    await waitFor(() => document.querySelectorAll(".rt-ds-topnav-menu-panel").length === 1);
    // Open the second WITHOUT leaving the first — both hover show-timers fire, both open.
    pointer(triggers[1], "pointerover");
    await waitFor(() => document.querySelectorAll(".rt-ds-topnav-menu-panel").length === 2);

    // Both stay open — no coordination force-closed the first.
    await sleep(120);
    if (document.querySelectorAll(".rt-ds-topnav-menu-panel").length !== 2) throw new Error("both menus must stay open independently (no single-open coordination)");
    if (triggers[0].getAttribute("aria-expanded") !== "true" || triggers[1].getAttribute("aria-expanded") !== "true") {
      throw new Error("both triggers must report aria-expanded=true");
    }
  },
};
