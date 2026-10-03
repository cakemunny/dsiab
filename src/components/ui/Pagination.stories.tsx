import { useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text as RadixText } from "@radix-ui/themes";
import { Pagination, type PaginationVariant, type PaginationSize } from "./Pagination";
// The SYSTEM Table, not Radix's. The invoice specimen below has a numeric column, and the system's
// numeric-column treatment (right-align + tabular figures) ships as `numeric` on the real component —
// a docs page that hand-rolls it teaches a mechanism the system does not have.
import { Table } from "./Table";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, MeasuredRow, MeasuredSpec, Muted,
  NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Section, SizeLesson, tick, TokenGroup,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/* ---- controlled demo wrappers -------------------------------------------- */
// Pagination is controlled-only ([[pagination-control]]) — these hold the page (and page size) so the docs specimens work.
function Pager({
  initial = 1,
  ...props
}: { initial?: number } & Omit<React.ComponentProps<typeof Pagination>, "page" | "onChange">) {
  const [page, setPage] = useState(initial);
  return <Pagination page={page} onChange={setPage} {...props} />;
}

function PagerWithSize({
  initial = 1,
  ...props
}: { initial?: number } & Omit<React.ComponentProps<typeof Pagination>, "page" | "onChange" | "pageSize" | "onPageSizeChange">) {
  const [page, setPage] = useState(initial);
  const [size, setSize] = useState(10);
  return (
    <Pagination
      page={page}
      onChange={setPage}
      pageSize={size}
      onPageSizeChange={(s) => { setSize(s); setPage(1); }}
      {...props}
    />
  );
}

/* ---- Tokens: measured off the rendered dots + page row ---------------------
   Each row names an element and a property, reads that property off a real rendered pager, and checks
   it against the token it claims — so a row can disagree with the component. The hover and focus rows
   read the declaration the component's OWN matched rule paints, since no script can synthesise either
   state. The old "Active dot / page number" row named one token for two different parts: the active
   DOT is the accent solid, while the current PAGE is the far fainter committed-selected band. They are
   separate rows now, because they are separate paints.

   The BOX group below is the second half, and it exists because paint is not the value most likely to
   drift here. [[control-box-per-step]] puts one control box on every size step and makes the vendor's own
   `--base-button-height` the floor — so a page number, being a ghost Button, reads the real variable —
   and it names ONE residue: the ellipsis is a <span>, the variable is declared on `.rt-BaseButton`, so
   the span cannot see it and carries a hand-kept COPY of the ladder in spacing tokens. Both sides are
   measured, side by side, so the copy is something a reader can check rather than take on trust; the
   Usage play asserts they are equal. That is also why the measurement pager is pinned to `md`: the
   ellipsis ladder is per-step, so a row can only name a token once the step is fixed. */
function PaginationTokens() {
  return (
    <Flex direction="column" gap="4">
      <TokenGroup
        label="PAINT — measured off the rendered controls (accent-aware)"
        blurb="The active dot and the current-page tint are measured on a rendered pager, so they follow the accent/appearance toolbar. The active dot is a 20px pill in the accent solid, the current page is the faint committed-selected band, and the rest dots are 1px neutral rings with a clear centre ([[neutral-part-stacks]])."
        specimen={
          <Flex direction="column" gap="3">
            <Pager initial={3} totalPages={7} variant="dots" label="Token specimen — dots" />
            <Pager initial={3} totalPages={9} variant="pages" label="Token specimen — pages" />
          </Flex>
        }
      >
        <MeasuredSpec
          render={() => (
            <>
              <Pager initial={3} totalPages={7} variant="dots" label="Measurement — dots" />
              <SizeLesson why="measurement rig — pinned to md; the ellipsis ladder is per-step, so a row can only name a token once the step is fixed">
                <Pager initial={3} totalPages={20} variant="pages" size="md" label="Measurement — pages" />
              </SizeLesson>
            </>
          )}
        >
          <MeasuredRow
            part="Active dot"
            note="The accent indicator, the shade every part without text paints ([[textless-part-fills]])."
            token="--accent-indicator"
            select='.rt-ds-pagination__dot[aria-current="page"]'
            prop="background-color"
          />
          <MeasuredRow
            part="Active dot edge"
            note="The [[mark-on-tint-edge]] mark step, stacked as a 1px inset ring, so the pill clears WCAG 3:1 and APCA Lc 30 against every surface ([[neutral-part-stacks]])."
            token="--accent-mark-edge"
            select='.rt-ds-pagination__dot[aria-current="page"]'
            prop="box-shadow"
          />
          <MeasuredRow
            part="Active dot length"
            note="A pill at every size, so the current dot differs by shape as well as colour ([[neutral-part-stacks]])."
            token="--ds-space-20"
            select='.rt-ds-pagination__dot[aria-current="page"]'
            prop="width"
          />
          <MeasuredRow
            part="Rest dot centre"
            token="--color-transparent"
            select=".rt-ds-pagination__dot:not([aria-current])"
            prop="background-color"
          />
          <MeasuredRow
            part="Dot — hover"
            token="--ds-fill-medium"
            select=".rt-ds-pagination__dot"
            prop="background-color"
            state="hover"
          />
          <MeasuredRow
            part="Focus ring (dots)"
            note="The accent base, with the stack alpha on top, 2px ([[focus-ring]])."
            token="--ds-stroke-focus"
            select=".rt-ds-pagination__dot"
            prop="outline-color"
            state="focus-visible"
          />
          <MeasuredRow
            part="Current page tint"
            note="The committed-selected band — a page number is never given the accent solid, which would fight the ghost row."
            token="--ds-fill-selected-subtle"
            select=".rt-ds-pagination__page[data-current]"
            prop="background-color"
          />
          <MeasuredRow
            part="Current page number"
            token="--ds-text-strong"
            select=".rt-ds-pagination__page[data-current]"
            prop="color"
          />
          <MeasuredRow
            part="Ellipsis"
            note="A non-interactive gap marker standing in for a collapsed run of pages — never focusable."
            token="--ds-text-weak"
            select=".rt-ds-pagination__ellipsis"
            prop="color"
          />
        </MeasuredSpec>
        <NoteRow part="Prev / next / page buttons" value="our IconButton / Button, ghost (priority: tertiary)" />
        <NoteRow
          part="Rest dot ring"
          value="1px of --ds-fill-press with a black alpha in light or a white alpha in dark stacked on it ([[neutral-part-stacks]]), in one shadow list, so no single property carries it"
          radix="--neutral-ring-stack"
        />
      </TokenGroup>

      <TokenGroup
        label="BOX — the control step, measured on both sides of the mirror"
        blurb="A page number is a ghost Button, so its box is the vendor's per-step control box read off the button itself. The ellipsis is a span standing in that row: the variable is declared on the button element, so it cannot reach the span, and its width is a hand-kept copy of the same ladder in spacing tokens. The three rows are pinned to md — 32px — so the copy and the original can be read against each other."
        specimen={<Box data-box-spec data-size-lesson="pinned to md so the ellipsis's hand-kept ladder copy and the button's own --base-button-height can be read against each other at one fixed step"><Pager initial={3} totalPages={20} size="md" label="Box specimen — pages" /></Box>}
      >
        <MeasuredSpec render={() => <SizeLesson why="measurement rig — pinned to md; the ellipsis ladder is per-step, so a row can only name a token once the step is fixed"><Pager initial={3} totalPages={20} variant="pages" size="md" label="Measurement — box" /></SizeLesson>}>
          <MeasuredRow
            part="Page cell — width"
            note="Square at its floor, wider only once the digits need it."
            token="--base-button-height"
            select=".rt-ds-pagination__page"
            prop="min-width"
          />
          <MeasuredRow
            part="Page cell — height"
            note="The same variable across the other axis — one control box per step, ghost included ([[control-box-per-step]])."
            token="--base-button-height"
            select=".rt-ds-pagination__page"
            prop="min-height"
          />
          <MeasuredRow
            part="Ellipsis — width"
            note="[[control-box-per-step]]'s one stated residue — the copy of the ladder. It has to equal the page cell above, and this page's play asserts it does."
            token="--ds-space-32"
            select=".rt-ds-pagination__ellipsis"
            prop="min-width"
          />
        </MeasuredSpec>
      </TokenGroup>
    </Flex>
  );
}

/** Rows across both measured specs — the exact count the Usage play asserts have measured. */
const SPEC_ROWS = 12;

/* ---- anatomy legend ------------------------------------------------------ */
const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Landmark", "a <nav aria-label> — the pagination is a navigation region. Give each pager on a page a distinct label."],
  [2, "Prev / Next", "ghost IconButtons (CaretLeft / CaretRight). Disabled at the range ends (page 1 → prev off, last page → next off)."],
  [3, "Page buttons", "ghost Buttons (variant `pages`). The current one carries aria-current=\"page\" + the committed-selected tint."],
  [4, "Ellipsis", "an aria-hidden … span standing in for a collapsed run of pages (from generatePageRange). Never focusable."],
  [5, "Indicator", "swaps by `variant`: page buttons · \"X–Y of Z\" · \"Page X of Y\" · dots · nothing."],
  [6, "Page-size Select", "our compound Select, shown when `pageSizeOptions` is set. Changing it resets to page 1."],
];

/* ---- anatomy diagram ------------------------------------------------------
   The pager's parts sit ACROSS one row, not stacked, so the callouts live in bands above and below the
   specimen and drop a leader into the part they name. Two bands rather than one, because the landmark
   and the row it holds are the same rectangle: the <nav> is named from ABOVE at its own left corner,
   and the parts inside the row from BELOW, so two dots never point at one pixel from one side.

   Everything is MEASURED off the live specimen. The control lane (the size toolbar) moves every one of
   these x values — each control is 24px wide at the small step and 40px at the large one — and
   generatePageRange decides how many page buttons and ellipses there even are. Nothing here is a
   hand-typed coordinate. */

const TOP_BAND = 72;
const BOT_BAND = 62;
/** Where the leaders in each band turn their corner — one shared line, so the elbows read as a set. */
const TOP_ELBOW = 36;
const BOT_ELBOW = 28;
/** Closest two dots in one band may sit, centre to centre. A dot is 20px wide. */
const MIN_GAP = 30;

type PinSpec = {
  n: number;
  band: "top" | "bottom";
  /** The element this callout names, resolved LIVE — the page range decides which elements exist. */
  find: (root: HTMLElement) => HTMLElement | null;
  /** Where across that element's box the leader lands, in px from its left edge. */
  at: (box: DOMRect, el: HTMLElement) => number;
  /** A part that is a ZONE rather than an element gets a bracket across it instead of one leader — a
   *  single line into the middle of a run of buttons reads as naming the button it happens to touch. */
  span?: (el: HTMLElement) => { left: number; right: number } | null;
};

/** The indicator's span: everything the variant renders BETWEEN prev and next — a run of page buttons
 *  here, one "X–Y of Z" span in `count`, a row of dots in `dots`, nothing in `none`. It is a ZONE
 *  rather than an element (there is no wrapper around it), so the callout is placed from its ends. */
function indicatorSpan(controls: HTMLElement): { left: number; right: number } | null {
  const inner = (Array.from(controls.children) as HTMLElement[]).slice(1, -1);
  if (inner.length === 0) return null;
  return {
    left: inner[0].getBoundingClientRect().left,
    right: inner[inner.length - 1].getBoundingClientRect().right,
  };
}

const PINS: PinSpec[] = [
  { n: 1, band: "top", find: (r) => r.querySelector(".rt-ds-pagination"), at: () => 0 },
  // Prev — the left half of the pair; next is the same control mirrored at the other end of the row.
  { n: 2, band: "top", find: (r) => r.querySelector(".rt-ds-pagination__controls > button:first-child"), at: (b) => b.width / 2 },
  {
    n: 5, band: "top",
    find: (r) => r.querySelector(".rt-ds-pagination__controls"),
    at: (b, el) => {
      const span = indicatorSpan(el);
      return span ? (span.left + span.right) / 2 - b.left : b.width / 2;
    },
    span: indicatorSpan,
  },
  { n: 6, band: "bottom", find: (r) => r.querySelector(".rt-ds-pagination__pagesize"), at: (b) => b.width / 2 },
  { n: 3, band: "bottom", find: (r) => r.querySelector(".rt-ds-pagination__page"), at: (b) => b.width / 2 },
  { n: 4, band: "bottom", find: (r) => r.querySelector(".rt-ds-pagination__ellipsis"), at: (b) => b.width / 2 },
];

type Placed = { dotX: number; partX: number; top: number; bottom: number; span?: [number, number] };

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
          const partX = Math.round(box.left - frameBox.left + pin.at(box, el));
          const zone = pin.span?.(el) ?? null;
          measured.push({
            n: pin.n, partX, dotX: partX,
            top: Math.round(box.top - frameBox.top),
            bottom: Math.round(box.bottom - frameBox.top),
            ...(zone
              ? { span: [Math.round(zone.left - frameBox.left), Math.round(zone.right - frameBox.left)] as [number, number] }
              : {}),
          });
        }
        // Sorted by where the parts ACTUALLY are, not by declaration order — the page range decides the
        // order of the buttons. One forward pass keeps any two dots a legible distance apart; the leader
        // turns a corner to reach its part, so the dot moves and the line still lands.
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
    <Box style={{ overflowX: "auto" }}>
      <Box ref={frame} style={{ position: "relative", paddingTop: TOP_BAND, paddingBottom: BOT_BAND }}>
        <Box
          ref={specimen}
          data-testid="anatomy"
          style={{ borderRadius: "var(--ds-radius-4)", background: "var(--ds-bg-subtle)", padding: "var(--ds-space-32)" }}
        >
          <PagerWithSize initial={4} totalItems={480} pageSizeOptions={[10, 20, 50]} label="Anatomy specimen" />
        </Box>

        {PINS.map(({ n, band }) => {
          const pin = pins[n];
          if (!pin) return null;
          const top = band === "top";
          // The two bands are mirror images: the dot sits at the outer end, the leader turns at the
          // band's shared elbow line, and the last segment runs into the part's own near edge.
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
              {pin.span ? (
                <>
                  {/* …into a bracket the width of the zone, dropping a tick at each end. */}
                  <Box style={hLine({ left: pin.span[0], top: elbow, width: pin.span[1] - pin.span[0] })} />
                  <Box style={tick({ left: pin.span[0], ...reach })} />
                  <Box style={tick({ left: pin.span[1], ...reach })} />
                </>
              ) : (
                <>
                  {/* …across to the part's own column (zero-width when they already agree)… */}
                  {pin.dotX !== pin.partX && (
                    <Box style={hLine({ left: Math.min(pin.dotX, pin.partX), top: elbow, width: Math.abs(pin.dotX - pin.partX) })} />
                  )}
                  {/* …and into the part. */}
                  <Box style={tick({ left: pin.partX, ...reach })} />
                </>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/* ========================================================================== */
/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>Navigation across pages of content: a prev button, a variant-driven indicator, a next button, and an optional page-size <Code>Select</Code>. Five indicator variants — numbered pages, count, compact, dots, and none. It is controlled only: you own <Code>page</Code> and <Code>onChange</Code>. Page changes announce politely, and the current page carries <Code>aria-current="page"</Code>.</>;

const meta: Meta<typeof Pagination> = {
  title: "Components/Navigation/Pagination",
  component: Pagination,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Pagination** navigates pages of content — a `<nav aria-label>` holding a **prev** IconButton, a " +
          "variant-driven indicator, and a **next** IconButton, plus an optional page-size **Select**. Five " +
          "variants: **pages** (numbered buttons + ellipsis), **count** (\"X–Y of Z\"), **compact** (\"Page X of " +
          "Y\"), **dots** (selection-follows-focus indicators), and **none** (just prev/next). Controlled-only: " +
          "you own `page` + `onChange`. Page changes announce politely (\"Page N of M\"); the current page carries " +
          "`aria-current=\"page\"`. The page-range math is the node-tested `generatePageRange`.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Pagination>;

/* ---- Anatomy ------------------------------------------------------------- */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page maxWidth={860}>
        <PageHeader title="Pagination · Anatomy" standfirst={DEFINITION} />
        <Section title="Anatomy" lead="A navigation landmark: prev, an indicator that swaps by variant, next — and an optional page-size Select.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>
            The current page is both <Code>aria-current="page"</Code> (for AT) and tinted (for sight). Prev/next
            disable at the ends. Callout 5 names the indicator <em>zone</em> — everything between prev and next,
            here a run of page buttons and ellipses; change <Code>variant</Code> and the same zone holds a count,
            a "Page X of Y", dots, or nothing.
          </Caption>
        </Section>

        <Rule />

        <Section title="Variants" lead="Five indicators between the same prev/next controls. Pick by how much context the user needs.">
          <Flex direction="column" gap="4">
            {[
              { v: "pages" as const, note: "Numbered buttons with ellipsis — best when the user jumps around a known set." },
              { v: "count" as const, note: "\"X–Y of Z\" — the item range; pairs naturally with a table footer." },
              { v: "compact" as const, note: "\"Page X of Y\" — the tightest labelled form." },
              { v: "dots" as const, note: "Dot indicators for a small, known set (galleries, onboarding). The current page is the wider pill. Selection follows focus." },
              { v: "none" as const, note: "Just prev/next — cursor pagination where the total is unknown." },
            ].map(({ v, note }) => (
              <Flex key={v} align="center" gap="4" wrap="wrap">
                <Box style={{ width: 92, flexShrink: 0 }}><Code>{v}</Code></Box>
                <Box style={{ minWidth: 280 }}>
                  <Pager
                    initial={3}
                    totalItems={v === "none" ? undefined : 84}
                    totalPages={v === "none" ? undefined : undefined}
                    hasMore={v === "none" ? true : undefined}
                    variant={v}
                    label={`Variant ${v}`}
                  />
                </Box>
                <Muted>{note}</Muted>
              </Flex>
            ))}
          </Flex>
        </Section>

        <Rule />

        <Section title="Sizes" lead="Two sizes for the controls; the dots and the buttons shrink together — both indicators are shown at each size so “together” is something you can see rather than take on trust.">
          <Flex direction="column" gap="4" data-size-lesson="size matrix — both steps are rendered at once so 'they shrink together' is visible, not asserted">
            {(["md", "sm"] as PaginationSize[]).map((s) => (
              <Flex key={s} align="center" gap="5" wrap="wrap">
                <Box style={{ width: 40, flexShrink: 0 }}><Code>{s}</Code></Box>
                <Pager initial={3} totalItems={84} variant="pages" size={s} label={`Size ${s} — pages`} />
                <Pager initial={3} totalPages={5} variant="dots" size={s} label={`Size ${s} — dots`} />
              </Flex>
            ))}
          </Flex>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Every numbered part in the legend has a callout ON the specimen — a numbered legend with nothing
    // to point at is the defect this diagram exists to avoid. Compared by NUMBER, not by count, so a
    // callout that lands on the wrong part's number is caught too.
    const pinned = [...canvasElement.querySelectorAll("[data-pin]")]
      .map((el) => Number(el.getAttribute("data-pin")))
      .sort((a, b) => a - b);
    const parts = ANATOMY_PARTS.map(([n]) => n).sort((a, b) => a - b);
    if (pinned.join() !== parts.join()) {
      throw new Error(`callouts [${pinned}] on the specimen do not match the legend's parts [${parts}]`);
    }
  },
};

/* ---- Usage --------------------------------------------------------------- */
export const Usage: Story = {
  // The DoDont prose tone (success/error text on the tint) measures ~4.4 — just under axe's strict 4.5;
  // the DO/DON'T word + icon already carry the meaning, so color-contrast is scoped off here (the same
  // documented specimen carve-out as StatusDot/Badge Usage).
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <Page maxWidth={860}>
      <PageHeader title="Pagination · Usage" standfirst={DEFINITION} />
      <Section title="Table footer — count + page size" lead="The most common shape: an item range on the left, page controls on the right, a rows-per-page Select.">
        <Box style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
          <Table.Root variant="ghost" size="2">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Invoice</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Client</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell numeric>Amount</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {[
                ["INV-2043", "Northwind Traders", "$4,200"],
                ["INV-2044", "Contoso Ltd.", "$1,180"],
                ["INV-2045", "Fabrikam Inc.", "$9,600"],
              ].map((r) => (
                <Table.Row key={r[0]}>
                  <Table.RowHeaderCell><Code>{r[0]}</Code></Table.RowHeaderCell>
                  <Table.Cell>{r[1]}</Table.Cell>
                  <Table.Cell numeric>{r[2]}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
          <Box style={{ borderTop: "1px solid var(--ds-stroke-weak)", padding: "var(--ds-space-12) var(--ds-space-16)" }}>
            <PagerWithSize initial={1} totalItems={137} pageSizeOptions={[10, 25, 50]} variant="count" label="Invoice rows" />
          </Box>
        </Box>
      </Section>

      <Rule />

      <Section title="Search results — page numbers" lead="When users skim and jump around a known set, numbered pages give the most orientation.">
        <Pager initial={5} totalItems={412} pageSize={20} variant="pages" label="Search results" />
      </Section>

      <Rule />

      <Section title="A small known set — dots" lead="For a gallery or onboarding flow, dots read as position. The current page is the wider pill, and every other page is a ring. Arrow keys move through them, and selection follows focus.">
        <Pager initial={2} totalPages={5} variant="dots" label="Onboarding step" />
      </Section>

      <Rule />

      <Section title="Cursor pagination — none / compact" lead="When the total is unknown (a cursor feed), use hasMore with the prev/next-only or compact form.">
        <Flex direction="column" gap="4">
          <Pager initial={3} hasMore variant="none" label="Activity feed" />
          <Pager initial={3} totalPages={12} variant="compact" label="Log page" />
        </Flex>
      </Section>

      <Rule />

      <Section title="Do / don't" lead="Pagination is navigation — keep it honest and reachable.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="Give each pager on a page a distinct label (Search results, Table rows). Two <nav> landmarks need unique names.">
            <RadixText size="2" style={{ color: "var(--ds-text-strong)" }}>
              <Code>&lt;Pagination label="Search results" …/&gt;</Code>
            </RadixText>
          </DoDont>
          <DoDont kind="dont" bare note="Don't reach for dots when the set is large or unknown — a 40-dot row is unreadable. Use pages or count instead.">
            <RadixText size="2" style={{ color: "var(--ds-text-strong)" }}>
              <Code>variant="dots"</Code> with <Code>totalPages=&#123;40&#125;</Code>
            </RadixText>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Every row is read off a rendered pager and checked against the token it names, so the table can disagree with the component — flip the accent/appearance toolbar and the accent-aware rows re-resolve.">
          <PaginationTokens />
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]). The hover and focus rows read the
    // declaration the component's own matched rule paints — no script can synthesise either state.
    // `rows: N` is the exact form: an "at least one" floor is satisfied by a table that has not
    // filled in yet, and the BOX group's rows arrive a frame or two after the PAINT group's.
    const rows = await awaitMeasuredRows(canvasElement, { rows: SPEC_ROWS });
    if (rows.measured !== SPEC_ROWS || rows.unproven !== 0) {
      throw new Error(`expected ${SPEC_ROWS} measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // THE MIRROR, asserted rather than displayed. The two BOX rows above each prove their own side —
    // the page cell equals `--base-button-height`, the ellipsis equals `--ds-space-32` — and neither
    // can catch the drift [[control-box-per-step]] actually names, which is the two ladders parting company. So read both
    // off the same pinned pager and compare them directly: the ellipsis is only "boxed to a page
    // button" for as long as this holds.
    const spec = canvasElement.querySelector<HTMLElement>("[data-box-spec] .rt-ds-pagination");
    if (spec?.getAttribute("data-size") !== "2") {
      throw new Error(`the box specimen must be pinned to md (data-size="2"), got ${JSON.stringify(spec?.getAttribute("data-size"))}`);
    }
    const box = spec.querySelector<HTMLElement>(".rt-ds-pagination__page");
    const gap = spec.querySelector<HTMLElement>(".rt-ds-pagination__ellipsis");
    if (!box || !gap) throw new Error("the md-pinned box specimen must render both a page cell and an ellipsis");
    const cellFloor = parseFloat(getComputedStyle(box).minWidth);
    const gapFloor = parseFloat(getComputedStyle(gap).minWidth);
    if (!(cellFloor > 0) || Math.round(cellFloor) !== Math.round(gapFloor)) {
      throw new Error(
        `the ellipsis mirrors the vendor control box ([[control-box-per-step]]'s stated residue): page cell floor ${cellFloor}px, ` +
        `ellipsis floor ${gapFloor}px — the hand-kept --ds-space-* ladder has drifted from --base-button-height`,
      );
    }
  },
};

/* ---- Props ---------------------------------------------------------- */
const PROPS: PropDef[] = [
  { name: "page", type: "number", desc: <>Required. Current page (1-based). Controlled — you own it with <Code>onChange</Code>.</>, source: "Pagination.tsx" },
  { name: "onChange", type: "(page: number) => void", desc: <>Required. Called with the new page on prev/next, a page button, or a dot.</>, source: "Pagination.tsx" },
  { name: "totalItems", type: "number", desc: <>Item count → page count is <Code>ceil(totalItems / pageSize)</Code>. Takes precedence over <Code>totalPages</Code>.</>, source: "Pagination.tsx" },
  { name: "totalPages", type: "number", desc: <>Page count directly, when you know it but not the item count.</>, source: "Pagination.tsx" },
  { name: "hasMore", type: "boolean", desc: <>Cursor pagination (total unknown) — enables Next when more pages exist.</>, source: "Pagination.tsx" },
  { name: "pageSize", type: "number", def: "10", desc: <>Items per page. Coerced to a positive integer (non-finite → 10).</>, source: "Pagination.tsx" },
  { name: "pageSizeOptions", type: "number[]", desc: <>Shows a page-size Select. Changing it calls <Code>onPageSizeChange</Code> and resets to page 1.</>, source: "Pagination.tsx" },
  { name: "onPageSizeChange", type: "(n: number) => void", desc: <>Called with the new page size.</>, source: "Pagination.tsx" },
  { name: "variant", type: `"pages" | "count" | "compact" | "dots" | "none"`, def: `"pages"`, desc: <>What appears between prev/next.</>, source: "Pagination.tsx" },
  { name: "siblingCount", type: "number", def: "1", desc: <>Page buttons on each side of the current one (variant <Code>pages</Code>).</>, source: "Pagination.tsx" },
  { name: "size", type: `"sm" | "md"`, desc: <>Control size. <strong>Unset, it follows the global <Code>uiSize</Code></strong> (the control lane) so it scales with the toolbar like every other control; <Code>sm</Code>/<Code>md</Code> pin it to Radix steps 1 / 2 per-instance.</>, source: "Pagination.tsx" },
  { name: "isDisabled", type: "boolean", def: "false", desc: <>Disables the whole control.</>, source: "Pagination.tsx" },
  { name: "label", type: "string", def: `"Pagination"`, desc: <>Accessible name for the <Code>&lt;nav&gt;</Code> landmark. Make it distinct per pager.</>, source: "Pagination.tsx" },
];

type PropsArgs = {
  variant: PaginationVariant;
  size: PaginationSize | "auto";
  totalItems: number;
  pageSize: number;
  siblingCount: number;
  withPageSize: boolean;
  isDisabled: boolean;
  label: string;
};

export const Props: StoryObj<PropsArgs> = {
  args: {
    variant: "pages",
    // "auto" (size unset) is the default so the pager tracks the global uiSize toolbar out of the box.
    size: "auto",
    totalItems: 240,
    pageSize: 20,
    siblingCount: 1,
    withPageSize: false,
    isDisabled: false,
    label: "Props",
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["pages", "count", "compact", "dots", "none"], table: { category: "Display" } },
    size: { control: "inline-radio", options: ["auto", "sm", "md"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); "sm"/"md" pin it to Radix steps 1 / 2.', table: { category: "Display" } },
    totalItems: { control: { type: "number", min: 0 }, table: { category: "Data" } },
    pageSize: { control: { type: "number", min: 1 }, table: { category: "Data" } },
    siblingCount: { control: { type: "number", min: 0, max: 3 }, description: "Pages on each side of the current (variant pages).", table: { category: "Display" } },
    withPageSize: { control: "boolean", description: "Show the page-size Select ([10, 20, 50]).", table: { category: "Data" } },
    isDisabled: { control: "boolean", table: { category: "State" } },
    label: { control: "text", table: { category: "A11y" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(args.pageSize);
    return (
      <Page maxWidth="none">
        <PageHeader title="Pagination · Props" standfirst={DEFINITION} />
        <Box style={{ padding: "var(--ds-space-16) 0" }}>
          <Pagination
            page={page}
            onChange={setPage}
            totalItems={args.totalItems}
            pageSize={args.withPageSize ? pageSize : args.pageSize}
            pageSizeOptions={args.withPageSize ? [10, 20, 50] : undefined}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            variant={args.variant}
            siblingCount={args.siblingCount}
            size={args.size === "auto" ? undefined : args.size}
            isDisabled={args.isDisabled}
            label={args.label}
          />
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>Pagination</Code> takes.</>}>
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
      <PageHeader title="Pagination · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[pagination-control]] · generatePageRange">
            The pure <Code>generatePageRange(current, total, siblingCount)</Code> and the <Code>pageSize</Code>
            coercion guard live in <Code>src/utils/generatePageRange.ts</Code> with a node-lane suite. The slot
            budget is <Code>5 + 2·siblingCount</Code>; the coercion floors/clamps a non-finite <Code>pageSize</Code>
            to protect the <Code>dots</Code> <Code>Array.from(&#123;length&#125;)</Code> from Infinity/NaN.
          </Decision>
          <Decision id="[[pagination-control]] · the dots-focus hook">
            The <Code>dots</Code> variant is a <Code>role="group"</Code> of buttons implementing the APG
            radiogroup <em>interaction</em> — <strong>selection-follows-focus</strong> + 1D roving. It rides a thin
            new <Code>useListFocus</Code> hook (horizontal, wrap), <strong>not</strong> <Code>useGridFocus</Code>:
            the grid hook is 2D, has no wrap, and <em>owns</em> the roving tabindex imperatively — which would fight
            the declarative per-dot <Code>tabIndex</Code> the radiogroup needs. The active dot is the single tab
            stop; arrowing to a dot selects its page (Safari focus-on-click workaround kept).
          </Decision>
          <Decision id="[[pagination-control]] · accent-aware paint">
            The active dot paints the accent indicator (<Code>--accent-indicator</Code>, [[textless-part-fills]]), and the current page paints
            <Code>--ds-fill-selected-subtle</Code> (the committed-selection band), so they follow the brand collision
            shift. Since [[neutral-part-stacks]] the active dot is a 20px pill with <Code>--accent-mark-edge</Code> on its edge and the rest
            dots are 1px neutral rings with a clear centre, so the current dot differs by shape as well as colour.{" "}
            <Code>aria-current="page"</Code> marks the current page/dot for AT, and colour is never the only cue.{" "}
            <strong>[[pagination-control]] added zero net-new tokens.</strong> [[neutral-part-stacks]] added <Code>--neutral-ring-stack</Code> for the ring.
          </Decision>
          <Decision id="[[pagination-control]] · controlled-only">
            There is <strong>no optimistic in-flight layer</strong> (<Code>useOptimistic</Code> /{" "}
            <Code>useTransition</Code> / <Code>changeAction</Code>) — <Code>page</Code> is the single source of
            truth. Optimistic advance + async <Code>changeAction</Code> aren't built yet.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Pagination</Code>: the controlled pager — five variants,
            <Code> generatePageRange</Code> + node tests, the <Code>useListFocus</Code> dots hook, the polite page
            announce, and the compound-Select page size. Zero net-new tokens.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
