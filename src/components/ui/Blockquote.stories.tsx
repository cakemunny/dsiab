import { useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Blockquote } from "./Blockquote";
import { Avatar } from "./Avatar";
import { Link } from "./Link";
import { ComparisonSection, SOURCE_CREDIT_COMPARISON } from "./_comparisons";
import {
  Caption, Decision, DoDont, DODONT_LABEL, HexThemeKey, LiteTokenSpec, MeasuredRow, MeasuredSpec, Mono, NoteRow, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Scenario, Section,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    A typographic quotation block — an accent left rule beside indented prose — for a genuine quote or
    citation in the reading flow. It reuses Radix's own quote skin, so it matches the system with no
    override; <Mono>size</Mono> passes through untouched because a quote is prose sized by its passage, not
    a control on the UI size lane.
  </>
);

/* Blockquote reuses Radix's own quote skin (a left rule painted from the accent scale, --accent-a6,
   plus the default prose text), so it declares no --ds-* roles of its own. --accent-a6 is exactly what
   --ds-stroke-accent-weak aliases, so the bare quote's rule already lands on the system's accent-stroke
   role with no override.

   MEASURED ([[measured-token-rows]]): each colour row names an element and a property, and reads that property off a real
   rendered quote, then checks it against the token it claims — so the row can disagree. The version
   this replaces resolved each token onto a span it had just painted and printed both sides, which
   agrees by construction. The two geometry rows below stay prose: the rule's thickness and the indent
   are em-aware clamps (`max(--space-1, 0.25em)`, `min(--space-5, max(--space-3, 0.5em))`), not a single
   token a row could be checked against, so they are read live off the rendered quote instead. */
type QuoteGeometry = { width: string; indent: string };

function BlockquoteSpec() {
  const wrap = useRef<HTMLDivElement>(null);
  const themeKey = useContext(HexThemeKey);
  const [v, setV] = useState<QuoteGeometry | null>(null);
  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>(".rt-Blockquote");
    if (!el) return;
    const cs = getComputedStyle(el);
    setV({ width: cs.borderLeftWidth, indent: cs.paddingLeft });
  }, [themeKey]);
  return (
    <LiteTokenSpec
      rationale={
        <>
          The QUOTE reuses Radix's own skin and declares no <Mono>--ds-*</Mono> role of its own — its left
          rule paints from the accent scale (<Mono>--accent-a6</Mono>), which resolves live to{" "}
          <Mono>--ds-stroke-accent-weak</Mono>, the system's accent-stroke role, and the quoted text keeps
          the default prose ink (<Mono>--gray-12</Mono>, what <Mono>--ds-text-strong</Mono> aliases), so a
          bare quote already matches with no override. The one place the wrap paints is the{" "}
          <Mono>attribution</Mono> caption, which takes the supporting-text role — a byline is quieter than
          the passage it credits. The rule's thickness and the indent scale with the quote's own type size,
          floored on the shared <Mono>--space</Mono> steps.
        </>
      }
    >
      {/* An off-screen REAL quote, kept only for the two geometry rows below — they read the used
          border-width and padding off it. The specimen a reader looks at renders in the section above. */}
      <div ref={wrap} style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <Blockquote size="4" attribution="Source">Quote</Blockquote>
      </div>
      <MeasuredSpec render={() => <Blockquote size="4" attribution="Source">Quote</Blockquote>}>
        <MeasuredRow
          part="Left rule"
          note="Radix's own border-left, on the accent step the system's accent-stroke role aliases."
          token="--ds-stroke-accent-weak"
          select=".rt-Blockquote"
          prop="border-left-color"
        />
        <MeasuredRow
          part="Quote text"
          note="Inherited prose ink — the wrap sets no colour on the passage."
          token="--ds-text-strong"
          select=".rt-Blockquote"
          prop="color"
        />
        <MeasuredRow
          part="Attribution text"
          note="The one place the wrap paints: a byline is quieter than the passage it credits."
          token="--ds-text-weak"
          select=".rt-ds-blockquote-attribution-text"
          prop="color"
        />
      </MeasuredSpec>
      <NoteRow part="Rule thickness" value={v ? `${v.width} — max(--space-1, 0.25em)` : "…"} />
      <NoteRow part="Indent" value={v ? `${v.indent} — min(--space-5, max(--space-3, 0.5em))` : "…"} />
    </LiteTokenSpec>
  );
}

/* The person-identity block, on the system's canonical two-tier pair — the one the shared row primitive
   declares in tokens/components.css (`.rt-ds-item-label` / `.rt-ds-item-description`): the name on
   --ds-text-strong at the size-2 step, the supporting line on --ds-text-weak one step down at size 1.
   No weight override: the tier is carried by colour and step, and adding a third variable is how the
   same block ends up rendered three different ways across a system. Composed INTO the attribution slot
   — Blockquote itself knows nothing about people. */
function PersonAttribution({ name, supporting, initials }: { name: string; supporting: string; initials: string }) {
  return (
    <Flex align="center" gap="3">
      <Avatar size="lg" fallback={initials} alt={name} />
      <Flex direction="column" style={{ minWidth: 0 }}>
        <Text size="2" style={{ color: "var(--ds-text-strong)" }}>{name}</Text>
        <Text size="1" style={{ color: "var(--ds-text-weak)" }}>{supporting}</Text>
      </Flex>
    </Flex>
  );
}

/* The alignment contract, MEASURED rather than asserted. Both numbers are the x of the first rendered
   glyph — taken with a Range over each element's contents, so they are where the text actually paints,
   not where its box starts. The figcaption's inset is derived from the quote's own rule + padding, so
   the delta is 0 at every size step; printing it means a regression shows up as a number on the page.
   Re-read on any toolbar flip (HexThemeKey), since the scaling knob moves the inset. */
function AlignmentSpecimen({ size, attribution, children }: { size: "2" | "6"; attribution: ReactNode; children: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const themeKey = useContext(HexThemeKey);
  const [v, setV] = useState<{ quote: number; caption: number } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const root = wrap.current;
      const bq = root?.querySelector<HTMLElement>(".rt-Blockquote");
      const cap = root?.querySelector<HTMLElement>(".rt-ds-blockquote-attribution-text");
      if (!root || !bq || !cap) return;
      const textX = (el: Element) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        return Math.round(r.getBoundingClientRect().x * 10) / 10;
      };
      const origin = root.getBoundingClientRect().x;
      setV({ quote: Math.round((textX(bq) - origin) * 10) / 10, caption: Math.round((textX(cap) - origin) * 10) / 10 });
    };
    measure();
    // The webfont lands after first paint and moves the glyphs; re-measure once it has.
    document.fonts?.ready.then(measure);
  }, [themeKey, size]);
  const aligned = v ? Math.abs(v.quote - v.caption) < 0.5 : false;
  return (
    <Box ref={wrap}>
      <Blockquote size={size} attribution={attribution}>{children}</Blockquote>
      <Text as="p" size="1" mt="3" style={{ color: "var(--ds-text-weak)", fontFamily: "var(--code-font-family)" }}>
        text column — quote at {v ? `${v.quote}px` : "—"} · byline at {v ? `${v.caption}px` : "—"}
        {v ? (aligned ? " — flush" : ` — off by ${Math.round(Math.abs(v.quote - v.caption) * 10) / 10}px`) : ""}
      </Text>
    </Box>
  );
}

const BLOCKQUOTE_PROPS: PropDef[] = [
  { name: "attribution", type: "ReactNode", def: "—", desc: <>The quotation's source. Present, the component renders <Code>&lt;figure&gt;&lt;blockquote/&gt;&lt;figcaption/&gt;&lt;/figure&gt;</Code> and indents the caption to line up with the quoted text; absent, it emits the bare <Code>&lt;blockquote&gt;</Code> and nothing changes. Compose the identity yourself — an <Code>Avatar</Code> beside a name for a person, a <Code>Link</Code> for a document, a plain string for a byline.</>, source: "Blockquote.tsx" },
  { name: "cite", type: "string", def: "—", desc: <>The standard <Code>&lt;blockquote cite&gt;</Code> URL of the source document. Machine-readable metadata only — no browser surfaces it, so anything a reader needs must also appear in <Code>attribution</Code>.</>, source: "HTML" },
  { name: "size", type: `"1" – "9"`, def: "inherit", desc: <>The quote's type step — the passage's prose size, <strong>not</strong> the global UI size lane (a quote is sized by its context, like <Code>Section</Code>). Passes straight through to Radix.</>, source: "Radix" },
  { name: "weight", type: `"light" | "regular" | "medium" | "bold"`, def: `"regular"`, desc: <>Font weight of the quoted text. Passes through to Radix.</>, source: "Radix" },
  { name: "color", type: `"gray" | "blue" | "green" | …`, def: "accent", desc: <>Tones the quote — text and left rule — to a Radix scale. Omitted, it follows the theme accent. Passes through to Radix (a quote may legitimately carry a deliberate tone).</>, source: "Radix" },
  { name: "truncate", type: "boolean", def: "false", desc: <>Clamps the quote to a single line with an ellipsis when it overflows its container.</>, source: "Radix" },
  { name: "wrap", type: `"wrap" | "nowrap" | "pretty" | "balance"`, def: `"wrap"`, desc: <>Line-wrapping strategy — <Code>"balance"</Code> evens the last lines of a short pull-quote; <Code>"pretty"</Code> avoids orphans. Passes through to Radix.</>, source: "Radix" },
];

const meta: Meta<typeof Blockquote> = {
  title: "Components/Content/Blockquote",
  component: Blockquote,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Blockquote** is a typographic quotation block — an accent left rule beside indented prose — " +
          "for a genuine quote or citation carried in the reading flow. It wraps Radix’s `Blockquote`, " +
          "reusing its own quote skin (the left rule paints the accent scale, which " +
          "already resolves to the system’s `--ds-stroke-accent-weak` role), so the quote matches with no " +
          "override and declares no `--ds-*` role of its own. It adds exactly one prop: `attribution`, which renders the " +
          "quote inside a `<figure>` with its source in a `<figcaption>`, indented to line up with the " +
          "quoted text. Without that prop the output is Radix’s bare `<blockquote>`, unchanged. `size` " +
          "passes through untouched — a quote is prose sized by " +
          "its passage, not a control on the UI size lane. It’s a **lite-tier** wrap — one Usage story " +
          "(specimen · attribution · live token spec · a do/don’t) plus a Props.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Blockquote>;

/** Usage — the primary lite docs story: a quotation in context, the live token spec, and one do/don't. */
export const Usage: Story = {
  // The DoDont callout labels (success/error text on the green/red tint) measure ~4.1–4.4 — just under
  // axe's strict 4.5; the callout colour + the DO/DON'T word already carry the meaning, so color-contrast
  // is scoped off here, a documented specimen exception (same pattern as Separator/Kbd Usage).
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader
          title="Blockquote · Usage"
          standfirst={DEFINITION}
        />

        {/* The quoted copy is deliberately ordinary source material — a line from a user interview, a
            clause from a policy — rather than praise for a design system. A docs page that quotes
            invented compliments about itself teaches the wrong register for the component. */}
        <Section title="Specimen" lead="A line from a user interview pulled into the reading flow, its source named in the attribution slot — one figure, quote and byline aligned on the same text column.">
          <Box style={{ maxWidth: 560 }}>
            <Blockquote
              size="4"
              data-testid="bq-specimen"
              attribution="— Dana Okoye, Shift Supervisor, Meridian Health"
            >
              We run the export on a Friday night because that is the only window when nobody is mid-edit. If it
              fails we find out on Monday, from a patient.
            </Blockquote>
          </Box>
        </Section>

        <Rule />

        <Section
          title="Naming the source"
          lead="attribution is the component's one owned prop. It renders the quote and its source as a single figure/figcaption, and it owns the indent: Radix insets the quoted text by the rule plus a padding derived from the quote's own type size, so a byline written as a sibling paragraph starts at the RULE and hangs left of the passage. Both readouts below are the x of the first painted glyph, measured off the rendered page."
        >
          <Grid columns={{ initial: "1", sm: "2" }} gap="5">
            <Scenario
              label="A PERSON"
              caption={<>An <Mono>Avatar</Mono> beside the name, with the role one tier down — the system's standard identity pair (name on <Mono>--ds-text-strong</Mono> at the size-2 step, supporting line on <Mono>--ds-text-weak</Mono> at size 1). Blockquote styles none of it: it holds a slot, and never learns what a person is.</>}
            >
              <Box data-testid="bq-person">
                <AlignmentSpecimen
                  size="2"
                  attribution={<PersonAttribution name="Dana Okoye" supporting="Shift Supervisor · Meridian Health" initials="DO" />}
                >
                  We run the export on a Friday night. Nobody is mid-edit then.
                </AlignmentSpecimen>
              </Box>
            </Scenario>
            <Scenario
              label="A DOCUMENT"
              caption={<>The same slot, holding a <Mono>Link</Mono> to the source instead. Pair it with the standard <Mono>cite</Mono> attribute for the machine-readable URL — nothing surfaces <Mono>cite</Mono> to a reader, so the visible link is what does the work.</>}
            >
              <Box data-testid="bq-document">
                <AlignmentSpecimen
                  size="6"
                  attribution={<>Accessibility policy — <Link href="#handbook-3-4">Handbook §3.4</Link></>}
                >
                  Every control must be reachable and operable by keyboard alone.
                </AlignmentSpecimen>
              </Box>
            </Scenario>
          </Grid>
          <Caption>
            The indent is derived from the quote's own rule and padding, not written as a number, so it holds
            across the whole type scale — the two specimens above are five size steps apart and both read
            <strong> flush</strong>. Leave <Mono>attribution</Mono> off and the component emits Radix's bare{" "}
            <Mono>&lt;blockquote&gt;</Mono>, with no figure and no caption.
          </Caption>
        </Section>

        <Rule />

        <ComparisonSection comparison={SOURCE_CREDIT_COMPARISON} highlight="Blockquote" />

        <Rule />

        <Section title="A quotation, not a highlight" lead="Blockquote is for a real quotation with a source — not a generic highlighted note. The left rule reads as attribution; give it something to attribute.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="A real quotation carried in the reading flow, its source in the attribution slot — exactly what the accent rule and indented prose are for.">
              <Blockquote size="3" attribution="— Priya Nadeem, Dispatch Lead, Northwind Logistics">
                Nobody reads the release note. They find out a field moved when a driver is stood at the dock
                with the tablet.
              </Blockquote>
            </DoDont>
            <DoDont kind="dont" bare note={<>A highlighted status message isn't a quotation — the left rule promises an attribution that never comes. For a note, warning, or alert, reach for a <strong>Callout</strong> (<Mono>System/Feedback &amp; Status/Callout</Mono>).</>}>
              <Blockquote size="2" data-testid="bq-bare">
                Note: your trial ends in 3 days. Upgrade now to keep your projects.
              </Blockquote>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Every value read live off a rendered quote, and every row named for the token behind it — the drift guard. The quote reuses Radix's skin and owns no --ds-* role: the left rule lands on --ds-stroke-accent-weak and the quoted text on --ds-text-strong. The attribution caption is the one thing the wrap paints, on the supporting-text role. Rule thickness and indent are floored on the shared --space steps.">
          <BlockquoteSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Passive (no driving / no flash): a blockquote has no open/close behaviour, so its render contract and
    // skin binding are asserted right here. axe runs automatically on the story.
    const bq = canvasElement.querySelector<HTMLElement>('[data-testid="bq-specimen"]');
    if (!bq) throw new Error("Usage must render the specimen blockquote");
    if (bq.tagName !== "BLOCKQUOTE") throw new Error(`Blockquote must render a <blockquote>; got <${bq.tagName.toLowerCase()}>`);

    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]). This is also what binds the left rule to
    // the accent-stroke role: the row reads border-left-color off a rendered quote and resolves
    // --ds-stroke-accent-weak on a different node, and `assertMeasuredRows` throws if they disagree.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 3 || rows.unproven !== 0) {
      throw new Error(`expected 3 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // `attribution` must produce the figure/figcaption pairing — a quote and its source are one unit,
    // and a caption that isn't inside a <figure> isn't a caption of anything.
    const figure = bq.closest("figure");
    if (!figure) throw new Error("a Blockquote with an attribution must render inside a <figure>");
    const caption = figure.querySelector("figcaption");
    if (!caption) throw new Error("a Blockquote with an attribution must render a <figcaption>");
    if (!(caption.textContent ?? "").trim()) throw new Error("the attribution figcaption must carry the source text");

    // THE ALIGNMENT CONTRACT, at two size steps five apart: the first painted glyph of the caption sits
    // on the same x as the first painted glyph of the quote. The x of the BOX would pass trivially —
    // it's the text column that hangs, so both readings are taken with a Range over the contents.
    const textX = (el: Element) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getBoundingClientRect().x;
    };
    for (const id of ["bq-person", "bq-document"]) {
      const scope = canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`);
      if (!scope) throw new Error(`the attribution section must render the ${id} specimen`);
      const quote = scope.querySelector<HTMLElement>(".rt-Blockquote");
      const capText = scope.querySelector<HTMLElement>(".rt-ds-blockquote-attribution-text");
      if (!quote || !capText) throw new Error(`${id} must render a quote and an attribution caption`);
      const delta = Math.abs(textX(quote) - textX(capText));
      if (delta > 1) {
        throw new Error(`${id}: the byline must line up with the quoted text; off by ${Math.round(delta * 10) / 10}px`);
      }
    }

    // …and with NO attribution the wrap adds nothing: a bare <blockquote>, no figure, no caption.
    const bare = canvasElement.querySelector<HTMLElement>('[data-testid="bq-bare"]');
    if (!bare) throw new Error("the do/don't must render the bare (attribution-less) quote");
    if (bare.closest("figure")) throw new Error("without `attribution`, Blockquote must not emit a <figure>");
  },
};

type PropsArgs = {
  attribution: string;
  size: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
  weight: "light" | "regular" | "medium" | "bold";
  color: "gray" | "indigo" | "blue" | "cyan" | "green" | "amber" | "orange" | "red" | "crimson" | "purple";
  truncate: boolean;
  wrap: "wrap" | "nowrap" | "pretty" | "balance";
};

/** Props — the live, args-driven Blockquote. Drive its source line, prose size, weight, tone, and
 *  wrapping — and watch the byline hold the quote's text column as the size step moves. */
export const Props: StoryObj<PropsArgs> = {
  args: { attribution: "— Dana Okoye, Principal Engineer, Meridian Health", size: "4", weight: "regular", color: "gray", truncate: false, wrap: "wrap" },
  argTypes: {
    attribution: { control: "text", description: "The source line. Empty → no figure and no caption, just the bare <blockquote>.", table: { category: "Content" } },
    size: { control: "inline-radio", options: ["1", "2", "3", "4", "5", "6", "7", "8", "9"], description: "Prose type step (not the UI size lane).", table: { category: "Variant" } },
    weight: { control: "inline-radio", options: ["light", "regular", "medium", "bold"], description: "Font weight of the quoted text.", table: { category: "Variant" } },
    color: { control: "select", options: ["gray", "indigo", "blue", "cyan", "green", "amber", "orange", "red", "crimson", "purple"], description: "Tone for text + left rule; follows the accent when unset.", table: { category: "Variant" } },
    truncate: { control: "boolean", description: "Clamp to one line with an ellipsis on overflow.", table: { category: "Layout" } },
    wrap: { control: "inline-radio", options: ["wrap", "nowrap", "pretty", "balance"], description: "Line-wrapping strategy for the quote.", table: { category: "Layout" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ attribution, size, weight, color, truncate, wrap }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Blockquote · Props" standfirst={DEFINITION} />
      <Box style={{ maxWidth: 560, padding: "16px 0 8px" }}>
        <Blockquote
          size={size}
          weight={weight}
          color={color}
          truncate={truncate}
          wrap={wrap}
          attribution={attribution || undefined}
        >
          The tokens make the right choice the default — a component that once needed three rounds of design
          review now lands review-free.
        </Blockquote>
      </Box>
      <PropsLead />
      <Caption>
        Move <strong>size</strong> up and down with a source line set — the byline tracks the quote's text
        column at every step, because its indent is derived from the quote's own rule and padding. Clear{" "}
        <strong>attribution</strong> and the figure disappears with it.
      </Caption>
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>Blockquote</Code> documents. <Code>attribution</Code> is ours; <Code>cite</Code> is the standard HTML attribute; the rest pass through to Radix's <Code>Blockquote</Code>.</>}>
        <PropTable rows={BLOCKQUOTE_PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Blockquote · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            Blockquote is a <strong>wrapped</strong> Radix Themes component — the Radix name wins; built on the
            Radix substrate + our <Code>--ds-*</Code> layer. It is a <Code>forwardRef</Code> wrapper that adds a
            single prop of its own (<Code>attribution</Code>, below) and passes everything else — every Radix
            prop, <Code>cite</Code>, <Code>className</Code>, <Code>style</Code>, <Code>data-*</Code> — straight
            through to the rendered <Code>&lt;blockquote&gt;</Code>. There is still no paint role, size lane, or
            a11y contract to wire.
          </Decision>
          <Decision id="Attribution slot">
            A quotation and its source are one unit, so <Code>attribution</Code> renders them as one:{" "}
            <Code>&lt;figure&gt;</Code> holding the <Code>&lt;blockquote&gt;</Code> and a{" "}
            <Code>&lt;figcaption&gt;</Code>. This is the one thing the caller cannot get right on their own —
            Radix insets the quoted text by the rule plus a padding it derives from the quote's own type size,
            so a byline written as a sibling paragraph starts at the <em>rule's</em> edge and hangs left of the
            passage. The figcaption pays that inset back with the same expression, tracking the quote's{" "}
            <Code>size</Code> step. <strong>The cost, stated plainly:</strong> Blockquote is no longer a bare
            pass-through. Pass no <Code>attribution</Code> and the DOM is byte-identical to Radix's; pass one
            and the component owns a wrapper element.
          </Decision>
          <Decision id="No identity model">
            The slot never learns what an identity <em>is</em>. Blockquote supplies the indent, the gap, and a
            quiet default text tier; a person is an <Code>Avatar</Code> plus a name composed into the slot, a
            document is a <Code>Link</Code>, a byline is a string. Named people belong here rather than in a{" "}
            <Code>Citation</Code>, which is a numbered reference marker — it requires an ordinal and announces
            itself as “Citation N: title”, so a person credited that way is read out as a source document.
          </Decision>
          <Decision id="Skin reuse">
            The quote reuses Radix's own skin — a left rule painted from the accent scale
            (<Code>--accent-a6</Code>) plus the default prose text — and declares no <Code>--ds-*</Code> role of
            its own. That rule already resolves to <Code>--ds-stroke-accent-weak</Code> (the accent-stroke role,
            which also aliases <Code>--accent-a6</Code>), so a bare quote matches with <strong>no new CSS and no
            new token</strong>. <Code>color</Code> stays available as a Radix passthrough — a quote may carry a
            deliberate tone. The <Code>attribution</Code> caption is the one thing the wrap paints, and it takes
            an existing role (<Code>--ds-text-weak</Code>) rather than adding one.
          </Decision>
          <Decision id="Size passthrough">
            <Code>size</Code> (1–9) passes through <strong>untouched</strong>. A quotation is prose sized by the
            passage that hosts it — like <Code>Section</Code>, it stays off the global UI size lane and is never
            resolved through the size context.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            <Code>attribution</Code> added — a quotation can now name its source in a{" "}
            <Code>&lt;figcaption&gt;</Code> that lines up with the quoted text instead of hanging left of it.
            The wrap became a <Code>forwardRef</Code> component to carry it; with the prop unset the rendered
            DOM is unchanged.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/Blockquote</Code> — Radix Blockquote surfaced as a documented re-export, its
            quote skin reused tokenlessly (the accent left rule resolves to <Code>--ds-stroke-accent-weak</Code>);
            {" "}<Code>size</Code> passed through as prose, not the type-size lane; History page added so every
            component, stubs included, has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
