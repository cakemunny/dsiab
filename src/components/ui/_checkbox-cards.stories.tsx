import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex, Text } from "@radix-ui/themes";
import { ChartLineUp, Headset, BellSimple } from "@phosphor-icons/react";
import { CheckboxCards } from "./CheckboxCards";

/* Test-only behavior for CheckboxCards — kept OUT of the docs stories (System/Choice/CheckboxCards) so
   viewing a docs page never flashes a driven interaction on view (Storybook runs a story's play on view).
   Underscore-prefixed file → guard-exempt, grouped under _internal. */

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

const stateOf = (label: Element) => label.querySelector(".rt-CheckboxCardCheckbox")?.getAttribute("data-state");

const meta: Meta<typeof CheckboxCards.Root> = {
  title: "_internal/CheckboxCards behavior",
  component: CheckboxCards.Root,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof CheckboxCards.Root>;

function AddonCard({ value, icon, title, desc }: { value: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <CheckboxCards.Item value={value}>
      <Flex align="center" gap="3" style={{ flex: 1, minWidth: 0 }}>
        <Box style={{ color: "var(--ds-text-weak)", display: "flex", flexShrink: 0 }}>{icon}</Box>
        <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
          <Text as="div" size="2" weight="medium" style={{ color: "var(--ds-text-strong)" }}>{title}</Text>
          <Text as="div" size="1" style={{ color: "var(--ds-text-weak)" }}>{desc}</Text>
        </Flex>
      </Flex>
    </CheckboxCards.Item>
  );
}

/** The multi-select contract: an uncontrolled group starts empty; clicking two cards checks BOTH at once
 *  (unlike a radio, where a second pick clears the first); clicking a checked card again unchecks just it. */
export const MultiSelect: Story = {
  render: () => (
    <Box p="5" style={{ maxWidth: 640 }}>
      <CheckboxCards.Root columns="1" gap="2" aria-label="Plan add-ons">
        <AddonCard value="analytics" icon={<ChartLineUp size={20} />} title="Analytics" desc="Dashboards and exports" />
        <AddonCard value="support" icon={<Headset size={20} />} title="Priority support" desc="24/7 response, 1h SLA" />
        <AddonCard value="alerts" icon={<BellSimple size={20} />} title="Realtime alerts" desc="Push + email on thresholds" />
      </CheckboxCards.Root>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const cards = [...canvasElement.querySelectorAll<HTMLElement>(".rt-CheckboxCardsItem")];
    if (cards.length !== 3) throw new Error(`expected 3 cards; got ${cards.length}`);

    // Uncontrolled → everything starts unchecked.
    if (cards.some((c) => stateOf(c) !== "unchecked")) throw new Error("all cards must start unchecked");

    // Click the FIRST card — its whole label is the target (the inner checkbox has pointer-events:none).
    cards[0].click();
    await waitFor(() => stateOf(cards[0]) === "checked");

    // Click the SECOND card — multi-select means the FIRST stays checked (a radio would clear it).
    cards[1].click();
    await waitFor(() => stateOf(cards[1]) === "checked");
    if (stateOf(cards[0]) !== "checked") throw new Error("multi-select: picking a second card must NOT clear the first");
    if (stateOf(cards[2]) !== "unchecked") throw new Error("an untouched card must stay unchecked");

    // Click the FIRST card again — it unchecks, and only it (the second stays checked).
    cards[0].click();
    await waitFor(() => stateOf(cards[0]) === "unchecked");
    if (stateOf(cards[1]) !== "checked") throw new Error("unchecking one card must not disturb the other");
  },
};
