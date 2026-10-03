import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex, Text } from "@radix-ui/themes";
import { resetWarnings } from "../../theme/detectAndWarn";
import { Button } from "./Button";
import { ScrollArea } from "./ScrollArea";

/* Test-only behaviour for ScrollArea, kept out of the docs stories (System/Container/ScrollArea).
   Underscore-prefixed file, so it is registry-guard-exempt and grouped under _internal.

   What this guards: A SCROLLER THAT HOLDS ONLY TEXT IS A NAMED KEYBOARD STOP. Radix puts no tab stop,
   role or name on the viewport. Chromium 130 and later make a scroller with nothing focusable inside
   focusable on their own, as a generic node, and a browser without that behaviour leaves the text below
   the fold out of reach by keyboard. So the system gives an overflowing, text-only viewport
   `tabIndex={0}`, gives a named viewport `role="region"`, and warns in development when the stop has no
   name. A scroller that holds a control, one that fits its content, and one whose caller passed a
   `tabIndex` all keep what they had. */

const LINES = Array.from({ length: 30 }, (_, i) => `Release note line ${i + 1}`);
const BOX = { width: 220, height: 120 };

function Notes() {
  return (
    <Box p="3">
      {LINES.map((line) => <Text as="p" size="2" key={line}>{line}</Text>)}
    </Box>
  );
}

const meta: Meta<typeof ScrollArea> = {
  title: "_internal/ScrollArea behavior",
  component: ScrollArea,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof ScrollArea>;

export const TextOnlyStop: Story = {
  render: () => (
    <Flex gap="4" p="4" wrap="wrap">
      <ScrollArea data-testid="unnamed" type="always" scrollbars="vertical" style={BOX}><Notes /></ScrollArea>
      <ScrollArea data-testid="named" aria-label="Release notes" type="always" scrollbars="vertical" style={BOX}><Notes /></ScrollArea>
      <ScrollArea data-testid="with-control" aria-label="Release notes with a control" type="always" scrollbars="vertical" style={BOX}>
        <Box p="3"><Button priority="secondary">Load more</Button></Box>
        <Notes />
      </ScrollArea>
      <ScrollArea data-testid="fits" aria-label="One short note" type="always" scrollbars="vertical" style={BOX}>
        <Box p="3"><Text size="2">One short line.</Text></Box>
      </ScrollArea>
      {/* A control inside means the system would add no stop, so a stop here can only be the caller's. */}
      <ScrollArea data-testid="caller-tabindex" aria-label="Notes with a control" tabIndex={0} type="always" scrollbars="vertical" style={BOX}>
        <Box p="3"><Button priority="secondary">Load more</Button></Box>
        <Notes />
      </ScrollArea>
    </Flex>
  ),
  play: async ({ canvasElement, mount }) => {
    // The warning is capped at once per page, so the cap is reset and the spy installed BEFORE mount.
    // The stop arrives one render after mount, once the viewport is measured, so the spy stays in
    // place until the unnamed viewport carries its tab stop.
    const originalWarn = console.warn;
    const warnings: string[] = [];
    console.warn = (...a: unknown[]) => { warnings.push(String(a[0])); };
    resetWarnings();
    const viewport = (id: string) => {
      const el = canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`);
      if (!el) throw new Error(`the "${id}" scroller must render`);
      return el;
    };
    try {
      await mount();
      const t0 = performance.now();
      while (viewport("unnamed").getAttribute("tabindex") !== "0" && performance.now() - t0 < 1500) {
        const { promise, resolve } = Promise.withResolvers<void>();
        setTimeout(resolve, 20);
        await promise;
      }
    } finally {
      console.warn = originalWarn;
    }

    const unnamed = viewport("unnamed");
    if (unnamed.scrollHeight <= unnamed.clientHeight) throw new Error("the unnamed fixture must overflow, or it proves nothing");
    if (unnamed.getAttribute("tabindex") !== "0")
      throw new Error(`an overflowing, text-only viewport must be a tab stop (tabindex 0, WCAG 2.1.1), got ${unnamed.getAttribute("tabindex")}`);
    if (unnamed.hasAttribute("role"))
      throw new Error(`a viewport with no name must not take role="region", which needs a name, got role="${unnamed.getAttribute("role")}"`);
    if (!warnings.some((m) => m.includes("ScrollArea is a keyboard stop with no accessible name")))
      throw new Error("a focusable viewport with no name must warn in development (WCAG 4.1.2)");

    const named = viewport("named");
    if (named.getAttribute("tabindex") !== "0" || named.getAttribute("role") !== "region")
      throw new Error(`a named, text-only viewport must be a region with a tab stop, got tabindex ${named.getAttribute("tabindex")}, role ${named.getAttribute("role")}`);

    const withControl = viewport("with-control");
    if (withControl.scrollHeight <= withControl.clientHeight) throw new Error("the with-control fixture must overflow, or it proves nothing");
    if (withControl.hasAttribute("tabindex"))
      throw new Error(`a viewport that holds a control is reached through it and must take no stop of its own, got tabindex ${withControl.getAttribute("tabindex")}`);

    const fits = viewport("fits");
    if (fits.hasAttribute("tabindex"))
      throw new Error(`a viewport that does not overflow has nothing to scroll and must take no stop, got tabindex ${fits.getAttribute("tabindex")}`);
    if (fits.getAttribute("role") !== "region") throw new Error("a named viewport must take role=\"region\" whether or not it scrolls");

    const callerTabIndex = viewport("caller-tabindex");
    if (callerTabIndex.getAttribute("tabindex") !== "0")
      throw new Error(`a caller's own tabIndex must win over the system's choice, got ${callerTabIndex.getAttribute("tabindex")}`);
  },
};
