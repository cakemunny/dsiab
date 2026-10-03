import { useContext, useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text as RadixText } from "@radix-ui/themes";
import { Timestamp, type TimestampFormat } from "./Timestamp";
import {
  AnatomyLegend, Caption, Decision, dotStyle, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, NoteRow, Page,
  PageHeader, PropsLead, type PropDef, PropTable, Rule, Section, tick, TokenGroup,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>A moment rendered as human text inside a semantic <Code>&lt;time&gt;</Code> element — machine-readable and screen-reader-friendly. It takes a Unix timestamp or an ISO string and formats it <Code>relative</Code> (“2 hours ago”), <Code>auto</Code> (relative while recent, absolute once old), or from a set of absolute presets. In relative mode the tooltip and the accessible name both carry the full time.</>;

/* Reference times — a fixed distance from render so the relative/auto specimens read stably in a session. */
const HOURS_AGO_2 = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
const DAYS_AGO_30 = new Date(Date.now() - 30 * 86400 * 1000).toISOString();

const FORMATS: { format: TimestampFormat; note: string }[] = [
  { format: "relative", note: "human distance — Intl.RelativeTimeFormat (locale-correct)" },
  { format: "auto", note: "relative while recent, date_time past the threshold" },
  { format: "date", note: "localized date" },
  { format: "date_time", note: "localized date + time" },
  { format: "time", note: "localized time" },
  { format: "system_date", note: "machine — YYYY-MM-DD" },
  { format: "system_date_time", note: "machine — YYYY-MM-DD HH:MM:SS" },
  { format: "system_time", note: "machine — HH:MM:SS" },
];

/* ---- Tokens: the reused Radix Text skin, measured off the rendered <time> ----
   The colour row names an element and a property and reads it off a real rendered <time>, then checks it
   against the token it claims — so it can disagree with the component. The two rows under it carry no
   token to be checked against: the size is whatever step the ambient text lane hands the <time>, and the
   figure style is a keyword, so both are read live off the same rendered element. */
function TimestampTokens() {
  const themeKey = useContext(HexThemeKey);
  const ref = useRef<HTMLDivElement>(null);
  const [read, setRead] = useState<{ size: string; variant: string }>({ size: "", variant: "" });
  useLayoutEffect(() => {
    const t = ref.current?.querySelector<HTMLElement>(".rt-ds-timestamp");
    if (t) {
      const cs = getComputedStyle(t);
      setRead({ size: cs.fontSize, variant: cs.fontVariantNumeric });
    }
  }, [themeKey]);
  return (
    <TokenGroup
      label="TEXT — reused Radix Text skin, measured off the rendered <time>"
      blurb="Timestamp declares no --ds-* roles of its own — it IS a Radix Text (via asChild), so its colour and size are Radix Text's. The only add is tabular figures, so a live tick never reflows."
      specimen={<Box ref={ref}><Timestamp value={HOURS_AGO_2} /></Box>}
    >
      <MeasuredSpec render={() => <Timestamp value={HOURS_AGO_2} />}>
        <MeasuredRow
          part="Text colour"
          note="The muted gray step Radix Text paints at the default color=&quot;gray&quot; — a timestamp is supporting text."
          token="--gray-a11"
          select=".rt-ds-timestamp"
          prop="color"
        />
      </MeasuredSpec>
      <NoteRow part="Font size" value={read.size ? `${read.size} — whatever step the ambient text lane hands it` : "…"} />
      <NoteRow part="Numeric" value={read.variant && read.variant !== "normal" ? `${read.variant} — one advance width per digit, so a live tick never reflows` : "…"} />
      <NoteRow part="Element" value="<time dateTime={ISO}> — machine-readable, semantic" radix="HTML <time>" />
    </TokenGroup>
  );
}

/* ---- anatomy legend ------------------------------------------------------ */
const ANATOMY_PARTS: [number, string, string][] = [
  [1, "<time> element", "the semantic root, carrying a machine-readable `dateTime={ISO}` — parseable by anything, not just human eyes. Styled AS a Radix Text via asChild (one element, no wrapper)."],
  [2, "Display text", "the chosen format's string. Relative uses Intl.RelativeTimeFormat (locale-correct); absolute uses Intl.DateTimeFormat; system_* are machine builders."],
  [3, "Tooltip + aria-label", "in RELATIVE mode only, the full absolute time is both the hover tooltip and the aria-label — so \"2 hours ago\" is never ambiguous to a mouse or a screen reader."],
];

/* ---- Anatomy diagram ------------------------------------------------------
   Timestamp is ONE element. `asChild` merges Radix Text's typography onto the `<time>` itself — no
   wrapper span — so the semantic root, the string it prints, and the names it carries are three facets
   of a single box, not three boxes. The callouts say so: all three leaders land on the same `<time>`,
   from three different sides — the element from its top-left, the tooltip + aria-label it carries from
   its top-right, the printed string from below its centre. A single stack of dots on one edge would
   read as three separate parts, which would be the wrong claim.

   Positions are MEASURED off the live specimen: the string's width is whatever the current locale and
   the elapsed distance make it ("2 hours ago" today, "yesterday" tomorrow), so no x here can be
   written down. */

const DOT = 20; // dotStyle's diameter
const TIME_EL = ".rt-ds-timestamp";

/** [callout, where across the element the leader lands, which band the dot sits in, tick length]. */
const PINS: { n: number; at: "left" | "center" | "right"; band: "over" | "under"; lane: number }[] = [
  { n: 1, at: "left", band: "over", lane: 26 },
  { n: 3, at: "right", band: "over", lane: 26 },
  { n: 2, at: "center", band: "under", lane: 26 },
];

function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const specimen = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<Record<number, { x: number; y: number }>>({});

  useLayoutEffect(() => {
    const f = frame.current;
    const s = specimen.current;
    if (!f || !s) return;
    const measure = () => {
      const el = s.querySelector<HTMLElement>(TIME_EL);
      if (!el) return;
      const fr = f.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const next: Record<number, { x: number; y: number }> = {};
      for (const p of PINS) {
        const x = p.at === "left" ? r.left : p.at === "right" ? r.right : r.left + r.width / 2;
        next[p.n] = {
          x: Math.round(x - fr.left),
          y: Math.round((p.band === "over" ? r.top : r.bottom) - fr.top),
        };
      }
      // Only write when something moved — the frame's own size feeds this observer otherwise.
      setAt((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
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
      <Box
        ref={frame}
        style={{
          position: "relative",
          borderRadius: "var(--ds-radius-4)",
          background: "var(--ds-bg-subtle)",
          padding: "56px var(--ds-space-32)",
        }}
      >
        <Flex ref={specimen} align="center" justify="center">
          <RadixText size="3">Deployed <Timestamp value={HOURS_AGO_2} size="3" /> to production.</RadixText>
        </Flex>
        {PINS.map((p) => {
          const a = at[p.n];
          if (!a) return null;
          const over = p.band === "over";
          return (
            <Box key={p.n}>
              <Box data-pin={p.n} style={{ ...dotStyle, left: a.x - DOT / 2, top: over ? a.y - p.lane - DOT : a.y + p.lane }}>{p.n}</Box>
              <Box style={tick({ left: a.x, top: over ? a.y - p.lane : a.y, height: p.lane })} />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/* ========================================================================== */
const meta: Meta<typeof Timestamp> = {
  title: "Components/Content/Timestamp",
  component: Timestamp,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Timestamp** renders a moment as human text inside a semantic `<time dateTime={ISO}>` — machine-" +
          "readable and screen-reader-friendly. It accepts a Unix timestamp (seconds or ms, auto-detected) or " +
          "an ISO string, and formats it **relative** (\"2 hours ago\" — locale-correct via `Intl.RelativeTimeFormat`), " +
          "**auto** (relative while recent, absolute once old), a set of localized **absolute** presets, or " +
          "machine **`system_*`** formats. In relative mode a hover tooltip and the `aria-label` both carry the " +
          "full absolute time, and `isLive` re-renders on a distance-aware interval ladder.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Timestamp>;

/* ---- Anatomy — the labelled diagram only; the token spec closes Usage ----- */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Timestamp · Anatomy" standfirst={DEFINITION} />

        <Section title="Anatomy" lead="A semantic <time> element carrying both a machine-readable datetime and the chosen human string.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>All three callouts land on the same <Code>&lt;time&gt;</Code> — <Code>asChild</Code> merges the typography onto it, so there is no second element to point at. Hover the "2 hours ago" above and the tooltip shows the full absolute time; the same string is the element's <Code>aria-label</Code>.</Caption>
        </Section>

        <Rule />

        <Section title="Formats" lead="One reference moment (2 hours ago), rendered in every format. Relative + auto are locale-correct; system_* are machine-stable.">
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="3">
            {FORMATS.map((f) => (
              <Flex key={f.format} align="center" justify="between" gap="3" style={{ padding: "var(--ds-space-8) var(--ds-space-12)", borderRadius: "var(--ds-radius-3)", border: "1px solid var(--ds-stroke-weak)" }}>
                <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
                  <Mono>{f.format}</Mono>
                  <RadixText size="1" style={{ color: "var(--ds-text-weak)" }}>{f.note}</RadixText>
                </Flex>
                <Box style={{ flexShrink: 0, textAlign: "right" }}>
                  <Timestamp value={HOURS_AGO_2} format={f.format} color="gray" />
                </Box>
              </Flex>
            ))}
          </Grid>
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

/* ---- Usage — scenarios, then the closing live token spec ----------------- */
export const Usage: Story = {
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="Timestamp · Usage" standfirst={DEFINITION} />

      <Section title="In a feed — relative, with the full time a hover away" lead="Relative time is the friendliest read for recent activity; the tooltip + aria-label keep the exact moment reachable.">
        <Flex direction="column" gap="2" style={{ maxWidth: 380 }}>
          {[
            { who: "Ada", what: "merged #482", when: HOURS_AGO_2 },
            { who: "Grace", what: "opened an incident", when: new Date(Date.now() - 18 * 60 * 1000).toISOString() },
            { who: "Alan", what: "archived the project", when: DAYS_AGO_30 },
          ].map((r) => (
            <Flex key={r.what} align="baseline" gap="2" style={{ padding: "var(--ds-space-8) var(--ds-space-12)", borderRadius: "var(--ds-radius-3)", border: "1px solid var(--ds-stroke-weak)" }}>
              <RadixText size="2" style={{ color: "var(--ds-text-strong)" }}><strong>{r.who}</strong> {r.what}</RadixText>
              <Box style={{ marginInlineStart: "auto" }}><Timestamp value={r.when} /></Box>
            </Flex>
          ))}
        </Flex>
        <Caption>The 30-days-ago row falls past the <Code>auto</Code> threshold, so it renders an absolute date instead of "a month ago".</Caption>
      </Section>

      <Rule />

      <Section title="Live" lead="Set isLive to tick the relative time in place. The interval ladders with distance; tabular figures keep it from reflowing.">
        <Flex align="center" gap="2">
          <RadixText size="2">Started</RadixText>
          <Timestamp value={new Date(Date.now() - 8 * 1000).toISOString()} format="relative" isLive />
        </Flex>
        <Caption>Watch it climb from "now" second by second. Under <Code>prefers-reduced-motion</Code> nothing here animates — it's a text swap, not motion.</Caption>
      </Section>

      <Rule />

      <Section title="Machine + absolute formats" lead="For logs and tables, reach for a fixed format: absolute presets are localized; system_* are locale-independent, sortable strings.">
        <Flex direction="column" gap="2">
          <Flex align="center" gap="3"><Code>date_time</Code><Timestamp value={HOURS_AGO_2} format="date_time" isTimezoneShown /></Flex>
          <Flex align="center" gap="3"><Code>system_date_time</Code><Timestamp value={HOURS_AGO_2} format="system_date_time" /></Flex>
        </Flex>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Read off the rendered <time> and checked against the token the row names — Timestamp borrows Radix Text's skin, so it declares no roles of its own.">
          <TimestampTokens />
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]).
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 1 || rows.unproven !== 0) {
      throw new Error(`expected 1 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Props ---------------------------------------------------------- */
const PROPS: PropDef[] = [
  { name: "value", type: "string | number", desc: <>A Unix timestamp (seconds or ms, auto-detected) or an ISO 8601 string.</>, source: "Timestamp.tsx" },
  { name: "format", type: FORMATS.map((f) => `"${f.format}"`).join(" | "), def: `"auto"`, desc: <>How to render the moment. See the Formats table in Anatomy.</>, source: "Timestamp.tsx" },
  { name: "autoThreshold", type: "number", def: "604800", desc: <><Code>auto</Code> switches relative → <Code>date_time</Code> past this many seconds (default 7 days).</>, source: "Timestamp.tsx" },
  { name: "hasTooltip", type: "boolean", def: "true", desc: <>Show the full-absolute hover tooltip. Applies to the relative format only.</>, source: "Timestamp.tsx" },
  { name: "isTimezoneShown", type: "boolean", def: "false", desc: <>Append the timezone abbreviation to time-bearing formats.</>, source: "Timestamp.tsx" },
  { name: "isLive", type: "boolean", def: "false", desc: <>Tick the relative time on the 1s/30s/60s/5min ladder.</>, source: "Timestamp.tsx" },
  { name: "size / color / weight", type: "RadixText props", desc: <>Typography pass-throughs. <Code>size</Code> follows the global uiSize; <Code>color</Code> defaults to <Code>gray</Code>.</>, source: "Timestamp.tsx" },
];

type PropsArgs = {
  offsetHours: number;
  format: TimestampFormat;
  hasTooltip: boolean;
  isTimezoneShown: boolean;
  isLive: boolean;
};

export const Props: StoryObj<PropsArgs> = {
  args: { offsetHours: 2, format: "auto", hasTooltip: true, isTimezoneShown: false, isLive: false },
  argTypes: {
    offsetHours: { control: { type: "number", min: -48, max: 8760, step: 1 }, name: "hours ago", description: "How far in the past (negative = future).", table: { category: "Content" } },
    format: { control: "select", options: FORMATS.map((f) => f.format), description: "Display format.", table: { category: "Format" } },
    hasTooltip: { control: "boolean", description: "Full-absolute hover tooltip (relative only).", table: { category: "Behavior" } },
    isTimezoneShown: { control: "boolean", description: "Append the timezone abbreviation.", table: { category: "Format" } },
    isLive: { control: "boolean", description: "Tick the relative time live.", table: { category: "Behavior" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ offsetHours, format, hasTooltip, isTimezoneShown, isLive }: PropsArgs) => {
    const value = new Date(Date.now() - offsetHours * 3600 * 1000).toISOString();
    return (
      <Page maxWidth="none">
        <PageHeader title="Timestamp · Props" standfirst={DEFINITION} />
        <Flex align="center" gap="2" style={{ padding: "var(--ds-space-8) 0 var(--ds-space-2)" }}>
          <RadixText size="3">Event occurred{" "}
            <Timestamp value={value} format={format} hasTooltip={hasTooltip} isTimezoneShown={isTimezoneShown} isLive={isLive} size="3" />
          </RadixText>
        </Flex>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>Timestamp</Code> takes.</>}>
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
      <PageHeader title="Timestamp · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[relative-timestamp]] · i18n fix">
            Relative strings run through <Code>Intl.RelativeTimeFormat</Code> with <Code>numeric: "auto"</Code>,
            so a Spanish locale reads "hace 2 horas" and "ayer" — real localization, not English words swapped
            in. The boundary ladder is a <strong>pure, locale-independent</strong> chooser
            (<Code>getRelativeParts</Code>) that hands Intl a <Code>{"{value, unit}"}</Code>; only the words are
            localized.
          </Decision>
          <Decision id="[[relative-timestamp]] · clock-skew tolerance">
            An asymmetric "now" window absorbs clock skew: <Code>|diff| &lt; 10s</Code> → "now" both ways, and a
            <strong> future</strong> value <Code>≤ 30s</Code> ahead → "now" (a near-future value is almost always
            the render clock lagging, not a real event — so it never flashes a confusing "in a few seconds").
          </Decision>
          <Decision id="[[relative-timestamp]] · live interval ladder">
            <Code>isLive</Code> re-renders relative time on a distance-aware ladder — every <strong>1s</strong>
            under a minute, <strong>30s</strong> under an hour, <strong>60s</strong> under a day, else
            <strong> 5min</strong> — fine near the event, cheap when it's distant. It ticks only while the effective
            format is relative. <strong>Tabular figures</strong> keep the tick from reflowing.
          </Decision>
          <Decision id="[[relative-timestamp]] · semantic time + tooltip">
            The root is a semantic <Code>&lt;time dateTime={"{ISO}"}&gt;</Code> (machine-readable), styled AS a
            Radix Text via <Code>asChild</Code> — one element, no wrapper span. In relative mode the full absolute
            string is both the hover <strong>tooltip</strong> (composed from the raw Radix Tooltip) and the
            <Code>aria-label</Code>. The pure time-math lives in a separately tested util
            (<Code>timestampFormat.logic.test.ts</Code>).
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Timestamp</Code>: the <Code>&lt;time&gt;</Code> element across relative /
            auto / absolute / system formats, the <Code>Intl.RelativeTimeFormat</Code> swap, the skew tolerance +
            live interval ladder (pure time-math helpers, node-tested), the relative-mode tooltip + aria-label. Tokens read live
            from the reused Radix Text skin.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
