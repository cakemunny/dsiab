import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex, Text } from "@radix-ui/themes";
import { Truck, Lightning, Package } from "@phosphor-icons/react";
import { RadioCards } from "./RadioCards";

/* Test-only behavior for RadioCards — kept OUT of the docs stories (System/Choice/RadioCards) so viewing
   a docs page never drives the selection on view. Underscore-prefixed file → guard-exempt, grouped under
   _internal. Storybook runs a story's play on view, so the driving lives here, not in the docs Usage story. */

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

const meta: Meta<typeof RadioCards.Root> = {
  title: "_internal/RadioCards behavior",
  component: RadioCards.Root,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof RadioCards.Root>;

/** An uncontrolled card set, nothing selected at rest — the play drives the single-select contract. */
function ShippingPicker() {
  const cards: { value: string; icon: React.ReactNode; title: string; sub: string }[] = [
    { value: "standard", icon: <Truck weight="fill" />, title: "Standard", sub: "$5 — 5–7 business days" },
    { value: "express", icon: <Lightning weight="fill" />, title: "Express", sub: "$15 — 2 business days" },
    { value: "overnight", icon: <Package weight="fill" />, title: "Overnight", sub: "$30 — next business day" },
  ];
  return (
    <RadioCards.Root columns={{ initial: "1", sm: "3" }} gap="3" aria-label="Shipping speed">
      {cards.map((c) => (
        <RadioCards.Item key={c.value} value={c.value}>
          <Flex direction="column" gap="1" width="100%">
            <Flex align="center" gap="2">
              <Text style={{ color: "var(--ds-text-strong)", display: "flex" }}>{c.icon}</Text>
              <Text size="2" weight="bold" style={{ color: "var(--ds-text-strong)" }}>{c.title}</Text>
            </Flex>
            <Text size="1" style={{ color: "var(--ds-text-weak)" }}>{c.sub}</Text>
          </Flex>
        </RadioCards.Item>
      ))}
    </RadioCards.Root>
  );
}

/** Single-select contract: click one card selects it; clicking a different card DESELECTS the first — the
 *  set holds exactly one selection at a time (never two, never zero once a choice is made). */
export const SingleSelect: Story = {
  render: () => (
    <Box p="5">
      <ShippingPicker />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const cards = [...canvasElement.querySelectorAll<HTMLButtonElement>(".rt-RadioCardsItem")];
    if (cards.length < 2) throw new Error("SingleSelect needs at least two cards");
    const checkedCount = () => canvasElement.querySelectorAll('.rt-RadioCardsItem[data-state="checked"]').length;

    // The group is a radiogroup, and nothing is selected at rest (uncontrolled, no defaultValue).
    const root = canvasElement.querySelector<HTMLElement>(".rt-RadioCardsRoot");
    if (root?.getAttribute("role") !== "radiogroup") throw new Error(`expected role="radiogroup"; got ${root?.getAttribute("role")}`);
    if (checkedCount() !== 0) throw new Error(`expected no card selected at rest; got ${checkedCount()}`);

    // Click the first card → it becomes the sole selection.
    cards[0].click();
    await waitFor(() => cards[0].getAttribute("data-state") === "checked");
    if (checkedCount() !== 1) throw new Error(`exactly one card must be selected after the first click; got ${checkedCount()}`);

    // Click a different card → the first DESELECTS, the second becomes the sole selection.
    cards[1].click();
    await waitFor(() => cards[1].getAttribute("data-state") === "checked");
    if (cards[0].getAttribute("data-state") !== "unchecked")
      throw new Error(`single-select: the first card must DESELECT when a second is chosen; got data-state="${cards[0].getAttribute("data-state")}"`);
    if (checkedCount() !== 1) throw new Error(`single-select: exactly one card selected at a time; got ${checkedCount()}`);
  },
};
