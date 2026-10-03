import { type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { EnvelopeSimple, BellSimple, DeviceMobile, Sparkle, ChartLineUp, Headset } from "@phosphor-icons/react";
import { CheckboxCards } from "./CheckboxCards";
import {
  Decision, DoDont, DODONT_LABEL, HexThemeKey, LiteTokenSpec, MeasuredRow, MeasuredSpec, Mono, NoteRow, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, PICK_FROM_SET_COMPARISON } from "./_comparisons";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    A multi-select card picker — a grid of cards, each an icon + a title + a line of description, where
    several can be picked at once (the value is a <Mono>string[]</Mono>). Reach for it over a plain
    CheckboxGroup when each option earns more than a label.
  </>
);

/* A checked card carries the SAME selected pair RadioCards does — a slight accent wash
   (--ds-fill-accent-weak) under a 2px accent edge (--accent-indicator) — so the two card pickers read as one
   family; Radix on its own gives a checked CheckboxCards card no card-level treatment at all, only the
   inner checkbox fills. The rows below are MEASURED off a real card set rendered into the measurement
   host: each reads its property from the element that paints it and checks it against the token it names,
   so a row can disagree with the component. */
function SelectedFillSpec() {
  return (
    <LiteTokenSpec
      rationale={
        <>
          A checked card is a <strong>pair</strong>: a slight accent wash (<Mono>--ds-fill-accent-weak</Mono>)
          under a 2px accent edge (<Mono>--accent-indicator</Mono>) — the identical treatment{" "}
          <Mono>RadioCards</Mono> carries, so the two card pickers read as one family. Both roles are
          accent-aware, so the selected cue tracks a brand collision shift with no override. The edge and the
          card's own checkbox are measured off a rendered card below and land on the same indicator, so a card
          and its box are one shade on every colour. The wash is layered as a gradient over the card surface,
          which has no colour property of its own to read.
        </>
      }
    >
      <MeasuredSpec
        render={() => (
          <CheckboxCards.Root defaultValue={["a"]} columns="1" aria-label="Selected card measurement">
            <CheckboxCards.Item value="a">Selected</CheckboxCards.Item>
            <CheckboxCards.Item value="b">Resting</CheckboxCards.Item>
          </CheckboxCards.Root>
        )}
      >
        <MeasuredRow
          part="Selected card edge" note="The 2px edge that marks a checked card."
          token="--accent-indicator" select=".rt-CheckboxCardsItem:has(.rt-CheckboxCardCheckbox[data-state='checked'])"
          pseudo="::after" prop="outline-color"
        />
        <MeasuredRow
          part="Checkbox fill" note="The card's own small checkbox, on Radix's skin."
          token="--accent-indicator" select=".rt-CheckboxCardCheckbox[data-state='checked']" pseudo="::before" prop="background-color"
        />
        <MeasuredRow
          part="Card surface" note="The card back, on a resting card."
          token="--color-surface" select=".rt-CheckboxCardsItem:has(.rt-CheckboxCardCheckbox[data-state='unchecked'])"
          pseudo="::before" prop="background-color"
        />
      </MeasuredSpec>
      <NoteRow
        part="Selected card wash"
        value="layered over the card surface as a flat gradient, so it carries no colour property a row can read"
        radix="--ds-fill-accent-weak"
      />
      <NoteRow
        part="Focus ring"
        value="a 4px ring on the card's edge, whether the card is selected or not: the accent fill with its stack on it, as two inset rings on ::after. A selected card rests with a 2px band, so the ring differs from it by the 2px strip inside the band. Forced colours paint the ring as a 4px outline ([[card-picker-focus-width]])"
        radix="--ds-stroke-focus"
      />
    </LiteTokenSpec>
  );
}

/* One realistic card: an icon + a title + a one-line description, with an optional trailing price. The
   CheckboxCards.Item renders a <label> and appends its own checkbox after these children. */
function OptionCard({ value, icon, title, desc, price }: { value: string; icon?: ReactNode; title: string; desc: string; price?: string }) {
  return (
    <CheckboxCards.Item value={value}>
      <Flex align="center" gap="3" style={{ flex: 1, minWidth: 0 }}>
        {icon && <Box style={{ color: "var(--ds-text-weak)", display: "flex", flexShrink: 0 }}>{icon}</Box>}
        <Flex direction="column" gap="1" style={{ minWidth: 0, flex: 1 }}>
          <Flex align="baseline" justify="between" gap="2">
            <Text as="div" weight="medium" style={{ color: "var(--ds-text-strong)" }}>{title}</Text>
            {price && <Text as="div" weight="medium" style={{ color: "var(--ds-text-strong)", flexShrink: 0 }}>{price}</Text>}
          </Flex>
          <Text as="div" size="1" style={{ color: "var(--ds-text-weak)", lineHeight: 1.5 }}>{desc}</Text>
        </Flex>
      </Flex>
    </CheckboxCards.Item>
  );
}

/* The notifications specimen reused by the Usage story + its passive play. Email + Push are pre-selected so
   the accent-aware selected treatment shows without any interaction. */
function NotificationCards() {
  return (
    <CheckboxCards.Root defaultValue={["email", "push"]} columns={{ initial: "1", sm: "3" }} data-testid="notif-cards" aria-label="Which notifications?">
      <OptionCard value="email" icon={<EnvelopeSimple />} title="Email" desc="A daily digest to your inbox" />
      <OptionCard value="push" icon={<BellSimple />} title="Push" desc="Instant alerts on your devices" />
      <OptionCard value="sms" icon={<DeviceMobile />} title="SMS" desc="Texts for urgent items only" />
    </CheckboxCards.Root>
  );
}

const PROPS: PropDef[] = [
  { name: "size", type: `"1" | "2" | "3"`, def: "control lane (1 at small)", desc: <>Card size step. Unset, it follows the global <Code>uiSize</Code> control lane (default <Code>small</Code> → <Code>1</Code>).</>, source: "CheckboxCards.tsx" },
  { name: "variant", type: `"surface" | "classic"`, def: `"surface"`, desc: <>The card skin — a bordered <Code>surface</Code>, or the shadowed <Code>classic</Code>. Both reuse Radix's own card treatment; a checked card takes the accent fill + accent edge either way.</>, source: "Radix" },
  { name: "columns", type: `"1"–"9" | responsive`, def: "auto-fit", desc: <>Grid columns (responsive). Default is an auto-fit grid (<Code>repeat(auto-fit, minmax(200px, 1fr))</Code>); set a step for a fixed column count.</>, source: "Radix" },
  { name: "gap", type: `"0"–"9" | responsive`, def: `"4"`, desc: <>Space between cards, on the Radix spacing scale.</>, source: "Radix" },
  { name: "color", type: "Radix accent", desc: <>Overrides the card accent. Unset, cards paint from the theme accent (accent-aware, tracks brand collision shifts).</>, source: "Radix" },
  { name: "highContrast", type: "boolean", desc: <>Deepens the selected fill for extra contrast.</>, source: "Radix" },
  { name: "defaultValue / value", type: "string[]", desc: <>The selected item values — an <strong>array</strong>, because several cards can be picked at once (multi-select). <Code>defaultValue</Code> is uncontrolled; <Code>value</Code> + <Code>onValueChange</Code> is controlled.</>, source: "Radix" },
  { name: "onValueChange", type: "(value: string[]) => void", desc: <>Fires with the full array of selected values on every check/uncheck.</>, source: "Radix" },
  { name: "Item — value", type: "string", desc: <>The value contributed to the group's array when this card is checked. Item holds arbitrary children (an icon, a title, a description).</>, source: "Radix" },
];

const meta: Meta<typeof CheckboxCards.Root> = {
  title: "Components/Choice/CheckboxCards",
  component: CheckboxCards.Root,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**CheckboxCards** is a multi-select card picker — a grid of selectable cards where several can " +
          "be picked at once (the value is a `string[]`), each card holding an icon, a title, and a line of " +
          "description. It wraps Radix Themes' compound CheckboxCards on the `surface` skin and the uiSize " +
          "control lane. A checked card takes the same accent-aware selected treatment `RadioCards` carries — " +
          "a slight accent fill (`--ds-fill-accent-weak`) under a 2px accent edge (`--accent-indicator`). " +
          "Reach for it over a plain `CheckboxGroup` when each option earns more than a label. It's a " +
          "**lite-tier** wrap — one Usage story (specimen · live token spec · comparison · a do/don't) plus a Props.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof CheckboxCards.Root>;

/** Usage — the primary lite docs story: a realistic specimen, the live token spec, the comparison, one do/don't. */
export const Usage: Story = {
  // The DoDont callout labels (success/error text on the green/red tint) measure ~4.1–4.4 — just under
  // axe's strict 4.5; the callout colour + the DO/DON'T word already carry the meaning, so color-contrast
  // is scoped off for just those cards (same pattern as Separator/AlertDialog Usage).
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader
          title="CheckboxCards · Usage"
          standfirst={DEFINITION}
        />

        <Section title="Specimen" lead="A multi-select set — pick any combination. Email and Push are pre-selected, so the accent-aware selected treatment shows without interaction.">
          <NotificationCards />
        </Section>

        <Rule />

        <ComparisonSection comparison={PICK_FROM_SET_COMPARISON} highlight="RadioCards / CheckboxCards" />

        <Rule />

        <Section title="When a card earns its room" lead="Cards earn their room when each option needs an icon, a description, or a price — and several can be picked. For a bare yes/no list, a CheckboxGroup is lighter.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="Each option carries an icon, a title, and a line of description — and several can be picked. The extra room per option is what earns the card.">
              <CheckboxCards.Root defaultValue={["analytics"]} columns="1" gap="2" aria-label="Add-ons (do)">
                <OptionCard value="analytics" icon={<ChartLineUp />} title="Analytics" desc="Dashboards and exports" price="$12/mo" />
                <OptionCard value="support" icon={<Headset />} title="Priority support" desc="24/7 response, 1h SLA" price="$20/mo" />
              </CheckboxCards.Root>
            </DoDont>
            <DoDont kind="dont" bare note="A plain yes/no list where each option is just a label wastes the card's room — a CheckboxGroup lays the same choices out lighter.">
              <CheckboxCards.Root defaultValue={["a"]} columns="1" gap="2" aria-label="Options (don't)">
                <OptionCard value="a" title="Accept marketing email" desc="" />
                <OptionCard value="b" title="Accept product updates" desc="" />
              </CheckboxCards.Root>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Two declared paints (the selected card's fill and edge) plus the reused Radix checkbox skin, read live off the rendered card — the drift guard. The spec confirms the edge and the checkbox fill both resolve to --accent-indicator in the running theme.">
          <SelectedFillSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Passive (no driving / no flash): the group semantics + a pre-selected card's checked state are asserted
    // right here. axe runs automatically on the story.
    const group = canvasElement.querySelector<HTMLElement>('[data-testid="notif-cards"]');
    if (!group) throw new Error("Usage must render the notifications specimen");
    if (group.getAttribute("role") !== "group") throw new Error(`CheckboxCards.Root must render role="group"; got ${group.getAttribute("role")}`);

    // Multi-select: BOTH pre-selected cards render checked (Email + Push), each aria-checked.
    const checked = group.querySelectorAll<HTMLElement>('.rt-CheckboxCardCheckbox[data-state="checked"]');
    if (checked.length !== 2) throw new Error(`the two pre-selected cards must render checked; got ${checked.length}`);
    for (const box of checked) {
      if (box.getAttribute("aria-checked") !== "true") throw new Error("a checked card's checkbox must be aria-checked=\"true\"");
    }

    // The token table's EVIDENCE, asserted at runtime: every measured row read a real card node,
    // resolved its claim somewhere else, and the two agree.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 3 || rows.unproven !== 0) {
      throw new Error(`expected 3 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

type PropsArgs = {
  size: "auto" | "1" | "2" | "3";
  variant: "surface" | "classic";
  columns: "1" | "2" | "3";
  gap: "0" | "1" | "2" | "3" | "4" | "5";
  color: undefined | "gray" | "blue" | "grass" | "crimson" | "iris";
  highContrast: boolean;
};

/** Props — the live, args-driven Root. Drive size, variant, columns, gap, accent, and contrast. */
export const Props: StoryObj<PropsArgs> = {
  // "auto" (size unset) is the default so the cards track the global uiSize toolbar out of the box.
  args: { size: "auto", variant: "surface", columns: "2", gap: "3", color: undefined, highContrast: false },
  argTypes: {
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset, control lane); a step pins the card size.', table: { category: "Variant" } },
    variant: { control: "inline-radio", options: ["surface", "classic"], description: "The card skin — bordered surface or shadowed classic.", table: { category: "Variant" } },
    columns: { control: "inline-radio", options: ["1", "2", "3"], description: "Grid column count (a fixed step, overriding the default auto-fit grid).", table: { category: "Layout" } },
    gap: { control: "inline-radio", options: ["0", "1", "2", "3", "4", "5"], description: "Space between cards (Radix spacing scale).", table: { category: "Layout" } },
    color: { control: "select", options: [undefined, "gray", "blue", "grass", "crimson", "iris"], description: "Accent override. Unset paints from the theme accent (accent-aware).", table: { category: "Variant" } },
    highContrast: { control: "boolean", description: "Deepen the selected fill for extra contrast.", table: { category: "Variant" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ size, variant, columns, gap, color, highContrast }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="CheckboxCards · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "8px 0 2px", maxWidth: 680 }}>
        <CheckboxCards.Root
          defaultValue={["standard"]}
          size={size === "auto" ? undefined : size}
          variant={variant}
          columns={columns}
          gap={gap}
          color={color}
          highContrast={highContrast}
          aria-label="Plan add-ons"
        >
          <OptionCard value="standard" icon={<Sparkle />} title="Standard" desc="Core features for small teams" price="Included" />
          <OptionCard value="analytics" icon={<ChartLineUp />} title="Analytics" desc="Dashboards, funnels, and exports" price="$12/mo" />
          <OptionCard value="support" icon={<Headset />} title="Priority support" desc="24/7 response with a 1-hour SLA" price="$20/mo" />
          <OptionCard value="alerts" icon={<BellSimple />} title="Realtime alerts" desc="Push + email when thresholds trip" price="$6/mo" />
        </CheckboxCards.Root>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>CheckboxCards</Code> adds or forwards — all pass through to Radix's <Code>CheckboxCards</Code> (its <Code>size</Code> rides the control lane).</>}>
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="CheckboxCards · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            CheckboxCards is a <strong>wrapped</strong> Radix Themes component — the Radix name wins; built on the
            Radix substrate + our <Code>--ds-*</Code> layer, not a hand-rolled card grid.
          </Decision>
          <Decision id="Multi-select">
            A card picker where <strong>several</strong> cards can be on at once — the value is a{" "}
            <Code>string[]</Code>. This is the card-shaped cousin of <Code>CheckboxGroup</Code> (its radio
            counterpart, <Code>RadioCards</Code>, is single-select).
          </Decision>
          <Decision id="Selected skin">
            A checked card carries the <strong>same selected treatment as <Code>RadioCards</Code></strong> — a
            slight accent fill (<Code>--ds-fill-accent-weak</Code>) under a 2px accent edge
            (<Code>--accent-indicator</Code>) — so the two card pickers read as one family. Left bare, only the
            small inner checkbox changes when a card is picked, which is far too quiet a signal for a whole
            card. Both roles are accent-aware, so the cue tracks a brand collision shift with no override.
          </Decision>
          <Decision id="[[card-picker-focus-width]] · A focused card rings 4px">
            A focused card rings 4px on its edge, selected or not, in the system ring's colour. A selected
            card rests with a 2px band in the same colour on most colours, so the 2px ring every other
            control wears changed no pixel on a focused selected card, and a focused card that was not
            selected looked selected. The 4px ring covers the band and the 2px strip inside it, so a
            focused card differs from a selected card at rest by 3:1 over that strip on 27 colours in both
            appearances. Every other ring in the system stays 2px.
          </Decision>
          <Decision id="Why the weak tint, not the a5 selected tint">
            The fill is the <Code>--ds-fill-accent-weak</Code> step, not the deeper{" "}
            <Code>--ds-fill-selected-subtle</Code> one a selected <em>row</em> takes. Measured on the card
            specimens, the deeper tint drops a card's muted description line to <strong>4.43:1</strong> in
            light mode — under the 4.5 floor for body text — while the weak step holds 5.29:1. A card carries a
            whole content block, so the tint stays a wash: the content is the subject, the fill only says
            which ones are picked.
          </Decision>
          <Decision id="uiSize · R10 · Global control lane">
            Card <Code>size</Code> follows the global control lane (our small default → <Code>1</Code>) unless set.
          </Decision>
          <Decision id="When to reach for cards">
            Choose cards over a plain <Code>CheckboxGroup</Code> only when each option needs more than a label —
            an icon, a description, a price. For a bare yes/no list, a <Code>CheckboxGroup</Code> is lighter.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            A focused card rings 4px, selected or not. The 2px ring painted where the selected band paints,
            in the same colour on most colours, so focus changed nothing on a selected card and made a card
            that was not selected look selected ([[card-picker-focus-width]]).
          </Decision>
          <Decision id="0.9.0">
            The 2px edge of a checked card paints the same indicator as the checkbox inside it. Before, it
            painted the fill that carries text, which is one shade deeper on 16 colours, so a card showed two
            shades of its accent.
          </Decision>
          <Decision id="0.9.0">
            A checked card gains the card-level selected treatment it was missing — the same accent fill +
            accent edge <Code>RadioCards</Code> carries — so picking a card changes the card, not just its
            checkbox, and the two card pickers finally match.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/CheckboxCards</Code> — Radix CheckboxCards wrapped on the <Code>surface</Code> skin
            and the uiSize control lane; its accent-aware selected fill bound to <Code>--ds-fill-accent</Code>{" "}
            tokenlessly; History page added so every component, stubs included, has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
