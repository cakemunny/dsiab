import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tooltip } from "./Tooltip";
import { Button } from "./Button";

/* Test-only behavior for Tooltip — kept OUT of the docs stories (System/Tooltip) so viewing a docs page
   doesn't briefly open/close the floating panel (a flash). Underscore-prefixed file → registry/order/
   category-guard-exempt, grouped under _internal. Hand-rolled play (no @storybook/test). */

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
async function waitForGone(fn: () => unknown, timeout = 1500): Promise<void> {
  const t0 = performance.now();
  for (;;) {
    if (!fn()) return;
    if (performance.now() - t0 > timeout) throw new Error("waitForGone: still present after timeout");
    await sleep(20);
  }
}

const meta: Meta<typeof Tooltip> = {
  title: "_internal/Tooltip behavior",
  component: Tooltip,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Tooltip>;

/** Keyboard focus opens the panel (role="tooltip", the content text) immediately; Escape and blur both
 *  close it. The docs Usage story only renders a static controlled-open panel — this is where the driving
 *  (open/close) lives, so the docs page never flashes. */
export const OpensAndCloses: Story = {
  render: () => (
    <Tooltip content="Saved to your workspace" delayDuration={0}>
      <Button priority="secondary" data-testid="tt-trigger">Save</Button>
    </Tooltip>
  ),
  play: async () => {
    const trigger = await waitFor(() => document.querySelector<HTMLElement>('[data-testid="tt-trigger"]'));

    // Closed at rest — the panel is not in the DOM until the trigger is engaged.
    if (document.querySelector('[role="tooltip"]')) throw new Error("tooltip must be closed at rest");

    // Keyboard focus opens it immediately (the delay applies to hover, not focus).
    trigger.focus();
    const tip = await waitFor(() => {
      const t = document.querySelector<HTMLElement>('[role="tooltip"]');
      return t && t.textContent?.includes("Saved to your workspace") ? t : null;
    });
    if (!tip) throw new Error("focus must open the tooltip with its content");

    // Blur closes it. (Do the blur-close path FIRST: after an Escape the trigger stays focused, so a
    // re-focus() would be a no-op and never re-open — blur first, then re-focus fires a fresh event.)
    trigger.blur();
    await waitForGone(() => document.querySelector('[role="tooltip"]'));

    // Re-open on a fresh focus, then Escape closes it (Radix's document-level escape handler while open).
    trigger.focus();
    await waitFor(() => document.querySelector('[role="tooltip"]'));
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await waitForGone(() => document.querySelector('[role="tooltip"]'));
  },
};
