import { type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Rocket, Lightning, UsersThree, Truck } from "@phosphor-icons/react";
import { RadioCards } from "./RadioCards";
import {
  AccentColor, Decision, DoDont, DODONT_LABEL, HexThemeKey, LiteTokenSpec, MeasuredRow, MeasuredSpec, Mono,
  NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, PICK_FROM_SET_COMPARISON } from "./_comparisons";

/* RadioCards reuses Radix's own card skin, and the selected card carries a 2px band in the
   --accent-indicator shade. The system adds two paints on top. --ds-fill-accent-weak is the slight
   accent wash a selected card carries, so it does not read as plain white with a stroke. [[radio-cards-band-edge]] paints the
   band as an inset ring outside forced colours, with --accent-part-edge on its outer 1px, the same band
   CheckboxCards paints ([[part-fill-edge]]). The rows below are MEASURED off a real card set rendered into the
   measurement host: each reads its property from the element that paints it and checks it against the
   token it names, so a row can disagree with the component. */

/* One card's body: an icon + a bold title, a price on the trailing edge, and a line of description
   beneath. The Radix Item is a flex box that centres its single child, so the body takes the full width. */
function CardBody({ icon, title, price, children }: { icon: ReactNode; title: string; price?: string; children: ReactNode }) {
  return (
    <Flex direction="column" gap="1" width="100%">
      <Flex align="center" justify="between" gap="2">
        <Flex align="center" gap="2">
          <Text style={{ color: "var(--ds-text-strong)", display: "flex" }}>{icon}</Text>
          <Text size="2" weight="bold" style={{ color: "var(--ds-text-strong)" }}>{title}</Text>
        </Flex>
        {price ? <Text size="2" weight="bold" style={{ color: "var(--ds-text-strong)" }}>{price}</Text> : null}
      </Flex>
      <Text size="1" style={{ color: "var(--ds-text-weak)", lineHeight: 1.5 }}>{children}</Text>
    </Flex>
  );
}

type Plan = { value: string; label: string; price: string; icon: ReactNode; blurb: string };
const PLANS: Plan[] = [
  { value: "starter", label: "Starter", price: "$0", icon: <Rocket weight="fill" />, blurb: "For side projects — 1 seat, community support" },
  { value: "pro", label: "Pro", price: "$20/mo", icon: <Lightning weight="fill" />, blurb: "For growing teams — analytics + priority support" },
  { value: "team", label: "Team", price: "$60/mo", icon: <UsersThree weight="fill" />, blurb: "For orgs — SSO, audit logs, unlimited seats" },
];

/* The selected card's outline and the card surface, MEASURED off a real two-card set rendered into the
   measurement host: the outline is read from the selected card's ::after, the surface from a resting
   card's ::before, and each is checked against the token the row names. */
function SelectedCardSpec() {
  return (
    <LiteTokenSpec
      rationale={
        <>
          A selected card is a <strong>pair</strong>: a slight accent wash (<Mono>--ds-fill-accent-weak</Mono>,
          the one role this component declares) inside a 2px band in <Mono>--accent-indicator</Mono>, the
          shade every part without text paints ([[textless-part-fills]]), so both halves track the brand collision shift with
          no override. On light amber, lime, mint, sky and yellow and on dark oxblood the band carries a
          1px <Mono>--accent-part-edge</Mono> on its outer pixel, so it clears 3:1 against the page ([[radio-cards-band-edge]]).
          CheckboxCards paints the identical pair, so the two card pickers read as one family. The band
          colour and the surface are measured off a rendered card below. The wash is layered as a gradient
          over that surface, which has no colour property of its own to read.
        </>
      }
    >
      <MeasuredSpec
        render={() => (
          <RadioCards.Root defaultValue="a" columns="1" aria-label="Selected card measurement">
            <RadioCards.Item value="a">Selected</RadioCards.Item>
            <RadioCards.Item value="b">Resting</RadioCards.Item>
          </RadioCards.Root>
        )}
      >
        <MeasuredRow
          part="Selected band" note="The 2px band that marks the chosen card, read as the outline colour its ::after keeps. Forced colours paint that outline. Everywhere else the same token paints the band as an inset ring."
          token="--accent-indicator" select='.rt-RadioCardsItem[data-state="checked"]' pseudo="::after" prop="outline-color"
        />
        <MeasuredRow
          part="Card surface" note="The card back, on a resting card."
          token="--color-surface" select='.rt-RadioCardsItem[data-state="unchecked"]' pseudo="::before" prop="background-color"
        />
      </MeasuredSpec>
      <NoteRow
        part="Selected wash"
        value="layered over the card surface as a flat gradient, so it carries no colour property a row can read"
        radix="--ds-fill-accent-weak"
      />
      <NoteRow
        part="Selected band edge"
        value="a 1px inset ring over the band's outer pixel, in the same shadow list as the band, so no single property carries it. A black or white alpha on the six colours whose band sits under 3:1, transparent on every other colour"
        radix="--accent-part-edge"
      />
      <NoteRow
        part="Focus ring"
        value="a 4px ring on the card's edge, whether the card is selected or not: the accent fill with its stack on it, as two inset rings on ::after. A selected card rests with a 2px band, so the ring differs from it by the 2px strip inside the band. Forced colours paint the ring as a 4px outline ([[card-picker-focus-width]])"
        radix="--ds-stroke-focus"
      />
    </LiteTokenSpec>
  );
}

const ROOT_PROPS: PropDef[] = [
  { name: "size", type: `"1" | "2" | "3"`, def: "control lane (1 at small)", desc: <>Card size. Unset, it resolves from the global <Code>uiSize</Code> control lane (default <Code>small</Code> → <Code>1</Code>); Radix's own default is <Code>2</Code>.</>, source: "RadioCards.tsx · Radix" },
  { name: "variant", type: `"surface" | "classic"`, def: `"surface"`, desc: <>The card skin — a bordered <Code>surface</Code>, or the shadowed <Code>classic</Code>. Both reuse Radix's own card treatment; the selected card gains the accent fill + accent-indicator outline either way.</>, source: "Radix" },
  { name: "color", type: "Radix accent", desc: <>Accent override for the selected outline; unset, it inherits the theme accent (which the token spec reads live).</>, source: "Radix" },
  { name: "highContrast", type: "boolean", def: "false", desc: <>Raises the selected outline to <Code>--accent-12</Code> for a stronger selected cue.</>, source: "Radix" },
  { name: "columns", type: "Responsive<enum | string>", def: `"1"`, desc: <>How many cards per row — a step <Code>"1"</Code>–<Code>"9"</Code>, a track template, or a responsive object (e.g. <Code>{`{ initial: "1", sm: "3" }`}</Code>).</>, source: "Radix" },
  { name: "gap", type: "Responsive<enum | string>", def: `"4"`, desc: <>The space between cards, on the Radix spacing scale.</>, source: "Radix" },
  { name: "value / defaultValue", type: "string", desc: <>Controlled / uncontrolled selected value — a single <Code>string</Code>, since exactly one card can win at a time.</>, source: "Radix" },
  { name: "onValueChange", type: "(value: string) => void", desc: <>Fires when the selection changes, by click or arrow-key move.</>, source: "Radix" },
  { name: "children", type: "ReactNode", desc: <>One or more <Code>RadioCards.Item</Code> — the cards in the set.</>, source: "Radix" },
];

const ITEM_PROPS: PropDef[] = [
  { name: "value", type: "string", def: "— (required)", desc: <>The card's value — required and unique within the set. Reported on selection.</>, source: "Radix" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Dims this single card and skips it in the tab sequence, without disabling the rest of the set.</>, source: "Radix" },
  { name: "children", type: "ReactNode", desc: <>The card's content — typically an icon, a title, a line of description, and maybe a price. Rendered non-interactive (Radix sets <Code>pointer-events: none</Code> on the content so the whole card is the target).</>, source: "Radix" },
];

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>A single-select card picker for a small set where each option earns more than a label — an icon, a description, a price. Exactly one card wins; the selected card takes an accent-aware outline.</>;

const meta: Meta<typeof RadioCards.Root> = {
  title: "Components/Choice/RadioCards",
  component: RadioCards.Root,
  parameters: {
    // Docs stories use custom render() and don't read args, so Controls is dead there; the Props
    // re-enables it. Accessibility + Interactions stay on.
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**RadioCards** is a single-select card picker — one choice out of a small set where each option " +
          "earns more room than a radio row: an icon, a title, a line of description, maybe a price. It wraps " +
          "Radix's compound RadioCards, riding the uiSize control lane; the value is a single `string`, so " +
          "exactly one card wins. A selected card takes a slight accent fill (`--ds-fill-accent-weak`) inside " +
          "a 2px band in `--accent-indicator`, and on the six colours whose band sits under 3:1 against the page " +
          "the band carries a 1px `--accent-part-edge`. Both halves are accent-aware and shared with " +
          "`CheckboxCards`, so the two card pickers read as one family. For a multi-select card set, use `CheckboxCards`; for a plain " +
          "one-of-many list, a `RadioGroup` is lighter.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof RadioCards.Root>;

/** Usage — the primary lite docs story: a realistic card set, the live token spec, and one do/don't. */
export const Usage: Story = {
  // The DoDont callout labels (success/error text on the green/red tint) measure ~4.1–4.4 — just under
  // axe's strict 4.5; the callout colour + the DO/DON'T word carry the meaning, so color-contrast is
  // scoped off here for that subtree only, a documented specimen exception (same pattern as Separator/AlertDialog).
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="RadioCards · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="A plan chooser — one card pre-selected, so the accent-aware selected treatment (a slight fill under an accent outline) reads at rest.">
          <RadioCards.Root defaultValue="pro" columns={{ initial: "1", sm: "3" }} gap="3" aria-label="Choose a plan" data-testid="rc-specimen">
            {PLANS.map((p) => (
              <RadioCards.Item key={p.value} value={p.value}>
                <CardBody icon={p.icon} title={p.label} price={p.price}>{p.blurb}</CardBody>
              </RadioCards.Item>
            ))}
          </RadioCards.Root>
        </Section>

        <Rule />

        <ComparisonSection comparison={PICK_FROM_SET_COMPARISON} highlight="RadioCards / CheckboxCards" />

        <Rule />

        <Section title="When a card earns its room" lead="Cards earn their room when each option carries an icon, a description, or a price. For a bare one-of list a RadioGroup is lighter; for a many-can-be-picked set, that's CheckboxCards.">
          <Flex direction="column" gap="4">
            <Grid columns={{ initial: "1", sm: "2" }} gap="3">
              <DoDont kind="do" bare note="One choice where each option needs an icon, a description, and a price — the card gives that content room, and exactly one shipping speed can win.">
                <RadioCards.Root defaultValue="express" columns="1" gap="2" aria-label="Shipping speed">
                  <RadioCards.Item value="standard">
                    <CardBody icon={<Truck weight="fill" />} title="Standard" price="$5">5–7 business days</CardBody>
                  </RadioCards.Item>
                  <RadioCards.Item value="express">
                    <CardBody icon={<Lightning weight="fill" />} title="Express" price="$15">2 business days</CardBody>
                  </RadioCards.Item>
                </RadioCards.Root>
              </DoDont>
              <DoDont kind="dont" bare note="Cards for a plain one-of list with nothing but a short label — a RadioGroup is lighter and scans faster. (And if several could be picked, that's CheckboxCards, not RadioCards.)">
                <RadioCards.Root defaultValue="m" columns="3" gap="2" aria-label="Size">
                  <RadioCards.Item value="s"><Text size="2" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Small</Text></RadioCards.Item>
                  <RadioCards.Item value="m"><Text size="2" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Medium</Text></RadioCards.Item>
                  <RadioCards.Item value="l"><Text size="2" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Large</Text></RadioCards.Item>
                </RadioCards.Root>
              </DoDont>
            </Grid>
          </Flex>
        </Section>

        <Rule />

        <Section title="Tokens" lead="One declared role (the selected fill) plus the reused Radix skin, read live off the rendered selected card as the drift guard. The spec confirms the band still resolves to the accent indicator in the running theme.">
          <SelectedCardSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Passive (no driving / no flash): assert the group's role and that the pre-selected card carries the
    // selected state. The single-select toggle behaviour lives in _internal/RadioCards behavior.
    const root = canvasElement.querySelector<HTMLElement>('[data-testid="rc-specimen"]');
    if (!root) throw new Error("Usage must render the plan specimen");
    if (root.getAttribute("role") !== "radiogroup")
      throw new Error(`a card set must be role="radiogroup"; got ${root.getAttribute("role")}`);
    const checked = root.querySelectorAll('.rt-RadioCardsItem[data-state="checked"]');
    if (checked.length !== 1)
      throw new Error(`a single-select card set rests with exactly one card selected; got ${checked.length}`);

    // The token table's EVIDENCE, asserted at runtime: both measured rows read a real card node,
    // resolved their claim somewhere else, and the two agree.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 2 || rows.unproven !== 0) {
      throw new Error(`expected 2 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

type PropsArgs = {
  size?: "auto" | "1" | "2" | "3";
  columns: string;
  variant: "surface" | "classic";
  gap: string;
  highContrast: boolean;
  color?: AccentColor;
  defaultValue: string;
  onValueChange?: (value: string) => void;
};

/** Props — the live, args-driven Root (drive size, columns, and the rest of the card set's props). */
export const Props: StoryObj<PropsArgs> = {
  // "auto" (size unset) is the default so the card set tracks the global uiSize toolbar out of the box.
  args: { size: "auto", columns: "3", variant: "surface", gap: "3", highContrast: false, color: undefined, defaultValue: "pro" },
  argTypes: {
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step (1–3) pins the card size.', table: { category: "Variant" } },
    columns: { control: "inline-radio", options: ["1", "2", "3", "4"], description: "Cards per row.", table: { category: "Layout" } },
    variant: { control: "inline-radio", options: ["surface", "classic"], description: "The card skin.", table: { category: "Variant" } },
    gap: { control: "inline-radio", options: ["1", "2", "3", "4"], description: "Space between cards.", table: { category: "Layout" } },
    highContrast: { control: "boolean", description: "Raise the selected outline for a stronger cue.", table: { category: "Variant" } },
    color: { control: "select", options: ["theme", "blue", "grass", "tomato", "amber"], mapping: { theme: undefined }, description: "Accent override for the selected outline; theme = inherit.", table: { category: "Variant" } },
    defaultValue: { control: "inline-radio", options: PLANS.map((p) => p.value), description: "Which card rests selected.", table: { category: "State" } },
    onValueChange: { action: "valueChange", table: { category: "Events" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ size, columns, variant, gap, highContrast, color, defaultValue, onValueChange }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="RadioCards · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "8px 0 2px" }}>
        <RadioCards.Root
          size={size === "auto" ? undefined : size}
          columns={columns}
          variant={variant}
          gap={gap}
          highContrast={highContrast}
          color={color}
          defaultValue={defaultValue}
          onValueChange={onValueChange}
          aria-label="Choose a plan"
          style={{ maxWidth: 680 }}
        >
          {PLANS.map((p) => (
            <RadioCards.Item key={p.value} value={p.value}>
              <CardBody icon={p.icon} title={p.label} price={p.price}>{p.blurb}</CardBody>
            </RadioCards.Item>
          ))}
        </RadioCards.Root>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>RadioCards</Code> accepts, grouped by part — <Code>Root</Code> (the set) and <Code>Item</Code> (one card). <Code>size</Code> rides the control lane; the rest pass through to Radix.</>}>
        <Section title="Root — the set" lead={<>The <Code>&lt;RadioCards.Root&gt;</Code> element — the <Code>role="radiogroup"</Code>, sized on the global control lane, laying its cards out on a responsive grid.</>}>
          <PropTable rows={ROOT_PROPS} />
        </Section>
        <Rule />
        <Section title="Item — one card" lead={<><Code>RadioCards.Item</Code> is a thin passthrough over Radix's radio card. Author one per option; the content is rendered non-interactive so the whole card is the click target.</>}>
          <PropTable rows={ITEM_PROPS} />
        </Section>
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="RadioCards · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            RadioCards is a <strong>wrapped</strong> Radix Themes component — the Radix name wins; built on the
            Radix substrate + our <Code>--ds-*</Code> layer, not a hand-rolled card grid.
          </Decision>
          <Decision id="Size lane">
            <Code>size</Code> rides the global <Code>uiSize</Code> <strong>control</strong> lane (default{" "}
            <Code>small</Code> → <Code>1</Code>), so a card set sizes with the Buttons and inputs around it
            rather than as a roomier surface.
          </Decision>
          <Decision id="Selected skin">
            A selected card is a <strong>slight accent fill</strong> (<Code>--ds-fill-accent-weak</Code>) inside
            a 2px band in <Code>--accent-indicator</Code>, not white with a stroke. Both halves are
            accent-aware, so the selected cue follows the brand collision shift automatically, and{" "}
            <Code>CheckboxCards</Code> paints the identical pair so the two card pickers read as one family.
          </Decision>
          <Decision id="[[radio-cards-band-edge]] · The band clears 3:1 on every colour">
            On light amber, lime, mint, sky and yellow and on dark oxblood the band read 1.33 to 2.08:1
            against the page, under the 3:1 a part without text owes. Outside forced colours the band now
            paints as a 2px inset ring on the card's <Code>::after</Code>, with a 1px{" "}
            <Code>--accent-part-edge</Code> ring on its outer pixel, as <Code>CheckboxCards</Code> paints it
            ([[part-fill-edge]]). The edge is transparent on every other colour. Forced colours and a disabled card keep
            Radix's outline. A set given <Code>color</Code> or <Code>highContrast</Code> takes the same band,
            and a highContrast band paints step 12 ([[colour-prop-and-high-contrast]]).
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
            <Code>--ds-fill-selected-subtle</Code> one used for a selected <em>row</em>. Measured on this
            page's plan cards, the deeper tint drops the card's muted description line to{" "}
            <strong>4.43:1</strong> in light mode — under the 4.5 floor for body text — while the weak step
            holds 5.29:1. A card carries a whole content block, so the tint has to stay a wash: the content
            is the subject, the fill only says which one is picked.
          </Decision>
          <Decision id="Cardinality">
            Single-select — the value is a single <Code>string</Code>, exactly one card selected at a time.
            Picking a card clears the rest. If any number can be on at once, that's <Code>CheckboxCards</Code>,
            never RadioCards.
          </Decision>
          <Decision id="Cards vs. a plain list">
            Reach for cards over a plain <Code>RadioGroup</Code> only when each option earns the extra room — an
            icon, a description, a price. For a bare one-of list a RadioGroup is lighter and scans faster.
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
            The selected band clears 3:1 against the page on every colour. On light amber, lime, mint, sky
            and yellow and on dark oxblood it gains a 1px edge, and a selected radio card matches a selected
            checkbox card ([[radio-cards-band-edge]]).
          </Decision>
          <Decision id="0.9.0">
            A selected card gains a slight accent fill (<Code>--ds-fill-accent-weak</Code>) beneath its
            outline, so it no longer reads as plain white-with-a-stroke — and{" "}
            <Code>CheckboxCards</Code> takes the same pair, ending the mismatch between the two card pickers.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/RadioCards</Code> — Radix RadioCards wrapped, its Root on the global control
            size lane and its accent-aware selected skin reused tokenlessly; single-select over a single{" "}
            <Code>string</Code> value; lite spine (History · Usage · Props).
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
