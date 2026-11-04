import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { Switch } from "./Switch";

/* Test-only behavior for Switch — kept OUT of the docs stories (System/Choice/Switch) so viewing a docs
   page never flips the toggle on view (Storybook runs a story's play on view). Underscore-prefixed file →
   guard-exempt, grouped under _internal. */

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

const meta: Meta<typeof Switch> = {
  title: "_internal/Switch behavior",
  component: Switch,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Switch>;

/** An uncontrolled switch in a labeled row — the toggle contract lives here, not in the docs story. */
function SettingToggle() {
  return (
    <Flex gap="2" align="center">
      <Switch id="notify" />
      <Text as="label" htmlFor="notify" size="2" style={{ color: "var(--ds-text-strong)" }}>Enable notifications</Text>
    </Flex>
  );
}

/** The toggle contract: an uncontrolled switch starts unchecked, clicking the real control flips
 *  aria-checked false → true, and clicking again flips it back to false. */
export const Toggle: Story = {
  render: () => (
    <Box p="5">
      <SettingToggle />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector<HTMLElement>('button[role="switch"]');
    if (!sw) throw new Error('the control must render role="switch"');
    if (sw.getAttribute("aria-checked") !== "false")
      throw new Error(`an uncontrolled switch starts unchecked; got aria-checked="${sw.getAttribute("aria-checked")}"`);

    // Click the REAL control (not a programmatic state poke) → aria-checked flips false → true.
    sw.click();
    await waitFor(() => sw.getAttribute("aria-checked") === "true");

    // Click it again → back to false.
    sw.click();
    await waitFor(() => sw.getAttribute("aria-checked") === "false");
  },
};

/** The ref reaches the Radix switch element in both modes, and the label prop's label toggles it. */
function RefProbe() {
  const bare = useRef<HTMLButtonElement>(null);
  const labelled = useRef<HTMLButtonElement>(null);
  const [seen, setSeen] = useState("");
  useEffect(() => {
    setSeen([bare.current, labelled.current].map((el) => (el?.getAttribute("role") === "switch" ? "switch" : "none")).join(","));
  }, []);
  return (
    <Flex direction="column" gap="3" data-ref-seen={seen}>
      <Switch ref={bare} aria-label="Bare probe" />
      <Switch ref={labelled} label="Labelled probe" description="Helper line." />
    </Flex>
  );
}

export const RefAndLabel: Story = {
  render: () => (
    <Box p="5">
      <RefProbe />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const seen = await waitFor(() => canvasElement.querySelector("[data-ref-seen]")?.getAttribute("data-ref-seen"));
    if (seen !== "switch,switch") throw new Error(`the ref must reach the switch in both modes; got "${seen}"`);
    const label = await waitFor(() => Array.from(canvasElement.querySelectorAll("label")).find((l) => l.textContent === "Labelled probe"));
    const sw = document.getElementById(label.htmlFor);
    if (sw?.getAttribute("role") !== "switch") throw new Error("the label prop's label must name the switch");
    // Clicking the LABEL flips the switch — the row's whole label is a target.
    label.click();
    await waitFor(() => sw.getAttribute("aria-checked") === "true");
  },
};
