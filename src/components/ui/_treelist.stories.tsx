import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Text } from "@radix-ui/themes";
import { TreeList, type TreeListItemData } from "./TreeList";

/* Test-only BEHAVIOR for the System/TreeList component + its lifted useTreeFocus hook ([[tree-list]] / D12). The
   PURE decision logic (collectExpandedKeys / findInitialTabbableId / level-scan / typeahead matcher) is
   node-lane tested in useTreeFocus.logic.test.ts; these plays pin the DOM-integration behaviours that
   need a live tree: arrow navigation across levels, ArrowRight/Left expand-collapse-child-parent, the
   single roving tab stop + its repair on disable, typeahead, controlled expansion, and the
   aria-selected tri-state. They DRIVE the UI (which flashes on view), so they live under _internal. */

const meta: Meta<typeof TreeList> = {
  title: "_internal/TreeList behavior",
  component: TreeList,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof TreeList>;

// --- helpers ----------------------------------------------------------------
const wait = async (fn: () => boolean, label: string) => {
  for (let i = 0; i < 100; i++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(`timeout waiting for: ${label}`);
};
/** Fire a keydown on the currently-focused element so it bubbles to the tree's React onKeyDown. */
const press = (key: string) => {
  const el = document.activeElement;
  if (el == null) throw new Error("no active element to press on");
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
};
const activeId = () => (document.activeElement as HTMLElement | null)?.getAttribute("data-tree-id") ?? null;
const rowById = (root: Element, id: string) => root.querySelector<HTMLElement>(`[data-tree-id="${id}"]`);
const tabbables = (root: Element) =>
  Array.from(root.querySelectorAll<HTMLElement>('[role="treeitem"]')).filter((el) => el.getAttribute("tabindex") === "0");

// --- shared navigation tree -------------------------------------------------
//   alpha (expanded)              level 1
//     one                         level 2
//     two (collapsed, children)   level 2
//       two-x                     level 3
//   bravo                         level 1
//   charlie (disabled)            level 1
//   delta                         level 1
const NAV: TreeListItemData[] = [
  {
    id: "a", label: "alpha", isExpanded: true,
    children: [
      { id: "a1", label: "one" },
      { id: "a2", label: "two", children: [{ id: "a2x", label: "two-x" }] },
    ],
  },
  { id: "b", label: "bravo" },
  { id: "c", label: "charlie", isDisabled: true },
  { id: "d", label: "delta" },
];

function NavTree() {
  return (
    <Box p="4" style={{ maxWidth: 320 }}>
      <Box data-testid="tree" style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "4px 0" }}>
        <TreeList items={NAV} header={<Text size="2" weight="bold">Nav</Text>} />
      </Box>
    </Box>
  );
}

/* ---- ArrowUp/Down across levels, skipping disabled ------------------------ */
export const ArrowNavigation: Story = {
  render: () => <NavTree />,
  play: async ({ canvasElement }) => {
    const tree = canvasElement.querySelector('[data-testid="tree"]')!;
    rowById(tree, "a")!.focus();
    if (activeId() !== "a") throw new Error("failed to focus the seed row");

    press("ArrowDown");
    await wait(() => activeId() === "a1", "down → a1");
    press("ArrowDown");
    await wait(() => activeId() === "a2", "down → a2 (across into level-2 sibling)");
    press("ArrowDown");
    await wait(() => activeId() === "b", "down → b (back to level 1)");
    press("ArrowDown");
    await wait(() => activeId() === "d", "down → d (charlie is disabled → skipped)");
    press("ArrowDown");
    if (activeId() !== "d") throw new Error("ArrowDown past the last row must clamp (no wrap)");

    press("ArrowUp");
    await wait(() => activeId() === "b", "up → b (charlie skipped)");
    press("Home");
    await wait(() => activeId() === "a", "Home → first row");
    press("End");
    await wait(() => activeId() === "d", "End → last row");
  },
};

/* ---- ArrowRight/Left: expand · first-child · collapse · parent ------------ */
export const ExpandCollapse: Story = {
  render: () => <NavTree />,
  play: async ({ canvasElement }) => {
    const tree = canvasElement.querySelector('[data-testid="tree"]')!;
    const a2 = rowById(tree, "a2")!;
    a2.focus();
    if (a2.getAttribute("aria-expanded") !== "false") throw new Error("a2 should start collapsed");

    // ArrowRight on a collapsed parent → EXPAND (focus stays).
    press("ArrowRight");
    await wait(() => rowById(tree, "a2")!.getAttribute("aria-expanded") === "true", "ArrowRight expands a2");
    await wait(() => rowById(tree, "a2x") != null, "a2x is now rendered");
    if (activeId() !== "a2") throw new Error("expanding must NOT move focus off the parent");

    // ArrowRight on an expanded parent → move to FIRST CHILD.
    press("ArrowRight");
    await wait(() => activeId() === "a2x", "ArrowRight → first child a2x");

    // ArrowRight on a leaf → no-op.
    press("ArrowRight");
    if (activeId() !== "a2x") throw new Error("ArrowRight on a leaf must be a no-op");

    // ArrowLeft on a leaf → parent.
    press("ArrowLeft");
    await wait(() => activeId() === "a2", "ArrowLeft on a leaf → parent a2");

    // ArrowLeft on an expanded parent → COLLAPSE.
    press("ArrowLeft");
    await wait(() => rowById(tree, "a2")!.getAttribute("aria-expanded") === "false", "ArrowLeft collapses a2");
    if (rowById(tree, "a2x") != null) throw new Error("a2x must unmount on collapse (leaves the a11y tree)");

    // ArrowLeft on a collapsed child-of-root row → step to the root parent.
    rowById(tree, "a1")!.focus();
    press("ArrowLeft");
    await wait(() => activeId() === "a", "ArrowLeft on a1 → parent alpha");
  },
};

/* ---- single roving tab stop ---------------------------------------------- */
export const RovingTabStop: Story = {
  render: () => <NavTree />,
  play: async ({ canvasElement }) => {
    const tree = canvasElement.querySelector('[data-testid="tree"]')!;
    // Exactly one treeitem is tabbable at rest, and it's enabled.
    const initial = tabbables(tree);
    if (initial.length !== 1) throw new Error(`expected exactly one tabindex=0, got ${initial.length}`);
    if (initial[0].getAttribute("data-tree-disabled") != null) throw new Error("the tab stop must be an enabled row");
    if (initial[0].getAttribute("data-tree-id") !== "a") throw new Error("the seed stop should be the first enabled row");

    // The stop MOVES with keyboard navigation and stays a single stop.
    rowById(tree, "a")!.focus();
    press("ArrowDown");
    await wait(() => activeId() === "a1", "moved to a1");
    const after = tabbables(tree);
    if (after.length !== 1) throw new Error(`still exactly one tab stop, got ${after.length}`);
    if (after[0].getAttribute("data-tree-id") !== "a1") throw new Error("the stop must follow focus to a1");
  },
};

/* ---- tab-stop REPAIR when the tabbable row becomes disabled --------------- */
function RepairHarness() {
  const [disableFirst, setDisableFirst] = useState(false);
  const items: TreeListItemData[] = [
    { id: "a", label: "alpha", isDisabled: disableFirst },
    { id: "b", label: "bravo" },
    { id: "c", label: "charlie" },
  ];
  return (
    <Box p="4" style={{ maxWidth: 300 }}>
      <button data-testid="disable" type="button" onClick={() => setDisableFirst(true)}>disable alpha</button>
      <Box data-testid="rtree" style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "4px 0" }}>
        <TreeList items={items} header={<Text size="2" weight="bold">Repair</Text>} />
      </Box>
    </Box>
  );
}

export const TabStopRepair: Story = {
  render: () => <RepairHarness />,
  play: async ({ canvasElement }) => {
    const tree = canvasElement.querySelector('[data-testid="rtree"]')!;
    if (tabbables(tree)[0]?.getAttribute("data-tree-id") !== "a") throw new Error("alpha should start as the tab stop");

    // Disable the tabbable row → the layout-effect repair promotes the next enabled row.
    (canvasElement.querySelector('[data-testid="disable"]') as HTMLButtonElement).click();
    await wait(() => rowById(tree, "a")!.getAttribute("data-tree-disabled") != null, "alpha becomes disabled");
    await wait(() => {
      const t = tabbables(tree);
      return t.length === 1 && t[0].getAttribute("data-tree-id") === "b";
    }, "the single tab stop is repaired onto bravo");
    if (rowById(tree, "a")!.getAttribute("tabindex") !== "-1") throw new Error("the disabled row must not be tabbable");
  },
};

/* ---- typeahead ------------------------------------------------------------ */
export const Typeahead: Story = {
  render: () => <NavTree />,
  play: async ({ canvasElement }) => {
    const tree = canvasElement.querySelector('[data-testid="tree"]')!;
    rowById(tree, "a")!.focus();

    press("b"); // → bravo
    await wait(() => activeId() === "b", "typeahead 'b' → bravo");

    // Let the 500ms typeahead buffer reset before the next standalone key (else it accumulates: "b"+"d").
    await new Promise((r) => setTimeout(r, 560));
    rowById(tree, "a")!.focus();
    press("d"); // → delta
    await wait(() => activeId() === "d", "typeahead 'd' → delta");

    // A non-matching key does not move focus.
    await new Promise((r) => setTimeout(r, 560));
    rowById(tree, "a")!.focus();
    press("z");
    await new Promise((r) => setTimeout(r, 30));
    if (activeId() !== "a") throw new Error("a non-matching typeahead key must not move focus");
  },
};

/* ---- controlled expansion (D12) ------------------------------------------ */
const CTRL: TreeListItemData[] = [
  {
    id: "a", label: "alpha",
    children: [
      { id: "a1", label: "one" },
      { id: "a2", label: "two", children: [{ id: "a2x", label: "two-x" }] },
    ],
  },
];

function ControlledHarness() {
  const [expanded, setExpanded] = useState<string[]>(["a"]);
  return (
    <Box p="4" style={{ maxWidth: 300 }}>
      <Text size="1" data-testid="state">{expanded.join(",")}</Text>
      <Box data-testid="ctree" style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "4px 0" }}>
        <TreeList items={CTRL} expanded={expanded} onExpandedChange={setExpanded} header={<Text size="2" weight="bold">Controlled</Text>} />
      </Box>
    </Box>
  );
}

function FrozenHarness() {
  // Controlled but the change is DROPPED — proves TreeList reads expansion from the prop, not internal state.
  return (
    <Box p="4" style={{ maxWidth: 300 }}>
      <Box data-testid="ftree" style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "4px 0" }}>
        <TreeList items={CTRL} expanded={["a"]} onExpandedChange={() => {}} header={<Text size="2" weight="bold">Frozen</Text>} />
      </Box>
    </Box>
  );
}

export const ControlledExpansion: Story = {
  render: () => (
    <>
      <ControlledHarness />
      <FrozenHarness />
    </>
  ),
  play: async ({ canvasElement }) => {
    // Controlled: clicking a2's chevron reports the toggle; the harness updates state → the subtree opens.
    const ctree = canvasElement.querySelector('[data-testid="ctree"]')!;
    if (rowById(ctree, "a2")!.getAttribute("aria-expanded") !== "false") throw new Error("a2 should start collapsed");
    (rowById(ctree, "a2")!.querySelector(".rt-ds-tree-chevron") as HTMLButtonElement).click();
    await wait(() => canvasElement.querySelector('[data-testid="state"]')!.textContent === "a,a2", "onExpandedChange reported a,a2");
    await wait(() => rowById(ctree, "a2x") != null, "the controlled subtree opened");

    // Frozen: the change is dropped, so the prop still governs → a2 never expands.
    const ftree = canvasElement.querySelector('[data-testid="ftree"]')!;
    (rowById(ftree, "a2")!.querySelector(".rt-ds-tree-chevron") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 40));
    if (rowById(ftree, "a2")!.getAttribute("aria-expanded") !== "false") throw new Error("a frozen controlled tree must not expand from an internal toggle");
    if (rowById(ftree, "a2x") != null) throw new Error("the frozen subtree must stay closed");
  },
};

/* ---- aria-selected tri-state --------------------------------------------- */
const SELECT: TreeListItemData[] = [
  { id: "sel", label: "Selected", isSelected: true, onClick: () => {} },
  { id: "unsel", label: "Selectable, unselected", isSelected: false, onClick: () => {} },
  { id: "nav", label: "Pure navigation", onClick: () => {} },
];

export const AriaSelectedTriState: Story = {
  render: () => (
    <Box p="4" style={{ maxWidth: 300 }}>
      <Box data-testid="stree" style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "4px 0" }}>
        <TreeList items={SELECT} header={<Text size="2" weight="bold">Select</Text>} />
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const tree = canvasElement.querySelector('[data-testid="stree"]')!;
    // Selectable + selected → "true"; selectable + unselected → "false"; pure navigation → NO attribute.
    if (rowById(tree, "sel")!.getAttribute("aria-selected") !== "true") throw new Error("selected row must be aria-selected=true");
    if (rowById(tree, "unsel")!.getAttribute("aria-selected") !== "false") throw new Error("selectable-unselected row must be aria-selected=false");
    if (rowById(tree, "nav")!.hasAttribute("aria-selected")) throw new Error("a pure-navigation row must have NO aria-selected");
  },
};
