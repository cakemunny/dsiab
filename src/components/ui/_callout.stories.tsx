import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { Callout } from "./Callout";
import { Button } from "./Button";

/* Test-only behaviour for Callout, kept out of the docs stories. Underscore-prefixed, so the registry and
   story-order guards skip it, grouped under _internal. The docs suite runs at the small size only, so these
   plays render each size explicitly. */

const meta: Meta<typeof Callout> = {
  title: "_internal/Callout behavior",
  component: Callout,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Callout>;

const SIZES = ["1", "2", "3"] as const;

/** An inline action centres on the first text line at every size, the row keeps the height of one line, and a
 *  message that wraps keeps the action on its first line. */
export const InlineActionOnFirstLine: Story = {
  render: () => (
    <Box p="4" style={{ display: "grid", gap: 24, maxWidth: 520 }}>
      {SIZES.map((s) => (
        <Box key={s} data-testid={`inline-${s}`}>
          <Callout size={s} actionPlacement="inline" actions={<Button size={s} priority="secondary">Retry</Button>}>
            Sync failed.
          </Callout>
        </Box>
      ))}
      <Box data-testid="inline-wrap" style={{ maxWidth: 260 }}>
        <Callout size="3" actionPlacement="inline" actions={<Button size="3" priority="secondary">Retry</Button>}>
          Sync failed for the shared drive and two of its folders.
        </Callout>
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const measure = (id: string) => {
      const root = canvasElement.querySelector(`[data-testid="${id}"] .rt-CalloutRoot`)!;
      const btn = root.querySelector("button")!.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(root.querySelector(".rt-CalloutText")!);
      const lines = [...range.getClientRects()];
      const first = lines[0];
      const lineH = parseFloat(getComputedStyle(root).getPropertyValue("--callout-icon-height"));
      const pad = parseFloat(getComputedStyle(root).paddingTop) + parseFloat(getComputedStyle(root).paddingBottom);
      return {
        offset: btn.top + btn.height / 2 - (first.top + first.height / 2),
        rows: new Set(lines.map((l) => Math.round(l.top))).size,
        height: root.getBoundingClientRect().height,
        oneLine: pad + lineH,
      };
    };
    for (const s of SIZES) {
      const m = measure(`inline-${s}`);
      if (Math.abs(m.offset) > 1) throw new Error(`size ${s}: the inline action must centre on the first line; it sits ${m.offset.toFixed(1)}px off`);
      if (Math.abs(m.height - m.oneLine) > 1)
        throw new Error(`size ${s}: a one-line Callout must be its padding plus one line, ${m.oneLine}px; it is ${m.height}px`);
    }
    const wrap = measure("inline-wrap");
    if (wrap.rows < 2) throw new Error("the wrapping case must wrap to test it");
    if (Math.abs(wrap.offset) > 1) throw new Error(`a wrapping message must keep the action on its first line; it sits ${wrap.offset.toFixed(1)}px off`);
  },
};
