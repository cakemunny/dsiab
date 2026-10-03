import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import {
  CalendarBlank, CalendarDots, CurrencyDollar, CurrencyEur, CurrencyGbp, Sun,
  TextAlignCenter, TextAlignLeft, TextAlignRight,
} from "@phosphor-icons/react";
import { SegmentedControl } from "./SegmentedControl";
import {
  Caption, Decision, DoDont, DODONT_LABEL, HexThemeKey, LiteTokenSpec, MeasuredRow, MeasuredSpec, Mono, NoteRow, Page,
  PageHeader, PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, PICK_FROM_SET_COMPARISON } from "./_comparisons";

/* SegmentedControl reuses Radix's own SegmentedControl skin: the selected segment is a raised surface
   tile (Radix paints it from --color-background, over the neutral track), theme-following, so the wrap
   declares no --ds-* roles of its own.

   MEASURED. The row reads the tile's background off a REAL SegmentedControl mounted in the measurement
   host and checks it against the token it names, so it can disagree with the component. The version this
   replaces read the value off a hidden copy the story rendered and printed it beside the label — the
   selector was right, but nothing checked the printed hex against the claim, so the row could not fail. */
function SelectedSegmentSpec() {
  return (
    <LiteTokenSpec
      rationale={
        <>
          SegmentedControl reuses Radix's own skin and declares no <Mono>--ds-*</Mono> roles of its own —
          the selected segment is a raised surface tile that slides over the track, painted from Radix's own{" "}
          <Mono>--segmented-control-indicator-background-color</Mono> (the theme background in light, a
          neutral alpha raised off the track in dark). Its 1px ring stacks <Mono>--neutral-ring-stack</Mono> on
          Radix's own, so the tile clears WCAG 3:1 and APCA Lc 30 against the track ([[neutral-part-stacks]]).
        </>
      }
    >
      <MeasuredSpec
        render={() => (
          // A selected value is required: Radix hides the indicator (display: none) until an item is on.
          <SegmentedControl.Root defaultValue="usd" aria-label="Selected tile measurement">
            <SegmentedControl.Item value="usd">USD</SegmentedControl.Item>
            <SegmentedControl.Item value="eur">EUR</SegmentedControl.Item>
          </SegmentedControl.Root>
        )}
      >
        <MeasuredRow
          part="Selected segment tile"
          note="The sliding tile that marks the selection — the segment button itself paints nothing."
          token="--segmented-control-indicator-background-color"
          select=".rt-SegmentedControlIndicator"
          pseudo="::before"
          prop="background-color"
        />
      </MeasuredSpec>
      <NoteRow
        part="Selected tile ring"
        value="1px of --neutral-ring-stack, a black alpha in light or a white alpha in dark, stacked on Radix's 1px --gray-a4 ring in one shadow list on the tile's ::before, so no single property carries it ([[neutral-part-stacks]])"
        radix="--neutral-ring-stack"
      />
    </LiteTokenSpec>
  );
}

/* The realistic value picker reused by the Usage specimen — a currency SETTING (a value the user
   picks), not a page view. Controlled, with the current selection reflected below the control. Each
   segment carries a leading glyph via `startContent`: the currency symbol is the fastest read of the
   option, and the three-letter code beside it stays the accessible name. */
function CurrencyPicker() {
  const [currency, setCurrency] = useState("eur");
  const label = { usd: "US dollars", eur: "euros", gbp: "British pounds" }[currency];
  return (
    <Flex direction="column" gap="3" align="start">
      <SegmentedControl.Root value={currency} onValueChange={setCurrency} aria-label="Display currency" data-testid="currency">
        <SegmentedControl.Item value="usd" startContent={<CurrencyDollar />}>USD</SegmentedControl.Item>
        <SegmentedControl.Item value="eur" startContent={<CurrencyEur />}>EUR</SegmentedControl.Item>
        <SegmentedControl.Item value="gbp" startContent={<CurrencyGbp />}>GBP</SegmentedControl.Item>
      </SegmentedControl.Root>
      <Text size="2" style={{ color: "var(--ds-text-weak)" }}>
        Prices shown in <Text weight="medium" style={{ color: "var(--ds-text-strong)" }}>{label}</Text>.
      </Text>
    </Flex>
  );
}

/* The leading-icon demo — a text-alignment setting, the case where a glyph genuinely carries the option
   faster than its word does. Set beside the same row without icons, so the slot's effect is visible. */
function AlignmentPicker({ withIcons }: { withIcons: boolean }) {
  return (
    <SegmentedControl.Root defaultValue="center" aria-label={withIcons ? "Text alignment" : "Text alignment (no icons)"}>
      <SegmentedControl.Item value="left" startContent={withIcons ? <TextAlignLeft /> : undefined}>Left</SegmentedControl.Item>
      <SegmentedControl.Item value="center" startContent={withIcons ? <TextAlignCenter /> : undefined}>Center</SegmentedControl.Item>
      <SegmentedControl.Item value="right" startContent={withIcons ? <TextAlignRight /> : undefined}>Right</SegmentedControl.Item>
    </SegmentedControl.Root>
  );
}

const ROOT_PROPS: PropDef[] = [
  { name: "size", type: `"1" | "2" | "3"`, def: `control lane (1 at small)`, desc: <>The control's height + type step. Unset, it follows the global <Code>uiSize</Code> <strong>control</strong> lane (default <Code>small</Code> → <Code>1</Code>); an explicit step wins.</>, source: "SegmentedControl.tsx" },
  { name: "variant", type: `"surface" | "classic"`, def: `"surface"`, desc: <>The track treatment. <Code>surface</Code> is a flat inset track; <Code>classic</Code> raises the selected tile with a stronger shadow.</>, source: "Radix" },
  { name: "radius", type: `"none" | "small" | "medium" | "large" | "full"`, def: `theme`, desc: <>Corner radius of the track + selected tile. Unset, it inherits the theme radius.</>, source: "Radix" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Disables the whole row — the track dims and no segment can be picked.</>, source: "Radix" },
  { name: "value", type: "string", desc: <>The selected segment's <Code>value</Code> (controlled). Pair with <Code>onValueChange</Code>.</>, source: "Radix" },
  { name: "defaultValue", type: "string", desc: <>The initially-selected <Code>value</Code> for an uncontrolled row.</>, source: "Radix" },
  { name: "onValueChange", type: "(value: string) => void", desc: <>Fires with the newly-selected segment's <Code>value</Code> when the user picks a different one.</>, source: "Radix" },
];

const ITEM_PROPS: PropDef[] = [
  { name: "value", type: "string", def: "— (required)", desc: <>The segment's value — required and unique in the row. Reported by <Code>onValueChange</Code> when this segment wins.</>, source: "Radix" },
  { name: "startContent", type: "ReactNode", desc: <>An optional <strong>leading icon</strong>, rendered before the label at the size step's own gap. Wrapped <Code>aria-hidden</Code>, so the label stays the accessible name — the same slot name the system's shared row primitive uses.</>, source: "SegmentedControl.tsx" },
  { name: "children", type: "ReactNode", desc: <>The segment's label — a short word or two. It is the accessible name, so a segment normally carries text; an icon-only segment must be given an explicit <Code>aria-label</Code>.</>, source: "Radix" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Skips this one segment while the rest of the row stays pickable.</>, source: "Radix" },
];

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>A flush inline row of mutually-exclusive options that picks a <Mono>value</Mono> — a setting, a mode, or a filter. It switches a value in place; to switch the <em>view</em> of a screen, reach for <Mono>Tabs</Mono>.</>;

const meta: Meta<typeof SegmentedControl.Root> = {
  title: "Components/Choice/SegmentedControl",
  component: SegmentedControl.Root,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**SegmentedControl** is a flush inline row of mutually-exclusive options that picks a **value** — " +
          "a setting, a mode, or a filter (currency, density, sort). It wraps Radix's compound " +
          "SegmentedControl on the uiSize control lane, reusing Radix's own selected-segment skin, so it " +
          "declares no `--ds-*` colour roles of its own; each `Item` adds one slot, an optional decorative " +
          "leading icon (`startContent`). It switches a value *in place*; to switch the **view** of a " +
          "screen among peer panels, reach for `Tabs`. It's a **lite-tier** wrap — one Usage story " +
          "(specimen · leading icon · live token spec · a do/don't) plus a Props.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof SegmentedControl.Root>;

/** Usage — the primary lite docs story: a value-picker specimen, the live token spec, and one do/don't. */
export const Usage: Story = {
  // The DoDont callout tint measures ~4.1–4.4 — just under axe's strict 4.5; the callout colour + the
  // DO/DON'T word already carry the meaning, so color-contrast is scoped off for JUST these cards
  // ([data-dodont]), a documented specimen exception (same pattern as Separator/AlertDialog Usage).
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="SegmentedControl · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="A controlled currency setting — the row picks a value, and the current selection is reflected below it. Each segment leads with its currency symbol, the optional startContent icon.">
          <CurrencyPicker />
        </Section>

        <Rule />

        <ComparisonSection comparison={PICK_FROM_SET_COMPARISON} highlight="SegmentedControl" />

        <Rule />

        <Section title="Leading icon" lead="startContent puts an optional glyph before a segment's label. Reach for it when the icon reads faster than the word — alignment, density, media type — and skip it when the label already says everything (a currency code, a date range).">
          <Flex direction="column" gap="4" align="start">
            <Flex gap="6" wrap="wrap" align="end">
              <Flex direction="column" gap="2" align="start">
                <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>WITH ICONS</Text>
                <AlignmentPicker withIcons />
              </Flex>
              <Flex direction="column" gap="2" align="start">
                <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>WITHOUT</Text>
                <AlignmentPicker withIcons={false} />
              </Flex>
            </Flex>
            <Caption>
              The glyph sits before the label, optically centred, at the gap the row's size step already
              prescribes — the track stays flush and the selected tile keeps its geometry. It is decorative:
              rendered <Mono>aria-hidden</Mono>, so the label is still the accessible name and the row still
              reads as words to a screen reader. Keep the label; an icon-only segment needs its own{" "}
              <Mono>aria-label</Mono> and loses the at-a-glance readout that makes a segmented row worth using.
            </Caption>
          </Flex>
        </Section>

        <Rule />

        <Section title="A value, not a view" lead="Use a SegmentedControl to switch a value inline among a few options. Where you're switching the view of a screen, that's Tabs.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="Switch a VALUE inline among 2–5 short options — a setting, a mode, a filter. Each option is a short label that fits one row.">
              <Flex direction="column" gap="2" align="start">
                <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>DENSITY</Text>
                <SegmentedControl.Root defaultValue="comfortable" aria-label="Row density">
                  <SegmentedControl.Item value="comfortable">Comfortable</SegmentedControl.Item>
                  <SegmentedControl.Item value="compact">Compact</SegmentedControl.Item>
                </SegmentedControl.Root>
              </Flex>
            </DoDont>
            <DoDont kind="dont" bare note="Don't use it to switch the page VIEW between peer panels (List / Board / Calendar) — that's Tabs, at System/Container/Tabs. A SegmentedControl picks a value, it doesn't swap what's on screen.">
              <Flex direction="column" gap="2" align="start">
                <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>PROJECT VIEW</Text>
                <SegmentedControl.Root defaultValue="list" aria-label="Project view (anti-pattern)">
                  <SegmentedControl.Item value="list">List</SegmentedControl.Item>
                  <SegmentedControl.Item value="board">Board</SegmentedControl.Item>
                  <SegmentedControl.Item value="calendar">Calendar</SegmentedControl.Item>
                </SegmentedControl.Root>
              </Flex>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Measured off a rendered control, not resolved from the token — the row reads the selected tile's own background and reports whether it equals what the token it names resolves to, so it can disagree. SegmentedControl reuses Radix's skin, so it owns no --ds-* roles.">
          <SelectedSegmentSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // The token row's EVIDENCE: only a live DOM can prove the row read a real mounted indicator, that the
    // claimed token was resolved somewhere else, and that the two agree.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 1 || rows.unproven !== 0) {
      throw new Error(`expected 1 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // Passive (no driving / no flash): a value-picker's selection contract is asserted right here on the
    // rendered specimen. axe runs automatically on the story.
    const root = canvasElement.querySelector<HTMLElement>('[data-testid="currency"]');
    if (!root) throw new Error("Usage must render the currency SegmentedControl specimen");

    // Radix builds the row on ToggleGroup type="single" → the Root is a radiogroup, each segment a radio.
    if (root.getAttribute("role") !== "radiogroup")
      throw new Error(`the row must be a radiogroup; got role="${root.getAttribute("role")}"`);
    const segments = [...root.querySelectorAll<HTMLElement>('button[role="radio"]')];
    if (segments.length !== 3)
      throw new Error(`the currency row must render 3 radio segments; got ${segments.length}`);

    // Exactly one segment is selected (aria-checked + data-state="on"); the specimen defaults to EUR.
    const selected = segments.filter((s) => s.getAttribute("aria-checked") === "true");
    if (selected.length !== 1)
      throw new Error(`exactly one segment must be selected; got ${selected.length}`);
    if (selected[0].getAttribute("data-state") !== "on")
      throw new Error(`the selected segment must carry data-state="on"; got "${selected[0].getAttribute("data-state")}"`);
    // The Item renders the label twice (active + an aria-hidden inactive span for width), so read the
    // active label rather than the doubled textContent. The specimen defaults to EUR.
    const activeLabel = selected[0].querySelector(".rt-SegmentedControlItemLabelActive")?.textContent?.trim();
    if (activeLabel !== "EUR")
      throw new Error(`the specimen must default to EUR selected; got "${activeLabel}"`);
  },
};

type PropsArgs = {
  size: "auto" | "1" | "2" | "3";
  variant: "surface" | "classic";
  radius: "none" | "small" | "medium" | "large" | "full";
  disabled: boolean;
  startContent: boolean;
  defaultValue: string;
};

const RANGE_ICONS = { day: <Sun />, week: <CalendarBlank />, month: <CalendarDots /> };

/** Props — the live, args-driven Root. Drive size, variant, radius, disabled, and the leading icon. */
export const Props: StoryObj<PropsArgs> = {
  // "auto" (size unset) is the default so the row tracks the global uiSize toolbar out of the box.
  args: { size: "auto", variant: "surface", radius: "medium", disabled: false, startContent: true, defaultValue: "day" },
  argTypes: {
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step (1–3) pins the height + type step.', table: { category: "Variant" } },
    variant: { control: "inline-radio", options: ["surface", "classic"], description: "Track treatment — flat inset (surface) or a raised selected tile (classic).", table: { category: "Variant" } },
    radius: { control: "inline-radio", options: ["none", "small", "medium", "large", "full"], description: "Corner radius of the track + tile.", table: { category: "Variant" } },
    disabled: { control: "boolean", description: "Disables the whole row.", table: { category: "State" } },
    startContent: { control: "boolean", description: "Item prop — a decorative leading icon before each label (aria-hidden; the gap follows the size step).", table: { category: "Item" } },
    defaultValue: { control: "inline-radio", options: ["day", "week", "month"], description: "The initially-selected segment's value (uncontrolled).", table: { category: "Value" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ size, variant, radius, disabled, startContent, defaultValue }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="SegmentedControl · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "16px 0 8px" }}>
        <SegmentedControl.Root size={size === "auto" ? undefined : size} variant={variant} radius={radius} disabled={disabled} defaultValue={defaultValue} aria-label="Reporting range">
          <SegmentedControl.Item value="day" startContent={startContent ? RANGE_ICONS.day : undefined}>Day</SegmentedControl.Item>
          <SegmentedControl.Item value="week" startContent={startContent ? RANGE_ICONS.week : undefined}>Week</SegmentedControl.Item>
          <SegmentedControl.Item value="month" startContent={startContent ? RANGE_ICONS.month : undefined}>Month</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>SegmentedControl</Code> accepts, grouped by part — <Code>Root</Code> (the row) and <Code>Item</Code> (one segment). <Code>size</Code> rides the control lane and <Code>startContent</Code> is ours; the rest pass through to Radix.</>}>
        <Section title="Root — the row" lead={<>The <Code>&lt;SegmentedControl.Root&gt;</Code> element — a <Code>role="radiogroup"</Code> track, sized on the global control lane.</>}>
          <PropTable rows={ROOT_PROPS} />
        </Section>
        <Rule />
        <Section title="Item — one segment" lead={<><Code>SegmentedControl.Item</Code> adds one slot of our own, <Code>startContent</Code>; the rest is Radix's segment.</>}>
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
      <PageHeader title="SegmentedControl · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            SegmentedControl is a <strong>wrapped</strong> Radix Themes component — the Radix name wins; built
            on the Radix substrate + our <Code>--ds-*</Code> layer, not a hand-rolled toggle row.
          </Decision>
          <Decision id="Control size lane">
            The row is a <strong>control</strong> — it sits alongside Buttons and inputs — so an unset{" "}
            <Code>size</Code> follows the global <Code>uiSize</Code> control lane (default <Code>small</Code> →{" "}
            <Code>1</Code>), the same step a Button beside it renders at. An explicit <Code>size</Code> wins.
          </Decision>
          <Decision id="Skin reuse">
            The selected segment reuses Radix's own SegmentedControl skin — a raised surface tile that slides
            over the neutral track — so the wrap declares <strong>no <Code>--ds-*</Code> colour roles</strong>{" "}
            and one layer of its own: [[neutral-part-stacks]] stacks <Code>--neutral-ring-stack</Code> on the tile's 1px ring. The token spec confirms the tile's colour live off the DOM (the
            drift guard).
          </Decision>
          <Decision id="Leading icon">
            A segment takes an optional leading icon through <Code>startContent</Code> — the same slot name
            the system's shared row primitive uses, so there is <strong>one word</strong> for "content before
            the label". It is <strong>decorative</strong>: rendered <Code>aria-hidden</Code>, sitting left of
            the label, vertically centred, at the gap the size step already prescribes (so the flush track and
            the sliding selected tile are untouched). The <strong>label carries the accessible name</strong> —
            a segmented row's job is to show the current value in words, so an icon-only segment needs an
            explicit <Code>aria-label</Code> and is the exception, not the shape to reach for.
          </Decision>
          <Decision id="Value, not view">
            SegmentedControl switches a <strong>value</strong> in place (a setting/mode/filter). Switching the{" "}
            <strong>view</strong> of one screen among peer panels is <Code>Tabs</Code> — a distinct component.
            The Usage do/don't and the comparison table both draw that line.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            <Code>SegmentedControl.Item</Code> gains <Code>startContent</Code> — an optional decorative leading
            icon before the label, on the size step's own gap.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/SegmentedControl</Code> — Radix SegmentedControl wrapped on the control size
            lane; its selected-segment skin reused tokenlessly; <Code>value</Code>/<Code>onValueChange</Code>{" "}
            passed through for a controlled row; History page added so every component, stubs included, has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
