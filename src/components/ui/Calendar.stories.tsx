import type { Meta, StoryObj } from "@storybook/react-vite";
import { useLayoutEffect, useRef, useState } from "react";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Calendar } from "./Calendar";
import type { DateRange, ISODateString } from "../../dates/dateTypes";
import {
  getDaysInMonth,
  plainDateToday,
  plainDateToISO,
  plainDateFromISO,
  plainDateToDate,
  plainDateAddDays,
  plainDateFormat,
  DATE_FORMAT_LONG,
} from "../../dates/plainDate";
import {
  AnatomyLegend, Caption, Decision, dotStyle, HexThemeKey, hLine, KeyBinding, KeyRow, MeasuredRow, MeasuredSpec,
  Muted, NoteRow, Page, PageHeader, PropsLead, PropDef, PropTable, Rule, Scenario, Section, tick, TokenGroup,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, DATE_TIME_COMPARISON } from "./_comparisons";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    A single or range date picker painted from the system's own tokens. Selection is an accent tint under a
    neutral numeral; today is a 2px accent bar, a third channel beside selection's fill and focus's outline;
    a range paints flush so the band reads as one continuous span. Full grid keyboard navigation on a single
    roving tab stop.
  </>
);

/* ---- demo date helpers — anchored to the real "today" so the today-marker
   always appears in the specimens, with safe mid-month days for the rest. ---- */
const T = plainDateToday();
const DIM = getDaysInMonth(T.year, T.month);
const dOf = (d: number): ISODateString =>
  plainDateToISO({ year: T.year, month: T.month, day: Math.min(Math.max(d, 1), DIM) });
const RANGE_DEMO: DateRange = { start: dOf(9), end: dOf(15) };
const SELECTED_DEMO = dOf(12);
// Read live from the locale rather than slicing a formatted string — the month is not
// always the first part of "month year".
const THIS_MONTH_NAME = new Intl.DateTimeFormat(undefined, { month: "long" }).format(plainDateToDate(T));
// A multi-word shortcut must not break across lines — "Shift + Page / Down" reads as two keys.
const NOWRAP = { whiteSpace: "nowrap" } as const;
const noop = () => {};

/* ========================================================================== */

const meta: Meta = {
  title: "Components/Date & Time/Calendar",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "A **single** or **range** date picker painted from the system's `--ds-*` tokens. Selection " +
          "is the accent TINT under a neutral numeral — the Select selected-row treatment; **today** is " +
          "a 2px accent bar, a *third* channel beside selection's fill and focus's outline; a **range** " +
          "is an intensity ramp painted flush so the band reads as one continuous span. Full WAI-ARIA " +
          "grid keyboard navigation with a single roving tab stop, and arrow-nav that mirrors under RTL.",
      },
    },
  },
};
export default meta;
type Story = StoryObj;

/* ---- Anatomy diagram -----------------------------------------------------
   The calendar's parts are BOTH stacked and spread: the caption's two halves sit side by side, the
   weekday row and the grid are bands across the whole width, and four of the nine parts are single day
   cells somewhere inside that grid. So the callouts use four lanes, one per kind of part:
     • a band ABOVE for the caption — its two halves share a row and would draw on top of each other in
       a gutter;
     • the LEFT gutter for the two full-width bands (the weekday header, the grid itself);
     • a band BELOW for the four day cells. Each rises along a COLUMN boundary to the cell's own bottom
       edge, so a leader never strikes through the numerals it passes — and four cells in one row (which
       a gutter would collapse onto a single shared line) stay four separate leaders;
     • the RIGHT gutter for the month grid beside it.

   Everything is MEASURED off the live specimens. A day cell's size follows the control lane (the size
   toolbar) and its POSITION follows the calendar month the page is read in — which weekday the 1st falls
   on moves every one of these coordinates. None of them can be written down.

   The specimen is a committed RANGE with a bound, and a second calendar opened on the month grid, so
   that all nine parts exist at once: a single-selection day view has no band (⑦), no disabled tier (⑧)
   and no view-jump grid (⑨) to point at. The dates are chosen so the band never covers today, whose bar
   is its own callout. */

/** A committed range that never swallows TODAY — a band drawn over today would put two leaders on one
 *  cell. Front half of the month when today is in the back, and the other way round. */
const ANATOMY_RANGE: DateRange = T.day > 12 ? { start: dOf(3), end: dOf(8) } : { start: dOf(20), end: dOf(25) };
/** One bound, placed so a DISABLED day (the harder dim tier) always exists in the month AND never lands
 *  on today: the month's first day when today is past it, its last day otherwise. */
const ANATOMY_MIN = T.day > 2 ? dOf(2) : undefined;
const ANATOMY_MAX = T.day > 2 ? undefined : dOf(DIM - 1);

const GUTTER = 56;
const TOP_BAND = 52;
const BOT_BAND = 64;
/** Where the leaders turn their corner — one shared line per lane, so the elbows read as a set. */
const ELBOW = 30;
const TOP_ELBOW = 30;
const BOT_ELBOW = 30;
/** Closest two dots in one lane may sit, centre to centre. A dot is 20px wide. */
const MIN_GAP = 26;

type PinSpec = {
  n: number;
  /** Which lane the callout sits in. */
  lane: "top" | "bottom" | "left" | "right";
  /** The element this callout names, resolved inside the frame. */
  sel: string;
  /** Where along the lane's own axis the leader meets the part (0 = its start, 0.5 = its middle). */
  at?: number;
};

/** dot / part = position along the lane's own axis; edge = the cross-axis coordinate the leader runs to
 *  (the part's near edge); hook = how far it then runs along that edge, which is what makes a bottom-lane
 *  leader name ONE day cell rather than the column it climbed. */
type Measured = { lane: "top" | "bottom" | "left" | "right"; dot: number; part: number; edge: number; hook: number };

const PINS: PinSpec[] = [
  // The caption's two halves share a row — named from ABOVE so two dots never stack in one gutter.
  { n: 1, lane: "top", sel: '[data-spec="days"] .rt-ds-calendar-nav-slot' },
  { n: 2, lane: "top", sel: '[data-spec="days"] .rt-ds-calendar-heading' },
  { n: 3, lane: "left", sel: '[data-spec="days"] .rt-ds-calendar-weekday' },
  // tbody, not the <table>: the day rows only, so the callout names the grid and not the header above it.
  { n: 4, lane: "left", sel: '[data-spec="days"] .rt-ds-calendar-grid tbody' },
  // The four day cells, from below. Which cell each one IS depends on the month — the selectors name the
  // STATE, and the geometry follows whatever the month puts there.
  { n: 5, lane: "bottom", sel: '[data-spec="days"] .rt-ds-calendar-day[data-today]' },
  { n: 6, lane: "bottom", sel: '[data-spec="days"] .rt-ds-calendar-day[data-range="start"]' },
  { n: 7, lane: "bottom", sel: '[data-spec="days"] .rt-ds-calendar-day[data-range="middle"]' },
  { n: 8, lane: "bottom", sel: '[data-spec="days"] .rt-ds-calendar-day[aria-disabled="true"]:not([data-outside])' },
  { n: 9, lane: "right", sel: '[data-spec="picker"] .rt-ds-calendar-picker' },
];

function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<Record<number, Measured>>({});
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const f = frame.current;
    const b = body.current;
    if (!f || !b) return;
    const measure = () => {
      const fb = f.getBoundingClientRect();
      const found: Array<{ n: number; lane: Measured["lane"]; part: number; edge: number; hook: number }> = [];
      for (const p of PINS) {
        const el = b.querySelector<HTMLElement>(p.sel);
        if (!el) continue;
        const box = el.getBoundingClientRect();
        const horizontal = p.lane === "top" || p.lane === "bottom";
        found.push({
          n: p.n,
          lane: p.lane,
          // Horizontal lanes run along x and meet the part's top / bottom edge; gutters run along y and
          // meet its left / right edge. A bottom-lane leader climbs a day cell's LEFT edge — a column
          // boundary of the flush grid — so it passes between the numerals of every row below it rather
          // than up through them; hence the 0 default there, against 0.5 everywhere else.
          part: horizontal
            ? Math.round(box.left - fb.left + box.width * (p.at ?? (p.lane === "bottom" ? 0 : 0.5)))
            : Math.round(box.top - fb.top + box.height * (p.at ?? 0.5)),
          edge: Math.round(
            (p.lane === "top" ? box.top : p.lane === "bottom" ? box.bottom : p.lane === "left" ? box.left : box.right) -
              (horizontal ? fb.top : fb.left),
          ),
          // Only the day cells hook: the leader arrives at the cell's bottom-left corner and runs half
          // its width, which is what tells the reader WHICH cell in the column it climbed.
          hook: p.lane === "bottom" ? Math.round(box.width / 2) : 0,
        });
      }
      const next: Record<number, Measured> = {};
      for (const lane of ["top", "bottom", "left", "right"] as const) {
        // Sorted by where the parts ACTUALLY are, not by declaration order — the month decides which
        // cell comes first. One forward pass over the sorted list keeps any two dots in a lane a legible
        // distance apart; the leader turns a corner to reach its part, so the dot moves and the line
        // still lands.
        const inLane = found.filter((r) => r.lane === lane).sort((x, y) => x.part - y.part);
        let floor = -Infinity;
        for (const r of inLane) {
          const dot = Math.max(r.part, floor + MIN_GAP);
          floor = dot;
          next[r.n] = { lane, dot, part: r.part, edge: r.edge, hook: r.hook };
        }
      }
      const nextSize = { w: Math.round(fb.width), h: Math.round(fb.height) };
      // Only write when something moved — the frame's own size feeds this observer otherwise.
      setMeasured((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      setSize((prev) => (prev.w === nextSize.w && prev.h === nextSize.h ? prev : nextSize));
    };
    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(f);
    ro.observe(b);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const botDot = size.h - 22;
  const botElbow = size.h - BOT_BAND + BOT_ELBOW;

  return (
    <Box style={{ overflowX: "auto" }}>
      <Box
        ref={frame}
        style={{
          position: "relative", width: "fit-content",
          paddingTop: TOP_BAND, paddingBottom: BOT_BAND, paddingLeft: GUTTER, paddingRight: GUTTER,
        }}
      >
        {/* The two specimens carry no state captions of their own: the top-lane leaders run down this
            column into the caption row, and a line of text in the way is a line they have to strike
            through. The section lead says what each one is. */}
        <Flex ref={body} gap="6" align="start" style={{ width: "fit-content" }}>
          <Box data-spec="days">
            <Calendar mode="range" min={ANATOMY_MIN} max={ANATOMY_MAX} defaultValue={ANATOMY_RANGE} onValueChange={noop} />
          </Box>
          <Box data-spec="picker">
            <Calendar defaultView="month" defaultValue={SELECTED_DEMO} onValueChange={noop} />
          </Box>
        </Flex>

        {PINS.map(({ n }) => {
          const m = measured[n];
          if (!m) return null;
          if (m.lane === "top" || m.lane === "bottom") {
            const top = m.lane === "top";
            // The two bands are mirror images: the dot sits at the outer end, the leader turns at the
            // band's shared elbow line, and the last segment runs into the part's near edge.
            const dotTop = top ? 2 : botDot;
            const elbow = top ? TOP_ELBOW : botElbow;
            const stem = top ? { top: 22, height: elbow - 22 } : { top: elbow, height: dotTop - elbow };
            const reach = top
              ? { top: elbow, height: Math.max(m.edge - 4 - elbow, 0) }
              : { top: m.edge, height: Math.max(elbow - m.edge, 0) };
            return (
              <Box key={n}>
                <Box data-pin={n} style={{ ...dotStyle, left: m.dot - 10, top: dotTop }}>{n}</Box>
                {/* out of the dot… */}
                <Box style={tick({ left: m.dot, ...stem })} />
                {/* …across to the part's own column (zero-width when they already agree)… */}
                {m.dot !== m.part && (
                  <Box style={hLine({ left: Math.min(m.dot, m.part), top: elbow, width: Math.abs(m.dot - m.part) })} />
                )}
                {/* …and into the part. */}
                <Box style={tick({ left: m.part, ...reach })} />
                {/* A day cell: run along its own bottom edge, so the leader names one cell and not the
                    column it climbed. */}
                {m.hook > 0 && <Box style={hLine({ left: m.part, top: m.edge, width: m.hook })} />}
              </Box>
            );
          }
          const right = m.lane === "right";
          const elbowX = right ? size.w - ELBOW : ELBOW;
          const dotX = right ? size.w - 20 : 0;
          return (
            <Box key={n}>
              <Box data-pin={n} style={{ ...dotStyle, left: dotX, top: m.dot - 10 }}>{n}</Box>
              {/* out of the dot… */}
              <Box style={hLine(right ? { left: elbowX, top: m.dot, width: dotX - elbowX } : { left: 22, top: m.dot, width: elbowX - 22 })} />
              {/* …down the gutter's own column to the part's line (zero-height when they already agree)… */}
              {m.dot !== m.part && (
                <Box style={tick({ left: elbowX, top: Math.min(m.dot, m.part), height: Math.abs(m.dot - m.part) })} />
              )}
              {/* …and into the part. */}
              <Box
                style={hLine(
                  right
                    ? { left: m.edge + 4, top: m.part, width: Math.max(elbowX - m.edge - 4, 0) }
                    : { left: elbowX, top: m.part, width: Math.max(m.edge - elbowX - 4, 0) },
                )}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/** Anatomy — the labeled parts and the paint states. The live token spec lives in Usage. */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page maxWidth={900}>
        <PageHeader title="Calendar · Anatomy" standfirst={DEFINITION} />
        <Section title="The parts" lead="A month is a labeled caption (chevrons + month-year heading), an abbreviated weekday header, and a 7-column day grid. The numbered parts are called out beside the specimen — never inside the grid, where a badge would read as a real day. Shown as a bounded range, and again opened on the month grid, so every numbered part is on screen at once.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>
            Only the day grid is interactive. The chevrons and month-year heading are the wayfinding
            chrome; the weekday row is <Code>&lt;th scope="col"&gt;</Code> headers. <strong>Today</strong>{" "}
            shows its bar wherever the current date falls in this month — the range above is placed to
            leave it clear. Each state below isolates one channel.
          </Caption>
        </Section>

        <Rule />

        <Section title="Paint states" lead="Each channel carries one meaning. Selection is the accent tint under a neutral numeral; today is the 2px bar; a range is the flush ramp — preview, committed band, then the endpoints where that band tint doubles; the two disabled tiers read distinctly.">
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
            <Scenario label="SELECTED (single)" caption={<>The accent tint + a <Code>--ds-text-strong</Code> numeral at weight 600 — the Select selected-row treatment.</>}>
              <Calendar defaultValue={SELECTED_DEMO} onValueChange={noop} />
            </Scenario>
            <Scenario label="RANGE (committed)" caption={<>Two endpoints — the band tint over itself — with the a5 band between, painted flush so it reads as one continuous selection.</>}>
              <Calendar mode="range" defaultValue={RANGE_DEMO} onValueChange={noop} />
            </Scenario>
            <Scenario label="TODAY" caption={<>A 2px accent bar under the numeral + <Code>aria-current="date"</Code> — the third channel, never a ring.</>}>
              <Calendar onValueChange={noop} />
            </Scenario>
            <Scenario label="DISABLED vs OUT-OF-MONTH" caption={<>Two tiers: past days are disabled (gray-a8, <Code>aria-disabled</Code>, unselectable); adjacent-month days are gray-11 and still navigable.</>}>
              <Calendar min={plainDateToISO(T)} onValueChange={noop} />
            </Scenario>
          </Grid>
        </Section>

        <Rule />

        <Section
          title="The view-jump grids"
          lead="Part 9 of the legend, shown at rest. Each caption control opens a grid in place: the month name a grid of all twelve months of the year in the caption, the year a decade page. Each pages by its own parent unit — the day grid steps a month, the month grid a year, the year grid a decade — so no view is a dead end you have to back out of. Both are held to the day grid's width; only the height changes with the grid."
        >
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
            <Scenario label="MONTH GRID" caption={<>Twelve months, the one in view carrying the same accent chip a selected day gets. The chevrons page a <strong>year</strong> at a time and the caption's year follows the page, so a jump to next March is two clicks without leaving for another grid.</>}>
              <Calendar defaultView="month" defaultValue={SELECTED_DEMO} onValueChange={noop} />
            </Scenario>
            <Scenario label="YEAR GRID" caption={<>A decade plus one neighbour on each side (dimmed, reusing the day grid's out-of-month idiom), so the adjacent years are reachable without paging. The chevrons page a <strong>decade</strong>.</>}>
              <Calendar defaultView="year" defaultValue={SELECTED_DEMO} onValueChange={noop} />
            </Scenario>
          </Grid>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Every numbered part in the legend has a callout ON the specimen — a numbered legend with nothing
    // to point at is the defect this diagram exists to avoid. Passive: nothing here drives a calendar.
    const pins = canvasElement.querySelectorAll("[data-pin]");
    if (pins.length !== ANATOMY_PARTS.length)
      throw new Error(`expected ${ANATOMY_PARTS.length} callout pins on the specimen; got ${pins.length}`);
  },
};

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Nav chevrons", "IconButton ghost (tertiary) — previous / next month; inherit the control lane (24px, clears the target-size floor), mirror under RTL, and go inert at min / max"],
  [2, "Month-year heading", "a centered Heading that names the grid (aria-labelledby). Its two halves are buttons: the month opens the month grid, the year the year grid"],
  [3, "Weekday header", "abbreviated day names, --ds-text-weak weight 600, as <th scope=\"col\" abbr=\"Monday\">"],
  [4, "Day grid", "role=grid, one role=gridcell per day; a single roving tab stop (one Tab into the grid)"],
  [5, "Today marker", "a 2px accent bar under the numeral + aria-current=\"date\""],
  [6, "Selected day", "the --ds-fill-selected-subtle accent tint + a --ds-text-strong numeral at weight 600 — the Select selected-row treatment"],
  [7, "Range band", "an a3 preview / a5 committed band, painted flush, between two endpoints where that tint doubles over itself"],
  [8, "Disabled / out-of-month", "two tiers — disabled gray-a8 (aria-disabled, inert) vs adjacent-month gray-11 (navigable)"],
  [9, "View-jump grids", "the month and year grids the caption controls open — same accent chip, today bar, and inset focus ring as the day grid, held to the day grid's own width (the height follows whichever grid is showing). Both render below"],
];

/* The two view-jump grids, shown at rest. They used to be described in the legend and in the token
   spec without appearing anywhere on the page — three token rows and a numbered part pointing at
   something a reader could not see. `defaultView` renders each one open on mount, which is a static
   initial state: nothing is driven on view, no focus is stolen, and the day grid never flashes first. */

/* ---- Usage: a realistic booking scenario -------------------------------- */

function BookingDemo() {
  const [range, setRange] = useState<DateRange>({
    start: plainDateToISO(plainDateAddDays(T, 3)),
    end: plainDateToISO(plainDateAddDays(T, 7)),
  });
  const start = plainDateFromISO(range.start);
  const end = plainDateFromISO(range.end);
  const nights = Math.round(
    (plainDateToDate(end).getTime() - plainDateToDate(start).getTime()) / 86_400_000,
  );
  return (
    <Flex gap="6" wrap="wrap" align="start">
      <Calendar
        mode="range"
        numberOfMonths={2}
        min={plainDateToISO(T)}
        value={range}
        onValueChange={setRange}
      />
      <Box
        style={{
          minWidth: 220,
          padding: "var(--space-4)",
          borderRadius: "var(--ds-radius-4)",
          border: "1px solid var(--ds-stroke-weak)",
          background: "var(--ds-bg-subtle)",
        }}
      >
        <Text as="p" size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em", marginBottom: "var(--space-3)" }}>
          YOUR STAY
        </Text>
        <Flex direction="column" gap="2">
          <Flex justify="between" gap="4">
            <Muted>Check-in</Muted>
            <Text size="2" weight="medium">{plainDateFormat(start, DATE_FORMAT_LONG)}</Text>
          </Flex>
          <Flex justify="between" gap="4">
            <Muted>Check-out</Muted>
            <Text size="2" weight="medium">{plainDateFormat(end, DATE_FORMAT_LONG)}</Text>
          </Flex>
          <Rule />
          <Flex justify="between" gap="4">
            <Muted>Nights</Muted>
            <Text size="2" weight="bold" style={{ color: "var(--ds-text-link)" }}>{nights}</Text>
          </Flex>
        </Flex>
      </Box>
    </Flex>
  );
}

/** Usage — a real reservation flow (a two-month range picker driving a stay summary) and the live token
 *  spec that closes the page. */
export const Usage: Story = {
  render: (_args, { globals }) => (
    <Page maxWidth={900}>
      <PageHeader title="Calendar · Usage" standfirst={DEFINITION} />
      <ComparisonSection comparison={DATE_TIME_COMPARISON} highlight="Calendar" />

      <Rule />

      <Section
        title="Book a stay — a two-month range"
        lead="The most common calendar job is picking a date range. Show two months so a stay that crosses a month boundary needs no navigation, disable the past with min, and reflect the live selection in a summary beside the grid — the range band makes the span legible at a glance."
      >
        <BookingDemo />
        <Caption>
          Click a check-in date, then a check-out date; the band fills between them. Picking a new
          start begins a fresh range. The endpoints are the deepest step of the tint ramp — the band
          colour over itself — and the nights between are the a5 band. Past dates are disabled from{" "}
          <Code>min</Code>.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Getting somewhere far away"
        lead="Chevrons are fine for next week. They are not fine for a birth date. The caption title is two controls: click the month name for a grid of all twelve months, click the year for a grid of years. Every view pages by its own parent unit — the day grid a month, the month grid a year, the year grid a decade — so you are never in a grid you have to back out of to get where you are going. All three are held to the day grid's own width, so the caption and everything beside the calendar stay put; only the height follows the grid on show."
      >
        <Flex gap="6" wrap="wrap" align="start">
          <Calendar defaultValue={SELECTED_DEMO} onValueChange={noop} />
          <Box style={{ flex: 1, minWidth: 260 }}>
            <Flex direction="column" gap="3">
              <Text as="p" size="2">
                <strong>Try it.</strong> Click <em>{THIS_MONTH_NAME}</em> in
                the caption for the month grid, or the year beside it for the year grid. Arrow keys move
                through either grid, <Code>Enter</Code> picks, <Code>Esc</Code> backs out and leaves the
                view where it was.
              </Text>
              <Text as="p" size="2">
                From the keyboard you never have to open them at all:{" "}
                <Code style={NOWRAP}>Shift + Page Up</Code> / <Code style={NOWRAP}>Shift + Page Down</Code>{" "}
                step a whole year from inside the day grid, and <Code style={NOWRAP}>Page Up</Code> /{" "}
                <Code style={NOWRAP}>Page Down</Code> step a month.
              </Text>
              <Muted>
                A month you could never pick from is never offered: <Code>min</Code> and <Code>max</Code>{" "}
                grey out both grids and stop the chevrons at the edge.
              </Muted>
            </Flex>
          </Box>
        </Flex>
        <Caption>
          Whichever way you close a grid — a pick or <Code>Esc</Code> — focus lands back on the control you
          opened it with, so the month and the year are always one step apart. Screen readers hear the new
          month and year spoken as the view changes.
        </Caption>
      </Section>

      <Rule />

      <Section title="Single date — an appointment" lead="For one date (a due date, an appointment, a birthday), the single mode paints just the chosen day as the accent chip. Today stays marked by its bar so “now” is always locatable.">
        <Calendar defaultValue={SELECTED_DEMO} onValueChange={noop} />
        <Caption>One tap selects; the previous selection clears. The grid is one tab stop — arrow keys move day to day, PageUp/Down move by month.</Caption>
      </Section>

      <Rule />

      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Measured off rendered calendars, not resolved from the tokens: each row names an element and a property, reads that property off a real Calendar in the state the row is about, and reports whether it equals what the token it names resolves to — so a row can disagree with the component. Semantic roles are accent-aware; they follow a brand's collision shifts.">
          <TokenGroup
            label="CHANNELS"
            specimen={<Calendar mode="range" defaultValue={RANGE_DEMO} onValueChange={noop} />}
            blurb="Selection / today / range / disabled — the roles that paint them."
          >
            {/* Five calendars, each held in the state its rows are about — a selection, a committed range, a
                constrained month, a year grid — because a state a static render can hold is a state a row can
                read. The bands and chips are pseudo-element layers on the day button, so those rows name the
                pseudo; the hover and focus paints exist only while the state is active, so those rows read the
                declaration the component's OWN matched rule will paint and resolve it on the element. */}
            <MeasuredSpec
              render={() => (
                <>
                  <div data-spec="plain"><Calendar onValueChange={noop} /></div>
                  <div data-spec="selected"><Calendar defaultValue={plainDateToISO(T)} onValueChange={noop} /></div>
                  <div data-spec="range"><Calendar mode="range" defaultValue={RANGE_DEMO} onValueChange={noop} /></div>
                  <div data-spec="limited"><Calendar min={dOf(10)} max={dOf(20)} onValueChange={noop} /></div>
                  <div data-spec="years"><Calendar defaultView="year" defaultValue={SELECTED_DEMO} onValueChange={noop} /></div>
                </>
              )}
            >
              <MeasuredRow
                part="Selected · endpoint chip"
                note="The chip is the day button's ::after layer — the button itself paints nothing."
                token="--ds-fill-selected-subtle"
                select='[data-spec="selected"] .rt-ds-calendar-day[data-selected]'
                pseudo="::after"
                prop="background-color"
              />
              <MeasuredRow
                part="Selected · numeral"
                token="--ds-text-strong"
                select='[data-spec="selected"] .rt-ds-calendar-day[data-selected]'
                prop="color"
              />
              <MeasuredRow
                part="Range · committed band"
                note="The band is the ::before layer, under the chip, so an endpoint composites the two."
                token="--ds-fill-selected-subtle"
                select='[data-spec="range"] .rt-ds-calendar-day[data-range="middle"]'
                pseudo="::before"
                prop="background-color"
              />
              <MeasuredRow
                part="Range · preview band"
                note="Lives only between the first and second click of a range — no static render can hold it, so it stays unproven rather than printing a colour nothing was read from."
                token="--ds-fill-accent-weak"
                select=".rt-ds-calendar-day[data-preview]"
                pseudo="::before"
                prop="background-color"
              />
              <MeasuredRow
                part="Today bar"
                note="The 2px rule under the numeral — the third channel, beside selection's fill and focus's outline."
                token="--accent-indicator"
                select='[data-spec="plain"] .rt-ds-calendar-today-bar'
                prop="background-color"
              />
              <MeasuredRow
                part="Today bar · on a selected day"
                note="It flips off its own hue: the chip beneath it is that same accent."
                token="--ds-text-strong"
                select='[data-spec="selected"] .rt-ds-calendar-day[data-endpoint] .rt-ds-calendar-today-bar'
                prop="background-color"
              />
              <MeasuredRow
                part="Day numeral (rest)"
                token="--ds-text-strong"
                select='[data-spec="plain"] .rt-ds-calendar-day:not([data-outside]):not([data-selected])'
                prop="color"
              />
              <MeasuredRow
                part="Out-of-month"
                note="Dimmed but still navigable — the softer of the two dim tiers."
                token="--ds-text-weak"
                select='[data-spec="plain"] .rt-ds-calendar-day[data-outside]'
                prop="color"
              />
              <MeasuredRow
                part="Disabled"
                note="The harder tier — unselectable, and it wins wherever the two overlap."
                token="--ds-text-disabled"
                select='[data-spec="limited"] .rt-ds-calendar-day[aria-disabled="true"]'
                prop="color"
              />
              <MeasuredRow
                part="Focus ring (inset)"
                state="focus-visible"
                note="Drawn on the chip's own layer, inset, so it survives a selected day and never spills into the neighbouring cell. This is the accent base. A Radix alpha, --ds-stroke-focus-stack, sits on top of it, 2px wide ([[focus-ring]])."
                token="--ds-stroke-focus"
                select='[data-spec="plain"] .rt-ds-calendar-day'
                prop="outline-color"
              />
              <MeasuredRow
                part="Month / year grid · current cell"
                note="Read off the year grid; the month grid shares the rule."
                token="--ds-fill-selected-subtle"
                select='[data-spec="years"] .rt-ds-calendar-picker-option[data-selected]'
                pseudo="::after"
                prop="background-color"
              />
              <MeasuredRow
                part="Month / year grid"
                state="hover"
                token="--ds-fill-hover"
                select='[data-spec="years"] .rt-ds-calendar-picker-option:not([data-selected]):not([aria-disabled="true"])'
                prop="background-color"
              />
              <MeasuredRow
                part="Month / year grid · adjacent decade"
                note="The year either side of the decade in view — the day grid's out-of-month idiom, reused."
                token="--ds-text-weak"
                select='[data-spec="years"] .rt-ds-calendar-picker-option[data-outside]'
                prop="color"
              />
              <MeasuredRow
                part="Caption control · hover / open chip"
                state="hover"
                note="The month and year names are buttons; the same chip marks them hovered and open."
                token="--ds-fill-hover"
                select='[data-spec="plain"] .rt-ds-calendar-caption-btn'
                prop="background-color"
              />
            </MeasuredSpec>
            <NoteRow part="Range endpoint depth" value="the committed band tint painted over itself — the chip and the band are separate layers, so an endpoint is the ramp's deepest step with no extra token" />
            <NoteRow part="Endpoint numeral weight" value="600 (a middle day stays 400) — the non-colour cue that separates an endpoint from the band it caps" />
          </TokenGroup>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]). Static analysis can prove a row is a
  // MeasuredRow; only a live DOM can prove it measured a real Calendar node, that the claim was resolved
  // somewhere else, and that the two agree. 13 measured; the range PREVIEW band is the one row that
  // cannot be proven — it exists only between the two clicks of a range, so it reports what it could not
  // measure instead of falling back to resolving its token. Passive: nothing here drives a calendar.
  // The preview-band row has no element to find, and a row with nothing to match waits (60 frames) before
  // it will say so — a reading that has not happened yet is not the same finding as a selector naming
  // nothing, and the row refuses to confuse them. So this play waits for the table rather than reading it
  // the instant the story renders: `awaitMeasuredRows` blocks until every row has recorded its evidence,
  // then runs the identical assertions.
  play: async ({ canvasElement }) => {
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 13 || rows.unproven !== 1) {
      throw new Error(`expected 13 measured / 1 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Keyboard contract -------------------------------------------------- */

const CALENDAR_KEYS: KeyBinding[] = [
  { keys: ["←", "→"], action: <>Move focus one day back / forward. Under RTL the arrows mirror, so a key always steps in its on-screen direction.</>, src: "system" },
  { keys: ["↑", "↓"], action: "Move focus one week up / down — the same weekday in the adjacent row.", src: "system" },
  { keys: ["Home", "End"], action: "Jump to the first / last day of the focused week.", src: "system" },
  { keys: ["Ctrl + Home", "Ctrl + End"], action: "Jump to the first / last day of the month.", src: "system" },
  { keys: ["Page Up", "Page Down"], action: "Move to the previous / next month.", src: "system" },
  { keys: ["Shift + Page Up", "Shift + Page Down"], action: "Move to the previous / next year.", src: "system" },
  { keys: ["Enter", "Space"], action: <>Select the focused day. In <Code>range</Code> mode, the first press sets the start and the second sets the end.</>, src: "system" },
  { keys: ["Esc"], action: <>Cancel a range that is mid-selection (a start chosen, waiting on the end); a committed selection is left unchanged.</>, src: "system" },
];

const VIEW_JUMP_KEYS: KeyBinding[] = [
  { keys: ["Enter", "Space"], action: <>On the caption's <strong>month</strong> or <strong>year</strong>, open that grid. Focus moves onto the month or year currently in view.</>, src: "system" },
  { keys: ["←", "→", "↑", "↓"], action: <>Move through the grid. Off the edge of a year page the sequence carries on into the neighbouring decade; a month page stops at its edges — twelve months IS the year, with nothing shared across the boundary — so use the chevrons or the Page keys to change year.</>, src: "system" },
  { keys: ["Home", "End"], action: "Jump to the first / last cell of the focused row.", src: "system" },
  { keys: ["Page Up", "Page Down"], action: <>Page the grid by its own parent unit — a <strong>year</strong> in the month grid, a <strong>decade</strong> in the year grid — holding your place in the grid across the flip. The chevrons do the same thing with the pointer.</>, src: "system" },
  { keys: ["Enter", "Space"], action: <>Pick. The view moves to that month or year, the grid closes, and focus returns to the control you opened it with.</>, src: "system" },
  { keys: ["Esc"], action: <>Close without changing the view; focus returns to the same control.</>, src: "system" },
];

/** Keyboard — the full key → action contract for the day grid: arrow navigation, month/year paging, and
 *  selection, all reachable through a single roving tab stop. */
export const Keyboard: Story = {
  render: () => (
    <Page maxWidth={900}>
      <PageHeader title="Calendar · Keyboard" standfirst={DEFINITION} />
      <Section
        title="Keyboard"
        lead={<>The full key → action contract. <Code>Tab</Code> moves focus into the grid — a <strong>single tab stop</strong>, so one Tab enters and one Tab leaves, and a roving focus remembers the active day. The keys below then move within the month.</>}
      >
        <Flex direction="column" gap="2">
          <Box>
            <Calendar defaultValue={SELECTED_DEMO} onValueChange={noop} />
          </Box>
          <Caption>A live target — <Code>Tab</Code> into the grid, then try the keys. The focused day takes the inset focus ring; arrows move it, <Code>Enter</Code> selects.</Caption>
        </Flex>
        <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
          {CALENDAR_KEYS.map((b) => <KeyRow key={b.keys.join("+")} {...b} />)}
        </Box>
        <Section
          title="The month and year grids"
          lead={<>The caption's title is two controls. Each opens a grid <em>in place</em> — same roving geometry, same one-Tab-in rule. The day-grid shortcuts above already cover most travel, so reach for these when you're going a long way: <Code style={NOWRAP}>Shift + Page Up</Code> / <Code style={NOWRAP}>Shift + Page Down</Code> step a year without opening anything.</>}
        >
          <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
            {VIEW_JUMP_KEYS.map((b, i) => <KeyRow key={`${b.keys.join("+")}-${i}`} {...b} />)}
          </Box>
          <Caption>
            Each control is a <Code>button aria-expanded</Code> inside the caption heading, so a screen
            reader hears it as collapsed or expanded and the day grid keeps its name. The grid it opens is
            a <Code>role="grid"</Code> named for what it holds — “Months in 2026”, “Years 2019 to 2030”.
            A month or year that <Code>min</Code> / <Code>max</Code> rules out carries{" "}
            <Code>aria-disabled</Code> and is skipped by the arrows.
          </Caption>
        </Section>

        <Caption>
          <strong>Screen readers:</strong> each day is a <Code>role="gridcell"</Code> with a full localized{" "}
          <Code>aria-label</Code> (“Monday, July 14, 2026”) and <Code>aria-selected</Code> on the chosen day;
          today carries <Code>aria-current="date"</Code>. A machine-readable <Code>data-date="YYYY-MM-DD"</Code>{" "}
          drives navigation, so the human label is never parsed — which would break under fr-FR or ja-JP.
        </Caption>
      </Section>
    </Page>
  ),
};

/* ---- Props --------------------------------------------------------- */

const PROPS: PropDef[] = [
  { name: "mode", type: `"single" | "range"`, def: `"single"`, desc: <>Pick one date, or a start→end range.</>, source: "Calendar.tsx" },
  { name: "value / defaultValue", type: "ISO | {start,end}", desc: <>Controlled / uncontrolled selection — an ISO string (single) or an ISO <Code>{`{ start, end }`}</Code> (range).</>, source: "Calendar.tsx" },
  { name: "onValueChange", type: "(v) => void", def: "— (required)", desc: <>Fires with the ISO selection — an ISO string (single) or an ISO <Code>{`{ start, end }`}</Code> (range).</>, source: "Calendar.tsx" },
  { name: "min / max", type: "ISO", desc: <>Inclusive selectable bounds; dates outside are disabled.</>, source: "Calendar.tsx" },
  { name: "isDateDisabled", type: "(iso) => boolean", desc: <>Custom disable predicate — return <strong>true to disable</strong> a date.</>, source: "Calendar.tsx" },
  { name: "weekStartsOn", type: "0…6", def: "0", desc: <>First weekday column (0 = Sunday).</>, source: "Calendar.tsx" },
  { name: "numberOfMonths", type: "1 | 2", def: "1", desc: <>Show one or two months; anything but 2 clamps to 1.</>, source: "Calendar.tsx" },
  { name: "hasOutsideDays", type: "boolean", def: "true", desc: <>Render dimmed adjacent-month spillover days (navigable — a click flips the month).</>, source: "Calendar.tsx" },
  { name: "hasWeekNumbers", type: "boolean", def: "false", desc: <>Prefix each week row with its ISO week number.</>, source: "Calendar.tsx" },
  { name: "defaultView", type: `"day" | "month" | "year"`, def: `"day"`, desc: <>Which view the calendar opens on. Initial-only and uncontrolled: a birth-date field can land straight on the year grid instead of making the user page there. Opening on a grid moves no focus, exactly like opening on the day view.</>, source: "Calendar.tsx" },
  { name: "focusDate / onFocusDateChange", type: "ISO", desc: <>Controlled focused day for the roving tab stop.</>, source: "Calendar.tsx" },
  { name: "size", type: `"1" | "2" | "3"`, def: `"1"`, desc: <>Control size lane; unset follows the global <Code>uiSize</Code> (default small → <Code>1</Code>).</>, source: "Calendar.tsx" },
  { name: "dir", type: `"ltr" | "rtl"`, desc: <>Reading direction; unset auto-detects from the DOM. RTL mirrors the chevrons and swaps arrow-nav.</>, source: "Calendar.tsx" },
];

type PropsArgs = {
  mode: "single" | "range";
  size: "auto" | "1" | "2" | "3";
  weekStartsOn: 0 | 1;
  numberOfMonths: 1 | 2;
  hasOutsideDays: boolean;
  hasWeekNumbers: boolean;
  disablePast: boolean;
  disableWeekends: boolean;
};

/** Props — drive every knob: mode, week start, month count, size, and the two disable levers. */
export const Props: StoryObj<PropsArgs> = {
  args: {
    mode: "single",
    // "auto" (size unset) is the default so the calendar tracks the global uiSize toolbar out of the box.
    size: "auto",
    weekStartsOn: 0,
    numberOfMonths: 1,
    hasOutsideDays: true,
    hasWeekNumbers: false,
    disablePast: false,
    disableWeekends: false,
  },
  argTypes: {
    mode: { control: "inline-radio", options: ["single", "range"] },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset); a step pins it.' },
    weekStartsOn: { name: "week starts on", control: "inline-radio", options: [0, 1] },
    numberOfMonths: { name: "months", control: "inline-radio", options: [1, 2] },
    hasOutsideDays: { name: "outside days", control: "boolean" },
    hasWeekNumbers: { name: "week numbers", control: "boolean" },
    disablePast: { name: "disable past (min = today)", control: "boolean" },
    disableWeekends: { name: "disable weekends", control: "boolean" },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => {
    const [single, setSingle] = useState<ISODateString>(SELECTED_DEMO);
    const [range, setRange] = useState<DateRange>(RANGE_DEMO);
    const isWeekend = (iso: ISODateString) => {
      const wd = plainDateToDate(plainDateFromISO(iso)).getDay();
      return wd === 0 || wd === 6;
    };
    const common = {
      size: args.size === "auto" ? undefined : args.size,
      weekStartsOn: args.weekStartsOn,
      numberOfMonths: args.numberOfMonths,
      hasOutsideDays: args.hasOutsideDays,
      hasWeekNumbers: args.hasWeekNumbers,
      min: args.disablePast ? plainDateToISO(T) : undefined,
      isDateDisabled: args.disableWeekends ? isWeekend : undefined,
    } as const;
    return (
      <Page maxWidth="none">
        <PageHeader title="Calendar · Props" standfirst={DEFINITION} />
        <Box p="5">
          {args.mode === "range" ? (
            <Calendar mode="range" value={range} onValueChange={setRange} {...common} />
          ) : (
            <Calendar value={single} onValueChange={setSingle} {...common} />
          )}
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop on <Code>&lt;Calendar&gt;</Code>. The API keeps <Code>PlainDate</Code> internal and ISO strings on the wire.</>}>
          <PropTable rows={PROPS} />
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Calendar · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[calendar-grid]] · Painted from semantic tokens">
            <strong>Painted entirely from the system's <Code>--ds-*</Code> semantic tokens</strong> — its
            own markup, no borrowed component skins. Every channel is accent-aware, so the calendar follows
            a brand's collision shifts like every other system surface.
          </Decision>
          <Decision id="[[calendar-grid]] · Three visual channels">
            <strong>Three visual channels, one per meaning.</strong> Selection owns the <em>fill</em>
            channel (<Code>--ds-fill-selected-subtle</Code>, the accent tint, under a{" "}
            <Code>--ds-text-strong</Code> numeral at weight 600 — the Select selected-row treatment);
            focus owns the <em>outline</em> channel; so <strong>today</strong> takes a <em>third</em> — a
            2px accent bar under the numeral (<Code>--accent-indicator</Code>), flipping to{" "}
            <Code>--ds-text-strong</Code> when today is also selected, because there the bar and the tint
            beneath it are the same hue. Never a ring (it would collide with focus); the bar is the WCAG
            1.4.1 non-colour cue.
          </Decision>
          <Decision id="[[calendar-grid]] · A numeral never sits on a solid accent">
            <strong>The selected day is a tint, not a solid fill.</strong> The chip used to paint the solid
            accent (<Code>--ds-fill-selected</Code>) under a white numeral. That step of a Radix scale is a
            <em>background</em> step and carries no text-contrast promise — only steps 11 and 12 do — and
            sampled off rendered pixels the white numeral measured <strong>3.00–4.12:1</strong> across 15 of
            27 brand colours, against the <strong>4.5:1</strong> a numeral that size owes. So the chip drops
            to the accent tint and the numeral goes back to <Code>--ds-text-strong</Code>: selection keeps
            the accent channel, contrast comes from the neutral text (8.5:1 or better at every brand colour,
            in both appearances). The same move the Select menu's selected row and the menu highlight made,
            and the same treatment Pagination's current page already uses.
          </Decision>
          <Decision id="[[calendar-grid]] · Range intensity ramp">
            <strong>Range is an intensity ramp</strong> across existing roles — preview{" "}
            <Code>--ds-fill-accent-weak</Code> (a3) · committed <Code>--ds-fill-selected-subtle</Code>{" "}
            (a5) · <strong>endpoints, the same committed tint composited over it</strong>. The band and the
            endpoint chip are separate layers, so an endpoint is literally the band tint twice — a third,
            deeper step with no fourth token and, decisively, no <em>edge</em>: a ring around a full-bleed
            chip would draw a line down the side facing the band and cut the continuity the flush grid
            exists for. Cells are painted <strong>flush</strong> (zero gap) so the band is continuous; only
            outer + run-boundary corners round, via logical radius props so they auto-mirror under RTL.{" "}
            <strong>Zero net-new tokens.</strong>
          </Decision>
          <Decision id="One content box for all three views">
            <strong>The day grid, the month grid and the year grid occupy the same box.</strong> They have
            different column counts — seven narrow against three or four wide — so left to size themselves
            each lands on a different width, and the caption centred above them moves every time a grid
            opens. The day grid is the sizer: its rendered width is measured and every other view is set
            from it. Measured rather than written down, because the week-number column is content-sized and
            has no number to hardcode — with week numbers on, the day body ran 19px wider than the grid that
            replaced it. In a two-month view the caption keeps the <em>first</em> pane's box while the grid
            spans both, so the title does not travel 110px to the right when you open it.
          </Decision>
          <Decision id="The caption title is two controls">
            <strong>The month name and the year are separate controls</strong>, not one label — the month
            opens a grid of all twelve months, the year a grid of years you can page through by decade.
            The split is taken from the locale's own formatted parts, so a language that writes the year
            first gets its controls in that order. Both stay inside the same heading, so the day grid is
            still named "September 2026" for a screen reader. Neither control carries a caret: the caption
            already runs close to the width of the grid beneath it, and a glyph would push it past. The
            affordance is the hover chip and the focus ring instead.
          </Decision>
          <Decision id="View changes are spoken">
            <strong>Changing the month or the year is announced</strong> through the shared polite live
            region. Clicking a chevron or picking from a grid moves no focus, so without this a screen
            reader hears nothing at all. The announcement can't live on the caption itself: the caption is
            rebuilt on every flip, and a live region that appears already holding its message is dropped
            by most screen readers.
          </Decision>
          <Decision id="Every view pages by its parent unit">
            <strong>The day grid steps a month, the month grid steps a year, the year grid steps a
            decade</strong> — one rule, three views, and the chevrons sit in the same two slots
            throughout. The month grid used to be the exception: it had no chevrons at all, so
            "open the months, realise you want next year" meant leaving for a different grid and
            coming back — a dead end under two empty reserved slots where every other view draws
            arrows. Twelve months has no <em>overlap</em> with the next twelve the way a year page
            overlaps its neighbour, so a month page's edge ARROWS still stop; the chevrons and{" "}
            <Code>Page Up</Code> / <Code>Page Down</Code> carry the year change. While the month grid
            is paged the caption's year follows the page — the cells read "Jan…Dec" and carry no year
            of their own, so nothing else on screen could say which year you were looking at.
          </Decision>
          <Decision id="Navigation stops at the bounds">
            <strong>Both chevrons and both grids stop at <Code>min</Code> / <Code>max</Code>.</strong> A
            month whose every day is out of range can't be paged into or chosen, so the calendar never
            lands somewhere with nothing to pick and no explanation.
          </Decision>
          <Decision id="[[calendar-grid]] · Inset focus ring">
            <strong>The grid-cell focus ring is INSET</strong> (<Code>outline-offset: -2px</Code>) — a
            deliberate divergence from the input <Code>+2px</Code> outset ring ([[input-focus-ring-offset]]).
            A flush grid has no gutter for an outset ring; it would be clipped by neighbours. Cites the
            Collapsible full-width-header precedent. Documented so a later reviewer doesn't "fix" it back
            and clip it.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            <strong>The month grid pages, and both grids are documented where they can be seen.</strong>{" "}
            The month grid gains year chevrons (and <Code>Page Up</Code> / <Code>Page Down</Code>), filling
            the two slots it used to reserve and leave empty; its caption year follows the page, and the
            roving tab stop falls back to the first selectable cell on a page that has nothing current.
            A new <Code>defaultView</Code> opens the calendar on the month or year grid — for a birth-date
            field, and for the Anatomy page, which called out both grids without ever rendering either.
          </Decision>
          <Decision id="0.9.0">
            <strong>Selection reads as a tint, and the views stopped moving.</strong> The selected day, the
            range endpoints and the month/year grids' current cell no longer paint a solid accent under a
            white numeral — measured on rendered pixels, that numeral fell below the 4.5:1 it owes on most
            brand colours. They take the accent tint with a neutral numeral instead; inside a range the
            endpoint is that tint over the band's, so the ramp keeps three steps and the band stays
            unbroken. The today bar flips to the same neutral ink there for the same reason. Separately,
            all three views now share one content box measured off the day grid, so opening the month or
            year grid no longer shifts the month-year title.
          </Decision>
          <Decision id="0.9.0">
            <strong>Month and year navigation.</strong> The caption title splits into two controls: the
            month opens a twelve-month grid, the year a decade-paged year grid. Both ride the same roving
            grid keyboard as the day view. Month and year changes are now announced to screen readers, and
            the chevrons and both grids stop at <Code>min</Code> / <Code>max</Code> instead of paging into
            a fully disabled month.
          </Decision>
          <Decision id="0.9.0">
            Calendar ships: a single + range date grid — the today-marker third channel, the
            preview → band → endpoint range ramp, and the inset focus ring. Full WAI-ARIA grid
            keyboard with a single roving tab stop. Stories on the standard spine: History · Anatomy ·
            Usage · Keyboard · Props.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
