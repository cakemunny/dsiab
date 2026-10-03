import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { OverflowList, type OverflowItem } from "./OverflowList";

/* Test-only BEHAVIOR for OverflowList — kept OUT of the docs stories (System/OverflowList) so viewing a
   docs page never drives a resize/recompute. Underscore-prefixed file → registry-guard-exempt, grouped
   under _internal.

   The whole engine is DOM-measurement-driven, so these use FIXED-width children + a FIXED-width indicator
   so the greedy-fit math is deterministic (the pure arithmetic itself is covered on the node lane by
   computeVisibleCount.logic.test.ts). Container 300 / items 80px / indicator 40px / gap 0:
     i0 80 (+40 reserve) → 120 ✓ · i1 160 (+40) → 200 ✓ · i2 240 (+40) → 280 ✓ · i3 320 (+40) → 360 ✗
     → 3 visible, 2 folded. Narrow to 150 → only 1 fits. minVisibleItems=3 at width 60 → floor keeps 3. */

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

/** A fixed-width indicator (span), so indicatorWidth is exactly 40 regardless of font metrics. */
const fixedIndicator = (items: OverflowItem[]) =>
  items.length > 0 ? (
    <span data-testid="more" style={{ display: "inline-flex", width: 40, flexShrink: 0 }}>
      +{items.length}
    </span>
  ) : null;

function Harness({
  width,
  items = 5,
  itemWidth = 80,
  minVisibleItems = 0,
  collapseFrom = "end",
  useDefault = false,
}: {
  width: number;
  items?: number;
  itemWidth?: number;
  minVisibleItems?: number;
  collapseFrom?: "start" | "end";
  useDefault?: boolean;
}) {
  return (
    <Box data-testid="box" style={{ width, padding: 0 }}>
      <OverflowList
        gap={0}
        minVisibleItems={minVisibleItems}
        collapseFrom={collapseFrom}
        label="Test row"
        {...(useDefault ? {} : { overflowRenderer: fixedIndicator })}
      >
        {Array.from({ length: items }, (_, i) => (
          <div
            key={i}
            className="ov-item"
            data-id={i}
            style={{ width: itemWidth, height: 20, flexShrink: 0, background: "var(--ds-fill-accent-weak)" }}
          >
            {i}
          </div>
        ))}
      </OverflowList>
    </Box>
  );
}

// Visible / measurement DOM handles + the ids currently shown in the visible row.
const parts = (canvas: HTMLElement) => {
  const box = canvas.querySelector<HTMLElement>('[data-testid="box"]')!;
  const visible = box.querySelector<HTMLElement>(".rt-ds-overflowlist")!;
  const measure = box.querySelector<HTMLElement>(".rt-ds-overflowlist-measure")!;
  const visibleIds = () =>
    Array.from(visible.querySelectorAll<HTMLElement>(".ov-item")).map((el) => Number(el.dataset.id));
  return { box, visible, measure, visibleIds };
};

const meta: Meta<typeof OverflowList> = {
  title: "_internal/OverflowList behavior",
  component: OverflowList,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof OverflowList>;

/** A row wider than its container collapses: some items fold into "+N", the folded ones leave the visible
 *  DOM (and the a11y tree), and the hidden measurement twin is inert + aria-hidden and holds everything. */
export const CollapsesToPlusN: Story = {
  render: () => <Harness width={300} />,
  play: async ({ canvasElement }) => {
    const { visible, measure, visibleIds } = parts(canvasElement);

    // Settles to 3 visible (the deterministic math above).
    await waitFor(() => visibleIds().length === 3);

    const shown = visibleIds();
    if (shown.length >= 5) throw new Error(`expected overflow (visible < 5); got ${shown.length}`);
    // collapseFrom='end' keeps the LEADING items.
    if (shown.join(",") !== "0,1,2") throw new Error(`expected visible ids 0,1,2; got ${shown.join(",")}`);

    // The indicator shows the correct hidden count (5 − 3 = 2).
    const more = visible.querySelector<HTMLElement>('[data-testid="more"]');
    if (!more) throw new Error('missing "+N" indicator in the visible row');
    if (more.textContent !== "+2") throw new Error(`expected "+2"; got "${more.textContent}"`);

    // The folded items (3, 4) are NOT in the visible row — they left the a11y tree.
    if (visible.querySelector('.ov-item[data-id="3"]') || visible.querySelector('.ov-item[data-id="4"]'))
      throw new Error("a folded item is still in the VISIBLE row (should have left the a11y tree)");

    // The measurement twin is out of the a11y tree and holds ALL items + the indicator.
    if (measure.getAttribute("aria-hidden") !== "true") throw new Error("measurement copy must be aria-hidden");
    if (!measure.hasAttribute("inert")) throw new Error("measurement copy must be inert");
    if (measure.querySelectorAll(".ov-item").length !== 5)
      throw new Error("measurement copy must hold ALL items");
    if (!measure.querySelector('[data-testid="more"]'))
      throw new Error("measurement copy must hold the indicator (measured at max width)");
  },
};

/** Shrinking the container recomputes via the shared ResizeObserver: fewer items fit. */
export const ResizeRecomputes: Story = {
  render: () => <Harness width={300} />,
  play: async ({ canvasElement }) => {
    const { box, visibleIds } = parts(canvasElement);

    await waitFor(() => visibleIds().length === 3);

    // Narrow the container — the observer fires and only 1 item fits (i0 90 ✓ · i1 200 > 150 ✗).
    box.style.width = "150px";
    await waitFor(() => visibleIds().length === 1);
    if (visibleIds().join(",") !== "0") throw new Error(`after resize expected id 0 only; got ${visibleIds().join(",")}`);

    // Widen it back — grows to all 5 (no overflow).
    box.style.width = "600px";
    await waitFor(() => visibleIds().length === 5);
  },
};

/** minVisibleItems is a hard floor: even when nothing fits, at least N stay. */
export const MinVisibleFloor: Story = {
  render: () => <Harness width={60} minVisibleItems={3} />,
  play: async ({ canvasElement }) => {
    const { visibleIds } = parts(canvasElement);
    // Container 60 fits nothing, but the floor keeps 3 (ids 0,1,2).
    await waitFor(() => visibleIds().length === 3);
    if (visibleIds().join(",") !== "0,1,2") throw new Error(`floor should keep ids 0,1,2; got ${visibleIds().join(",")}`);
  },
};

/** collapseFrom='start' keeps the TRAILING items and puts "+N" first. */
export const CollapseFromStart: Story = {
  render: () => <Harness width={300} collapseFrom="start" />,
  play: async ({ canvasElement }) => {
    const { visible, visibleIds } = parts(canvasElement);
    // 3 fit; from the start means the last 3 survive (ids 2,3,4), the first 2 fold.
    await waitFor(() => visibleIds().length === 3);
    if (visibleIds().join(",") !== "2,3,4") throw new Error(`expected trailing ids 2,3,4; got ${visibleIds().join(",")}`);

    // The "+N" leads the row (it is the first child of the visible container).
    const first = visible.firstElementChild as HTMLElement | null;
    if (!first || first.getAttribute("data-testid") !== "more")
      throw new Error("collapseFrom='start' must render the indicator FIRST");
    if (first.textContent !== "+2") throw new Error(`expected "+2"; got "${first?.textContent}"`);
  },
};

/** The DEFAULT indicator is a neutral gray Badge "+N" that is non-interactive and carries a hidden
 *  "N more" accessible name (the count, not a control). */
export const DefaultIndicatorIsCountBadge: Story = {
  render: () => <Harness width={150} useDefault />,
  play: async ({ canvasElement }) => {
    const { visible, visibleIds } = parts(canvasElement);
    await waitFor(() => visibleIds().length < 5);

    const hidden = 5 - visibleIds().length;
    const badge = visible.querySelector<HTMLElement>(".rt-Badge");
    if (!badge) throw new Error("default indicator must be a .rt-Badge");
    // The VISIBLE glyph is the aria-hidden span; the badge's own textContent also carries the
    // visually-hidden "N more" that gives the count a real accessible name (an aria-label on a
    // name-prohibited generic can be dropped by AT), so assert on the glyph, not the whole node.
    const glyph = badge.querySelector<HTMLElement>("[aria-hidden]");
    if (glyph?.textContent !== `+${hidden}`) throw new Error(`badge glyph should be "+${hidden}"; got "${glyph?.textContent}"`);
    if (badge.getAttribute("aria-label") !== `${hidden} more`)
      throw new Error(`badge accessible name should be "${hidden} more"; got "${badge.getAttribute("aria-label")}"`);
    // Non-interactive: the count is a Badge, not a button/link/role=button.
    if (badge.tagName === "BUTTON" || badge.tagName === "A" || badge.getAttribute("role") === "button")
      throw new Error("the default indicator must be non-interactive (a count, not a control)");
  },
};
