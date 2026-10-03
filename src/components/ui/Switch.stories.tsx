import { type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid } from "@radix-ui/themes";
// The system's own Text, not Radix's. This page teaches the labelled-switch row,
// and until [[text-element-attributes]] it could only be built with Radix's Text because ours rejected
// `htmlFor` — a route a consumer of the package does not have. Importing ours is
// what makes the documented pattern reproducible outside this repo.
import { Text } from "./Text";
import { Switch } from "./Switch";
import { useResolvedSize } from "../../theme/SizeContext";
import {
  Caption, Decision, DoDont, DODONT_LABEL, HexThemeKey, LiteTokenSpec, MeasuredRow, MeasuredSpec, Mono, NoteRow,
  Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Section, toHex,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, BOOLEAN_CHOICE_COMPARISON } from "./_comparisons";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>An on/off toggle for a single setting that takes effect immediately — flip it and it applies, no Save. Always paired with a label, and the label always leads: the switch sits on the row's trailing edge.</>;

// Resolve a CSS custom property to an sRGB hex, as it computes on `el` (P3-safe via the canvas).
function tokenHex(el: Element, name: string): string {
  const probe = document.createElement("span");
  el.appendChild(probe);
  probe.style.color = `var(${name})`;
  const hex = toHex(getComputedStyle(probe).color);
  probe.remove();
  return hex;
}

// Pull the first colour out of a computed background-image gradient string (sRGB rgb()/rgba() or a P3
// color(display-p3 …) or a hex) — that first stop is the switch's --accent-track ON-track fill. The
// table's rows cannot express this reading (no colour property carries it), so the ON-track binding is
// asserted in the Usage play instead, off the rendered switch.
function firstGradientColor(bgImage: string): string | null {
  const m = bgImage.match(/rgba?\([^)]*\)|color\([^)]*\)|#[0-9a-fA-F]{3,8}/);
  return m ? m[0] : null;
}

/* Switch reuses Radix's own track skin (its checked surface track paints from --accent-track, the shade
   every part without text paints, [[textless-part-fills]]), so it declares no --ds-* roles of its own. The ON colour rides
   INSIDE the track's background-IMAGE gradient — the sliding stop that moves under the thumb — so it is
   not carried by any colour property a row can read off the element; the base track fill under it is,
   and that is the measured row below. */

/** The system's switch row — the ONE shape every specimen on this page uses.
 *
 *  The LABEL LEADS and the switch sits at the row's TRAILING edge. Stated logically, not as left/right:
 *  `justify="between"` on a row flexbox resolves against the writing direction, so an RTL page mirrors the
 *  whole row for free (label at the right, switch at the left) with no extra rule. The label tracks the
 *  size toolbar; an optional supporting line stacks beneath it, inside the label column.
 *
 *  The label is painted --ds-text-strong in every state, which is what this row really produces. A
 *  Switch takes no `label` of its own — it is a lite wrap and the labelled row is a pattern the caller
 *  composes — so it has no Field shell, and the rule that dims a disabled field's name (components.css)
 *  has nothing to key off here. This row used to fake that dim with a ternary of its own, which showed
 *  readers a disabled state the pattern does not actually hand them. */
function LabeledSwitch({ id, label, description, style, ...props }: { id: string; label: string; description?: string } & Omit<ComponentProps<typeof Switch>, "id">) {
  const labelSize = useResolvedSize<ComponentProps<typeof Text>["size"]>("text", undefined);
  return (
    <Flex align="center" justify="between" gap="4" style={{ width: "100%", ...style }}>
      <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
        <Text as="label" htmlFor={id} size={labelSize} style={{ color: "var(--ds-text-strong)" }}>{label}</Text>
        {description && <Text size="1" style={{ color: "var(--ds-text-weak)", lineHeight: 1.5 }}>{description}</Text>}
      </Flex>
      <Switch id={id} {...props} style={{ flexShrink: 0 }} />
    </Flex>
  );
}

/** One row of a settings card — the shared row shape, plus the card's divider + padding. */
function SettingRow({ id, title, desc, defaultChecked, first, testid }: { id: string; title: string; desc: string; defaultChecked?: boolean; first?: boolean; testid?: string }) {
  return (
    <Box style={{ padding: "14px 20px", borderTop: first ? undefined : "1px solid var(--ds-stroke-weak)" }}>
      <LabeledSwitch id={id} label={title} description={desc} defaultChecked={defaultChecked} data-testid={testid} />
    </Box>
  );
}

/** The realistic settings card reused by the Usage specimen + the play. */
function SettingsCard() {
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)", maxWidth: 460 }}>
      <SettingRow first id="set-email" title="Email notifications" desc="Get an email when someone mentions you." defaultChecked testid="switch-on" />
      <SettingRow id="set-push" title="Push notifications" desc="Send alerts to your devices in real time." defaultChecked />
      <SettingRow id="set-digest" title="Weekly digest" desc="A Monday summary of activity in your workspace." />
    </Box>
  );
}

/** The anti-pattern specimen for the label-side do/don't: the switch LEADING, its label trailing — the
 *  checkbox's arrangement borrowed for a control that isn't one. Rendered only inside a DON'T card. */
function SwitchLeadingRow({ id, label }: { id: string; label: string }) {
  const labelSize = useResolvedSize<ComponentProps<typeof Text>["size"]>("text", undefined);
  return (
    <Flex align="center" gap="2" style={{ width: "100%" }}>
      <Switch id={id} defaultChecked style={{ flexShrink: 0 }} />
      <Text as="label" htmlFor={id} size={labelSize} style={{ color: "var(--ds-text-strong)" }}>{label}</Text>
    </Flex>
  );
}

/** The track token spec — the base fill measured off a rendered switch, the ON colour named in prose. */
function SwitchOnTrackSpec() {
  return (
    <LiteTokenSpec
      rationale={
        <>
          Switch reuses Radix's own track skin and declares no <Mono>--ds-*</Mono> roles of its own. Its
          checked track paints from <Mono>--accent-track</Mono>, the shade every part without text paints,
          so the ON state is accent-aware and follows the brand shift with no override. The thumb stays
          white on every colour. Where a light track leaves a white thumb under 3:1, the thumb's 1px ring
          takes a deeper step of the switch's own colour. The accent stop lives inside the track's
          background gradient and the ring inside the thumb's shadow, so neither is readable as a colour
          property. The neutral base the gradient rides on is, and it is measured below.
        </>
      }
    >
      <MeasuredSpec render={() => <Switch defaultChecked aria-label="Track measurement" />}>
        <MeasuredRow
          part="Track base" note="The neutral the track rests on, under the sliding accent stop."
          token="--gray-a3" select=".rt-SwitchRoot" pseudo="::before" prop="background-color"
        />
      </MeasuredSpec>
      <NoteRow
        part="ON track fill"
        value="the accent stop inside the track's background gradient — it slides rather than filling a box, so no colour property carries it"
        radix="--accent-track"
      />
      <NoteRow
        part="Thumb stroke (on)"
        value="the checked thumb's 1px ring, inside its box-shadow: Radix's --accent-a4, or the lightest deeper step of the same colour that clears 3:1 where the white thumb cannot"
        radix="--accent-thumb-stroke"
      />
    </LiteTokenSpec>
  );
}

const SWITCH_PROPS: PropDef[] = [
  { name: "size", type: `"1" | "2" | "3"`, def: `control lane (1 at small)`, desc: <>Control size. Unset, it resolves from the global <Code>uiSize</Code> control lane (default <Code>small</Code> → <Code>1</Code>); Radix's own default is <Code>2</Code>.</>, source: "Switch.tsx · Radix" },
  { name: "variant", type: `"surface" | "classic"`, def: `"surface"`, desc: <>The track's visual style. Both pass through, and <Code>surface</Code> is the default, an inset track that reads as a control. <Code>soft</Code> is not offered: its pale track read 1.24:1 against the page, and a switch given it is a type error ([[colour-prop-and-high-contrast]]).</>, source: "Radix" },
  { name: "checked", type: "boolean", desc: <>Controlled on/off state. A switch flips <em>immediately</em> — pair it with an <Code>onCheckedChange</Code> that applies the setting, not a deferred Save.</>, source: "Radix" },
  { name: "defaultChecked", type: "boolean", def: "false", desc: <>Uncontrolled initial on/off state.</>, source: "Radix" },
  { name: "onCheckedChange", type: `(checked: boolean) => void`, desc: <>Fires when the switch flips, on pointer and keyboard activation.</>, source: "Radix" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Disables the control. Intentionally low-contrast (WCAG-exempt) — prefer guiding toward a valid action over silently disabling one.</>, source: "Radix" },
  { name: "color", type: `<Radix accent>`, desc: <>Accent override for the ON track; otherwise it inherits the theme accent.</>, source: "Radix" },
  { name: "highContrast", type: "boolean", def: "false", desc: <>Raises the ON track's contrast against the page.</>, source: "Radix" },
  { name: "radius", type: `"none" | "small" | "medium" | "large" | "full"`, desc: <>Track + thumb corner radius; otherwise inherits the theme radius.</>, source: "Radix" },
];

const meta: Meta<typeof Switch> = {
  title: "Components/Choice/Switch",
  component: Switch,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Switch** is an on/off toggle for a single setting that takes effect immediately — flip it " +
          "and it applies, no Save. It’s a thin wrapper over Radix’s `Switch`, riding the uiSize control " +
          "lane; its checked track reuses Radix’s accent-aware skin (`--accent-track`), " +
          "so the ON state follows the brand accent with no `--ds-*` role of its own. A switch is always " +
          "paired with a label, and the label always **leads** with the switch on the row's **trailing** " +
          "edge. It’s a **lite-tier** wrap — one Usage story (settings " +
          "specimen · live token spec · comparison · do/don’ts) plus a Props.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Switch>;

/** Usage — the primary lite docs story: a settings specimen, the live token spec, and one do/don't. */
export const Usage: Story = {
  // The DoDont callout labels (success/error text on the green/red tint) measure ~4.1–4.4 — just under
  // axe's strict 4.5; the callout colour + the DO/DON'T word already carry the meaning, so color-contrast
  // is scoped off here, a documented specimen exception (same pattern as Separator/AlertDialog Usage).
  //
  // button-name is carved out BY RULE, not by element (2026-08-04). The first DON'T specimen IS a bare
  // <Switch> with no label — that is the anti-pattern the card exists to show, and its note says so in
  // words ("A bare switch has no accessible name and no context"). Naming the rule keeps the exemption
  // readable, which excluding the card wholesale did not: this story used to exclude [data-dodont], and
  // that blanket was also forgiving every other rule inside both specimens.
  parameters: {
    a11y: {
      context: { exclude: [DODONT_LABEL] },
      config: { rules: [{ id: "button-name", enabled: false }] },
    },
  },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Switch · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="A settings card — each row leads with its label and supporting line and puts the switch on the trailing edge, so the states line up in one scannable column.">
          <SettingsCard />
        </Section>

        <Rule />

        <ComparisonSection comparison={BOOLEAN_CHOICE_COMPARISON} highlight="Switch" />

        <Rule />

        <Section title="Label leads, switch trails" lead="A switch is for a live setting with a clear label — and the label always leads, with the switch on the row's trailing edge. If the change only lands on Save, it's a Checkbox; if it has no label, it has no meaning.">
          <Flex direction="column" gap="3">
            <Grid columns={{ initial: "1", sm: "2" }} gap="3">
              <DoDont kind="do" bare note="A clear adjacent label, for a setting that applies the moment it flips — the label is the accessible name and the reader knows exactly what toggles.">
                <LabeledSwitch id="do-switch" label="Dark mode" defaultChecked />
              </DoDont>
              <DoDont kind="dont" bare note="A bare switch has no accessible name and no context. And if the change only takes effect on Save, it isn't a switch at all — that's a Checkbox.">
                <Switch defaultChecked />
              </DoDont>
            </Grid>
            <Grid columns={{ initial: "1", sm: "2" }} gap="3">
              <DoDont kind="do" bare note="Label leading, switch on the trailing edge. Read the setting, then its state — and in a stack the switches line up in one column you can scan for what's on.">
                <Flex direction="column" gap="2" width="100%">
                  <LabeledSwitch id="do-side-a" label="Two-factor authentication" defaultChecked />
                  <LabeledSwitch id="do-side-b" label="Sign-in alerts" defaultChecked />
                  <LabeledSwitch id="do-side-c" label="Trusted devices" />
                </Flex>
              </DoDont>
              <DoDont kind="dont" bare note="Don't lead with the switch — that's the Checkbox's arrangement, where the box is part of reading the option. Here it scatters the states across the row and makes a switch look like a checkbox. And don't mix the two arrangements on one screen.">
                <Flex direction="column" gap="2" width="100%">
                  <SwitchLeadingRow id="dont-side-a" label="Two-factor authentication" />
                  <SwitchLeadingRow id="dont-side-b" label="Sign-in alerts" />
                </Flex>
              </DoDont>
            </Grid>
            <Caption>
              Say it as <strong>leading / trailing</strong>, not left / right: a row flexbox resolves those
              against the writing direction, so an RTL page mirrors the row for free — label at the right,
              switch at the left — with no extra rule. Inside a <Mono>Field</Mono> the rule is unchanged and
              needs no special case: the field's own label already leads (above the control by default, in the
              leading column in horizontal mode). Trailing-edge <em>alignment</em> is what a settings row
              adds on top — it stretches the row so a stack of switches lines up in one column.
            </Caption>
          </Flex>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Read live from the rendered switch — the drift guard. Switch reuses Radix's track skin, so it owns no --ds-* roles; the spec confirms the ON track resolves to --accent-track in the running theme.">
          <SwitchOnTrackSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Passive (no driving / no flash): a switch's rest render already carries its a11y role and the ON
    // token binding, so both are asserted here without toggling. axe runs automatically on the story.
    const anySwitch = canvasElement.querySelector<HTMLElement>('[role="switch"]');
    if (!anySwitch) throw new Error('Usage must render a switch (role="switch")');

    const on = canvasElement.querySelector<HTMLElement>('[data-testid="switch-on"]');
    if (!on) throw new Error("the specimen must include a checked switch to read the ON track");
    if (on.getAttribute("aria-checked") !== "true") throw new Error(`the probed switch must be checked; got aria-checked="${on.getAttribute("aria-checked")}"`);

    // ON track binds to --accent-track. The accent lives in the ::before background-IMAGE gradient (the
    // track's background-COLOR is the base gray), so read the gradient's first colour. Resolve the token
    // INSIDE the .radix-themes root (canvasElement is above it).
    const first = firstGradientColor(getComputedStyle(on, "::before").backgroundImage);
    if (!first) throw new Error("a checked switch must paint an accent gradient on its track");
    const themeRoot = canvasElement.querySelector<HTMLElement>(".radix-themes") ?? on;
    const got = toHex(first);
    const want = tokenHex(themeRoot, "--accent-track");
    if (got !== want) throw new Error(`switch ON-track must resolve --accent-track; got ${got} vs ${want}`);

    // The token table's EVIDENCE, asserted at runtime: the track-base row read a real switch node,
    // resolved its claim somewhere else, and the two agree.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 1 || rows.unproven !== 0) {
      throw new Error(`expected 1 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

type PropsArgs = {
  size: "auto" | "1" | "2" | "3";
  variant: "surface" | "classic";
  checked: boolean;
  disabled: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

/** Props — the live, args-driven Switch in a labeled row. Drive size, variant, checked, disabled. */
export const Props: StoryObj<PropsArgs> = {
  args: { size: "auto", variant: "surface", checked: false, disabled: false },
  argTypes: {
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step pins the track.', table: { category: "Variant" } },
    variant: { control: "inline-radio", options: ["surface", "classic"], description: "The track's visual style.", table: { category: "Variant" } },
    checked: { control: "boolean", description: "On/off state (drive it from Controls; the change also logs in Actions).", table: { category: "State" } },
    disabled: { control: "boolean", description: "Disables the control.", table: { category: "State" } },
    onCheckedChange: { action: "checkedChange" },
  },
  parameters: { controls: { disable: false } },
  render: ({ size, variant, checked, disabled, onCheckedChange }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Switch · Props" standfirst={<>{DEFINITION} The row below is the system's one switch shape — label leading, switch on the trailing edge.</>} />
      <Box style={{ padding: "16px 0 8px", maxWidth: 360 }}>
        <LabeledSwitch id="pg-switch" label="Reduce motion" size={size === "auto" ? undefined : size} variant={variant} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>Switch</Code> accepts — <Code>size</Code> resolves from the <Code>uiSize</Code> control lane when unset, the rest pass through to Radix's <Code>Switch</Code>.</>}>
        <PropTable rows={SWITCH_PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Switch · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            Switch is a <strong>wrapped</strong> Radix Themes component — the Radix name wins; built on the
            Radix substrate + our <Code>--ds-*</Code> layer, not a hand-rolled toggle.
          </Decision>
          <Decision id="Control lane">
            An unset <Code>size</Code> follows the global <Code>uiSize</Code> control lane (default{" "}
            <Code>small</Code> → <Code>1</Code>), so a switch renders at the same tier as the controls beside
            it. Radix's own default is <Code>2</Code>.
          </Decision>
          <Decision id="Skin reuse">
            The checked track paints from <Code>--accent-track</Code>, the shade every part without text
            paints, so the ON state is already accent-aware and tracks the brand collision shift. It declares
            no <Code>--ds-*</Code> roles of its own; focus is the system ring, the accent with a stacked alpha ([[focus-ring]]), not a
            per-component glow.
          </Decision>
          <Decision id="[[textless-part-fills]] · Thumb stroke">
            The thumb stays white on every colour. On a light track a white thumb falls under 3:1, so its 1px
            ring, which Radix paints <Code>--accent-a4</Code>, takes the lightest deeper step of the same colour
            that clears 3:1 against the track: <Code>--accent-a11</Code> on amber, lime, mint, sky and yellow in
            light, and in dark step 7 on those five and step 6 on orange. Every other colour keeps Radix's ring.
          </Decision>
          <Decision id="Labeled row">
            A switch is never shipped bare — it is always paired with an adjacent text <Code>&lt;label&gt;</Code>{" "}
            (the accessible name), the same labeled-row rule the Checkbox follows.
          </Decision>
          <Decision id="Label side">
            <strong>The label leads; the switch sits on the row's trailing edge.</strong> One arrangement, no
            exceptions — a page that mixes both makes the reader re-find the control on every row. Three
            reasons it goes this way round: (1) reading order matches the sentence — you read <em>what</em> the
            setting is, then its current state, and the state is the part that changes; (2) with the switches
            flush to the trailing edge they line up in a column, so a settings list can be scanned for
            "what's on" in one vertical sweep — leading switches scatter as soon as labels differ in length;
            (3) it keeps a switch visually distinct from a <Code>Checkbox</Code> or <Code>RadioGroup</Code>{" "}
            item, where the box <em>does</em> lead because it's part of reading the option. Stated as{" "}
            <strong>leading / trailing</strong>, never left / right — a row flexbox resolves those against
            the writing direction, so an RTL page mirrors the whole row with no extra rule.
          </Decision>
          <Decision id="Label side · in a Field">
            Same rule, no special case. A switch inside a <Code>Field</Code> keeps the field's own label —
            above the control in the default vertical mode, in the leading column in the horizontal one — so
            the label still leads either way. The trailing-edge alignment is what a <em>settings row</em>{" "}
            adds: it stretches the row and pushes the switch to the far edge so a stack of them lines up.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            The checked thumb's ring deepens on the light tracks where a white thumb fell under 3:1 (lime
            1.35:1 in light, yellow 1.96:1 in dark), and the ON track follows the one shade every part without
            text paints. The thumb stays white.
          </Decision>
          <Decision id="0.9.0">
            Label side settled: the label <strong>leads</strong>, the switch sits on the row's{" "}
            <strong>trailing</strong> edge. Every specimen on the page moved onto that one shape (the docs
            previously showed both arrangements with no rule), with a do/don't and the RTL + Field notes.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/Switch</Code> — Radix Switch wrapped, its accent-aware track skin reused
            tokenlessly so the ON state follows the brand accent; size driven by the global <Code>uiSize</Code>{" "}
            control lane; the labeled-row rule documented; History page added so every component, stubs
            included, has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
