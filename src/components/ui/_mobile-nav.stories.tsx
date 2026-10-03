import { useId, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Text } from "@radix-ui/themes";
import { MobileNav, MobileNavToggle, type MobileNavSide } from "./MobileNav";
import { Item } from "./Item";
import { toHex } from "./_storyKit";

/* Test-only behavior for MobileNav — kept OUT of the docs stories (System/Navigation/MobileNav).
   Underscore-prefixed → registry / story-order / category guard-exempt, grouped under _internal. Opening a
   fullscreen portal drawer here is fine (the on-view flash concern is a docs-story rule). Covers: initial
   focus lands on the panel; Escape + backdrop close; body scroll-lock while open; side="auto" picking the
   edge from the trigger's position; and MobileNavToggle's aria-expanded / aria-controls tracking the state.
   Hand-rolled (no @storybook/test): local sleep + waitFor poll, native driving, throw-on-fail. */

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

function NavBody() {
  return (
    <nav aria-label="Primary">
      {["Home", "Reports", "Team", "Settings"].map((l) => (
        <Item key={l} href={`#${l.toLowerCase()}`} label={l} />
      ))}
    </nav>
  );
}

/** A harness whose trigger can be pinned to a viewport edge (for the side="auto" probe). */
function Harness({
  side = "auto",
  pin,
}: {
  side?: MobileNavSide;
  pin?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const drawerId = useId();
  const pinStyle =
    pin === "left"
      ? { position: "fixed" as const, left: 8, top: 8, zIndex: 1 }
      : pin === "right"
        ? { position: "fixed" as const, right: 8, top: 8, zIndex: 1 }
        : undefined;
  return (
    <Box>
      <Box style={pinStyle}>
        <MobileNavToggle open={open} onToggle={setOpen} drawerId={drawerId} data-testid="toggle" />
      </Box>
      <MobileNav
        id={drawerId}
        side={side}
        open={open}
        onOpenChange={setOpen}
        header={<Text size="3" weight="bold">Menu</Text>}
      >
        <NavBody />
      </MobileNav>
    </Box>
  );
}

const openDrawer = (canvasElement: HTMLElement) => {
  const toggle = canvasElement.querySelector<HTMLButtonElement>('[data-testid="toggle"]')!;
  toggle.focus();
  toggle.click();
  return toggle;
};

const meta: Meta<typeof MobileNav> = {
  title: "_internal/MobileNav behavior",
  component: MobileNav,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof MobileNav>;

/** Opening steers initial focus to the drawer PANEL (onOpenAutoFocus + preventDefault, D4). */
export const OpenFocusesPanel: Story = {
  render: () => <Harness side="start" />,
  play: async ({ canvasElement }) => {
    openDrawer(canvasElement);
    const panel = await waitFor(() => document.querySelector<HTMLElement>(".rt-ds-mobilenav"));
    // Initial focus is the panel itself, not a stray inner control.
    await waitFor(() => document.activeElement === panel);
    if (panel.tabIndex !== -1) throw new Error(`the panel must be programmatically focusable (tabIndex -1); got ${panel.tabIndex}`);
    // Close to clean up.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await gone(".rt-ds-mobilenav");
  },
};

/** Escape closes (Radix Dialog owns it — no duplicate handler). */
export const EscapeCloses: Story = {
  render: () => <Harness side="start" />,
  play: async ({ canvasElement }) => {
    openDrawer(canvasElement);
    await waitFor(() => document.querySelector(".rt-ds-mobilenav"));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await gone(".rt-ds-mobilenav");
  },
};

/** Closing returns focus to the toggle that opened the drawer ([[focus-return-on-close]]).
 *
 *  Radix restores close-focus to a registered `Dialog.Trigger`. The drawer opens from `open` and
 *  registers none, so without `useReturnFocus` focus lands on <body> and the next Tab restarts from the
 *  top of the page — with the drawer's own toggle now behind the user. `EscapeCloses` above passes
 *  either way, because it only asserts that the panel went away. */
export const RestoresFocusOnClose: Story = {
  render: () => <Harness side="start" />,
  play: async ({ canvasElement }) => {
    const toggle = openDrawer(canvasElement);
    await waitFor(() => document.querySelector(".rt-ds-mobilenav"));
    await waitFor(() => document.activeElement !== toggle);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await gone(".rt-ds-mobilenav");
    await waitFor(() => document.activeElement === toggle, 1500).catch(() => {
      const a = document.activeElement as HTMLElement;
      throw new Error(`closing must return focus to the toggle; it went to <${a.tagName.toLowerCase()}>`);
    });
  },
};

/** A pointer-down on the backdrop (outside the panel) closes the modal drawer. */
export const BackdropCloses: Story = {
  render: () => <Harness side="start" />,
  play: async ({ canvasElement }) => {
    openDrawer(canvasElement);
    await waitFor(() => document.querySelector(".rt-ds-mobilenav"));
    const overlay = await waitFor(() => document.querySelector<HTMLElement>(".rt-BaseDialogOverlay"));
    // Radix DismissableLayer listens (setTimeout 0) for an outside pointerdown; a following click flushes a
    // deferred dispatch. The overlay is outside the content layer → this dismisses.
    await sleep(20);
    overlay.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
    overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await gone(".rt-ds-mobilenav");
  },
};

/** The modal drawer locks body scroll while open (react-remove-scroll → data-scroll-locked on body). */
export const LocksBodyScroll: Story = {
  render: () => <Harness side="start" />,
  play: async ({ canvasElement }) => {
    if (document.body.hasAttribute("data-scroll-locked")) throw new Error("body must not be scroll-locked before open");
    openDrawer(canvasElement);
    await waitFor(() => document.querySelector(".rt-ds-mobilenav"));
    await waitFor(() => document.body.hasAttribute("data-scroll-locked"));
    // And the lock is released on close.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await gone(".rt-ds-mobilenav");
    await waitFor(() => !document.body.hasAttribute("data-scroll-locked"));
  },
};

/** side="auto": a LEFT-pinned trigger opens the drawer from the start edge. */
export const AutoSideStartFromLeftTrigger: Story = {
  render: () => <Harness side="auto" pin="left" />,
  play: async ({ canvasElement }) => {
    openDrawer(canvasElement);
    const panel = await waitFor(() => document.querySelector<HTMLElement>(".rt-ds-mobilenav"));
    await waitFor(() => panel.getAttribute("data-side") === "start");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await gone(".rt-ds-mobilenav");
  },
};

/** side="auto": a RIGHT-pinned trigger opens the drawer from the end edge. */
export const AutoSideEndFromRightTrigger: Story = {
  render: () => <Harness side="auto" pin="right" />,
  play: async ({ canvasElement }) => {
    openDrawer(canvasElement);
    const panel = await waitFor(() => document.querySelector<HTMLElement>(".rt-ds-mobilenav"));
    await waitFor(() => panel.getAttribute("data-side") === "end");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await gone(".rt-ds-mobilenav");
  },
};

/** The drawer panel is OPAQUE over coloured content — its surface never lets the page bleed through
    (the coloured-backdrop lesson: a transparent panel looks fine on a white canvas but not over content). */
export const PanelIsOpaqueOverColouredContent: Story = {
  render: () => (
    <>
      {/* A bright full-bleed backdrop behind everything — if the panel were see-through, this would show. */}
      <Box style={{ position: "fixed", inset: 0, background: "#c026d3", zIndex: 0 }} />
      <Box style={{ position: "relative", zIndex: 1 }}>
        <Harness side="start" />
      </Box>
    </>
  ),
  play: async ({ canvasElement }) => {
    openDrawer(canvasElement);
    const panel = await waitFor(() => document.querySelector<HTMLElement>(".rt-ds-mobilenav"));
    // Rasterize the panel's resolved background (P3-safe) — an opaque colour has NO alpha suffix (7 chars).
    const bg = toHex(getComputedStyle(panel).backgroundColor);
    const isOpaque = /^#[0-9a-f]{6}$/.test(bg);
    if (!isOpaque) throw new Error(`the drawer panel must be OPAQUE (no alpha); got ${bg}`);
    // And, once the slide settles, the panel is the topmost element at its centre — it occludes the
    // coloured backdrop (poll: mid-slide the panel is briefly off-screen, so elementFromPoint would miss).
    const centreHitsPanel = () => {
      const r = panel.getBoundingClientRect();
      const top = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
      return !!(top && panel.contains(top));
    };
    await waitFor(centreHitsPanel);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await gone(".rt-ds-mobilenav");
  },
};

/** MobileNavToggle carries aria-expanded + aria-controls, tracking the open state. */
export const ToggleAriaTracksState: Story = {
  render: () => <Harness side="start" />,
  play: async ({ canvasElement }) => {
    const toggle = canvasElement.querySelector<HTMLButtonElement>('[data-testid="toggle"]')!;
    // Closed: collapsed, and aria-controls points at the (rendered-on-demand) drawer id.
    if (toggle.getAttribute("aria-expanded") !== "false")
      throw new Error(`closed toggle must be aria-expanded=false; got ${toggle.getAttribute("aria-expanded")}`);
    const controls = toggle.getAttribute("aria-controls");
    if (!controls) throw new Error("the toggle must carry aria-controls");

    // Open: expanded, and aria-controls resolves to the live drawer panel.
    toggle.focus();
    toggle.click();
    const panel = await waitFor(() => document.querySelector<HTMLElement>(".rt-ds-mobilenav"));
    await waitFor(() => toggle.getAttribute("aria-expanded") === "true");
    if (panel.id !== controls) throw new Error(`aria-controls (${controls}) must match the drawer panel id (${panel.id})`);

    // Close again: back to collapsed.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await gone(".rt-ds-mobilenav");
    await waitFor(() => toggle.getAttribute("aria-expanded") === "false");
  },
};
