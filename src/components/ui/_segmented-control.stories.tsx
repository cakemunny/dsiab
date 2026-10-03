import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { SegmentedControl } from "./SegmentedControl";

/* Test-only behavior for SegmentedControl — kept OUT of the docs stories (System/Choice/SegmentedControl)
   so viewing a docs page never drives the row on view (Storybook runs a story's play on view). The docs
   The docs Usage play is passive (asserts the rendered contract only); the click-to-select behavior lives here.
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

const meta: Meta<typeof SegmentedControl.Root> = {
  title: "_internal/SegmentedControl behavior",
  component: SegmentedControl.Root,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof SegmentedControl.Root>;

function SortRow() {
  return (
    <SegmentedControl.Root defaultValue="newest" aria-label="Sort order" data-testid="sort">
      <SegmentedControl.Item value="newest">Newest</SegmentedControl.Item>
      <SegmentedControl.Item value="oldest">Oldest</SegmentedControl.Item>
      <SegmentedControl.Item value="popular">Popular</SegmentedControl.Item>
    </SegmentedControl.Root>
  );
}

/** The selection contract: clicking a non-selected segment moves the selection to it — its
 *  aria-checked / data-state flips to selected, and the previously-selected segment deselects. */
export const Select: Story = {
  render: () => (
    <Box p="5">
      <SortRow />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector<HTMLElement>('[data-testid="sort"]');
    if (!root) throw new Error("must render the sort SegmentedControl");
    const segments = [...root.querySelectorAll<HTMLElement>('button[role="radio"]')];
    // The Item renders the label twice (active + an aria-hidden inactive span), so match on the active
    // label span rather than the doubled textContent.
    const byLabel = (t: string) => {
      const el = segments.find((s) => s.querySelector(".rt-SegmentedControlItemLabelActive")?.textContent?.trim() === t);
      if (!el) throw new Error(`no segment labelled "${t}"`);
      return el;
    };

    const newest = byLabel("Newest");
    const popular = byLabel("Popular");

    // Baseline: the uncontrolled row defaults to "Newest" selected, "Popular" not.
    if (newest.getAttribute("aria-checked") !== "true" || newest.getAttribute("data-state") !== "on")
      throw new Error(`baseline: "Newest" must start selected (aria-checked=true, data-state=on); got aria-checked="${newest.getAttribute("aria-checked")}" data-state="${newest.getAttribute("data-state")}"`);
    if (popular.getAttribute("aria-checked") === "true")
      throw new Error(`baseline: "Popular" must start deselected`);

    // Drive: click a non-selected segment.
    popular.click();

    // The clicked segment becomes selected…
    await waitFor(() => popular.getAttribute("aria-checked") === "true");
    if (popular.getAttribute("data-state") !== "on")
      throw new Error(`after click: "Popular" must carry data-state="on"; got "${popular.getAttribute("data-state")}"`);
    // …and the previously-selected segment deselects (mutual exclusion).
    if (newest.getAttribute("aria-checked") === "true" || newest.getAttribute("data-state") === "on")
      throw new Error(`after click: "Newest" must deselect; got aria-checked="${newest.getAttribute("aria-checked")}" data-state="${newest.getAttribute("data-state")}"`);

    // Exactly one segment is selected at any time.
    const selected = segments.filter((s) => s.getAttribute("aria-checked") === "true");
    if (selected.length !== 1)
      throw new Error(`exactly one segment must be selected after the click; got ${selected.length}`);
  },
};
