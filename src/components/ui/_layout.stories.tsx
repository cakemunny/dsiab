import type { Meta, StoryObj } from "@storybook/react-vite";
import { Layout } from "./Layout";

/* Test-only behavioral plays for Layout — kept OUT of the docs stories (System/Layout/Layout) so viewing
   a docs page never drives a resize (which mutates a panel's size → a flash). Underscore-prefixed file →
   registry/category/order-guard-exempt, grouped under _internal. Plays are hand-rolled (no @storybook/test):
   local sleep/waitFor poll, native event driving, assertions via throw. The DEEP resize contract (arrow
   deltas, collapse, Home/End, drag-leak) is ResizeHandle's own _internal suite — here we assert only that
   Layout WIRES the engine to the panel. */

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
const q = (root: ParentNode, sel: string) => root.querySelector<HTMLElement>(sel);
const all = (root: ParentNode, sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));

const meta: Meta<typeof Layout> = {
  title: "_internal/Layout behavior",
  component: Layout,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Layout>;

/* -------------------------------------------------------------------------- */
/** Slot presence: each slot renders its area in the right region; omitted slots (and their dividers)
 *  simply aren't drawn. */
export const SlotPresence: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Layout data-testid="lp-full" defaultHasDividers style={{ height: 200 }}>
        <Layout.Header>Header</Layout.Header>
        <Layout.Panel style={{ width: 120 }}>Panel</Layout.Panel>
        <Layout.Content>Content</Layout.Content>
        <Layout.Footer>Footer</Layout.Footer>
      </Layout>
      <Layout data-testid="lp-partial" style={{ height: 120 }}>
        <Layout.Header>Header</Layout.Header>
        <Layout.Content>Content</Layout.Content>
      </Layout>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const full = await waitFor(() => q(canvasElement, '[data-testid="lp-full"]'));
    for (const area of ["header", "panel", "content", "footer"]) {
      if (!q(full, `[data-ds-layout-area="${area}"]`)) throw new Error(`full layout missing area: ${area}`);
    }
    // Regions: header is before the body row; the body row holds panel + content; footer is last.
    const areas = all(full, "[data-ds-layout-area]").map((el) => el.getAttribute("data-ds-layout-area"));
    if (areas.join(",") !== "header,panel,content,footer")
      throw new Error(`slot areas out of order: ${areas.join(",")}`);
    const body = q(full, "[data-ds-layout-body]");
    if (!body) throw new Error("no body row");
    if (!q(body, '[data-ds-layout-area="panel"]') || !q(body, '[data-ds-layout-area="content"]'))
      throw new Error("panel + content must live in the body row");
    if (q(body, '[data-ds-layout-area="header"]')) throw new Error("header must not be in the body row");

    // Partial layout: only the slots given render — no phantom panel/footer areas.
    const partial = await waitFor(() => q(canvasElement, '[data-testid="lp-partial"]'));
    if (q(partial, '[data-ds-layout-area="panel"]')) throw new Error("partial layout drew a panel it wasn't given");
    if (q(partial, '[data-ds-layout-area="footer"]')) throw new Error("partial layout drew a footer it wasn't given");
    if (!q(partial, '[data-ds-layout-area="header"]') || !q(partial, '[data-ds-layout-area="content"]'))
      throw new Error("partial layout must still render header + content");
  },
};

/* -------------------------------------------------------------------------- */
/** Divider resolution: defaultHasDividers draws all area rules; a per-slot hasDivider override wins; and
 *  with dividers off, only the slot that opts in gets one. */
export const DividerResolution: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Layout data-testid="dv-on" defaultHasDividers style={{ height: 160 }}>
        <Layout.Header>Header</Layout.Header>
        <Layout.Panel style={{ width: 120 }}>Panel</Layout.Panel>
        <Layout.Content>Content</Layout.Content>
        <Layout.Footer>Footer</Layout.Footer>
      </Layout>
      <Layout data-testid="dv-override" defaultHasDividers style={{ height: 160 }}>
        <Layout.Header>Header</Layout.Header>
        <Layout.Panel style={{ width: 120 }} hasDivider={false}>Panel</Layout.Panel>
        <Layout.Content>Content</Layout.Content>
        <Layout.Footer>Footer</Layout.Footer>
      </Layout>
      <Layout data-testid="dv-off" defaultHasDividers={false} style={{ height: 160 }}>
        <Layout.Header hasDivider>Header</Layout.Header>
        <Layout.Panel style={{ width: 120 }}>Panel</Layout.Panel>
        <Layout.Content>Content</Layout.Content>
        <Layout.Footer>Footer</Layout.Footer>
      </Layout>
    </div>
  ),
  play: async ({ canvasElement }) => {
    // All on → 3 dividers (header/footer horizontal + panel/content vertical).
    const on = await waitFor(() => q(canvasElement, '[data-testid="dv-on"]'));
    if (all(on, "[data-ds-layout-divider]").length !== 3)
      throw new Error(`defaultHasDividers must draw 3 area rules; got ${all(on, "[data-ds-layout-divider]").length}`);
    if (all(on, '[data-ds-layout-divider="vertical"]').length !== 1) throw new Error("expected one vertical rule (panel↔content)");
    if (all(on, '[data-ds-layout-divider="horizontal"]').length !== 2) throw new Error("expected two horizontal rules (header, footer)");

    // Panel hasDivider={false} → the panel↔content vertical rule is suppressed; the horizontals remain.
    const ov = await waitFor(() => q(canvasElement, '[data-testid="dv-override"]'));
    if (all(ov, '[data-ds-layout-divider="vertical"]').length !== 0)
      throw new Error("panel hasDivider={false} must suppress the panel↔content rule");
    if (all(ov, '[data-ds-layout-divider="horizontal"]').length !== 2)
      throw new Error("a panel override must not touch the header/footer rules");

    // Dividers off, header opts in → exactly one horizontal rule (below the header), nothing else.
    const off = await waitFor(() => q(canvasElement, '[data-testid="dv-off"]'));
    if (all(off, "[data-ds-layout-divider]").length !== 1)
      throw new Error(`with dividers off + header opt-in, expect exactly one rule; got ${all(off, "[data-ds-layout-divider]").length}`);
    if (all(off, '[data-ds-layout-divider="horizontal"]').length !== 1) throw new Error("the opted-in rule must be the horizontal header rule");
  },
};

/* -------------------------------------------------------------------------- */
/** Landmark roles: opt-in only. Header⇒banner, panel⇒complementary, footer⇒contentinfo when `landmark`
 *  is set; absent otherwise (slots are generic containers). One landmark-bearing Layout on the page keeps
 *  each role unique (a11y-valid). */
export const OptInLandmarks: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Layout data-testid="lm-on" style={{ height: 160 }}>
        <Layout.Header landmark>Header</Layout.Header>
        <Layout.Panel landmark style={{ width: 120 }}>Panel</Layout.Panel>
        <Layout.Content>Content</Layout.Content>
        <Layout.Footer landmark>Footer</Layout.Footer>
      </Layout>
      <Layout data-testid="lm-off" style={{ height: 120 }}>
        <Layout.Header>Header</Layout.Header>
        <Layout.Content>Content</Layout.Content>
        <Layout.Footer>Footer</Layout.Footer>
      </Layout>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const on = await waitFor(() => q(canvasElement, '[data-testid="lm-on"]'));
    const roleOf = (area: string) => q(on, `[data-ds-layout-area="${area}"]`)?.getAttribute("role");
    if (roleOf("header") !== "banner") throw new Error(`header landmark must be banner; got ${roleOf("header")}`);
    if (roleOf("panel") !== "complementary") throw new Error(`panel landmark must be complementary; got ${roleOf("panel")}`);
    if (roleOf("footer") !== "contentinfo") throw new Error(`footer landmark must be contentinfo; got ${roleOf("footer")}`);

    // Off by default — a slot with no `landmark` prop is a roleless container (never auto-emitted).
    const off = await waitFor(() => q(canvasElement, '[data-testid="lm-off"]'));
    for (const area of ["header", "content", "footer"]) {
      const role = q(off, `[data-ds-layout-area="${area}"]`)?.getAttribute("role");
      if (role) throw new Error(`slot ${area} must not auto-emit a landmark role; got ${role}`);
    }
  },
};

/* -------------------------------------------------------------------------- */
/** Resizable integration: a resizable panel renders the shared ResizeHandle (role=separator), the handle
 *  drives the engine, and the PANEL's width tracks the engine's size. (The keyboard/drag contract itself
 *  is covered by ResizeHandle's own suite — here we only assert the Layout↔engine↔panel wiring.) */
export const ResizablePanelIntegration: Story = {
  render: () => (
    <Layout data-testid="rz-panel" style={{ height: 200 }}>
      <Layout.Panel resizable={{ defaultSize: 200, minSizePx: 100, maxSizePx: 400 }} style={{ width: 200 }}>
        Panel
      </Layout.Panel>
      <Layout.Content>Content</Layout.Content>
    </Layout>
  ),
  play: async ({ canvasElement }) => {
    const root = await waitFor(() => q(canvasElement, '[data-testid="rz-panel"]'));
    const handle = q(root, '[role="separator"]');
    const panel = q(root, '[data-ds-layout-area="panel"]');
    if (!handle) throw new Error("a resizable panel must render a role=separator ResizeHandle");
    if (!panel) throw new Error("no panel area");
    if (handle.getAttribute("aria-orientation") !== "vertical") throw new Error("panel handle must be a vertical splitter");

    // A resizable panel takes the seam itself — no auto-divider should be drawn beside it.
    if (q(root, "[data-ds-layout-divider]")) throw new Error("a resizable panel must suppress the auto-divider (the handle is the seam)");

    const valueNow = () => Number(handle.getAttribute("aria-valuenow"));
    const panelPx = () => parseInt(panel.style.width || "0", 10);
    // The panel's rendered width tracks the engine's committed size.
    if (valueNow() !== 200 || panelPx() !== 200)
      throw new Error(`initial wiring off: aria-valuenow=${valueNow()}, panel width=${panelPx()} (want 200/200)`);

    // Drive the handle once — the panel must follow (the integration; deltas are ResizeHandle's suite).
    handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    await waitFor(() => valueNow() === 210 || null);
    if (panelPx() !== valueNow())
      throw new Error(`panel width must track the engine size; panel=${panelPx()} vs aria-valuenow=${valueNow()}`);
  },
};
