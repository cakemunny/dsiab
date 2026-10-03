import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Text } from "@radix-ui/themes";
import { Collapsible, CollapsibleGroup } from "./Collapsible";

/* Test-only behavior for Collapsible — kept OUT of the docs stories (System/Collapsible) so viewing a
   docs page doesn't drive the disclosure (these plays open/close items and move focus → a state flip and
   a height animation on view). Underscore-prefixed file → registry-guard-exempt, grouped under
   _internal. */

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

const toMs = (v: string) => (v.trim().endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000);

const meta: Meta<typeof Collapsible> = {
  title: "_internal/Collapsible behavior",
  component: Collapsible,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Collapsible>;

/** [[collapsible-and-accordion]] aria wiring (aria-expanded + aria-controls → content id) + [[collapsible-and-accordion]] expand motion
 *  resolving --ds-duration-overlay (proving the CSS height animation is wired to the rendered node). */
export const Disclosure: Story = {
  render: () => (
    <Box p="4">
      <Box style={{ width: 320 }}>
        <Collapsible trigger="Advanced settings">
          <Text size="2" style={{ color: "var(--ds-text-weak)" }}>Region, retention window, and export format.</Text>
        </Collapsible>
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<HTMLElement>(".rt-ds-collapsible-trigger");
    if (!trigger) throw new Error("behavior story must render a Collapsible trigger");

    // (1) aria wiring at rest: default closed ([[collapsible-and-accordion]]), aria-expanded='false'. aria-controls is only set by
    //     Radix once open (it points at the content id), so it's asserted after opening below.
    if (trigger.getAttribute("data-state") !== "closed")
      throw new Error(`Collapsible must default closed ([[collapsible-and-accordion]]); got data-state=${trigger.getAttribute("data-state")}`);
    if (trigger.getAttribute("aria-expanded") !== "false")
      throw new Error("a closed trigger must be aria-expanded='false'");

    // (2) open it — the content mounts with data-state='open'.
    trigger.click();
    const content = await waitFor(() =>
      canvasElement.querySelector<HTMLElement>('.rt-ds-collapsible-content[data-state="open"]'),
    );
    if (trigger.getAttribute("aria-expanded") !== "true")
      throw new Error("an open trigger must be aria-expanded='true'");
    // aria-controls → the content id: wired for free by the primitive.
    const controls = trigger.getAttribute("aria-controls");
    if (!controls || controls !== content.id)
      throw new Error(`trigger aria-controls must point at the content id; got aria-controls=${controls} vs content id=${content.id}`);

    // (3) [[collapsible-and-accordion]] motion: the expand animation opens on OUR popper tier (--ds-duration-overlay), read live
    //     off the rendered content — proving components.css's height animation is wired to the node, not
    //     just present. The SAME token clamps to ~0 under prefers-reduced-motion (motion.css), so this
    //     assertion also proves reduced-motion is honored structurally (the CSS references the token,
    //     never a hardcoded ms).
    const wantMs = toMs(getComputedStyle(content).getPropertyValue("--ds-duration-overlay"));
    const gotMs = toMs(getComputedStyle(content).animationDuration.split(",")[0]);
    if (Math.abs(gotMs - wantMs) > 1)
      throw new Error(`expand animation must use --ds-duration-overlay (${wantMs}ms); got ${gotMs}ms`);
  },
};

/** [[collapsible-and-accordion]]: single-mode CollapsibleGroup is ALWAYS closable to none (collapsible=true forced) + arrow-key
 *  roving nav moves focus between triggers. */
export const GroupSingle: Story = {
  render: () => (
    <Box p="4">
      <Box style={{ width: 320 }}>
        <CollapsibleGroup.Root type="single" dividers="between">
          <CollapsibleGroup.Item value="a" trigger="First section">
            <Text size="2" style={{ color: "var(--ds-text-weak)" }}>Content of the first section.</Text>
          </CollapsibleGroup.Item>
          <CollapsibleGroup.Item value="b" trigger="Second section">
            <Text size="2" style={{ color: "var(--ds-text-weak)" }}>Content of the second section.</Text>
          </CollapsibleGroup.Item>
          <CollapsibleGroup.Item value="c" trigger="Third section">
            <Text size="2" style={{ color: "var(--ds-text-weak)" }}>Content of the third section.</Text>
          </CollapsibleGroup.Item>
        </CollapsibleGroup.Root>
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector<HTMLElement>(".rt-ds-accordion");
    if (!group) throw new Error("behavior story must render the accordion group");
    const triggers = [...group.querySelectorAll<HTMLButtonElement>(".rt-ds-collapsible-trigger")];
    if (triggers.length !== 3) throw new Error(`expected 3 triggers; got ${triggers.length}`);
    const [first, second] = triggers;

    // (1) all closed to start (no defaultValue).
    if (group.querySelector('[data-state="open"]'))
      throw new Error("the group must start with every item closed (no defaultValue)");

    // (2) open the first item.
    first.click();
    await waitFor(() => group.querySelector('.rt-ds-accordion-content[data-state="open"]'));
    if (first.getAttribute("aria-expanded") !== "true")
      throw new Error("clicking a closed item must open it (aria-expanded='true')");

    // (3) THE [[collapsible-and-accordion]] PROOF — re-click the open item closes it to NONE (collapsible=true forced for single;
    //     Radix's default false would leave it stuck open). No item stays open.
    first.click();
    await sleep(0);
    if (first.getAttribute("aria-expanded") !== "false")
      throw new Error("single-mode: re-clicking the open item must close it (collapsible=true) — got aria-expanded still true");
    if (group.querySelector('.rt-ds-accordion-content[data-state="open"]'))
      throw new Error("single-mode must be closable to NONE; an item stayed open");

    // (4) arrow-key roving nav between triggers (a free a11y upgrade). ArrowDown → next trigger.
    first.focus();
    if (document.activeElement !== first) throw new Error("focusing the first trigger should land on it");
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await sleep(0);
    if (document.activeElement !== second)
      throw new Error("ArrowDown must move the roving focus to the next trigger");
  },
};
