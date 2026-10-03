import { useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Folder, FolderOpen, File, Hash, GitBranch, Users } from "@phosphor-icons/react";
import { TreeList, type TreeListItemData, type TreeListDensity } from "./TreeList";
import { Badge } from "./Badge";
import { ScrollArea } from "./ScrollArea";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, KeyRow, type KeyBinding, MeasuredRow,
  MeasuredSpec, NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section, TokenGroup,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>A data-driven WAI-ARIA tree: expandable treeitem rows on the shared Item primitive, with the full APG keyboard model over a single roving tab stop, and controlled or uncontrolled expansion.</>;

/* ---- a folder-tree specimen reused across the page ------------------------ */
const folder = <Folder style={{ color: "var(--ds-icon-interactive)" }} />;
const folderOpen = <FolderOpen style={{ color: "var(--ds-icon-interactive)" }} />;
const file = <File style={{ color: "var(--ds-icon-neutral)" }} />;

const FILE_TREE: TreeListItemData[] = [
  {
    id: "src",
    label: "src",
    isExpanded: true,
    startContent: folderOpen,
    children: [
      {
        id: "components",
        label: "components",
        startContent: folder,
        children: [
          { id: "Button.tsx", label: "Button.tsx", startContent: file, onClick: () => {} },
          { id: "TreeList.tsx", label: "TreeList.tsx", startContent: file, isSelected: true, onClick: () => {} },
        ],
      },
      { id: "App.tsx", label: "App.tsx", startContent: file, onClick: () => {} },
      { id: "index.tsx", label: "index.tsx", startContent: file, onClick: () => {} },
    ],
  },
  { id: "package.json", label: "package.json", startContent: file, onClick: () => {} },
  { id: "README.md", label: "README.md", startContent: file, onClick: () => {} },
];

function FileTree({ density = "balanced" as TreeListDensity }: { density?: TreeListDensity }) {
  return (
    <TreeList
      density={density}
      header={<Text size="2" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Explorer</Text>}
      items={FILE_TREE}
    />
  );
}

/* ---- Anatomy legend ------------------------------------------------------- */
const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Tree (ul role=tree)", "the container. Owns the keyboard model (arrows / typeahead) + a single roving tab stop — exactly one treeitem is tabbable at a time."],
  [2, "Header", "optional — an id'd node above the tree, wired via aria-labelledby so a screen reader announces the tree's name."],
  [3, "Treeitem (li role=treeitem)", "one row — the shared Item primitive. Carries aria-level / -posinset / -setsize / -expanded and the roving tabIndex; depth shows as an indent."],
  [4, "Chevron", "a real <button aria-label=\"Toggle children\"> on rows with children (tabIndex=-1 — the row owns the stop). Rotates on expand; leaf rows get an aligning spacer."],
  [5, "Row content", "the Item slots: startContent (icon) · label(+description) · endContent (badge/action). A row navigates via onClick / href; selection paints the accent-subtle tint + aria-selected."],
];

/* ---- Tokens: measured off a rendered treeitem ------------------------------
   Each row names an element and a property, reads it off a real rendered tree, and checks it against
   the token it claims — so a row can disagree with the component. The hover and focus rows read the
   declaration the component's OWN matched rule paints, since no script can synthesise a hover and
   :focus-visible needs a keyboard.

   The measurement tree puts its SELECTED row at the root level on purpose: child rows fade-and-rise in
   as they mount, and a reading taken while that animation is running would need a named frame to mean
   anything. A root row carries no reveal, so its tint is a resting value. */
function TreeTokens() {
  return (
    <TokenGroup
      label="ROW — measured off a rendered treeitem"
      blurb="The row paints only from --ds-* semantic tokens (reused from the Item primitive + the Select-menu highlight vocabulary), so it follows brand collision shifts. Every value below is read off a rendered tree and checked against the token the row names."
      specimen={
        <Box style={{ width: 260, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "4px 0" }}>
          <TreeList items={[{ id: "root", label: "Label text", description: "Description text", isExpanded: true, startContent: folderOpen, children: [{ id: "child", label: "Selected child", isSelected: true, startContent: file }] }]} />
        </Box>
      }
    >
      <MeasuredSpec
        render={() => (
          <TreeList
            items={[
              { id: "m-row", label: "Label text", description: "Description text", onClick: () => {}, startContent: file },
              { id: "m-selected", label: "Selected", isSelected: true, onClick: () => {}, startContent: file },
              { id: "m-parent", label: "Parent", isExpanded: true, startContent: folderOpen, children: [{ id: "m-child", label: "Child", startContent: file }] },
            ]}
          />
        )}
      >
        <MeasuredRow part="Label" token="--ds-text-strong" select=".rt-ds-item-label" prop="color" />
        <MeasuredRow part="Description" token="--ds-text-weak" select=".rt-ds-item-description" prop="color" />
        <MeasuredRow
          part="Hover row"
          note="Only on a row that navigates or selects, and only while it is NOT the selected row — a selected row keeps its own tint under the pointer."
          token="--ds-fill-hover"
          select=".rt-ds-treeitem[data-interactive]:not([data-selected])"
          prop="background-color"
          state="hover"
        />
        <MeasuredRow
          part="Selected row"
          note="The same faint committed-selected tint the Select menu uses for a chosen row."
          token="--ds-fill-selected-subtle"
          select=".rt-ds-treeitem[data-selected]"
          prop="background-color"
        />
        <MeasuredRow
          part="Chevron icon"
          note="A target in its own right — it expands the row rather than opening it."
          token="--ds-icon-neutral"
          select=".rt-ds-tree-chevron"
          prop="color"
        />
        <MeasuredRow
          part="Focus ring (inset)"
          note="Inset, because a full-width row has no gutter for an outset ring; the row itself owns the tab stop. The accent base, with the stack alpha on top, 2px ([[focus-ring]])."
          token="--ds-stroke-focus"
          select=".rt-ds-treeitem"
          prop="outline-color"
          state="focus-visible"
        />
      </MeasuredSpec>
      <NoteRow part="Indent per level" value="16 px" radix="--ds-space-16" />
      <NoteRow part="Density (block padding)" value="compact 4 · balanced 8 · spacious 12 px" radix="--ds-space-4/8/12" />
    </TokenGroup>
  );
}

/* ========================================================================== */
const meta: Meta<typeof TreeList> = {
  title: "Components/Table & List/TreeList",
  component: TreeList,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**TreeList** is a data-driven **WAI-ARIA tree** — a `<ul role=\"tree\">` of expandable `<li role=\"treeitem\">` " +
          "rows built from the shared **Item** primitive. It ships the full APG keyboard model (arrows to roam, " +
          "`ArrowRight`/`ArrowLeft` to expand / collapse / step to a child or parent, `Home`/`End`, `Enter`/`Space`, " +
          "typeahead) over a single roving tab stop. Expansion is **uncontrolled by default** (seed with `isExpanded`) " +
          "or **controlled** via `expanded` + `onExpandedChange`. Reach for it for hierarchy — a file explorer, a nav " +
          "tree, an org chart; for a flat collection use `List`, for an actions menu `DropdownMenu`.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof TreeList>;

/* ---- Anatomy — the labelled diagram only; the token spec closes Usage ------ */
/* ---- Anatomy diagram -----------------------------------------------------
   The tree's parts are STACKED, so the callouts sit in gutters either side of the specimen and run a
   leader into the row they name. Two gutters, not one: the header and the tree's own top edge are ~20px
   apart — a single column of dots would draw them on top of each other — so the container edges are
   named from the left and the rows from the right.

   Positions are MEASURED off the live specimen. Row height follows the density AND the control lane
   (the size toolbar), so every one of these y values moves when the reader changes size; none of them
   can be written down. */

const GUTTER = 56;
const SPEC_W = 320;

/** [callout, selector inside the specimen, where on that element to anchor, which gutter]. */
const PINS: [number, string, "top" | "center", "left" | "right"][] = [
  [1, ".rt-ds-tree-list", "top", "left"],
  [4, '[data-tree-id="components"] .rt-ds-tree-chevron', "center", "left"],
  [2, ".rt-ds-tree-header", "center", "right"],
  [3, '[data-tree-id="index.tsx"]', "center", "right"],
  // The row's content column. Item names it `-body` when the row navigates (this specimen's rows carry
  // an onClick, so it is a real <button>) and `-content` when it doesn't — the callout names the slot,
  // not the tag, so it accepts either.
  [5, '[data-tree-id="package.json"] :is(.rt-ds-item-body, .rt-ds-item-content)', "center", "right"],
];

function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const specimen = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Record<number, number>>({});

  useLayoutEffect(() => {
    const f = frame.current;
    const s = specimen.current;
    if (!f || !s) return;
    const measure = () => {
      const top = f.getBoundingClientRect().top;
      const next: Record<number, number> = {};
      for (const [n, sel, anchor] of PINS) {
        const el = s.querySelector<HTMLElement>(sel);
        if (!el) continue;
        const box = el.getBoundingClientRect();
        next[n] = Math.round(box.top + (anchor === "top" ? 0 : box.height / 2) - top);
      }
      // Only write when something moved — the frame's own size feeds this observer otherwise.
      setPins((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(f);
    ro.observe(s);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <Box style={{ overflowX: "auto" }}>
      <Box ref={frame} style={{ position: "relative", width: "fit-content", paddingLeft: GUTTER, paddingRight: GUTTER }}>
        <Box
          ref={specimen}
          data-testid="anatomy"
          style={{ width: SPEC_W, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", padding: 12, background: "var(--ds-bg-subtle)" }}
        >
          <FileTree />
        </Box>
        {PINS.map(([n, , , side]) => {
          const y = pins[n];
          if (y == null) return null;
          const right = side === "right";
          return (
            <Box key={n}>
              <Box data-pin={n} style={{ ...dotStyle, left: right ? GUTTER + SPEC_W + GUTTER - 20 : 0, top: y - 10 }}>{n}</Box>
              <Box
                style={hLine(
                  right
                    ? { left: GUTTER + SPEC_W + 4, top: y, width: GUTTER - 26 }
                    : { left: 22, top: y, width: GUTTER - 26 },
                )}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="TreeList · Anatomy" standfirst={DEFINITION} />

        <Section title="Anatomy" lead="A file explorer — a labelled tree wired via aria-labelledby, then treeitem rows built from the shared Item primitive.">
          {/* The legend sits UNDER the diagram, as it does on every other Anatomy page: the callouts now
              occupy the gutters either side of the specimen, and beside them the legend's own numerals
              land within a few dozen pixels of the pins — two sets of numbered dots side by side, which
              reads as one confusing set. */}
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>Depth is shown by indentation and announced by <Code>aria-level</Code>; a screen reader reads each row's level, position, and expanded state.</Caption>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Every numbered part in the legend has a callout ON the specimen — a numbered legend with nothing
    // to point at is the defect this diagram exists to avoid.
    const pins = canvasElement.querySelectorAll("[data-pin]");
    if (pins.length !== ANATOMY_PARTS.length)
      throw new Error(`expected ${ANATOMY_PARTS.length} callout pins on the specimen; got ${pins.length}`);
  },
};

/* ---- Usage — scenarios, then the closing live token spec ------------------ */
const ORG_TREE: TreeListItemData[] = [
  {
    id: "eng", label: "Engineering", isExpanded: true, startContent: <Users style={{ color: "var(--ds-icon-interactive)" }} />,
    endContent: <Badge color="gray">42</Badge>,
    children: [
      { id: "platform", label: "Platform", startContent: <Users style={{ color: "var(--ds-icon-neutral)" }} />, endContent: <Badge color="gray">12</Badge>, onClick: () => {} },
      { id: "design-sys", label: "Design Systems", startContent: <Users style={{ color: "var(--ds-icon-neutral)" }} />, endContent: <Badge color="gray">8</Badge>, isSelected: true, onClick: () => {} },
    ],
  },
  { id: "design", label: "Design", startContent: <Users style={{ color: "var(--ds-icon-interactive)" }} />, endContent: <Badge color="gray">15</Badge>, onClick: () => {} },
];

const NAV_TREE: TreeListItemData[] = [
  { id: "main", label: "main", startContent: <GitBranch style={{ color: "var(--ds-icon-neutral)" }} />, onClick: () => {} },
  {
    id: "feat", label: "feature", isExpanded: true, startContent: <GitBranch style={{ color: "var(--ds-icon-neutral)" }} />,
    children: [
      { id: "feat-tree", label: "feature/tree-list", startContent: <Hash style={{ color: "var(--ds-icon-neutral)" }} />, onClick: () => {} },
      { id: "feat-cmd", label: "feature/command-palette", startContent: <Hash style={{ color: "var(--ds-icon-neutral)" }} />, onClick: () => {} },
    ],
  },
];

export const Usage: Story = {
  // The DoDont callout labels measure just under axe's strict 4.5 on their tint; the callout colour + the
  // DO/DON'T word carry the meaning (colour-not-alone), so color-contrast is scoped off here — the same
  // documented specimen exception as List/Token/Badge Usage. The tree specimens themselves clear it.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="TreeList · Usage" standfirst={DEFINITION} />

      <Section title="Where a tree fits" lead="Expandable hierarchy — a file explorer, an org chart, a branch or nav tree. Depth matters and rows expand to reveal children.">
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
          <Scenario label="FILE EXPLORER" caption="Folders expand to files; the whole row selects, with a chevron affordance and the accent-subtle selected tint.">
            <Box style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "4px 0" }}><FileTree density="compact" /></Box>
          </Scenario>
          <Scenario label="ORG CHART — COUNTS IN endContent" caption="A trailing Badge rides the endContent slot; selection marks the active team with aria-selected.">
            <Box style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "4px 8px" }}>
              <TreeList items={ORG_TREE} header={<Text size="2" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Teams</Text>} />
            </Box>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section title="A tree, not a list or a menu" lead="TreeList carries tree roles + the expand/collapse keyboard model. For a flat collection use List; for an actions menu use DropdownMenu.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="A tree for genuine hierarchy — branches that expand to reveal nested children, with aria-level depth and the APG arrow model.">
            <Box style={{ width: "100%", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "4px 8px" }}>
              <TreeList items={NAV_TREE} />
            </Box>
          </DoDont>
          <DoDont kind="dont" bare note="Don't use a tree for a flat, non-hierarchical set of rows — there's nothing to expand, so the tree roles and the Right/Left keys mislead. Reach for List.">
            <Box style={{ width: "100%", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "4px 8px" }}>
              <TreeList items={[
                { id: "a", label: "Profile", startContent: file, onClick: () => {} },
                { id: "b", label: "Billing", startContent: file, onClick: () => {} },
                { id: "c", label: "Security", startContent: file, onClick: () => {} },
              ]} />
            </Box>
          </DoDont>
        </Grid>
        <Caption>Expansion is uncontrolled by default (seed with <Code>isExpanded</Code> on the data) — pass <Code>expanded</Code> + <Code>onExpandedChange</Code> to drive it from your own state.</Caption>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Every value read off a rendered tree and checked against the token the row names, so the table can disagree with the component.">
          <TreeTokens />
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]). The hover and focus rows read the
    // declaration the component's own matched rule paints — no script can synthesise either state.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 6 || rows.unproven !== 0) {
      throw new Error(`expected 6 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Keyboard ------------------------------------------------------------- */
const KEYS: KeyBinding[] = [
  { keys: ["↑", "↓"], action: <>Move to the previous / next <strong>visible</strong> row (collapsed subtrees are skipped; disabled rows are stepped over).</>, src: "system" },
  { keys: ["→"], action: <>On a <strong>collapsed</strong> parent, expand it; on an <strong>expanded</strong> parent, move to its first child; on a leaf, do nothing.</>, src: "system" },
  { keys: ["←"], action: <>On an <strong>expanded</strong> parent, collapse it; otherwise move to the <strong>parent</strong> row (the nearest shallower ancestor).</>, src: "system" },
  { keys: ["Home", "End"], action: <>Jump to the first / last visible row.</>, src: "system" },
  { keys: ["Enter", "Space"], action: <>Activate the row's own action (its link / button); a parent with no action toggles its expansion instead.</>, src: "system" },
  { keys: ["A – Z", "0 – 9"], action: <>Typeahead — jump to the next row whose label starts with the typed characters (a 500&nbsp;ms buffer for multi-key matches).</>, src: "system" },
  { keys: ["Tab"], action: <>Move out of the tree — the whole tree is a <strong>single tab stop</strong> (roving tabindex); one row is tabbable and the arrows roam within.</>, src: "system" },
];

export const Keyboard: Story = {
  render: () => (
    <Page>
      <PageHeader title="TreeList · Keyboard" standfirst={DEFINITION} />

      <Section title="Keyboard" lead="TreeList implements the full WAI-ARIA tree pattern over a single roving tab stop — the reason it rides the useTreeFocus hook rather than a linear list-focus helper.">
        <Box style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
          {KEYS.map((k, i) => <KeyRow key={i} {...k} />)}
        </Box>
        <Caption>Every binding is owned by the system hook — a tree is not a linear list, so Right/Left carry expand/collapse and child/parent semantics that a list model has no notion of.</Caption>
      </Section>
      <Rule />
      <Section title="Try it" lead="Focus the tree and drive it entirely from the keyboard — arrows to roam, Right/Left to expand and collapse, a letter to typeahead.">
        <Box style={{ width: 320, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "4px 0" }}>
          <FileTree />
        </Box>
      </Section>
    </Page>
  ),
};

/* ---- Narrowing ------------------------------------------------------------
   The state a file rail actually lives in: someone drags the splitter in. Both specimens are the
   SAME tree in the SAME kind of container (a vertical ScrollArea, which is what a rail is), at two
   widths, so the pair reads as one behaviour rather than two designs. The ScrollArea is not
   decoration here: its content wrapper is `width: fit-content`, so it is the ancestor that used to
   take the row's min-content and hand the viewport something too wide to show ([[truncating-label-width]]). */

/** The one-letter working-copy marks a rail shows beside a touched file. */
const modifiedMark = <Text weight="medium" style={{ color: "var(--ds-text-warning)" }}>M</Text>;
const addedMark = <Text weight="medium" style={{ color: "var(--ds-text-success)" }}>A</Text>;

const RAIL_TREE: TreeListItemData[] = [
  {
    id: "rail-src",
    label: "src",
    isExpanded: true,
    startContent: folderOpen,
    children: [
      { id: "rail-checkout", label: "checkout-service.ts", startContent: file, endContent: modifiedMark, onClick: () => {} },
      { id: "rail-webhooks", label: "webhook-dispatcher.ts", startContent: file, endContent: addedMark, onClick: () => {} },
      { id: "rail-index", label: "index.ts", startContent: file, onClick: () => {} },
    ],
  },
  { id: "rail-readme", label: "README.md", startContent: file, onClick: () => {} },
];

function Rail({ width, testId }: { width: number; testId: string }) {
  return (
    <Box
      data-testid={testId}
      style={{
        width,
        height: 200,
        border: "1px solid var(--ds-stroke-weak)",
        borderRadius: "var(--ds-radius-3)",
        overflow: "hidden",
      }}
    >
      <ScrollArea type="auto" scrollbars="vertical">
        <Box style={{ padding: "var(--ds-space-8)" }}>
          <TreeList
            density="compact"
            header={<Text size="2" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Explorer</Text>}
            items={RAIL_TREE}
          />
        </Box>
      </ScrollArea>
    </Box>
  );
}

export const Narrowing: Story = {
  render: () => (
    <Page>
      <PageHeader title="TreeList · Narrowing" standfirst={DEFINITION} />

      <Section
        title="Narrowing"
        lead="A rail gets dragged narrower than anyone designed for. The label truncates, the row keeps to the rail, and the trailing status mark stays where a reader looks for it."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
          <Scenario label="272px — the rail at rest" caption="Every filename fits, so nothing truncates and the M / A working-copy marks sit at the right edge.">
            <Rail width={272} testId="rail-wide" />
          </Scenario>
          <Scenario label="200px — dragged in" caption="The same tree. The filenames ellipse, the rows still end at the rail, and the marks are untouched: a one-character state is never the thing that gets cut.">
            <Rail width={200} testId="rail-narrow" />
          </Scenario>
        </Grid>
        <Caption>
          Truncate labels, reflow prose (<Code>GUIDELINES</Code> §8b). The row shrinks because the label no
          longer reports its full string as an intrinsic width, which is what <Code>min-width: 0</Code> alone
          cannot buy: a rail inside a <Code>ScrollArea</Code> is sized <Code>fit-content</Code>, so a label
          that refuses to shrink is handed straight to a viewport that clips it mid-glyph.
        </Caption>
      </Section>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    const read = (testId: string) => {
      const rail = canvasElement.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
      if (!rail) throw new Error(`${testId}: rail missing`);
      const viewport = rail.querySelector<HTMLElement>(".rt-ScrollAreaViewport");
      if (!viewport) throw new Error(`${testId}: the rail must scroll inside a ScrollArea`);
      const rows = Array.from(rail.querySelectorAll<HTMLElement>(".rt-ds-treeitem"));
      if (rows.length === 0) throw new Error(`${testId}: no treeitem rows rendered`);
      return { rail, viewport, rows, edge: viewport.getBoundingClientRect().right };
    };

    for (const testId of ["rail-wide", "rail-narrow"]) {
      const { rows, edge } = read(testId);
      // The row never hangs past the viewport that clips it. This is the whole defect: the row used
      // to measure 212px inside a 150px viewport and lose its last 62px to a hard clip.
      for (const row of rows) {
        const right = row.getBoundingClientRect().right;
        if (right > edge + 0.5) {
          throw new Error(`${testId}: a treeitem must not overflow the rail (row right ${Math.round(right)} vs viewport ${Math.round(edge)})`);
        }
      }
      // The trailing status mark is the row's STATE and one character wide, so it is never what gets cut.
      for (const row of rows) {
        const end = row.querySelector<HTMLElement>(".rt-ds-item-end");
        if (!end) continue;
        const box = end.getBoundingClientRect();
        if (box.right > edge + 0.5 || box.width === 0) {
          throw new Error(`${testId}: the endContent mark must stay visible (right ${Math.round(box.right)} vs viewport ${Math.round(edge)}, width ${Math.round(box.width)})`);
        }
      }
    }

    // …and the narrow rail actually truncates rather than merely fitting: at least one label is
    // ellipsed, which is what makes the cut read as truncation instead of as a clipped glyph.
    const narrow = read("rail-narrow");
    const clamped = narrow.rows
      .map((row) => row.querySelector<HTMLElement>(".rt-ds-item-label"))
      .filter((label): label is HTMLElement => label != null && label.scrollWidth > label.clientWidth);
    if (clamped.length === 0) {
      throw new Error("the 200px rail must ellipse at least one filename; none of its labels overflow their box");
    }
  },
};

/* ---- Props ----------------------------------------------------------- */
const PROPS: PropDef[] = [
  { name: "items", type: "TreeListItemData[]", desc: <>The recursive tree data. Each item: <Code>id</Code>, <Code>label</Code>, optional <Code>description</Code>, <Code>startContent</Code>/<Code>endContent</Code>, <Code>children</Code>, <Code>onClick</Code>/<Code>href</Code>, <Code>isDisabled</Code>, <Code>isSelected</Code>, <Code>isExpanded</Code>.</>, source: "TreeList.tsx" },
  { name: "density", type: `"compact" | "balanced" | "spacious"`, def: "balanced", desc: <>Row block padding (~4 / 8 / 12 px).</>, source: "TreeList.tsx" },
  { name: "header", type: "ReactNode", desc: <>A node above the tree, wired to it via <Code>aria-labelledby</Code>.</>, source: "TreeList.tsx" },
  { name: "expanded", type: "string[]", desc: <>Controlled expansion — the exact set of expanded ids. Omit (with <Code>onExpandedChange</Code>) to run uncontrolled.</>, source: "TreeList.tsx" },
  { name: "onExpandedChange", type: "(ids: string[]) => void", desc: <>Called with the next expanded-id set on every toggle (controlled mode).</>, source: "TreeList.tsx" },
  { name: "item.isExpanded", type: "boolean", desc: <>Seeds the initial expanded state of a row (uncontrolled).</>, source: "TreeList.tsx" },
  { name: "item.isSelected", type: "boolean", desc: <>Selection. <em>Presence</em> marks the row selectable → <Code>aria-selected="true"|"false"</Code>; omit for a pure-navigation row.</>, source: "TreeList.tsx" },
  { name: "item.onClick / href", type: "(e) => void / string", desc: <>Row action — a real inner button / anchor (keyboard-activated by <Code>Enter</Code>/<Code>Space</Code>; the row owns the tab stop).</>, source: "TreeList.tsx" },
  { name: "item.isDisabled", type: "boolean", desc: <>Dimmed + <Code>aria-disabled</Code>; skipped by the keyboard model but kept in the a11y tree.</>, source: "TreeList.tsx" },
];

type PropsArgs = {
  density: TreeListDensity;
  withHeader: boolean;
  controlled: boolean;
};

export const Props: StoryObj<PropsArgs> = {
  args: { density: "balanced", withHeader: true, controlled: false },
  argTypes: {
    density: { control: "inline-radio", options: ["compact", "balanced", "spacious"] },
    withHeader: { name: "header", control: "boolean" },
    controlled: { control: "boolean", description: "Drive expansion from React state (expanded / onExpandedChange) vs. uncontrolled." },
  },
  parameters: { controls: { disable: false } },
  render: ({ density, withHeader, controlled }: PropsArgs) => {
    // A controlled harness lifts expansion into state; uncontrolled lets TreeList own it (seeded by isExpanded).
    const [expanded, setExpanded] = useState<string[]>(["src", "components"]);
    return (
      <Page maxWidth="none">
        <PageHeader title="TreeList · Props" standfirst={DEFINITION} />
        <Box style={{ maxWidth: 380, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", padding: 12 }}>
          <TreeList
            density={density}
            header={withHeader ? <Text size="2" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Explorer</Text> : undefined}
            items={FILE_TREE}
            expanded={controlled ? expanded : undefined}
            onExpandedChange={controlled ? setExpanded : undefined}
          />
        </Box>
        {controlled && (
          <Caption>Controlled — expanded ids: <Code>{expanded.length ? expanded.join(", ") : "(none)"}</Code></Caption>
        )}
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>TreeList</Code> and its items add.</>}>
          <PropTable rows={PROPS} />
        </Section>
      </Page>
    );
  },
};

/* ---- History -------------------------------------------------------------- */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="TreeList · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[tree-list]] · The useTreeFocus hook">
            The keyboard model rides the shared, generic <Code>useTreeFocus</Code> hook — the tree analogue of{" "}
            <Code>useGridFocus</Code> (a tree is not a linear list). Linear <Code>ArrowUp/Down/Home/End</Code> over the{" "}
            <em>visible</em> rows, <Code>ArrowRight/ArrowLeft</Code> carrying tree semantics (expand · collapse · first
            child · parent), <Code>Enter/Space</Code>, and a 500&nbsp;ms typeahead buffer. Its pure decision logic is
            unit-tested in the node lane; the DOM behaviours are <Code>_internal</Code> browser plays.
          </Decision>
          <Decision id="[[tree-list]] · rows compose Item">
            Every row is <Code>Item as="li" role="treeitem"</Code> — reusing the <Code>Item</Code> row anatomy (chevron marker · start ·
            label+description · end) and the no-nested-interactives guard, rather than re-building them. TreeList adds the
            APG wiring: <Code>aria-level</Code> / <Code>-posinset</Code> / <Code>-setsize</Code> / <Code>-expanded</Code>{" "}
            and the roving <Code>tabIndex</Code>.
          </Decision>
          <Decision id="[[tree-list]] · controlled expansion + aria-selected">
            <strong>Controlled expansion</strong> (<Code>expanded</Code> / <Code>onExpandedChange</Code>) and <strong><Code>aria-selected="false"</Code></strong> on unselected <em>selectable</em>{" "}
            rows (the APG convention added here), via an additive <Code>Item.ariaSelected</Code> tri-state. Presence of{" "}
            <Code>isSelected</Code> in a row's data marks it selectable; its absence = a pure-navigation row with no{" "}
            <Code>aria-selected</Code> at all.
          </Decision>
          <Decision id="[[tree-list]] · flat render, row-scoped focus">
            Visible rows render <strong>flat</strong> (each treeitem a direct child of the tree, depth via{" "}
            <Code>aria-level</Code> + an absolute indent) — the exact list the hook queries, and it keeps a row's focus
            ring and selection tint scoped to its own row (never its subtree). Collapsed rows <em>unmount</em>, so they
            leave the tab order and the accessibility tree.
          </Decision>
          <Decision id="[[tree-list]] · zero net-new tokens">
            Paint reuses shipped <Code>--ds-*</Code> roles (the Item vocabulary, the <Code>--ds-fill-selected-subtle</Code>{" "}
            selected tint, the inset [[focus-ring]] focus ring (<Code>--ds-stroke-focus</Code>), the shared motion ladder). Chevron{" "}
            <Code>CaretRight</Code> (Phosphor); the branch guide-lines are deferred as pure decoration. No new tokens; no{" "}
            <Code>!important</Code>.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/TreeList</Code> on the shared <Code>useTreeFocus</Code> hook: the full APG
            keyboard model, roving tabindex, controlled + uncontrolled expansion, the <Code>aria-selected</Code> tri-state,
            rows on the <Code>Item</Code> primitive, and the expand motion.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
