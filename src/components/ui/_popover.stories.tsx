import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex, Text, TextField } from "@radix-ui/themes";
import { Popover } from "./Popover";
import { Button } from "./Button";

/* Test-only behavior for Popover — kept OUT of the docs stories (System/Popover) so viewing a docs page
   never opens + Escape-closes the panel on view (Storybook runs a story's play on view — that's the
   flicker). Underscore-prefixed file → guard-exempt, grouped under _internal. */

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

const meta: Meta<typeof Popover.Root> = {
  title: "_internal/Popover behavior",
  component: Popover.Root,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Popover.Root>;

function SharePopover() {
  return (
    <Popover.Root>
      <Popover.Trigger>
        <Button priority="secondary">Share…</Button>
      </Popover.Trigger>
      <Popover.Content maxWidth="288px" aria-label="Share this project">
        <Flex direction="column" gap="3">
          <Text size="2" weight="bold">Share “Orbit”</Text>
          <TextField.Root placeholder="name@company.com" aria-label="Email address" />
          <Popover.Close>
            <Button priority="primary">Send invite</Button>
          </Popover.Close>
        </Flex>
      </Popover.Content>
    </Popover.Root>
  );
}

/** The Popover contract: click opens a role="dialog" panel that carries the shared .rt-PopperContent
 *  base class (so it inherits the system popper motion), focus lands inside on a focusable control, and
 *  Escape dismisses the panel + returns focus to the trigger. */
export const Behavior: Story = {
  render: () => (
    <Box p="5">
      <SharePopover />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<HTMLElement>('button[aria-haspopup="dialog"]');
    if (!trigger) throw new Error('the trigger must carry aria-haspopup="dialog"');
    trigger.click();

    // Radix portals the panel to <body> with role="dialog" (a Popover is named content, not a menu).
    const dialog = await waitFor(() => document.querySelector<HTMLElement>('[role="dialog"]'));

    // Motion is inherited free: the content node carries the shared .rt-PopperContent base class, which
    // components.css binds to the popper tier — --ds-duration-overlay/--ds-ease-entry in and the longer
    // --ds-duration-emphasis/--ds-ease-standard out ([[motion-retiming]]) — no per-component motion CSS.
    const content = dialog.classList.contains("rt-PopperContent") ? dialog : dialog.querySelector<HTMLElement>(".rt-PopperContent");
    if (!content) throw new Error(`Popover content must carry the shared .rt-PopperContent base class; got "${dialog.className}"`);

    // Content is focusable: a real control lives inside, and focus lands within the open panel.
    const focusable = dialog.querySelector<HTMLElement>('input, button, [tabindex]');
    if (!focusable) throw new Error("an open Popover must contain a focusable control");
    if (!dialog.contains(document.activeElement)) throw new Error("focus must land inside the open Popover");

    // Escape closes the panel and returns focus to the trigger.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await waitFor(() => !document.querySelector('[role="dialog"]'));
    // waitFor rather than an immediate read: focus return lands a frame late under suite load
    // (three flaky sightings, dark lane only, always green in isolation). The requirement is
    // unchanged — focus MUST end on the trigger; it just gets the browser's frame to do it.
    await waitFor(() => document.activeElement === trigger).catch(() => {
      throw new Error("focus must return to the trigger on close");
    });
  },
};
