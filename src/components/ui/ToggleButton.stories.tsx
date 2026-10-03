import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { TextB, TextItalic, TextUnderline, PushPin } from "@phosphor-icons/react";
import { ToggleButton } from "./ToggleButton";
import {
  Decision, DoDont, DODONT_LABEL, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, NoteRow, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, BOOLEAN_CHOICE_COMPARISON } from "./_comparisons";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>A binary on/off control — bold, mute, pin. Pressed reads three ways: an accent-aware selected fill, a 1px accent edge and a bolded label. The bolded label is the cue that needs no colour. An icon-only toggle has no visible text to bold, so <Code>pressedIcon</Code> swaps its glyph instead.</>;

/* The Bold specimen's two faces. `pressedIcon` swaps the WHOLE rest content, so the pressed face carries
   the label as well as the glyph — and the glyph itself thickens, so "on" shows in the mark, not only in
   the label's weight. The swap is a WEIGHT step (regular → bold), not the Pin pair's outline → fill: the
   filled TextB is a boxed B, a different silhouette, whereas the bold B is the same letterform carrying
   the same meaning as the toggle itself. */
const BOLD_REST = <><TextB /> Bold</>;
const BOLD_PRESSED = <><TextB weight="bold" /> Bold</>;

/* The component OWNS the pressed paint — all three parts of it: the --ds-fill-selected-subtle tint, the
   1px --ds-stroke-accent-weak edge and the --ds-text-strong ink over it. MEASURED: each row reads its property off a real pressed ToggleButton
   mounted in the measurement host — "pressed" is a state a static render can hold (defaultPressed →
   data-state="on"), so there is nothing to synthesise — and checks it against the token it claims. The
   version this replaces painted a probe with that same token and printed the hex beside the label, which
   agreed by construction and could never disagree with the component.

   THE INK ROW IS NOT DECORATION. Left undeclared, the label kept Radix's ghost --accent-a11, which is
   tuned to read on the PAGE and not on a tint of its own hue: 17 of the 27 accents x 2 appearances fell
   under WCAG AA, worst light/orange at 3.13:1. Naming the ink here is what makes the pairing readable as
   a pairing, and the sweep in _internal/ToggleButton behavior is what holds it. */
function PressedFillSpec() {
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      <Flex align="center" gap="3" style={{ padding: "20px" }}>
        <div style={{ flexShrink: 0 }}><ToggleButton defaultPressed pressedIcon={BOLD_PRESSED}>{BOLD_REST}</ToggleButton></div>
        <Text size="1" style={{ color: "var(--ds-text-weak)" }}>
          A pressed ToggleButton fills from the accent-aware <Mono>--ds-fill-selected-subtle</Mono>, draws a 1px inset{" "}
          <Mono>--ds-stroke-accent-weak</Mono> edge, the edge a pressed <strong>Token</strong> keeps, and bolds
          its label to weight 600 — a non-colour cue, so <strong>on</strong> reads without relying on colour
          alone. The label also <strong>leaves the accent</strong>: it takes{" "}
          <Mono>--ds-text-strong</Mono>, the same committed-selection ink a checked{" "}
          <strong>Select</strong> row and a current <strong>Pagination</strong> page carry. Accent ink on an
          accent tint is one hue arguing with itself — the two move together as the brand changes, and the
          pair fell under AA on 17 of the 54 accent × appearance combinations before the ink stepped out.
          The label reserves its bold width at all times, so the weight shift never reflows. Everything else
          is Button's own ghost skin (size · focus ring · disabled), reused, not re-skinned. The three rows below
          are read off a pressed toggle and checked against the tokens they name.
        </Text>
      </Flex>
      <MeasuredSpec render={() => <ToggleButton defaultPressed>{BOLD_REST}</ToggleButton>}>
        <MeasuredRow
          part="Pressed fill"
          note="The accent tint an “on” toggle carries — Radix's ghost button paints nothing at rest."
          token="--ds-fill-selected-subtle"
          select='.rt-BaseButton[data-state="on"]'
          prop="background-color"
        />
        <MeasuredRow
          part="Pressed edge"
          note="A 1px inset ring drawn as a shadow, so the row proves the edge's colour and reports its geometry beside it. A bare tint on a control is the flat soft look [[soft-variant-scope]] keeps off controls."
          token="--ds-stroke-accent-weak"
          select='.rt-BaseButton[data-state="on"]'
          prop="box-shadow"
        />
        <MeasuredRow
          part="Pressed label ink"
          note="The committed-selection ink over that tint — not the ghost button's accent, which is tuned for the page behind it."
          token="--ds-text-strong"
          select='.rt-BaseButton[data-state="on"]'
          prop="color"
        />
      </MeasuredSpec>
      <NoteRow part="Pressed weight" value="font-weight 600 — the non-colour cue (width reserved, no reflow)" />
      <NoteRow part="Button skin" value="Radix ghost .rt-variant-ghost (reused — size, focus ring, disabled)" />
    </Box>
  );
}

const PROPS: PropDef[] = [
  { name: "pressed", type: "boolean", desc: <>Controlled pressed state. Pair with <Code>onPressedChange</Code>.</>, source: "ToggleButton.tsx" },
  { name: "defaultPressed", type: "boolean", def: "false", desc: <>Initial pressed state when uncontrolled.</>, source: "ToggleButton.tsx" },
  { name: "onPressedChange", type: "(pressed: boolean) => void", desc: <>Fires on every state change, controlled or uncontrolled.</>, source: "ToggleButton.tsx" },
  { name: "pressedIcon", type: "ReactNode", desc: <>Optional icon shown while pressed — swaps the rest content. Omit it and the same content renders in both states.</>, source: "ToggleButton.tsx" },
  { name: "label", type: "string", desc: <>Accessible name → <Code>aria-label</Code>. <strong>Required</strong> for an icon-only toggle — there is no auto-tooltip.</>, source: "ToggleButton.tsx" },
  { name: "size", type: `"1" | "2" | "3" | "inherit"`, desc: <>Passed through to Button. Unset, it follows the global <Code>uiSize</Code> control lane (default <Code>small</Code> → <Code>1</Code>).</>, source: "ToggleButton.tsx" },
  { name: "disabled", type: "boolean", desc: <>Disables the toggle — keeps Radix's dimmed treatment; the pressed paint is gated off (<Code>:not([data-disabled])</Code>).</>, source: "Radix" },
];

const meta: Meta<typeof ToggleButton> = {
  title: "Components/Action/ToggleButton",
  component: ToggleButton,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**ToggleButton** is a binary on/off control (bold, mute, pin). It composes the " +
          "`@radix-ui/react-toggle` primitive `asChild` over our **Button** at `priority=\"tertiary\"` (ghost), " +
          "so it reuses the entire Button chrome — size, focus ring, disabled. Pressed reads three ways: an " +
          "accent-aware `--ds-fill-selected-subtle` fill, a 1px inset `--ds-stroke-accent-weak` edge **and** a bolded (600) label. The bolded label is the cue that needs no colour, " +
          "with the label's bold width reserved so pressing never reflows. The pressed label paints " +
          "`--ds-text-strong`, the system's committed-selection ink, rather than the ghost button's accent — " +
          "accent ink over an accent tint tracks the brand and fails AA on most of them. It is controlled (`pressed`) or " +
          "uncontrolled (`defaultPressed`); an icon-only toggle requires `label` (there is no auto-tooltip).",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ToggleButton>;

export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="ToggleButton · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead={<>Rest and pressed, side by side — the fill, its 1px edge and the bolded label together mark the pressed state. An icon-only toggle has no visible text, so it takes its accessible name from the <Code>label</Code> prop, and <Code>pressedIcon</Code> swaps its glyph on press.</>}>
          <Flex align="center" gap="4" wrap="wrap">
            <Flex align="center" gap="2">
              <ToggleButton pressedIcon={BOLD_PRESSED}>{BOLD_REST}</ToggleButton>
              <ToggleButton defaultPressed pressedIcon={BOLD_PRESSED}>{BOLD_REST}</ToggleButton>
            </Flex>
            <Box style={{ width: 1, height: 28, background: "var(--ds-stroke-weak)" }} />
            <Flex align="center" gap="2">
              <ToggleButton label="Pin" pressedIcon={<PushPin weight="fill" />}><PushPin /></ToggleButton>
              <ToggleButton label="Pin" defaultPressed pressedIcon={<PushPin weight="fill" />}><PushPin /></ToggleButton>
            </Flex>
          </Flex>
        </Section>
        <Rule />
        <ComparisonSection comparison={BOOLEAN_CHOICE_COMPARISON} highlight="ToggleButton" />
        <Rule />
        <Section title="A transient binary, not a setting" lead="A ToggleButton is a transient, in-context binary. A persistent setting is a Switch; a mutually-exclusive pick is a ToggleButtonGroup.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="A transient, in-context binary — a formatting mark toggled on the current selection. The pressed state shows in the fill and its edge, and the glyph swaps to its bold weight, so it never relies on colour alone (WCAG 1.4.1).">
              <Flex align="center" gap="1" style={{ padding: 6, background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", width: "fit-content" }}>
                <ToggleButton defaultPressed label="Bold" pressedIcon={<TextB weight="bold" />}><TextB /></ToggleButton>
                <ToggleButton label="Italic" pressedIcon={<TextItalic weight="bold" />}><TextItalic /></ToggleButton>
                <ToggleButton label="Underline" pressedIcon={<TextUnderline weight="bold" />}><TextUnderline /></ToggleButton>
              </Flex>
            </DoDont>
            <DoDont kind="dont" bare note="A persistent setting that applies immediately is a Switch (or a form control) — not a ToggleButton. Reserve ToggleButton for transient, in-context toggles.">
              <Flex align="center" justify="between" style={{ width: 220, padding: "8px 12px", background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" }}>
                <Text size="2" style={{ color: "var(--ds-text-strong)", whiteSpace: "nowrap" }}>Email notifications</Text>
                <Box style={{ width: 34, height: 20, borderRadius: "var(--ds-radius-full)", background: "var(--ds-fill-selected)", position: "relative", flexShrink: 0 }}>
                  <Box style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "var(--ds-radius-full)", background: "var(--on-accent)" }} />
                </Box>
              </Flex>
            </DoDont>
          </Grid>
        </Section>
        <Rule />
        <Section title="Tokens" lead="Measured off a rendered toggle, not resolved from the token — each row reads the pressed fill, edge or label ink and reports whether it equals what the token it names resolves to, so it can disagree with the component.">
          <PressedFillSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // The token row's EVIDENCE: the row measured a real pressed toggle, resolved its claim somewhere else,
    // and the two agree.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 3 || rows.unproven !== 0) {
      throw new Error(`expected 3 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // Passive render assertion only — the pre-pressed (defaultPressed) specimen already shows the "on"
    // state statically; this reads it, it does NOT drive the toggle (no flash on view). The paint +
    // weight + width-reservation behavior is exercised in _internal/ToggleButton behavior.
    const pressed = canvasElement.querySelector<HTMLElement>('button[aria-pressed="true"]');
    if (!pressed) throw new Error("Usage must render a pre-pressed ToggleButton (data-state='on')");
    if (pressed.getAttribute("data-state") !== "on")
      throw new Error(`a pressed toggle must carry data-state='on'; got ${pressed.getAttribute("data-state")}`);
  },
};

type PropsArgs = {
  label: string;
  defaultPressed: boolean;
  pressedIcon: boolean;
  size: "auto" | "1" | "2" | "3" | "4";
  disabled: boolean;
  onPressedChange: (pressed: boolean) => void;
};

export const Props: StoryObj<PropsArgs> = {
  args: { label: "Pin", defaultPressed: false, pressedIcon: true, size: "auto", disabled: false },
  argTypes: {
    label: { control: "text", description: "Accessible name → aria-label (required for an icon-only toggle).", table: { category: "Content" } },
    defaultPressed: { control: "boolean", description: "Initial pressed state (uncontrolled — click it to toggle).", table: { category: "State" } },
    pressedIcon: { control: "boolean", description: "Swap to a filled glyph while pressed (the pressedIcon fallback).", table: { category: "Content" } },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3", "4"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step pins the button.', table: { category: "Variant" } },
    disabled: { control: "boolean", description: "Disable the toggle — the pressed paint is gated off.", table: { category: "State" } },
    onPressedChange: { action: "pressedChange", table: { category: "Events" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ label, defaultPressed, pressedIcon, size, disabled, onPressedChange }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="ToggleButton · Props" standfirst={<>{DEFINITION} The instance below is the uncontrolled (<Code>defaultPressed</Code>) mode — the controlled <Code>pressed</Code> prop is documented in the table.</>} />
      <Box style={{ padding: "8px 0 2px" }}>
        <ToggleButton
          label={label}
          defaultPressed={defaultPressed}
          disabled={disabled}
          size={size === "auto" ? undefined : size}
          pressedIcon={pressedIcon ? <PushPin weight="fill" /> : undefined}
          onPressedChange={onPressedChange}
        >
          <PushPin />
        </ToggleButton>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>ToggleButton</Code> adds; <Code>size</Code>/<Code>disabled</Code> and the rest forward to Button.</>}>
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="ToggleButton · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[toggle-button]] · composition">
            ToggleButton is the <Code>@radix-ui/react-toggle</Code> primitive composed <Code>asChild</Code> over
            Button at <Code>priority="tertiary"</Code> (ghost) — it <strong>reuses</strong> Button's chrome
            (size, focus ring, disabled), never re-skins it. Toggle merges <Code>data-state="on"</Code>; the
            pressed paint is the accent-aware <Code>--ds-fill-selected-subtle</Code> fill, a 1px inset{" "}
            <Code>--ds-stroke-accent-weak</Code> edge <strong>and</strong> a weight-600 label. The weight is the cue that needs no colour. An icon-only toggle has no visible text for it to act on, so <Code>pressedIcon</Code> swaps its glyph instead.
          </Decision>
          <Decision id="D11 · the pressed label leaves the accent">
            The pressed label takes <Code>--ds-text-strong</Code>, not the ghost button's inherited{" "}
            <Code>--accent-a11</Code> — the same ink every other committed-selection surface in the system
            already uses (the checked <Code>Select</Code> row, the active <Code>DateRangeInput</Code> preset,
            the current <Code>Pagination</Code> page). Accent ink is tuned to read on the <em>page</em>; over
            an accent tint of its own hue the two track each other as the brand changes, and the pair fell
            under WCAG AA on <strong>17 of the 27 accents × 2 appearances</strong> — worst light/orange at{" "}
            <strong>3.13:1</strong>. Lightening the fill was measured and rejected: it still failed 17
            combinations at <Code>a4</Code> and 10 at <Code>a3</Code>, because both sides move together. With
            the neutral ink, every combination clears — worst <strong>8.84:1</strong>.
          </Decision>
          <Decision id="[[toggle-button]] · controlled">
            Controlled <Code>and</Code> uncontrolled — <Code>pressed</Code>/<Code>onPressedChange</Code> or{" "}
            <Code>defaultPressed</Code>. Radix's primitive gives uncontrolled state for free, and it's the platform
            convention for a form-ish control.
          </Decision>
          <Decision id="Docs · label">
            An icon-only ToggleButton does <strong>not</strong> get an automatic <strong>tooltip</strong> from{" "}
            <Code>label</Code>. Follow the IconButton rule: an icon-only toggle <strong>requires</strong>{" "}
            <Code>label</Code> (→ <Code>aria-label</Code>) for an accessible name.
          </Decision>
          <Decision id="Deferred">
            Deferred: an event-arg <Code>preventDefault</Code> opt-out, and the async{" "}
            <Code>pressedChangeAction</Code> + <Code>useOptimistic</Code> optimistic-update pattern — revisit if
            the app layer needs them.
          </Decision>
          <Decision id="uiSize · R10 · Global control lane">
            <Code>size</Code> follows the global <Code>uiSize</Code> control lane (default <Code>small</Code>) via
            Button.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0 · the pressed edge">
            A pressed toggle draws a 1px inset <Code>--ds-stroke-accent-weak</Code> edge, the edge a pressed Token
            keeps, because the tint alone read as the flat soft look that [[soft-variant-scope]] keeps off controls ([[toggle-button]]).
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/ToggleButton</Code> — react-toggle composed over Button ghost; the
            pressed selected-subtle fill + weight-600 non-colour cue with a reserved bold width (no reflow);
            controlled + uncontrolled; the <Code>label</Code>-not-tooltip a11y correction. The pressed label
            then moved off the inherited accent ink onto <Code>--ds-text-strong</Code>, on a measured sweep of
            all 27 accents in both appearances (17 combinations were under WCAG AA; the worst read 3.13:1).
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
