import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Button, Dialog, Popover, Text } from "@radix-ui/themes";

/* Architectural gate — the nested-Escape layer-stack contract.
   Proves Radix's DismissableLayer escape stack survives THIS repo's pre-bundled dual-React setup: a
   single Escape must dismiss only the TOP layer, not every layer at once. That stack (a module-level
   `DismissableLayerContext.layers` Set + an `index === layers.size - 1` "is highest layer" check) is
   what lets us drop a hand-rolled `escapeStack` in favor of the primitive — but only if there is ONE
   DismissableLayer instance across the whole tree. If the pre-bundle split it into two Reacts/two module copies, each
   layer would see its own `layers` Set, both would think they're highest, and one Escape would collapse
   BOTH — the failure this fixture is here to catch for every floating component in the wave.

   Underscore-prefixed file → registry-guard-exempt, grouped under _internal. It drives overlays,
   so it lives here (never on a docs story). */

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

const meta: Meta = {
  title: "_internal/EscapeStack",
  // Mechanism-proof fixture, not a shipped component surface — axe off (same carve-out as _internal/Focus).
  parameters: { controls: { disable: true }, a11y: { test: "off" } },
};
export default meta;
type Story = StoryObj;

/** A raw Radix Popover nested inside a raw Radix Dialog (the showcased primitives — no System wrappers,
 *  several of which don't exist yet). The play opens both, then dispatches Escape twice and asserts the
 *  stack peels one layer at a time: Escape #1 closes only the Popover, Escape #2 closes the Dialog. */
export const NestedEscape: Story = {
  // Named so the gate is selectable by `vitest run -t "EscapeStack"`.
  name: "EscapeStack",
  render: () => (
    <Box p="5">
      <Dialog.Root>
        <Dialog.Trigger>
          <Button data-testid="escape-dialog-trigger">Open dialog…</Button>
        </Dialog.Trigger>
        <Dialog.Content data-testid="escape-dialog" maxWidth="440px">
          <Dialog.Title>Nested layers</Dialog.Title>
          <Dialog.Description size="2" mb="3">
            A Popover opens on top of this Dialog to exercise the DismissableLayer escape stack.
          </Dialog.Description>
          <Popover.Root>
            <Popover.Trigger>
              <Button data-testid="escape-popover-trigger">Open popover…</Button>
            </Popover.Trigger>
            <Popover.Content data-testid="escape-popover">
              <Text size="2">Top layer — one Escape closes only this.</Text>
            </Popover.Content>
          </Popover.Root>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    // 1. Open the Dialog (bottom layer).
    const dialogTrigger = canvasElement.querySelector<HTMLElement>('[data-testid="escape-dialog-trigger"]');
    if (!dialogTrigger) throw new Error("dialog trigger not found in the story canvas");
    dialogTrigger.click();
    const dialog = await waitFor(() => document.querySelector<HTMLElement>('[data-testid="escape-dialog"]'));

    // 2. Open the Popover nested inside it (top layer). Its trigger lives inside the portaled dialog.
    const popoverTrigger = dialog.querySelector<HTMLElement>('[data-testid="escape-popover-trigger"]');
    if (!popoverTrigger) throw new Error("popover trigger not found inside the open dialog");
    popoverTrigger.click();
    const popover = await waitFor(() => document.querySelector<HTMLElement>('[data-testid="escape-popover"]'));
    // Let both DismissableLayers register in the shared escape stack before we probe it.
    await sleep(30);

    // Both layers portal to <body> and BOTH carry role="dialog" (Radix's Popover primitive gives its
    // content role="dialog" too) — so we disambiguate by data-testid, never by role. Log what the running
    // DOM actually reports, for the record.
    console.info(
      `[EscapeStack] dialog role="${dialog.getAttribute("role")}" · popover role="${popover.getAttribute("role")}"`,
    );

    // Precondition: both must be open before the first Escape.
    if (!document.querySelector('[data-testid="escape-dialog"]') || !document.querySelector('[data-testid="escape-popover"]'))
      throw new Error("precondition failed: both the Dialog and the Popover must be open before Escape #1");

    // 3. Escape #1 — must close ONLY the top layer (Popover); the Dialog underneath survives.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await waitFor(() => !document.querySelector('[data-testid="escape-popover"]'));
    const dialogAfter1 = document.querySelector<HTMLElement>('[data-testid="escape-dialog"]');
    if (!dialogAfter1)
      throw new Error(
        "STACK COLLAPSE: Escape #1 closed the Dialog too — a single Escape dismissed BOTH layers. The " +
          "DismissableLayer escape singleton is likely split by the dual-React/pre-bundle setup.",
      );
    if (dialogAfter1.getAttribute("data-state") !== "open")
      throw new Error(
        `STACK COLLAPSE: Escape #1 started closing the Dialog (data-state="${dialogAfter1.getAttribute("data-state")}") ` +
          "— the stack failed to isolate the top layer.",
      );

    // 4. Escape #2 — now the Dialog is the top (only) layer and dismisses.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await waitFor(() => !document.querySelector('[data-testid="escape-dialog"]'));
  },
};
