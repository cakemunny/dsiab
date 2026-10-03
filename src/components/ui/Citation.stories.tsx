import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text as RadixText } from "@radix-ui/themes";
import { Citation } from "./Citation";
import {
  AnatomyLegend, Caption, Decision, dotStyle, HexThemeKey, hLine, MeasuredRow, MeasuredSpec, NoteRow, Page,
  PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section, tick, TokenGroup,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    A source reference, inline in the text. It renders an anchor when the source is linked and a plain
    span when it is not — there is no floating primitive. Two variants: <Code>label</Code>, a bordered
    pill with an optional favicon and a truncated title, and <Code>number</Code>, a superscript circle
    badge. It names itself <Code>{"Citation {n}: {title}"}</Code>.
  </>
);

/* Offline data-URI favicons (a coloured disc) — always render, no network / CSP dependency. */
const favicon = (hex: string) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='7' fill='%23${hex}'/%3E%3C/svg%3E`;
const FAVICON_A = favicon("4f46e5");
const FAVICON_B = favicon("0891b2");

/* ---- Tokens: measured off a rendered pill + badge -------------------------
   Each row names an element and a property and reads that property off a real, rendered citation,
   then checks it against the token it claims — so a row can disagree with the component. The two
   hover rows read the declaration the component's OWN matched rule paints, since no script can
   synthesise a real hover. */
function CitationTokens() {
  return (
    <TokenGroup
      label="PAINT — measured off a rendered pill + badge"
      blurb="Citation paints from --ds-* semantic tokens: --ds-text-weak (secondary text), --ds-stroke-weak (the pill border), and the accent-aware --ds-fill-accent-weak (the number badge — follows the brand shift). Every row below is read off the rendered leaf, so the table reports what it paints."
      specimen={
        <Flex align="center" gap="3">
          <Citation number={1} source={{ title: "Radix Themes", url: "https://radix-ui.com", icon: FAVICON_A }} />
          <RadixText size="3">badge<Citation number={1} variant="number" source={{ title: "Radix Themes", url: "https://radix-ui.com" }} /></RadixText>
        </Flex>
      }
    >
      <MeasuredSpec
        render={() => (
          <Flex align="center" gap="3">
            <Citation number={1} source={{ title: "Radix Themes", url: "https://radix-ui.com", icon: FAVICON_A }} />
            <RadixText size="3">badge<Citation number={1} variant="number" source={{ title: "Radix Themes", url: "https://radix-ui.com" }} /></RadixText>
          </Flex>
        )}
      >
        <MeasuredRow part="Pill text" token="--ds-text-weak" select=".rt-ds-citation--label" prop="color" />
        <MeasuredRow part="Pill border" token="--ds-stroke-weak" select=".rt-ds-citation--label" prop="border-top-color" />
        <MeasuredRow
          part="Pill fill"
          note="A linked pill deepens on hover — the bounded surface is the affordance, so there is no underline."
          token="--ds-fill-hover"
          select=".rt-ds-citation--label[data-linked]"
          prop="background-color"
          state="hover"
        />
        <MeasuredRow
          part="Badge fill"
          note="Accent-aware, so the badge follows a brand collision shift."
          token="--ds-fill-accent-weak"
          select=".rt-ds-citation--number"
          prop="background-color"
        />
        <MeasuredRow
          part="Badge fill"
          note="One step deeper while a linked badge is under the pointer."
          token="--ds-fill-accent-med"
          select=".rt-ds-citation--number[data-linked]"
          prop="background-color"
          state="hover"
        />
      </MeasuredSpec>
      <NoteRow part="Badge shape" value="radius: full on a square (min-width = height) → a circle" radix="--ds-radius-full" />
    </TokenGroup>
  );
}

/* ---- anatomy legends ----------------------------------------------------- */
const LABEL_PARTS: [number, string, string][] = [
  [1, "Pill container", "an <a> (linked) or <span> (unlinked). A bounded surface with a --ds-stroke-weak border; on a linked pill, hover deepens the fill (the surface is the affordance — no underline)."],
  [2, "Favicon", "optional — a fixed, non-shrinking bordered disc holding the source's icon (aria-hidden, alt=\"\"). Decorative; the title names the source."],
  [3, "Title", "the source title, ellipsis-truncated at a 15em pill cap. The full title is a hover (native title) + the aria-label away."],
];
const NUMBER_PARTS: [number, string, string][] = [
  [1, "Superscript badge", "a circle raised via vertical-align: super — radius: full on a square (min-width = height) box, so a single digit is a circle and a two-digit number grows to a tidy stadium."],
  [2, "Accent-muted fill", "--ds-fill-accent-weak (accent-a3) — a faint, accent-aware tint that follows the brand collision shift; a linked badge deepens on hover."],
];

/* ---- Anatomy diagrams -----------------------------------------------------
   Citation is an INLINE leaf, so its parts run ACROSS a line rather than stacking: the callouts sit in
   the band above (and, for the badge's paint, the band below) and drop a tick onto the part they name.
   The pill container is the one part with an outer edge to point at, so it is named from the side gutter.

   TWO legends means TWO diagrams — each numbered against its OWN legend, so the pill's parts run 1–3 and
   the badge's run 1–2. One shared numbering would send the reader hunting across a rule for the part a
   dot names.

   Positions are MEASURED off the live specimen. The pill sizes off the surrounding text
   (font-size: 0.85em) and the page follows the size toolbar, so none of these x/y values can be
   written down. */

const DOT = 20;    // dotStyle's diameter
const LEADER = 40; // the gutter dot's horizontal run into the part it names

type Pin =
  /** Named from the side gutter, on the part's own centre line. */
  | { n: number; sel: string; place: "gutter" }
  /** A dot in the band above/below, dropping a tick onto the part; `lane` is the tick's length. */
  | { n: number; sel: string; place: "over" | "under"; lane: number; at?: "left" | "center" | "right" };

function PinnedDiagram({
  pins, stop, bandTop, bandBottom, children,
}: {
  pins: Pin[];
  /** The box every over/under tick stops on, so a callout onto a part INSIDE the pill never draws across its fill. */
  stop?: string;
  bandTop: number;
  bandBottom: number;
  children: ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const specimen = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<Record<number, { x: number; y: number }>>({});
  /** One x for every gutter dot, so they stack in a column — taken off the leftmost part. */
  const [gutter, setGutter] = useState<number | null>(null);

  useLayoutEffect(() => {
    const f = frame.current;
    const s = specimen.current;
    if (!f || !s) return;
    const measure = () => {
      const fr = f.getBoundingClientRect();
      const stopBox = stop ? s.querySelector<HTMLElement>(stop)?.getBoundingClientRect() : undefined;
      const next: Record<number, { x: number; y: number }> = {};
      let leftmost = Infinity;
      for (const p of pins) {
        const el = s.querySelector<HTMLElement>(p.sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (p.place === "gutter") {
          const x = Math.round(r.left - fr.left);
          next[p.n] = { x, y: Math.round(r.top + r.height / 2 - fr.top) };
          leftmost = Math.min(leftmost, x);
          continue;
        }
        const x = p.at === "left" ? r.left : p.at === "right" ? r.right : r.left + r.width / 2;
        // The tick stops at whichever edge it reaches first — the part's own, or the container's — so a
        // callout onto a part inside the pill stops at the pill.
        const edge = p.place === "over"
          ? Math.min(r.top, stopBox?.top ?? r.top)
          : Math.max(r.bottom, stopBox?.bottom ?? r.bottom);
        next[p.n] = { x: Math.round(x - fr.left), y: Math.round(edge - fr.top) };
      }
      // Only write when something moved — the frame's own size feeds this observer otherwise.
      setAt((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      setGutter(Number.isFinite(leftmost) ? leftmost - LEADER - DOT : null);
    };
    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(f);
    ro.observe(s);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [pins, stop]);

  return (
    <Box style={{ overflowX: "auto" }}>
      <Box
        ref={frame}
        style={{
          position: "relative",
          borderRadius: "var(--ds-radius-4)",
          background: "var(--ds-bg-subtle)",
          padding: `${bandTop}px var(--ds-space-32) ${bandBottom}px`,
        }}
      >
        <Flex ref={specimen} align="center" justify="center">{children}</Flex>
        {pins.map((p) => {
          const a = at[p.n];
          if (!a) return null;
          if (p.place === "gutter") {
            if (gutter == null) return null;
            return (
              <Box key={p.n}>
                <Box data-pin={p.n} style={{ ...dotStyle, left: gutter, top: a.y - DOT / 2 }}>{p.n}</Box>
                <Box style={hLine({ left: gutter + DOT, top: a.y, width: a.x - gutter - DOT })} />
              </Box>
            );
          }
          const over = p.place === "over";
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

const LABEL_PINS: Pin[] = [
  { n: 1, sel: ".rt-ds-citation--label", place: "gutter" },
  { n: 2, sel: ".rt-ds-citation__favicon", place: "over", lane: 24 },
  { n: 3, sel: ".rt-ds-citation__label", place: "over", lane: 24 },
];

/* Both callouts name the SAME badge: the legend's two parts are its geometry and its paint, not two
   boxes. So one comes down onto the badge's top edge and the other up onto its bottom edge — a dot on
   each side of the one part, rather than two dots crowded on the same edge. */
const NUMBER_PINS: Pin[] = [
  { n: 1, sel: ".rt-ds-citation--number", place: "over", lane: 26 },
  { n: 2, sel: ".rt-ds-citation--number", place: "under", lane: 26 },
];

/* ========================================================================== */
const meta: Meta<typeof Citation> = {
  title: "Components/Content/Citation",
  component: Citation,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Citation** is a pure inline **leaf** — a source reference that renders an `<a>` when the source is " +
          "linked, else a plain `<span>` (no floating primitive). Two variants: **label** (a bordered pill with " +
          "an optional favicon and an ellipsis-truncated title) and **number** (a superscript accent-muted circle " +
          "badge). It names itself `Citation {n}: {title}`, and carries **`role=\"doc-noteref\"` on the linked form " +
          "ONLY** — on a plain span that role trips axe, so it's omitted there (the polarity is correct here). " +
          "A hover source-preview card is not built yet.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Citation>;

/* ---- Anatomy — the labelled diagrams only; the token spec closes Usage ---- */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Citation · Anatomy" standfirst={DEFINITION} />
        <Section title="Anatomy — label" lead="A bordered pill: an optional favicon, an ellipsis-truncated title, on a linked (<a>) or unlinked (<span>) surface.">
          <PinnedDiagram pins={LABEL_PINS} stop=".rt-ds-citation--label" bandTop={56} bandBottom={28}>
            <Citation number={1} source={{ title: "Radix Themes documentation", url: "https://radix-ui.com", icon: FAVICON_A }} />
          </PinnedDiagram>
          <AnatomyLegend parts={LABEL_PARTS} />
        </Section>

        <Rule />

        <Section title="Anatomy — number" lead="A superscript circle badge — the compact form for dense, numbered references in running text.">
          <PinnedDiagram pins={NUMBER_PINS} bandTop={56} bandBottom={56}>
            <RadixText>
              The result was reproduced across three studies<Citation number={1} variant="number" source={{ title: "Study A", url: "https://example.com/a" }} /><Citation number={2} variant="number" source={{ title: "Study B", url: "https://example.com/b" }} />.
            </RadixText>
          </PinnedDiagram>
          <AnatomyLegend parts={NUMBER_PARTS} />
          <Caption>Both callouts name the same badge — its shape and its paint are two facets of one part, so one dot lands on its top edge and the other on its bottom.</Caption>
        </Section>

        <Rule />

        <Section title="Linked vs unlinked" lead="A source with a url is an <a> (doc-noteref, opens in a new tab); a source without one is a plain <span> — no role, still named.">
          <Flex align="center" gap="4" wrap="wrap">
            <Flex direction="column" gap="1" align="start">
              <Citation number={1} source={{ title: "Linked source", url: "https://radix-ui.com", icon: FAVICON_B }} />
              <Caption>&lt;a&gt; · role="doc-noteref"</Caption>
            </Flex>
            <Flex direction="column" gap="1" align="start">
              <Citation number={2} source={{ title: "Unlinked source" }} />
              <Caption>&lt;span&gt; · no role (axe-correct)</Caption>
            </Flex>
          </Flex>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Every numbered part in BOTH legends has a callout ON its own specimen — a numbered legend with
    // nothing to point at is the defect these diagrams exist to avoid.
    const expected = LABEL_PARTS.length + NUMBER_PARTS.length;
    const pins = canvasElement.querySelectorAll("[data-pin]");
    if (pins.length !== expected)
      throw new Error(`expected ${expected} callout pins across the two specimens; got ${pins.length}`);
  },
};

/* ---- Usage — scenarios, then the closing live token spec ----------------- */
export const Usage: Story = {
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="Citation · Usage" standfirst={DEFINITION} />
      <Section title="Label pills — a named source inline" lead="Reach for the label variant when the source's identity matters at a glance: a document, a page, a tool the reader recognizes.">
        <RadixText style={{ lineHeight: 1.8 }}>
          The design system is built on{" "}
          <Citation number={1} source={{ title: "Radix Themes", url: "https://radix-ui.com", icon: FAVICON_A }} />{" "}
          and follows the{" "}
          <Citation number={2} source={{ title: "WAI-ARIA Authoring Practices", url: "https://www.w3.org/WAI/ARIA/apg/", icon: FAVICON_B }} />{" "}
          for keyboard and screen-reader behaviour.
        </RadixText>
        <Caption>The pill caps at 15em and ellipsis-truncates; the full title is a hover (and the aria-label) away.</Caption>
      </Section>

      <Rule />

      <Section title="Number badges — dense, numbered references" lead="Reach for the number variant for footnote-style references where a compact ordinal keeps the prose readable.">
        <RadixText style={{ lineHeight: 1.9 }}>
          Large language models can hallucinate citations<Citation number={1} variant="number" source={{ title: "On Faithfulness", url: "https://example.com/1" }} />, so grounding responses in retrieved sources<Citation number={2} variant="number" source={{ title: "RAG", url: "https://example.com/2" }} /> measurably improves factuality<Citation number={3} variant="number" source={{ title: "Eval Study", url: "https://example.com/3" }} />.
        </RadixText>
      </Section>

      <Rule />

      <Section title="Do / don't" lead="Pick the variant by density; keep the number honest.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <Scenario label="DO — MATCH VARIANT TO DENSITY" caption="A single, recognizable source reads best as a label pill; a run of footnotes reads best as compact number badges.">
            <Flex align="center" gap="2" wrap="wrap">
              <Citation number={1} source={{ title: "Radix Themes", url: "https://radix-ui.com", icon: FAVICON_A }} />
              <RadixText style={{ color: "var(--ds-text-weak)" }}>vs</RadixText>
              <RadixText>text<Citation number={1} variant="number" source={{ title: "A", url: "https://example.com" }} /><Citation number={2} variant="number" source={{ title: "B", url: "https://example.com" }} /></RadixText>
            </Flex>
          </Scenario>
          <Scenario label="DON'T — MISLABEL AN UNLINKED SOURCE" caption="An unlinked citation is a plain span with no role — don't fake a link affordance on a source that goes nowhere.">
            <Citation number={9} source={{ title: "Source with no URL" }} />
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Read off a rendered pill + badge and checked against the token each row names — flip the accent/appearance toolbar and the accent-aware badge re-resolves.">
          <CitationTokens />
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]). The two hover rows read the declaration
    // the component's own matched rule paints — no script can synthesise a real hover.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 5 || rows.unproven !== 0) {
      throw new Error(`expected 5 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Props ---------------------------------------------------------- */
const PROPS: PropDef[] = [
  { name: "source.title", type: "string", desc: <>The source title (the pill text; part of the accessible name). Falls back to the number when absent.</>, source: "Citation.tsx" },
  { name: "source.url", type: "string", desc: <>Present → a link (<Code>&lt;a&gt;</Code>, <Code>doc-noteref</Code>, new tab); absent → a plain <Code>&lt;span&gt;</Code>.</>, source: "Citation.tsx" },
  { name: "source.icon", type: "string", desc: <>Favicon URL for the <Code>label</Code> variant (decorative, <Code>alt=""</Code> <Code>aria-hidden</Code>).</>, source: "Citation.tsx" },
  { name: "number", type: "number", desc: <>Required. The visible ordinal and part of the accessible name.</>, source: "Citation.tsx" },
  { name: "variant", type: `"label" | "number"`, def: `"label"`, desc: <>Pill (<Code>label</Code>) or superscript badge (<Code>number</Code>).</>, source: "Citation.tsx" },
];

type PropsArgs = {
  variant: "label" | "number";
  number: number;
  title: string;
  linked: boolean;
  withIcon: boolean;
};

export const Props: StoryObj<PropsArgs> = {
  args: { variant: "label", number: 1, title: "Radix Themes", linked: true, withIcon: true },
  argTypes: {
    variant: { control: "inline-radio", options: ["label", "number"], description: "Pill or superscript badge.", table: { category: "Variant" } },
    number: { control: { type: "number", min: 1, max: 999 }, description: "The citation ordinal.", table: { category: "Content" } },
    title: { control: "text", description: "The source title.", table: { category: "Content" } },
    linked: { control: "boolean", description: "Give the source a url → an <a> (doc-noteref); off → a <span>.", table: { category: "Behavior" } },
    withIcon: { control: "boolean", description: "Show a favicon (label variant only).", table: { category: "Content" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ variant, number, title, linked, withIcon }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Citation · Props" standfirst={DEFINITION} />
      <Flex align="center" gap="2" style={{ padding: "var(--ds-space-8) 0 var(--ds-space-2)" }}>
        <RadixText>
          As documented{" "}
          <Citation
            variant={variant}
            number={number}
            source={{ title, url: linked ? "https://radix-ui.com" : undefined, icon: withIcon ? FAVICON_A : undefined }}
          />
          {variant === "number" ? " in the reference." : "."}
        </RadixText>
      </Flex>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>Citation</Code> takes.</>}>
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

/* ---- History ------------------------------------------------------------- */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Citation · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[inline-citation]] · Inline leaf">
            Citation is a <strong>pure inline leaf</strong> — no floating primitive. It renders an
            <Code>&lt;a&gt;</Code> when <Code>source.url</Code> is present, else a plain <Code>&lt;span&gt;</Code>.
            Two variants: <Code>label</Code> (a bordered pill) and <Code>number</Code> (a superscript circle
            badge). Paint is from <Code>--ds-*</Code> semantic tokens; <strong>zero net-new tokens.</strong>
          </Decision>
          <Decision id="[[inline-citation]] · role polarity (a11y trap)">
            <Code>role="doc-noteref"</Code> is a <strong>reference role valid only on the LINKED <Code>&lt;a&gt;</Code></strong>.
            On a plain unlinked <Code>&lt;span&gt;</Code> it trips axe <Code>aria-allowed-role</Code>, so it's
            <strong> omitted</strong> there — <Code>noteRole = href ? "doc-noteref" : undefined</Code>. The
            <Code> aria-label</Code> (<Code>Citation {"{n}"}: {"{title}"}</Code>) names the citation in <strong>both</strong>
            forms regardless. This polarity is correct here.
          </Decision>
          <Decision id="[[inline-citation]] · accent-aware badge">
            The number badge fills from the <strong>accent-aware</strong> <Code>--ds-fill-accent-weak</Code>
            (accent-a3), so it follows the brand collision shift. <Code>--ds-radius-full</Code> (9999px) renders a
            <strong> circle</strong> because the box is square at its minimum (<Code>min-width = height</Code>); a
            two-digit number grows past that into a tidy stadium, by design. Linked citations open in a new tab
            (<Code>target="_blank" rel="noopener noreferrer"</Code>).
          </Decision>
          <Decision id="[[inline-citation]] · hover card deferred">
            A hover <strong>source-preview card</strong> is <strong>not built yet</strong>. It is net-new and
            waits on a design. If added later it composes a <strong>raw Radix HoverCard</strong>.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Citation</Code>: the inline leaf — <Code>label</Code> pill (favicon +
            truncated title) and <Code>number</Code> superscript badge, the <Code>&lt;a&gt;</Code>/<Code>&lt;span&gt;</Code>
            + <Code>doc-noteref</Code>-on-links-only polarity, the accent-aware badge. Paint reads live from the DOM.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
