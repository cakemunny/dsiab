import { useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Card, type CardVariant } from "./Card";
import { Button } from "./Button";
import { ButtonGroup } from "./ButtonGroup";
import { Badge } from "./Badge";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, LiteTokenSpec, MeasuredRow,
  MeasuredSpec, Mono, NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, CARD_SURFACES_COMPARISON } from "./_comparisons";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    A surface that groups the content of one entity and sets it apart from the page. It is a container,
    not a control.
  </>
);

/* Card's three variants differ by BOUNDARY treatment (edge / edge+lift / fill-with-no-edge), so the spec
   documents all three: the shared edge + panel fill inherited from Radix's surface skin, the Raised shadow
   the elevated variant reuses from the system elevation ladder, and the --ds-* role the filled variant
   paints from.

   EVERY row below is MEASURED off a rendered card: it names the element and the property that paints the
   part — the ::before the surface fills, the ::after ring it draws, the box-shadow it lifts with — reads
   that property, and checks it against the token it claims. So a row can DISAGREE with the component,
   which is the only thing that makes the table evidence rather than a restatement of the tokens. */

function CardSpec() {
  return (
    <LiteTokenSpec
      rationale={
        <>
          All three variants keep the same <strong>box</strong> — radius, padding and size lane never change
          between them. What changes is the <strong>boundary</strong>: <Mono>outlined</Mono> and{" "}
          <Mono>elevated</Mono> share the translucent panel fill and its 1px edge and differ only by lift;{" "}
          <Mono>filled</Mono> swaps in a tonal fill and <strong>drops the edge</strong> — the fill is what
          separates it from the page, so a border would say the same thing twice. The fill is an{" "}
          <strong>alpha</strong> step, which is what lets one token darken a light page and lighten a dark
          one. Every row below is read off a rendered card of that variant.
        </>
      }
    >
      <MeasuredSpec
        render={() => (
          <>
            <Card variant="outlined">measurement</Card>
            <Card variant="elevated">measurement</Card>
            <Card variant="filled">measurement</Card>
          </>
        )}
      >
        <MeasuredRow
          part="Panel fill (outlined · elevated)"
          note="Radix's translucent surface skin, painted on the card's ::before rather than its own box."
          token="--color-panel"
          select='.rt-Card[data-ds-card="outlined"]'
          prop="background-color"
          pseudo="::before"
        />
        <MeasuredRow
          part="Edge (outlined · elevated)"
          note="Radix's 1px ring, drawn as a ::after box-shadow so it never affects layout."
          token="--base-card-surface-box-shadow"
          select='.rt-Card[data-ds-card="outlined"]'
          prop="box-shadow"
          pseudo="::after"
        />
        <MeasuredRow
          part="Fill (filled — replaces the panel)"
          note="An alpha step, so one token darkens a light page and lightens a dark one."
          token="--ds-fill-weak"
          select='.rt-Card[data-ds-card="filled"]'
          prop="background-color"
          pseudo="::before"
        />
        <MeasuredRow
          part="Lift (elevated only)"
          note="The Raised step of the elevation ladder — reused, not a new shadow."
          token="--ds-shadow-2"
          select='.rt-Card[data-ds-card="elevated"]'
          prop="box-shadow"
        />
      </MeasuredSpec>
      <NoteRow part="Edge (filled)" value="none — the ring is dropped on ::after; the fill does the separating" />
    </LiteTokenSpec>
  );
}

/* ---- Anatomy ------------------------------------------------------------- */

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Container", "the card surface itself — one entity's content, set apart from the page; padding + radius come from size"],
  [2, "Media (optional)", "a preview image or thumbnail, flush to the card's edges"],
  [3, "Header", "the title (what this entity IS) and an optional subtitle / metadata line"],
  [4, "Body", "the supporting content — a teaser, a few fields, a summary. A taste, not the full record"],
  [5, "Footer actions (optional)", "a ButtonGroup of actions on this entity; the primary anchors per the global buttonOrder"],
];

/* A fully-composed card showing every anatomical part in order. Realistic content — a real project
   summary — so the parts are judged against something that could ship. Each part carries `data-part`,
   the hook the diagram below pins its numbered callout to. */
function AnatomyCard() {
  return (
    <Card variant="outlined">
      {/* media: a flush preview band. A real card would use an image here. */}
      <Box
        data-part="2"
        style={{
          height: 96,
          margin: "calc(var(--card-padding) * -1) calc(var(--card-padding) * -1) var(--space-3)",
          background: "linear-gradient(135deg, var(--ds-fill-accent-weak), var(--ds-fill-accent-med))",
          borderTopLeftRadius: "inherit",
          borderTopRightRadius: "inherit",
        }}
      />
      <Flex data-part="3" justify="between" align="start" gap="2">
        <Text as="p" size="3" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Orbit</Text>
        <Badge tone="success">Active</Badge>
      </Flex>
      <Text as="p" size="1" style={{ color: "var(--ds-text-weak)", marginTop: 2 }}>Updated 2 hours ago · 12 members</Text>
      <Text data-part="4" as="p" size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.5, marginTop: "var(--space-2)" }}>
        The design-system workstream — tokens, components, and the docs that keep them honest.
      </Text>
      <ButtonGroup data-part="5" mt="4">
        <Button priority="primary">Open</Button>
        <Button priority="secondary">Share</Button>
      </ButtonGroup>
    </Card>
  );
}

/* The specimen with its parts PINNED — the same mechanism the Dialog anatomy uses: a numbered
   `dotStyle` bubble parked in the frame's gutter, joined to its part by an `hLine` leader. A legend
   whose numerals appear nowhere on the specimen is just an unkeyed list, so the numbers have to land
   on the thing they name.

   One difference from Dialog, and it is deliberate: Dialog pins a hand-built STILL of fixed padding,
   so its pin tops are constants measured once. This specimen is a REAL Card, whose padding rides the
   uiSize container lane — a constant would drift the moment the toolbar's Size changes. So the tops
   are measured off the live parts in a layout effect and re-measured by a ResizeObserver. Callout 1
   (Container) sits on the left, into the card's own edge; the four content parts descend the right. */
const CARD_W = 320;
const GUTTER = 76; // dot (20) + leader (48) + air (8)
const LEADER = { offset: 22, width: GUTTER - 22 };

function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Record<number, number>>({});
  useLayoutEffect(() => {
    const f = frame.current;
    if (!f) return;
    const measure = () => {
      const card = f.querySelector<HTMLElement>(".rt-Card");
      if (!card) return;
      const frameTop = f.getBoundingClientRect().top;
      // 1 (Container) anchors just inside the card's top edge — the boundary IS the part.
      const next: Record<number, number> = { 1: Math.round(card.getBoundingClientRect().top - frameTop) + 10 };
      for (const part of f.querySelectorAll<HTMLElement>("[data-part]")) {
        const r = part.getBoundingClientRect();
        next[Number(part.dataset.part)] = Math.round(r.top + r.height / 2 - frameTop);
      }
      setPins(next);
    };
    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(f);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const pin = (n: number, side: "left" | "right") => {
    const top = pins[n];
    if (top == null) return null;
    const edge = side === "left" ? { left: 0 } : { right: 0 };
    const leaderEdge = side === "left" ? { left: LEADER.offset } : { right: LEADER.offset };
    return (
      <Box key={n}>
        <Box style={{ ...dotStyle, ...edge, top: top - 10 }}>{n}</Box>
        <Box style={hLine({ ...leaderEdge, top, width: LEADER.width })} />
      </Box>
    );
  };

  return (
    <Box style={{ overflowX: "auto" }}>
      <Box ref={frame} style={{ position: "relative", width: CARD_W + GUTTER * 2, padding: `0 ${GUTTER}px` }}>
        <AnatomyCard />
        {pin(1, "left")}
        {pin(2, "right")}
        {pin(3, "right")}
        {pin(4, "right")}
        {pin(5, "right")}
      </Box>
    </Box>
  );
}

/* ---- specimens ----------------------------------------------------------- */

function VariantCard({ variant, title, body }: { variant: CardVariant; title: string; body: string }) {
  return (
    <Card variant={variant} style={{ maxWidth: 260 }}>
      <Text as="p" size="2" weight="bold" mb="1" style={{ color: "var(--ds-text-strong)" }}>{title}</Text>
      <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.5 }}>{body}</Text>
    </Card>
  );
}

const PROPS: PropDef[] = [
  { name: "variant", type: `"outlined" | "elevated" | "filled"`, def: `"outlined"`, desc: <>The card skin — they differ by boundary treatment, so they read apart at a glance: <Code>outlined</Code> a 1px edge on the panel fill · <Code>elevated</Code> that same edge plus the Raised shadow · <Code>filled</Code> a tonal fill one step off the page with the edge dropped (the fill does the separating). Radix's generic <Code>surface</Code>/<Code>classic</Code>/<Code>ghost</Code> are deliberately not exposed.</>, source: "Card.tsx" },
  { name: "size", type: `"1"–"5"`, def: "container lane (2 at small)", desc: <>Padding + radius step. Unset, it follows the global <Code>uiSize</Code> <strong>container</strong> lane (default <Code>small</Code> → <Code>2</Code>) — a notch roomier than a control.</>, source: "Card.tsx" },
  { name: "asChild", type: "boolean", def: "false", desc: <>Merge the card onto its single child. For a card that navigates, prefer <Code>ClickableCard</Code>, which owns the accessible stretched-link pattern.</>, source: "Radix" },
];

const meta: Meta<typeof Card> = {
  title: "Components/Container/Card",
  component: Card,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Card** is a surface that groups the content of ONE entity and sets it apart from the page. " +
          "Three variants that are actually tellable apart, differing by how the card meets the page: " +
          "`outlined` (a 1px edge on the panel fill), `elevated` (that same edge plus the system's Raised " +
          "shadow), `filled` (a tonal fill one step off the page with the edge dropped — the fill does the separating). " +
          "It is a **container**, not a control: for a card that navigates use `ClickableCard`, and for " +
          "card-shaped pickers use `RadioCards` / `CheckboxCards`.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Card>;

/** Anatomy — the labeled parts and the three variants side by side. The live token spec lives in Usage. */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page maxWidth={900}>
        <PageHeader title="Card · Anatomy" standfirst={DEFINITION} />
        <Section title="The parts" lead="A card is a container with an optional media band, a header naming the entity, a body of supporting content, and an optional footer of actions. Every part except the container is optional — but the ORDER is fixed, so cards in a set stay scannable. The numbered callouts are pinned onto the specimen; the legend spells each one out.">
          {/* Diagram over legend, not beside it — the same stacking the Dialog anatomy uses. Side by
              side, the legend's two-column grid gets squeezed into ~190px columns and every note
              wraps to five lines; the callouts key the two together, so they don't need to be
              adjacent. */}
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>
            A card shows a <strong>taste</strong> of an entity, not its full record — it is an entry point to
            the detail view, so keep the body to what earns the glance.
          </Caption>
        </Section>

        <Rule />

        <Section title="The three variants" lead="Same box every time — the boundary is what changes. Outlined and elevated share the edge and differ by lift; filled swaps in a tonal fill one step off the page and drops the edge, which is what makes the three tellable apart at a glance.">
          <Grid columns={{ initial: "1", sm: "3" }} gap="4">
            <Scenario label="OUTLINED · default" caption={<>A 1px edge on the panel fill. The everyday card — use it unless you have a reason not to.</>}>
              <VariantCard variant="outlined" title="Weekly digest" body="What changed across your projects this week." />
            </Scenario>
            <Scenario label="ELEVATED" caption={<>The same edge, lifted with the Raised shadow. For a card that genuinely floats — dragged, or over a busy canvas.</>}>
              <VariantCard variant="elevated" title="Weekly digest" body="What changed across your projects this week." />
            </Scenario>
            <Scenario label="FILLED" caption={<>A tonal fill one step off the page, no edge and no lift. Recedes instead of rising — good for a secondary or nested grouping.</>}>
              <VariantCard variant="filled" title="Weekly digest" body="What changed across your projects this week." />
            </Scenario>
          </Grid>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
};

/** Usage — when a card earns its edge, when it doesn't, which card-shaped component to reach for, and
 *  the live token spec that closes the page. */
export const Usage: Story = {
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <Page maxWidth={900}>
      <PageHeader title="Card · Usage" standfirst={DEFINITION} />
      <ComparisonSection comparison={CARD_SURFACES_COMPARISON} highlight="Card" />

      <Rule />

      <Section
        title="When to use a card"
        lead="A card earns its edge when it represents ONE entity — a project, an invoice, a person, an article — and sits beside peers of the same kind. The edge says “these belong together, and this one is separate from that one”."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="4">
          <Scenario label="A SET OF PEERS" caption="Several entities of the same kind, side by side — the card boundary tells them apart.">
            <Flex direction="column" gap="3">
              <VariantCard variant="outlined" title="Orbit" body="12 members · updated 2 hours ago" />
              <VariantCard variant="outlined" title="Meridian" body="4 members · updated yesterday" />
            </Flex>
          </Scenario>
          <Scenario label="ONE ENTITY'S SUMMARY" caption="A single entity's key facts, set apart from the page around it — an entry point to the full detail view.">
            <Card variant="outlined" style={{ maxWidth: 260 }}>
              <Text as="p" size="2" weight="bold" mb="1" style={{ color: "var(--ds-text-strong)" }}>Storage</Text>
              <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.5 }}>12.4 GB of 50 GB used across 3 projects.</Text>
              <ButtonGroup mt="3"><Button priority="secondary">Manage</Button></ButtonGroup>
            </Card>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section title="When NOT to use a card" lead="Most misuse is reaching for the box because content needs SEPARATION, when what it actually needs is spacing or a heading. If you would have to override the border or padding away, it was never a card.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="A card per entity in a set of peers — the boundary carries meaning, and the content inside is a taste, not the whole record.">
            <VariantCard variant="outlined" title="Orbit" body="12 members · updated 2 hours ago" />
          </DoDont>
          <DoDont kind="dont" bare note="Not rows of data (that is a Table), not a single ungrouped block, not a lone call to action (that is a Button), and never as decoration — a border around content is not a card.">
            <Flex direction="column" gap="2" style={{ maxWidth: 260 }}>
              <Card variant="outlined"><Text size="1" style={{ color: "var(--ds-text-weak)" }}>Jul 3 · $1,240.00 · Paid</Text></Card>
              <Card variant="outlined"><Text size="1" style={{ color: "var(--ds-text-weak)" }}>Jul 4 · $820.50 · Open</Text></Card>
              <Card variant="outlined"><Text size="1" style={{ color: "var(--ds-text-weak)" }}>Jul 5 · $96.20 · Paid</Text></Card>
            </Flex>
          </DoDont>
        </Grid>
        <Caption>
          The rows above are <strong>tabular data</strong> wearing card costumes — three cards that would read
          better as three table rows with aligned columns. Reach for <Code>Table</Code>. Likewise: don't nest a
          card inside a card (group with whitespace and a heading), and don't box a single block just to give
          it an edge.
        </Caption>
      </Section>

      <Rule />

      <Section title="Elevation is meaning, not decoration" lead="Lift a card only when it genuinely floats above the page. When everything is raised, nothing is.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="One elevated card against outlined peers — the lift says “this one is detached”, e.g. it is being dragged or it floats over a canvas.">
            <Flex direction="column" gap="3">
              <VariantCard variant="elevated" title="Dragging: Orbit" body="Drop onto a workspace to move it." />
              <VariantCard variant="outlined" title="Meridian" body="4 members · updated yesterday" />
            </Flex>
          </DoDont>
          <DoDont kind="dont" bare note="Every card elevated: the lift stops meaning anything and the page reads busy. Default to outlined and spend elevation where it signals something.">
            <Flex direction="column" gap="3">
              <VariantCard variant="elevated" title="Orbit" body="12 members · updated 2 hours ago" />
              <VariantCard variant="elevated" title="Meridian" body="4 members · updated yesterday" />
            </Flex>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Every row is measured off a rendered card of that variant and checked against the token it names, so the table reports what a card paints rather than what the tokens say. The shared skin comes from Radix; the two variant-specific properties are named system tokens.">
          <CardSpec />
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — each row read a REAL rendered card of its
    // variant (surface and ring both live on pseudo-elements), not a probe this story painted.
    // `awaitMeasuredRows` blocks until every row has recorded its evidence (a row whose element
    // mounts late retries for up to 60 frames before it reports), then runs the identical assertions.
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 4 || rows.unproven !== 0) {
      throw new Error(`expected 4 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

type PropsArgs = { variant: CardVariant; size: "auto" | "1" | "2" | "3" | "4" | "5" };

/** Props — the live, args-driven Card. Drive the variant and the size step. */
export const Props: StoryObj<PropsArgs> = {
  // "auto" (size unset) is the default so the card tracks the global uiSize toolbar out of the box.
  args: { variant: "outlined", size: "auto" },
  argTypes: {
    variant: { control: "inline-radio", options: ["outlined", "elevated", "filled"], description: "The card skin — edge / lift / fill.", table: { category: "Variant" } },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3", "4", "5"], description: '"auto" tracks the global uiSize toolbar (unset, container lane — small → 2); a step pins the padding + radius.', table: { category: "Variant" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ variant, size }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Card · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "16px 0 8px", maxWidth: 320 }}>
        <Card variant={variant} size={size === "auto" ? undefined : size}>
          <Text as="p" size="2" weight="bold" mb="1" style={{ color: "var(--ds-text-strong)" }}>Project settings</Text>
          <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.5 }}>
            Everything about how this project behaves, grouped behind one surface.
          </Text>
          <ButtonGroup mt="3"><Button priority="secondary">Edit</Button></ButtonGroup>
        </Card>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>Card</Code> accepts. Radix's generic <Code>surface</Code>/<Code>classic</Code>/<Code>ghost</Code> variants are deliberately withheld — see the History page.</>}>
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Card · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            Card is a <strong>wrapped</strong> Radix Themes component — the Radix name wins; built on the
            Radix substrate + our <Code>--ds-*</Code> layer, not a hand-rolled surface.
          </Decision>
          <Decision id="[[card-variants]] · Variants">
            <strong>Three variants that differ by boundary treatment</strong> — <Code>outlined</Code> (edge),{" "}
            <Code>elevated</Code> (edge + lift), <Code>filled</Code> (tonal fill, no lift). Radix's own{" "}
            <Code>surface</Code> / <Code>classic</Code> / <Code>ghost</Code> are <strong>not exposed</strong>:
            they are a generic skin vocabulary shared across Badge, Callout, Select and Table rather than card
            semantics, and they fail the test a variant must pass — <Code>surface</Code> and{" "}
            <Code>classic</Code> differ only by border alpha plus a faint drop (the same box twice), and{" "}
            <Code>ghost</Code> is a zero-border, negative-margin alignment device — a card with the card
            removed. Content that shouldn't be boxed wants a plain layout box, not a card variant.
          </Decision>
          <Decision id="[[elevation-model]] · Elevation is meaning">
            <Code>elevated</Code> reuses the <strong>Raised step of the system elevation ladder</strong>{" "}
            (<Code>--ds-shadow-2</Code>) — no new shadow was invented. Lift means "this floats above the
            page", so it is reserved for cards that genuinely do (dragged, or over a busy canvas). A wall of
            elevated cards is noise, not hierarchy.
          </Decision>
          <Decision id="Container size">
            Card rides the <strong>container</strong> size lane (<Code>small</Code> → <Code>2</Code>) — a
            surface reads a notch roomier than a control, the same lane the Dialog panel uses.
          </Decision>
          <Decision id="Container, not control">
            A Card holds content. A card that <em>navigates</em> is <Code>ClickableCard</Code> (one link, one
            tab stop); a card that <em>submits a value</em> is <Code>RadioCards</Code> /{" "}
            <Code>CheckboxCards</Code>. Never wrap a whole Card in an anchor.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Variants restructured to <Code>outlined</Code> / <Code>elevated</Code> / <Code>filled</Code> —
            each now moves a distinct property, replacing Radix's near-identical{" "}
            <Code>surface</Code>/<Code>classic</Code> pair and the <Code>ghost</Code> non-card. Page grown to
            the full spine with an anatomy, when-not-to-use rules, and a "which card-shaped component?"
            comparison.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/Card</Code> — Radix Card wrapped on the container size lane, its skin reused
            tokenlessly; <Code>ClickableCard</Code> layers the navigation build on top.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
