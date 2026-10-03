import { useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Funnel, Hash } from "@phosphor-icons/react";
import { OverflowList } from "./OverflowList";
import { Badge } from "./Badge";
import { Token } from "./Token";
import { VisuallyHidden } from "./VisuallyHidden";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, MeasuredRow, MeasuredSpec, NoteRow,
  Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Section, tick, TokenGroup,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/* ---- shared specimen data ------------------------------------------------ */
const FILTERS = ["Owner: me", "Status: open", "Label: bug", "Priority: high", "Milestone: v2", "Assignee: priya", "Type: task"];

/** A row of static filter Tokens inside a fixed-width, resizable box — the canonical use. */
function FilterRow({ width, gap = 2, ...rest }: { width: number; gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 } & Record<string, unknown>) {
  return (
    <Box style={{ width, maxWidth: "100%", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "var(--ds-space-8)" }}>
      <OverflowList gap={gap} label="Applied filters" {...rest}>
        {FILTERS.map((f) => (
          <Token key={f} leadingIcon={<Funnel weight="bold" />}>{f}</Token>
        ))}
      </OverflowList>
    </Box>
  );
}

/* ========================================================================== */
/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>A measurement engine, not an indicator: it measures the row's width and folds the items that don't fit into a single +N, so a horizontal set of chips, tags, or actions stays on one line as the space changes. The +N is a defaulted neutral count; revealing the hidden items is the consumer's.</>;

const meta: Meta<typeof OverflowList> = {
  title: "Components/Table & List/OverflowList",
  component: OverflowList,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**OverflowList** is a **measurement engine, not an indicator**. It measures its own (or its " +
          "parent's) width and collapses the items that don't fit into a single **+N** indicator, so a " +
          "horizontal row of chips, tags, or actions stays on one line as the space changes. The engine — a " +
          "shared `ResizeObserver`, a hidden dual-render measurement copy, and a pure fit reducer " +
          "(`computeVisibleCount`) — decides how many items fit. The indicator is **defaulted** (a neutral `Badge` " +
          "**+N**) but **consumer-overridable**: the *reveal* of the hidden items (a menu or popover) is the " +
          "consumer's job via `overflowRenderer`. Collapsed items genuinely **leave the accessibility tree** " +
          "(they are relocated, not hidden-but-reachable), so the visible set is wrapped in a named " +
          "`role=\"group\"` and the measurement copy is `aria-hidden` + `inert`.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof OverflowList>;

/* ---- Anatomy ------------------------------------------------------------- */
const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Visible group", "the on-screen flex row — a role=\"group\" with an accessible name (label), so a screen reader hears one unit, not N items plus a stray counter. overflow:hidden, white-space:nowrap, min-width:0."],
  [2, "Items", "the first `visibleCount` children (for collapseFrom='end') — the survivors that fit."],
  [3, "Overflow indicator", "the '+N' — the default neutral Badge (a count), or whatever overflowRenderer returns. Rendered live with the actual hidden count; trails the items (collapseFrom='end') or leads them ('start')."],
  [4, "Measurement copy", "a hidden, absolutely-positioned twin holding ALL children + the indicator at max width. aria-hidden + inert (out of the a11y tree). The engine reads each child's offsetWidth here to decide how many fit — no flicker on the visible row."],
];

/* ---- Anatomy diagram ------------------------------------------------------
   The list's parts sit ACROSS one row, so the callouts live in bands above and below the specimen and
   drop a leader into the part they name. Two bands rather than one, because the visible group and the
   measurement twin are the same rectangle in the same place: the twin is named from ABOVE at the origin
   both share, the visible row from BELOW at the edge where it stops. The twin is REAL but invisible —
   position:absolute, visibility:hidden, height:0 — so its box is measurable even though nothing paints.

   Everything is MEASURED off the live specimen: how many items survive follows the control lane (the
   size toolbar), so at the large step the same 300px box holds two chips rather than three and the
   indicator counts differently. Nothing here is a hand-typed coordinate. */

const TOP_BAND = 68;
const BOT_BAND = 58;
/** Where the leaders in each band turn their corner — one shared line, so the elbows read as a set. */
const TOP_ELBOW = 34;
const BOT_ELBOW = 26;
/** Closest two dots in one band may sit, centre to centre. A dot is 20px wide. */
const MIN_GAP = 30;

type PinSpec = {
  n: number;
  band: "top" | "bottom";
  /** The element this callout names, resolved LIVE — how many items are on the row depends on the size. */
  find: (root: HTMLElement) => HTMLElement | null;
  /** Where across that element's box the leader lands, in px from its left edge. */
  at: (box: DOMRect) => number;
};

const PINS: PinSpec[] = [
  // The twin starts exactly where the visible row starts (it is laid out at the row's static position),
  // so it is named at that shared origin — from above, with the group named from below.
  { n: 4, band: "top", find: (r) => r.querySelector(".rt-ds-overflowlist-measure"), at: () => 0 },
  // The default indicator is a Badge that is NOT a Token — the items are Tokens, the "+N" is not.
  { n: 3, band: "top", find: (r) => r.querySelector(".rt-ds-overflowlist > .rt-Badge:not(.rt-ds-token)"), at: (b) => b.width / 2 },
  { n: 2, band: "bottom", find: (r) => r.querySelector(".rt-ds-overflowlist > .rt-ds-token"), at: (b) => b.width / 2 },
  // The visible group, named at the edge where it STOPS — the overflow:hidden boundary the survivors fit
  // inside. Its left edge is the twin's, and two dots on one corner read as one callout.
  { n: 1, band: "bottom", find: (r) => r.querySelector(".rt-ds-overflowlist"), at: (b) => b.width },
];

type Placed = { dotX: number; partX: number; top: number; bottom: number };

/** The "+N" is a LATE part: on the first layout pass the row still holds every item and no indicator —
 *  the engine collapses it a beat later, and the diagram re-measures on the ResizeObserver's own first
 *  callback. So the play waits for the callouts, bounded, instead of reading one frame too early and
 *  failing on a diagram that is right by the time anyone sees it. */
async function awaitPins(root: Element, expected: number[], timeout = 4000): Promise<number[]> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const pinned = [...root.querySelectorAll("[data-pin]")]
      .map((el) => Number(el.getAttribute("data-pin")))
      .sort((a, b) => a - b);
    if (pinned.join() === expected.join() || Date.now() > deadline) return pinned;
    await new Promise((r) => requestAnimationFrame(() => r(null)));
  }
}

function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const specimen = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Record<number, Placed>>({});
  /** The specimen's bottom edge — where the lower band starts. */
  const [floor, setFloor] = useState(0);

  useLayoutEffect(() => {
    const f = frame.current;
    const s = specimen.current;
    if (!f || !s) return;

    const measure = () => {
      const frameBox = f.getBoundingClientRect();
      const next: Record<number, Placed> = {};
      for (const band of ["top", "bottom"] as const) {
        const measured: (Placed & { n: number })[] = [];
        for (const pin of PINS.filter((p) => p.band === band)) {
          const el = pin.find(s);
          if (!el) continue;
          const box = el.getBoundingClientRect();
          const partX = Math.round(box.left - frameBox.left + pin.at(box));
          measured.push({
            n: pin.n, partX, dotX: partX,
            top: Math.round(box.top - frameBox.top),
            bottom: Math.round(box.bottom - frameBox.top),
          });
        }
        // Sorted by where the parts ACTUALLY are, not by declaration order — the size step decides how
        // many items survive, and with them where the indicator sits. One forward pass keeps any two
        // dots a legible distance apart; the leader turns a corner, so the dot moves and the line lands.
        measured.sort((a, b) => a.partX - b.partX);
        let floorX = -Infinity;
        for (const m of measured) {
          const dotX = Math.max(m.partX, floorX + MIN_GAP);
          floorX = dotX;
          next[m.n] = { ...m, dotX };
        }
      }
      const nextFloor = Math.round(s.getBoundingClientRect().bottom - frameBox.top);
      // Only write when something moved — the frame's own size feeds this observer otherwise.
      setPins((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      setFloor((prev) => (prev === nextFloor ? prev : nextFloor));
    };

    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(f);
    ro.observe(s);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    // The frame is full width rather than fit-content on purpose: it becomes the twin's containing block
    // (it is the nearest positioned ancestor), and a narrow one would cap the width the engine measures
    // its children at.
    <Box ref={frame} style={{ position: "relative", width: "100%", paddingTop: TOP_BAND, paddingBottom: BOT_BAND }}>
      <Box
        ref={specimen}
        data-testid="anatomy"
        style={{ width: 300, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "var(--ds-space-8)" }}
      >
        <OverflowList label="Topics">
          {["design", "systems", "radix", "tokens", "accessibility", "motion"].map((t) => (
            <Token key={t} leadingIcon={<Hash weight="bold" />}>{t}</Token>
          ))}
        </OverflowList>
      </Box>

      {PINS.map(({ n, band }) => {
        const pin = pins[n];
        if (!pin) return null;
        const top = band === "top";
        // The two bands are mirror images: the dot sits at the outer end, the leader turns at the band's
        // shared elbow line, and the last segment runs into the part's own near edge.
        const dotTop = top ? 2 : floor + BOT_BAND - 22;
        const elbow = top ? TOP_ELBOW : floor + BOT_ELBOW;
        const stem = top
          ? { top: dotTop + 20, height: elbow - dotTop - 20 }
          : { top: elbow, height: dotTop - elbow };
        const reach = top
          ? { top: elbow, height: pin.top - 6 - elbow }
          : { top: pin.bottom + 6, height: elbow - pin.bottom - 6 };
        return (
          <Box key={n}>
            <Box data-pin={n} style={{ ...dotStyle, left: pin.dotX - 10, top: dotTop }}>{n}</Box>
            {/* out of the dot… */}
            <Box style={tick({ left: pin.dotX, ...stem })} />
            {/* …across to the part's own column (zero-width when they already agree)… */}
            {pin.dotX !== pin.partX && (
              <Box style={hLine({ left: Math.min(pin.dotX, pin.partX), top: elbow, width: Math.abs(pin.dotX - pin.partX) })} />
            )}
            {/* …and into the part. */}
            <Box style={tick({ left: pin.partX, ...reach })} />
          </Box>
        );
      })}
    </Box>
  );
}

/* ---- Tokens: the default "+N" indicator borrows Badge's neutral skin; the engine owns no paint roles.
   MEASURED ([[measured-token-rows]]) off the indicator the list itself renders — not off a Badge this story stood up beside
   it, which is what the previous rows read. The list renders that indicator twice: once in the visible
   row (only while items are actually collapsed) and once at full width inside its measurement copy, so
   the copy is the instance that is always there to read. */
function OverflowListTokens() {
  return (
    <TokenGroup
      label="DEFAULT +N INDICATOR — measured off the rendered list"
      blurb="OverflowList is a layout / measurement engine, so it declares no --ds-* paint roles of its own. Its only visible chrome is the default +N indicator — a neutral gray Badge reused as-is, so its fill and text ARE Badge's — plus the inter-item gap, a scaling-aware --ds-space-* spacing step."
      specimen={<Badge color="gray" aria-label="3 more"><span aria-hidden>+3</span><VisuallyHidden>3 more</VisuallyHidden></Badge>}
    >
      <MeasuredSpec
        render={() => (
          <OverflowList label="Measurement list">
            {FILTERS.map((f) => <Token key={f}>{f}</Token>)}
          </OverflowList>
        )}
      >
        <MeasuredRow
          part="+N fill"
          note="Badge's neutral soft tint, reused as-is — the count is a label, never a control."
          token="--gray-a3"
          select=".rt-ds-overflowlist-measure-indicator .rt-Badge"
          prop="background-color"
        />
        <MeasuredRow
          part="+N text"
          token="--gray-a11"
          select=".rt-ds-overflowlist-measure-indicator .rt-Badge"
          prop="color"
        />
      </MeasuredSpec>
      <NoteRow part="Item gap (default)" value="8 px — a scaling-aware spacing step" radix="--ds-space-8" />
      <NoteRow part="Own paint roles" value="none — a layout engine; the visible chrome reuses Badge's skin" />
    </TokenGroup>
  );
}

/* ---- Anatomy — the labelled diagram only; the token spec closes Usage ----- */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
    <Page>
      <PageHeader title="OverflowList · Anatomy" standfirst={DEFINITION} />
      <Section title="Anatomy" lead="A visible named group, plus a hidden measurement twin the engine reads to decide how many items fit.">
        <AnatomyDiagram />
        <AnatomyLegend parts={ANATOMY_PARTS} />
        <Caption>
          The measurement copy is why there's no flicker: the engine never has to render-then-shrink the visible
          row — it already knows every item's width. Callout 4 points at nothing you can see on purpose: the twin
          is <Code>visibility: hidden</Code> at <Code>height: 0</Code>, laid out at the row's own origin, so it is
          named from above at the corner the visible group (callout 1) is named from below.
        </Caption>
      </Section>

      <Rule />

      <Section title="Watch it collapse" lead="The same list at three widths. Fewer items fit as the box narrows; the survivors stay, and the count grows.">
        <Flex direction="column" gap="4">
          {[440, 300, 190].map((w) => (
            <Flex key={w} align="center" gap="3">
              <Text size="1" style={{ color: "var(--ds-text-weak)", fontFamily: "var(--code-font-family)", width: 48, flexShrink: 0 }}>{w}px</Text>
              <FilterRow width={w} />
            </Flex>
          ))}
        </Flex>
      </Section>
    </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Passive structure read only (no clicks/focus → no flash on view). The measurement twin must be
    // out of the a11y tree, and the visible set must be a NAMED group.
    const root = canvasElement.querySelector('[data-testid="anatomy"]')!;
    const measure = root.querySelector<HTMLElement>(".rt-ds-overflowlist-measure");
    if (!measure) throw new Error("missing measurement copy");
    if (measure.getAttribute("aria-hidden") !== "true") throw new Error("measurement copy must be aria-hidden");
    if (!measure.hasAttribute("inert")) throw new Error("measurement copy must be inert");
    const group = root.querySelector<HTMLElement>(".rt-ds-overflowlist");
    if (!group || group.getAttribute("role") !== "group") throw new Error("visible set must be role=group");
    if (!group.getAttribute("aria-label")) throw new Error("the group must have an accessible name");
    // Every numbered part in the legend has a callout ON the specimen — a numbered legend with nothing
    // to point at is the defect this diagram exists to avoid. Compared by NUMBER, not by count, so a
    // callout that lands under the wrong number is caught too.
    const parts = ANATOMY_PARTS.map(([n]) => n).sort((a, b) => a - b);
    const pinned = await awaitPins(canvasElement, parts);
    if (pinned.join() !== parts.join()) {
      throw new Error(`callouts [${pinned}] on the specimen do not match the legend's parts [${parts}]`);
    }
    // The diagram is only honest while the row actually collapses — a specimen wide enough to fit every
    // item renders no indicator, and callout 3 would have nothing to point at. Read AFTER the wait
    // above: the engine collapses the row a beat after the first layout pass.
    if (!group.querySelector(".rt-Badge:not(.rt-ds-token)")) throw new Error("the specimen must be collapsed (a +N indicator on the visible row)");
  },
};

/* ---- Usage — scenarios, then the closing live token spec ----------------- */
export const Usage: Story = {
  // The DoDont callout labels (DO/DON'T text on the green/red tint) measure ~4.1–4.4 — just under axe's
  // strict 4.5; the callout colour + the DO/DON'T word already carry the meaning, so color-contrast is
  // scoped off here, the documented specimen exception (same pattern as Token/Badge/ToggleButton Usage).
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="OverflowList · Usage" standfirst={DEFINITION} />
      <Section title="Applied filters that collapse" lead="The canonical case: a row of filter Tokens that stays one line. When the space runs out, the trailing filters fold into a +N — the whole row never wraps or clips a chip mid-word.">
        <FilterRow width={360} />
        <Caption>Narrow the browser (or see the Anatomy page's three widths) to watch the +N count change. The visible chips are a named group; the folded ones have left the a11y tree.</Caption>
      </Section>

      <Rule />

      <Section title="The reveal is yours" lead="The +N is a count by default. To make it reveal the hidden items, pass an overflowRenderer that returns an interactive control — a clickable Token (or Button) opening your own DropdownMenu / Popover of the collapsed items.">
        <Box style={{ width: 300, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "var(--ds-space-8)" }}>
          <OverflowList
            label="Applied filters"
            overflowRenderer={(items) =>
              items.length > 0 ? (
                <Token onClick={() => {}} aria-label={`${items.length} more filters`}>+{items.length} more</Token>
              ) : null
            }
          >
            {FILTERS.map((f) => (
              <Token key={f} leadingIcon={<Funnel weight="bold" />}>{f}</Token>
            ))}
          </OverflowList>
        </Box>
        <Caption>Here the indicator is a clickable Token — wire its <Code>onClick</Code> to open a menu of the <Code>overflowItems</Code> (each carries its original <Code>index</Code>). OverflowList measures and collapses; what the +N <em>does</em> is the consumer's call.</Caption>
      </Section>

      <Rule />

      <Section title="A row of anything, not just chips" lead="Any horizontal set — action buttons, breadcrumb-like tags, avatars — can ride the engine. It measures real rendered widths, so mixed widths collapse correctly.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="Reach for OverflowList when a one-line row must stay one line across widths and the surplus reads fine as a count (or a menu you provide).">
            <Box style={{ width: 220, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "var(--ds-space-8)" }}>
              <OverflowList label="Tags">
                {["react", "typescript", "css", "radix", "vite"].map((t) => (
                  <Badge key={t} color="gray">{t}</Badge>
                ))}
              </OverflowList>
            </Box>
          </DoDont>
          <DoDont kind="dont" bare note="Don't reach for it when wrapping to multiple lines is fine — a plain flex-wrap row is simpler and shows everything. The engine earns its keep only when one line is a hard constraint.">
            <Flex gap="2" wrap="wrap" style={{ width: 220 }}>
              {["react", "typescript", "css", "radix", "vite"].map((t) => (
                <Badge key={t} color="gray">{t}</Badge>
              ))}
            </Flex>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Read off the indicator the list renders and checked against the token each row names, so the table can disagree with the component.">
          <OverflowListTokens />
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // Passive: every OverflowList renders a named group + an out-of-tree measurement twin.
    const lists = Array.from(canvasElement.querySelectorAll<HTMLElement>(".rt-ds-overflowlist"));
    if (lists.length === 0) throw new Error("no OverflowList rendered");
    for (const list of lists) {
      if (list.getAttribute("role") !== "group") throw new Error("each visible set must be role=group");
      if (!list.getAttribute("aria-label")) throw new Error("each group must be named");
    }
    const twins = Array.from(canvasElement.querySelectorAll<HTMLElement>(".rt-ds-overflowlist-measure"));
    for (const twin of twins) {
      if (twin.getAttribute("aria-hidden") !== "true" || !twin.hasAttribute("inert"))
        throw new Error("each measurement copy must be aria-hidden + inert");
    }

    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]).
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 2 || rows.unproven !== 0) {
      throw new Error(`expected 2 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Props ---------------------------------------------------------- */
const PROPS: PropDef[] = [
  { name: "children", type: "ReactNode", desc: <>The items — each a single element. Rendered in a hidden twin to measure, then sliced to what fits.</>, source: "OverflowList.tsx" },
  { name: "gap", type: "0–9", def: "2", desc: <>Gap as a spacing step (→ <Code>--ds-space-*</Code>, scaling-aware). Also feeds the fit math.</>, source: "OverflowList.tsx" },
  { name: "minVisibleItems", type: "number", def: "0", desc: <>Floor — keep at least this many visible even if they don't fit.</>, source: "OverflowList.tsx" },
  { name: "collapseFrom", type: `"start" | "end"`, def: `"end"`, desc: <>Which end folds. <Code>'end'</Code> keeps leading items, "+N" trails (house default); <Code>'start'</Code> keeps trailing items, "+N" leads.</>, source: "OverflowList.tsx" },
  { name: "behavior", type: `"observeSelf" | "observeParent"`, def: `"observeSelf"`, desc: <>Width source. <Code>observeParent</Code> keeps the row content-sized (fills while overflowing) so it can grow back.</>, source: "OverflowList.tsx" },
  { name: "label", type: "string", def: `"List"`, desc: <>Accessible name for the visible <Code>role="group"</Code> (collapsed items leave the a11y tree, so name the survivors).</>, source: "OverflowList.tsx" },
  { name: "overflowRenderer", type: "(items) => ReactNode", desc: <>Render the "+N". Defaults to a neutral non-interactive Badge; return a control here to make the reveal interactive.</>, source: "OverflowList.tsx" },
];

type PropsArgs = {
  containerWidth: number;
  itemCount: number;
  gap: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  minVisibleItems: number;
  collapseFrom: "start" | "end";
};

export const Props: StoryObj<PropsArgs> = {
  args: { containerWidth: 320, itemCount: 7, gap: 2, minVisibleItems: 0, collapseFrom: "end" },
  argTypes: {
    containerWidth: { control: { type: "range", min: 120, max: 560, step: 10 }, description: "Drag to resize the container and watch items collapse.", table: { category: "Demo" } },
    itemCount: { control: { type: "range", min: 1, max: 7, step: 1 }, description: "How many filter chips to render.", table: { category: "Demo" } },
    gap: { control: "inline-radio", options: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], description: "Spacing step between items.", table: { category: "Layout" } },
    minVisibleItems: { control: { type: "range", min: 0, max: 5, step: 1 }, description: "Minimum items kept visible.", table: { category: "Layout" } },
    collapseFrom: { control: "inline-radio", options: ["start", "end"], description: "Which end folds into +N.", table: { category: "Layout" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ containerWidth, itemCount, gap, minVisibleItems, collapseFrom }: PropsArgs) => {
    const items = FILTERS.slice(0, itemCount);
    return (
      <Page maxWidth="none">
        <PageHeader title="OverflowList · Props" standfirst={DEFINITION} />
        <Flex direction="column" gap="2" style={{ paddingTop: "var(--ds-space-8)" }}>
          <Box style={{ width: containerWidth, maxWidth: "100%", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "var(--ds-space-8)" }}>
            <OverflowList gap={gap} minVisibleItems={minVisibleItems} collapseFrom={collapseFrom} label="Applied filters">
              {items.map((f) => (
                <Token key={f} leadingIcon={<Funnel weight="bold" />}>{f}</Token>
              ))}
            </OverflowList>
          </Box>
          <Caption>Container: {containerWidth}px · {items.length} items · gap {gap} · collapseFrom {collapseFrom}. Drag <Code>containerWidth</Code> to see the +N change.</Caption>
        </Flex>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>OverflowList</Code> adds.</>}>
          <PropTable rows={PROPS} />
        </Section>
      </Page>
    );
  },
};

/* ---- History ------------------------------------------------------------- */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="OverflowList · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[overflow-list]] · engine, not indicator">
            OverflowList provides <strong>responsive layout</strong>, not a fixed widget. Its core is the
            measurement engine: <Code>useOverflow</Code> + a shared <Code>ResizeObserver</Code> singleton + a
            hidden <strong>dual-render</strong> measurement copy, with the pure greedy-fit reducer
            (<Code>computeVisibleCount</Code>) extracted so the arithmetic is unit-tested on the node lane.
          </Decision>
          <Decision id="[[overflow-list]] · +N is a default">
            The default indicator is a <strong>neutral, non-interactive <Code>Badge</Code> "+N"</strong> (a
            <em> count</em>, with a hidden "N&nbsp;more" name) — reusing AvatarGroup's stronger-gray counter
            treatment. It is <strong>overridable</strong> via <Code>overflowRenderer</Code>; the reveal of the
            hidden items (a menu / popover — e.g. a clickable <Code>Token</Code> opening a <Code>DropdownMenu</Code>)
            is the <strong>consumer's</strong> job, not the engine's.
          </Decision>
          <Decision id="[[overflow-list]] · indicator by position">
            The measurement copy holds all items <em>followed by</em> the indicator; the engine identifies the
            indicator by <strong>position</strong> (more children than items), <strong>not</strong> a
            <Code> data-overflow-indicator</Code> attribute.
          </Decision>
          <Decision id="[[overflow-list]] · leaves the a11y tree (not a hover-reveal)">
            Collapsed items are genuinely <strong>relocated</strong> into the indicator, so they
            <strong> leave the accessibility tree</strong> — this is <strong>not</strong> the hover-reveal idiom
            (which keeps hover-revealed content reachable). The measurement copy is <Code>aria-hidden</Code> +
            <Code> inert</Code> so nothing double-announces, and the visible set is a named
            <Code> role="group"</Code>. Do not "fix" this toward a hover-reveal.
          </Decision>
          <Decision id="[[overflow-list]] · collapseFrom='end'">
            Default <Code>collapseFrom='end'</Code> — matching AvatarGroup's end-collapse house idiom (and every
            token / avatar list). Leading items stay; the "+N" trails.
          </Decision>
          <Decision id="[[overflow-list]] · callback-ref cleanup">
            The observer teardown is <strong>callback-ref based</strong>, not a <Code>useEffect</Code> return:
            React calls <Code>containerRef(null)</Code> on unmount and that is where <Code>unobserveResize</Code>
            runs. A naive <Code>useRef</Code> + <Code>useEffect</Code> rewrite would drop the cleanup — the callback
            refs are load-bearing. Zero net-new tokens.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/OverflowList</Code> — the collapse-to-"+N" measurement engine:
            <Code> sharedResizeObserver</Code> singleton + <Code>useOverflow</Code> DOM wrapper + the extracted
            pure <Code>computeVisibleCount</Code> reducer (node-lane logic-tested), a default neutral Badge "+N",
            <Code> collapseFrom='end'</Code>, and the collapsed-items-leave-the-a11y-tree contract.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
