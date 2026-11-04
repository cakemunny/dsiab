import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { analyseBrand } from "../palette/brandAnalysis";
import { parseSeed } from "../palette/parseSeed";

/* ONE SEED'S FULL SEARCH, TIMED IN THE BROWSER ([[generated-helper-layers]]).

   `analyseBrand` runs the filled-button search, the collision choice and every
   helper-layer search for both appearances. The custom-accent plan budgets it
   at 16 ms per seed in the browser, one frame, so a consumer's settings screen
   can re-run it as someone types. This times five seeds that take different
   paths (an adjusted shade, a gamut-clamped shade, a seed as typed, a pale and
   a dark seed), each nine times after three warm-up runs, and holds the median
   of each under the budget. A median, because one run can be stretched by
   whatever else the machine is doing. */

const meta: Meta = { title: "_internal/Brand analysis timing" };
export default meta;
type Story = StoryObj;

const BUDGET_MS = 16;
const SEEDS = ["#3b82f6", "#ff8c00", "#6e56cf", "#fff59d", "#0b1a3a"];

export const OneSeedUnderAFrame: Story = {
  render: () => <Box data-testid="probe" />,
  play: async () => {
    const slow: string[] = [];
    const medians: string[] = [];
    for (const s of SEEDS) {
      const p = parseSeed(s);
      if (!p.ok) throw new Error(`${s} did not parse`);
      for (let i = 0; i < 3; i++) analyseBrand(p.rgb);
      const runs: number[] = [];
      for (let i = 0; i < 9; i++) {
        const t0 = performance.now();
        analyseBrand(p.rgb);
        runs.push(performance.now() - t0);
      }
      runs.sort((a, b) => a - b);
      const median = runs[4]!;
      medians.push(`${s} ${median.toFixed(1)} ms`);
      if (median >= BUDGET_MS) slow.push(`${s}: median ${median.toFixed(1)} ms over ${runs.length} runs`);
    }
    if (slow.length) throw new Error(`the brand analysis runs past ${BUDGET_MS} ms:\n${slow.join("\n")}\n(all: ${medians.join(", ")})`);
  },
};
