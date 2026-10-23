import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Text } from "@radix-ui/themes";
import { HoverCard } from "./HoverCard";

/* Test-only behavior for HoverCard — kept OUT of the docs stories (Components/Modals & Popovers/HoverCard)
   so viewing a docs page never opens the card on view. Underscore-prefixed file → registry/order/
   category-guard-exempt, grouped under _internal. */

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

const meta: Meta<typeof HoverCard.Root> = {
  title: "_internal/HoverCard behavior",
  component: HoverCard.Root,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof HoverCard.Root>;

/** Leaves the panel open so axe scans it in its open state (checklist item 56). */
export const OpenForAxe: Story = {
  render: () => (
    <Box p="6">
      <HoverCard.Root>
        <HoverCard.Trigger>
          <a href="#elena-ruiz" data-testid="hc-axe-trigger" style={{ color: "var(--ds-text-link)", textDecorationLine: "underline" }}>@elena-ruiz</a>
        </HoverCard.Trigger>
        <HoverCard.Content maxWidth="300px">
          <Text size="2" weight="bold">Elena Ruiz</Text>
          <Text as="p" size="1">Staff Engineer, Design Systems</Text>
        </HoverCard.Content>
      </HoverCard.Root>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<HTMLElement>('[data-testid="hc-axe-trigger"]');
    if (!trigger) throw new Error("the HoverCard trigger must render");
    // Keyboard focus opens a HoverCard immediately; the hover path waits on a delay.
    trigger.focus();
    const card = await waitFor(() => document.querySelector<HTMLElement>(".rt-HoverCardContent"));
    if (!card.isConnected) throw new Error("the hover card must still be open when the play ends");
    await sleep(300);
  },
};
