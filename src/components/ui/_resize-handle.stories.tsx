import { createRoot } from "react-dom/client";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useResizable } from "../../hooks/useResizable";
import type { ResizeOrientation } from "../../utils/resizableMath";
import { ResizeHandle } from "./ResizeHandle";

/* Test-only DRIVING behavior for ResizeHandle — kept OUT of the docs stories (System/Layout/ResizeHandle)
   so viewing a docs page doesn't drive the handle (keyboard/drag mutates size → a flash). Underscore-
   prefixed file → registry/category/order-guard-exempt, grouped under _internal. Plays are hand-rolled
   (no @storybook/test): local sleep/waitFor poll, native event driving, assertions via throw. */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 1500): Promise<T> {
  const t0 = performance.now();
  for (;;) {
    const r = fn();
    if (r) return r as T;
    if (performance.now() - t0 > timeout) throw new Error("waitFor: timed out");
    await sleep(20);
  }
}

const now = (handle: Element) => Number(handle.getAttribute("aria-valuenow"));
/** Poll until aria-valuenow equals `want` (works for 0), then hard-assert with a clear message. */
async function expectNow(handle: Element, want: number, msg: string) {
  await waitFor(() => now(handle) === want || null);
  if (now(handle) !== want) throw new Error(`${msg}: expected aria-valuenow ${want}, got ${now(handle)}`);
}

function key(handle: Element, k: string, shiftKey = false) {
  handle.dispatchEvent(new KeyboardEvent("keydown", { key: k, shiftKey, bubbles: true, cancelable: true }));
}

/* A self-contained resizable two-pane fixture. The consumer owns the engine (as Layout/SideNav do) and
   hands the handle its separatorProps + onDragStart. The container carries a data-testid the play scopes to. */
function RZFixture({
  testid,
  orientation = "vertical",
  collapsible = false,
  defaultSize = 200,
  minSizePx = 100,
  maxSizePx = 400,
}: {
  testid: string;
  orientation?: ResizeOrientation;
  collapsible?: boolean;
  defaultSize?: number;
  minSizePx?: number;
  maxSizePx?: number;
}) {
  const rz = useResizable({ orientation, collapsible, defaultSize, minSizePx, maxSizePx, "aria-label": "Resize the panel" });
  const isVertical = orientation === "vertical";
  const size = rz.isCollapsed ? 0 : rz.size;
  return (
    <div data-testid={testid} style={{ display: "flex", flexDirection: isVertical ? "row" : "column", width: 600, height: 240, border: "1px solid var(--ds-stroke-weak)" }}>
      <div style={{ [isVertical ? "width" : "height"]: size, flexShrink: 0, background: "var(--ds-bg-raised)" }} />
      <ResizeHandle separatorProps={rz.separatorProps} onDragStart={rz.onDragStart} />
      <div style={{ flex: 1, background: "var(--ds-bg-base)" }} />
    </div>
  );
}

const meta: Meta<typeof ResizeHandle> = {
  title: "_internal/ResizeHandle behavior",
  component: ResizeHandle,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof ResizeHandle>;

/** Keyboard model: arrows ±10, Shift+arrow ±50, Home→min / End→max (the WAI window-splitter contract). */
export const KeyboardSteps: Story = {
  render: () => <RZFixture testid="rh-keys" minSizePx={100} maxSizePx={400} defaultSize={200} />,
  play: async ({ canvasElement }) => {
    const handle = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-testid="rh-keys"] [role="separator"]'));
    await expectNow(handle, 200, "initial size");

    key(handle, "ArrowRight");
    await expectNow(handle, 210, "ArrowRight steps +10");
    key(handle, "ArrowLeft");
    await expectNow(handle, 200, "ArrowLeft steps -10");
    key(handle, "ArrowRight", true);
    await expectNow(handle, 250, "Shift+ArrowRight steps +50");
    key(handle, "ArrowLeft", true);
    await expectNow(handle, 200, "Shift+ArrowLeft steps -50");

    key(handle, "Home");
    await expectNow(handle, 100, "Home jumps to min");
    key(handle, "End");
    await expectNow(handle, 400, "End jumps to max");

    // Off-axis arrows are ignored for a vertical separator (Up/Down do nothing).
    key(handle, "ArrowUp");
    await sleep(30);
    if (now(handle) !== 400) throw new Error(`vertical handle must ignore ArrowUp; aria-valuenow moved to ${now(handle)}`);
  },
};

/** Collapse toggle: Enter and double-click flip collapsed (aria-valuenow → 0); EXPAND restores the
 *  pre-collapse size, NOT the minimum (the D5 fix — 200 was the size, min is 100). */
export const CollapseToggle: Story = {
  render: () => <RZFixture testid="rh-collapse" collapsible minSizePx={100} maxSizePx={400} defaultSize={200} />,
  play: async ({ canvasElement }) => {
    const handle = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-testid="rh-collapse"] [role="separator"]'));
    await expectNow(handle, 200, "initial size");
    // Collapsible → aria-valuemin is 0 (the pane can go all the way closed).
    if (handle.getAttribute("aria-valuemin") !== "0")
      throw new Error(`a collapsible handle must expose aria-valuemin="0"; got ${handle.getAttribute("aria-valuemin")}`);

    // Enter collapses → aria-valuenow 0.
    key(handle, "Enter");
    await expectNow(handle, 0, "Enter collapses (aria-valuenow 0)");
    // Enter again expands → restores 200 (pre-collapse size), NOT 100 (min). The D5 fix.
    key(handle, "Enter");
    await expectNow(handle, 200, "Enter expands to the pre-collapse size, not min");
    if (now(handle) === 100) throw new Error("expand restored to min (100) — the D5 restore-pre-collapse fix regressed");

    // Double-click toggles the same way.
    handle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    await expectNow(handle, 0, "double-click collapses");
    handle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    await expectNow(handle, 200, "double-click expands back to the pre-collapse size");
  },
};

/** Pointer drag: a primary-button drag along the axis changes the committed size. */
export const PointerDrag: Story = {
  render: () => <RZFixture testid="rh-drag" minSizePx={100} maxSizePx={400} defaultSize={200} />,
  play: async ({ canvasElement }) => {
    const handle = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-testid="rh-drag"] [role="separator"]'));
    await expectNow(handle, 200, "initial size");

    // Down on the handle (primary button), move +60px along X, then up. rawSize = 200 + 60 = 260.
    handle.dispatchEvent(new PointerEvent("pointerdown", { button: 0, clientX: 100, clientY: 0, bubbles: true, cancelable: true }));
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 160, clientY: 0 }));
    await expectNow(handle, 260, "drag +60px grows the pane to 260");
    window.dispatchEvent(new PointerEvent("pointerup", { clientX: 160, clientY: 0 }));

    // A non-primary button (button !== 0) must NOT start a drag.
    const before = now(handle);
    handle.dispatchEvent(new PointerEvent("pointerdown", { button: 2, clientX: 160, clientY: 0, bubbles: true, cancelable: true }));
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 260, clientY: 0 }));
    await sleep(30);
    if (now(handle) !== before) throw new Error(`a non-primary-button drag must not resize; moved ${before} → ${now(handle)}`);
    window.dispatchEvent(new PointerEvent("pointerup", { clientX: 260, clientY: 0 }));
  },
};

/** Drag-collapse then re-expand restores the PRE-DRAG size, not the size the drag ratcheted down to (the
 *  #16 fix). A GRADUAL drag walks the size 200 → 150 → 100(min) before crossing the collapse threshold, so
 *  the naive "remember prev.size at collapse" would save 100; the fix remembers the drag-start 200. */
export const DragCollapseRestoresPreDragSize: Story = {
  render: () => <RZFixture testid="rh-drag-collapse" collapsible minSizePx={100} maxSizePx={400} defaultSize={200} />,
  play: async ({ canvasElement }) => {
    const handle = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-testid="rh-drag-collapse"] [role="separator"]'));
    await expectNow(handle, 200, "initial size");

    // Gradual drag left: startSize 200 at clientX 300. collapseThreshold = minSizePx/2 = 50.
    handle.dispatchEvent(new PointerEvent("pointerdown", { button: 0, clientX: 300, clientY: 0, bubbles: true, cancelable: true }));
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 250, clientY: 0 })); // rawSize 150
    await expectNow(handle, 150, "drag to 150");
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 200, clientY: 0 })); // rawSize 100 → min
    await expectNow(handle, 100, "drag ratchets down to min (100)");
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 120, clientY: 0 })); // rawSize 20 < 50 → collapse
    await expectNow(handle, 0, "drag below the collapse threshold snaps closed");
    window.dispatchEvent(new PointerEvent("pointerup", { clientX: 120, clientY: 0 }));

    // Expand (Enter) must restore the PRE-DRAG 200 — not the ratcheted-down 100 the buggy code saved.
    key(handle, "Enter");
    await expectNow(handle, 200, "expand restores the pre-DRAG size (200)");
    if (now(handle) === 100) throw new Error("drag-collapse remembered the ratcheted-down min (100), not the pre-drag 200 — the #16 fix regressed");
  },
};

/** Unmount mid-drag must not leak the window pointer listeners (the D5 effect-cleanup fix). Best-effort:
 *  render into an OWN root, start a drag, unmount without pointerup, assert the net pointermove listener
 *  count returns to zero. */
export const UnmountMidDragNoLeak: Story = {
  render: () => <div data-testid="rh-leak-host" style={{ padding: 8 }}>listener-leak probe runs in the play (own React root)</div>,
  play: async () => {
    const rawAdd = window.addEventListener;
    const rawRemove = window.removeEventListener;
    let netMove = 0;
    window.addEventListener = function (type: string, ...rest: unknown[]) {
      if (type === "pointermove") netMove++;
      // @ts-expect-error — pass-through to the real implementation.
      return rawAdd.call(this, type, ...rest);
    } as typeof window.addEventListener;
    window.removeEventListener = function (type: string, ...rest: unknown[]) {
      if (type === "pointermove") netMove--;
      // @ts-expect-error — pass-through to the real implementation.
      return rawRemove.call(this, type, ...rest);
    } as typeof window.removeEventListener;

    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    let unmounted = false;
    try {
      root.render(<RZFixture testid="rh-leak" minSizePx={100} maxSizePx={400} defaultSize={200} />);
      const handle = await waitFor(() => host.querySelector<HTMLElement>('[data-testid="rh-leak"] [role="separator"]'));

      // Start a drag (registers the window pointermove/up listeners) — but never fire pointerup.
      handle.dispatchEvent(new PointerEvent("pointerdown", { button: 0, clientX: 100, clientY: 0, bubbles: true, cancelable: true }));
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 140, clientY: 0 }));
      await sleep(20);
      if (netMove <= 0) throw new Error(`expected a live pointermove listener mid-drag; net=${netMove}`);

      // Unmount MID-DRAG — the effect-return cleanup must tear the listeners down.
      root.unmount();
      unmounted = true;
      await sleep(20);
      if (netMove !== 0) throw new Error(`pointermove listener leaked after unmount mid-drag; net=${netMove}`);
    } finally {
      // If an assertion above threw BEFORE the unmount, the React root (and its live drag listeners) would
      // otherwise leak into later stories — always tear it down here.
      if (!unmounted) root.unmount();
      window.addEventListener = rawAdd;
      window.removeEventListener = rawRemove;
      host.remove();
    }
  },
};
