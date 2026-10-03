import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useLayoutEffect, useRef, useState } from "react";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Checkbox } from "./Checkbox";
import { CheckboxGroup } from "./CheckboxGroup";
import {
  AccentColor, AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, MeasuredRow,
  MeasuredSpec, NoteRow, Page, PageHeader, PropsLead, PropDef, PropTable, Rule, Scenario, Section, tick,
  TokenGroup,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, BOOLEAN_CHOICE_COMPARISON } from "./_comparisons";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    A single checkbox, locked to the <Code>surface</Code> variant so it reads as an input — a box with a
    border that separates from the page. It always needs a label, which is its accessible name, and supports
    an <Code>indeterminate</Code> state for a parent whose children are only partly selected. For a set of
    related options, use <Code>CheckboxGroup</Code>.
  </>
);

/* ---- anatomy diagram + field (Checkbox-specific) ------------------------- */

/** Where a callout sits and what it points at.
 *  `gutter` — the dot parks in the left gutter and runs a leader in to the part's LEFT edge, landing
 *  on the part's vertical middle.
 *  `over` / `under` — the dot sits above (or below) the specimen on the part's own CENTRE line and
 *  runs a tick to the first edge between them; `lane` is that tick's length. The tick stops at the
 *  part's own edge or the control box's, whichever it reaches first, so a callout for a glyph
 *  INSIDE the box never draws across the fill. */
type Pin =
  | { n: number; part: string; place: "gutter" }
  | { n: number; part: string; place: "over" | "under"; lane: number };

/** The control box — the leaders' stop edge, and the part callout 1 names. */
const CONTAINER = ".rt-CheckboxRoot";
const DOT = 20; // dotStyle's diameter
const LEADER = 63; // the gutter leader's length
const LANE = { over: 24, ring: 14 };

const PINS: Pin[] = [
  { n: 1, part: CONTAINER, place: "gutter" },
  { n: 2, part: ".rt-CheckboxIndicator", place: "over", lane: LANE.over },
  { n: 3, part: "[data-part='label']", place: "over", lane: LANE.over },
  { n: 4, part: "[data-part='focus-ring']", place: "under", lane: LANE.ring },
];

/** A labelled, ticked checkbox specimen (checked, so the indicator shows).
 *
 *  Every callout is MEASURED off that live specimen rather than parked at a hand-computed offset: a
 *  dot takes its x from the part it names and its y from that part's own edge, read in a layout
 *  effect and re-read by a ResizeObserver on the frame and the specimen. Pinned numbers drift the
 *  moment the label's type step, the box's size lane or its radius moves — and they had: the label
 *  callout sat 4px left of the word it names. */
function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const specimen = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Record<number, { x: number; y: number }>>({});
  const [gutter, setGutter] = useState<number | null>(null);

  useLayoutEffect(() => {
    const f = frame.current;
    const s = specimen.current;
    if (!f || !s) return;
    const measure = () => {
      const box = s.querySelector<HTMLElement>(CONTAINER);
      if (!box) return;
      const fr = f.getBoundingClientRect();
      const control = box.getBoundingClientRect();
      const next: Record<number, { x: number; y: number }> = {};
      let leftmost = Infinity;
      for (const p of PINS) {
        const el = s.querySelector<HTMLElement>(p.part);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (p.place === "gutter") {
          const x = Math.round(r.left - fr.left);
          next[p.n] = { x, y: Math.round(r.top + r.height / 2 - fr.top) };
          leftmost = Math.min(leftmost, x);
        } else {
          const edge = p.place === "over"
            ? Math.min(r.top, control.top)
            : Math.max(r.bottom, control.bottom);
          next[p.n] = { x: Math.round(r.left + r.width / 2 - fr.left), y: Math.round(edge - fr.top) };
        }
      }
      setPins(next);
      setGutter(Number.isFinite(leftmost) ? leftmost - LEADER - DOT : null);
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
      <Box ref={frame} style={{ position: "relative", width: "100%", minWidth: 340, maxWidth: 600, margin: "0 auto", height: 180, background: "var(--ds-bg-subtle)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
        <Flex align="center" justify="center" style={{ position: "absolute", inset: 0 }}>
          {/* the specimen ref shrink-wraps the control and its label, so the ResizeObserver sees them grow */}
          <Flex ref={specimen} align="center" gap="3">
            <Box style={{ position: "relative", display: "flex" }}>
              {/* focus-ring overlay — the two layers the control paints ([[focus-ring]]): the accent base, then the Radix alpha stacked on it */}
              <Box aria-hidden data-part="focus-ring" style={{ position: "absolute", inset: -2, borderRadius: "var(--ds-radius-2)", outline: "2px solid var(--ds-stroke-focus)", outlineOffset: 0, pointerEvents: "none" }} />
              <Box aria-hidden style={{ position: "absolute", inset: -2, borderRadius: "var(--ds-radius-2)", outline: "2px solid var(--ds-stroke-focus-stack)", outlineOffset: 0, pointerEvents: "none" }} />
              <Checkbox checked size="3" onCheckedChange={() => {}} aria-label="anatomy specimen" />
            </Box>
            <Text data-part="label" size="3" style={{ color: "var(--ds-text-strong)" }}>Accept terms</Text>
          </Flex>
        </Flex>
        {PINS.map((p) => {
          const a = pins[p.n];
          if (!a) return null;
          if (p.place === "gutter") {
            if (gutter == null) return null;
            return (
              <Box key={p.n}>
                <Box style={{ ...dotStyle, left: gutter, top: a.y - DOT / 2 }}>{p.n}</Box>
                <Box style={hLine({ left: gutter + DOT, top: a.y, width: a.x - gutter - DOT })} />
              </Box>
            );
          }
          const over = p.place === "over";
          return (
            <Box key={p.n}>
              <Box style={{ ...dotStyle, left: a.x - DOT / 2, top: over ? a.y - p.lane - DOT : a.y + p.lane }}>{p.n}</Box>
              <Box style={tick({ left: a.x, top: over ? a.y - p.lane : a.y, height: p.lane })} />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Control", "the box itself — fill, border, size, radius"],
  [2, "Indicator", "the check / dash glyph (checked or indeterminate)"],
  [3, "Label", "required — the accessible name; click target extends to it"],
  [4, "Focus ring", "keyboard-focus indicator around the control"],
];

/* ========================================================================== */

const meta: Meta<typeof Checkbox> = {
  title: "Components/Choice/Checkbox",
  component: Checkbox,
  parameters: {
    // The docs stories use custom render() and don't read args, so Controls is dead there.
    // The Props re-enables it. (Accessibility + Interactions stay on.)
    controls: { disable: true },
    docs: {
      description: {
        component:
          "A single checkbox, locked to the **surface** variant (`soft`/`classic` aren’t exposed) so it " +
          "reads as an input — a box with a border that separates from the page. It always needs a " +
          "**label** (the accessible name), and supports an **indeterminate** state for a parent whose " +
          "children are only partly selected. For a set of related options, use `CheckboxGroup`.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Checkbox>;

/** The parts of a checkbox — a labeled diagram — and the states it can be in. The token spec that
 *  used to close this page now closes Usage. */
export const Anatomy: Story = {
  render: () => (
    <Page>
      <PageHeader title="Checkbox · Anatomy" standfirst={DEFINITION} />
      <Section title="Anatomy" lead="The checked checkbox is shown — it surfaces the most: control, indicator, and label.">
        <AnatomyDiagram />
        <AnatomyLegend parts={ANATOMY_PARTS} />
        <Caption>
          The indicator only appears when <strong>checked</strong> or <strong>indeterminate</strong>; the
          label is required and clickable. The focus ring sits just outside the control.
        </Caption>
      </Section>

      <Rule />

      <Section title="States" lead="The states a checkbox can be in.">
        <Flex direction="column" gap="3">
          <Checkbox label="Unchecked" />
          <Checkbox label="Checked" defaultChecked />
          <Checkbox label="Indeterminate" checked="indeterminate" onCheckedChange={() => {}} />
          <Checkbox label="Disabled" disabled />
          <Checkbox label="Disabled + checked" defaultChecked disabled />
        </Flex>
        <Caption>
          <strong>Disabled</strong> is intentionally low-contrast (WCAG-exempt — GUIDELINES §9). Prefer
          guiding the user over silently disabling.
        </Caption>
        <Caption>
          <strong>Focus:</strong> on keyboard focus (<Code>:focus-visible</Code>) the box takes the system
          focus ring ([[focus-ring]]). The ring is the accent (<Code>--ds-stroke-focus</Code>) with a Radix alpha
          (<Code>--ds-stroke-focus-stack</Code>) stacked on it. It is 2px wide. It clears 3:1 and APCA Lc
          30 on every surface, for every accent, in both modes. It is the same ring on every control.
        </Caption>
        <Caption>
          <strong>Interaction &amp; motion:</strong> hover tints the box and the check toggles over{" "}
          <Code>--ds-duration-micro</Code>; colour + focus over <Code>--ds-duration-fast</Code> —
          honouring reduced-motion (GUIDELINES §6/§7). <strong>Colour-not-alone:</strong> the checked
          state is carried by the checkmark glyph, not colour (WCAG 1.4.1).
        </Caption>
      </Section>
    </Page>
  ),
};

/** Usage: the component in real situations, the guidance that keeps it accessible, and — closing the
 *  page — the live token spec measured off a rendered checkbox. */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Checkbox · Usage" standfirst={DEFINITION} />
        <ComparisonSection comparison={BOOLEAN_CHOICE_COMPARISON} highlight="Checkbox" />

        <Rule />

        <Section
          title="In context"
          lead={<>Real situations, driven by the toolbar above — <strong>Accent</strong> tints the checked fill, <strong>Size</strong> scales the set, <strong>Appearance</strong> flips light and dark.</>}
        >
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
            <Scenario label="SINGLE FIELD" caption="A standalone choice — always paired with its label.">
              <Checkbox label="I accept the terms and conditions" />
            </Scenario>

            <Scenario label="WITH DESCRIPTION" caption="The label prop makes a single field; description adds a calm helper line beneath, aligned to the box.">
              <Checkbox label="Product emails" description="Occasional updates about new features. You can unsubscribe anytime." defaultChecked />
            </Scenario>

            <Scenario label="REQUIRED — CONSENT" caption="A consent checkbox can be required and can error; the message glyph aligns to the box, not the label.">
              <Checkbox label="I agree to the terms" validation={{ tone: "error", message: "Please accept the terms to continue." }} />
            </Scenario>

            <Scenario label="GROUP (MULTI-SELECT)" caption="Related options as a CheckboxGroup — one name, many values.">
              <CheckboxGroup defaultValue={["email"]} name="notify">
                <CheckboxGroup.Item value="email">Email</CheckboxGroup.Item>
                <CheckboxGroup.Item value="sms">SMS</CheckboxGroup.Item>
                <CheckboxGroup.Item value="push">Push</CheckboxGroup.Item>
              </CheckboxGroup>
            </Scenario>

            <Scenario label="SELECT-ALL (INDETERMINATE)" caption="The parent is indeterminate when only some children are checked — the one correct use of indeterminate.">
              <Flex direction="column" gap="2">
                <Checkbox label="Select all" checked="indeterminate" onCheckedChange={() => {}} />
                <Box style={{ paddingLeft: 24 }}>
                  <Flex direction="column" gap="2">
                    <Checkbox label="Reading" defaultChecked />
                    <Checkbox label="Writing" />
                  </Flex>
                </Box>
              </Flex>
            </Scenario>
          </Grid>
        </Section>

        <Rule />

        <Section title="Always label it" lead="A bare checkbox has no accessible name and a tiny target — pair it with a label, every time.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" accent={globals.accent as AccentColor} note="The label is the accessible name and extends the click target.">
              <Checkbox label="Remember me" />
            </DoDont>
            <DoDont kind="dont" accent={globals.accent as AccentColor} note="A bare box: no visible name, a ~20px target, and easy to miss.">
              <Checkbox aria-label="remember me" />
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Put the clarification in the label, not a tooltip" lead="If a checkbox needs explanation, put it in a persistent helper line under the label — not a tooltip the user must hover to find. A tooltip hides the consequence; a helper line is always visible.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" accent={globals.accent as AccentColor} note="A persistent helper line: always visible, no interaction required, reads well in screen readers.">
              <Flex gap="2" align="start">
                <Checkbox id="do-helper" defaultChecked />
                <Flex direction="column" gap="1">
                  <Text as="label" htmlFor="do-helper" size="2" style={{ color: "var(--ds-text-strong)" }}>Marketing emails</Text>
                  <Text size="1" style={{ color: "var(--ds-text-weak)", lineHeight: 1.5 }}>Occasional updates about new features. Unsubscribe anytime.</Text>
                </Flex>
              </Flex>
            </DoDont>
            <DoDont kind="dont" accent={globals.accent as AccentColor} note="A tooltip hides the consequence — the user must hover to learn what they're agreeing to. Blind submission is likely.">
              <Flex gap="2" align="center">
                <Checkbox id="dont-tooltip" defaultChecked />
                <Flex align="center" gap="1">
                  <Text as="label" htmlFor="dont-tooltip" size="2" style={{ color: "var(--ds-text-strong)" }}>Marketing emails</Text>
                  <Box
                    style={{
                      width: 14, height: 14, borderRadius: "50%",
                      background: "var(--ds-fill-accent)", color: "var(--on-accent)",
                      fontFamily: "var(--code-font-family)", fontSize: 9, fontWeight: 700,
                      display: "block", alignContent: "center", textAlign: "center", textBox: "trim-both cap alphabetic",
                      cursor: "default",
                    }}
                    aria-hidden
                  >?</Box>
                </Flex>
              </Flex>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Let the label wrap — don't truncate it" lead="When a label is long, let it wrap onto multiple lines. The checkbox should be top-aligned to the first line of text. Truncating a label hides information; vertically centering the box against a wrapped label misaligns reading.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" accent={globals.accent as AccentColor} note="Long label wraps freely; the checkbox sits at the top of the first line, so the control and the start of the text align.">
              <Flex gap="2" align="start" style={{ maxWidth: 200 }}>
                <Checkbox id="do-wrap" defaultChecked style={{ flexShrink: 0, marginTop: 2 }} />
                <Text as="label" htmlFor="do-wrap" size="2" style={{ color: "var(--ds-text-strong)", lineHeight: 1.5 }}>
                  I agree to receive transactional and marketing emails from this service
                </Text>
              </Flex>
            </DoDont>
            <DoDont kind="dont" accent={globals.accent as AccentColor} note="Truncated label: the user can't read the full text without extra interaction, and consent to an incomplete label is not informed consent.">
              <Flex gap="2" align="center" style={{ maxWidth: 200 }}>
                <Checkbox id="dont-truncate" defaultChecked style={{ flexShrink: 0 }} />
                <Text as="label" htmlFor="dont-truncate" size="2" style={{ color: "var(--ds-text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  I agree to receive transactional and marketing emails from this service
                </Text>
              </Flex>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Read-only is not the same as disabled">
          <Caption>
            <strong>Disabled</strong> means the option is not applicable right now — it's locked, not
            available to this user or in this context. <strong>Read-only</strong> means the value exists
            and matters, but can't be edited here (e.g. a setting the user's admin has locked, shown for
            transparency). Disabled communicates "unavailable"; read-only communicates "this is set, you
            can see it, but not change it here." The distinction matters: a disabled checkbox implies the
            user could act under different conditions, a read-only one implies they shouldn't.
          </Caption>
        </Section>

        <Rule />

        <Section title="Write labels that name the on-state positively">
          <Caption>
            Phrase labels as the thing the user is agreeing to, not a thing they're switching off.
            "Email me about new features" is clearer than "Don't suppress feature emails." For consent
            checkboxes, first-person framing ("I agree to…", "I want to receive…") signals that the
            user is actively opting in — the Usage scenarios model this throughout.
          </Caption>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Every colour row below is MEASURED off a real checkbox rendered for the purpose — the property is read from the element that paints it and checked against the token the row names, so a row can disagree with the component. The box is drawn on the control’s ::before, so that is where the fill, the resting surface and the focus outline are read.">
          <Flex direction="column" gap="4">
            <TokenGroup label="CHECKED" blurb="The accent fill carries a contrast-coloured check." specimen={<Checkbox label="Checked" defaultChecked />}>
              <MeasuredSpec render={() => <Checkbox checked onCheckedChange={() => {}} aria-label="checked measurement" />}>
                <MeasuredRow
                  part="Control fill" note="The box itself, drawn on the control’s ::before."
                  token="--accent-indicator" select=".rt-CheckboxRoot" pseudo="::before" prop="background-color"
                />
                <MeasuredRow
                  part="Indicator" note="The check glyph, which has to clear the fill it sits on."
                  token="--accent-contrast" select=".rt-CheckboxIndicator" prop="color"
                />
              </MeasuredSpec>
            </TokenGroup>
            <TokenGroup label="RESTING & FOCUS" blurb="An unchecked box on Radix’s surface, with the focus ring on top." specimen={<Checkbox label="Unchecked" />}>
              <MeasuredSpec render={() => <Checkbox aria-label="resting measurement" />}>
                <MeasuredRow
                  part="Control surface" note="The unchecked box — Radix’s surface variant, translucent over the page."
                  token="--color-surface" select=".rt-CheckboxRoot" pseudo="::before" prop="background-color"
                />
                <MeasuredRow
                  part="Focus ring" note="The accent base layer, read from the rule the control’s own stylesheet paints on keyboard focus. A Radix alpha, --ds-stroke-focus-stack, sits on top of it ([[focus-ring]])."
                  token="--ds-stroke-focus" select=".rt-CheckboxRoot" prop="outline-color" state="focus-visible"
                />
              </MeasuredSpec>
              <NoteRow part="Control border" value="a 1px inset ring carried inside box-shadow — a neutral hairline, not an accent stroke" radix="--gray-a7" />
            </TokenGroup>
            <TokenGroup label="DISABLED">
              <MeasuredSpec render={() => <Checkbox checked disabled onCheckedChange={() => {}} aria-label="disabled measurement" />}>
                <MeasuredRow
                  part="Control fill" note="Read off a rendered disabled control, so this is the paint as it lands."
                  token="--ds-fill-disabled" select=".rt-CheckboxRoot:disabled" pseudo="::before" prop="background-color"
                />
                <MeasuredRow
                  part="Indicator" note="The check dims with the box rather than disappearing."
                  token="--ds-text-disabled" select=".rt-CheckboxRoot:disabled .rt-CheckboxIndicator" prop="color"
                />
              </MeasuredSpec>
            </TokenGroup>
            <TokenGroup label="GEOMETRY">
              <NoteRow part="Shape (radius)" value="inherits <Theme radius>" radix="--radius-*" />
              <NoteRow part="Size" value="control size lane" radix="--checkbox-size-*" />
            </TokenGroup>
          </Flex>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector("button.rt-CheckboxRoot, button[role='checkbox']");
    if (!box) throw new Error("checkbox not rendered");
    if (!box.classList.contains("rt-variant-surface")) {
      throw new Error(`checkbox must be surface, got "${box.className}"`);
    }

    // The token table's EVIDENCE, asserted at runtime: every measured row read a real checkbox node,
    // resolved its claim somewhere else, and the two agree. Six rows, none unproven.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 6 || rows.unproven !== 0) {
      throw new Error(`expected 6 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Properties (Checkbox-specific) --------------------------------------- */

const CHECKBOX_PROPS: PropDef[] = [
  { name: "label", type: "ReactNode", desc: <>Promotes the bare box into a single <Code>Field</Code> — label beside the control, the accessible name. Omit it to keep the checkbox <strong>bare</strong> (its default) for a <Code>CheckboxGroup.Item</Code>, a table cell, or anywhere a label already exists nearby.</>, source: "Checkbox.tsx:18" },
  { name: "description", type: "ReactNode", desc: <>Persistent helper line under the label — calm guidance that holds in any validation state. Only renders when <Code>label</Code> is set.</>, source: "Checkbox.tsx:20" },
  { name: "validation", type: `{ tone; message }`, desc: <>Accent-aware validation — border tint + status glyph + message, aligned to the control's left edge, not the label. <Code>tone</Code> is <Code>"error" | "warning" | "success" | "info"</Code>. Only renders when <Code>label</Code> is set.</>, source: "Checkbox.tsx:7,21" },
  { name: "variant", type: `"classic" | "surface" | "soft"`, locked: true, desc: <>Radix's raw variant is <strong>not exposed</strong> — the wrapper hard-sets <Code>surface</Code> so an input always separates from the page. <Code>soft</Code> and <Code>classic</Code> are intentionally unavailable.</>, source: "Checkbox.tsx:17" },
  { name: "size", type: `"1" | "2" | "3"`, desc: <>Control size. Unset, it resolves from the global <Code>uiSize</Code> (default <Code>small</Code> → <Code>1</Code>); Radix's own default is <Code>2</Code>.</>, source: "Checkbox.tsx:32 · Radix" },
  { name: "color", type: `<Radix accent>`, desc: <>Accent override for the checked fill; otherwise inherits the theme accent.</>, source: "Radix" },
  { name: "checked", type: `boolean | "indeterminate"`, desc: <>Controlled checked state. <Code>"indeterminate"</Code> is for a <em>parent</em> whose children are partly selected — not a third state a user toggles to directly.</>, source: "Radix" },
  { name: "defaultChecked", type: `boolean | "indeterminate"`, def: "false", desc: <>Uncontrolled initial checked state.</>, source: "Radix" },
  { name: "onCheckedChange", type: `(checked: boolean | "indeterminate") => void`, desc: <>Fires when the checked state changes, on pointer and keyboard activation.</>, source: "Radix" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Disables the control. Intentionally low-contrast (WCAG-exempt) — prefer guiding toward a valid action over silently disabling one.</>, source: "Radix" },
  { name: "required", type: "boolean", def: "false", desc: <>Marks the field required for native form submission.</>, source: "Radix" },
  { name: "name", type: "string", desc: <>Form field name, for a standalone checkbox submitted outside a <Code>CheckboxGroup</Code>.</>, source: "Radix" },
  { name: "value", type: "string | number | readonly string[]", desc: <>The value reported on submission when checked.</>, source: "Radix" },
];

/** Props — the live, args-driven checkbox. Drive it from Controls; changes log in Actions.
 *  Set `label` to switch from a bare box to a single Field (label beside the box); `description`
 *  and `validation` only render once a label is present. */
type PropsArgs = Omit<ComponentProps<typeof Checkbox>, "checked" | "validation" | "size"> & {
  checked?: "unchecked" | "checked" | "indeterminate";
  validation?: "none" | "error" | "warning" | "success" | "info";
  size?: "auto" | "1" | "2" | "3";
};

export const Props: StoryObj<PropsArgs> = {
  args: {
    label: "Props checkbox",
    description: "",
    checked: "unchecked",
    validation: "none",
    disabled: false,
    // "auto" (size unset) is the default so the box tracks the global uiSize toolbar out of the box.
    size: "auto",
  },
  argTypes: {
    label: { control: "text" },
    description: { control: "text" },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset); a step pins it.' },
    // string option keys serialize cleanly; `mapping` passes the real checked value (incl. "indeterminate")
    checked: {
      control: "inline-radio",
      options: ["unchecked", "checked", "indeterminate"],
      mapping: { unchecked: false, checked: true, indeterminate: "indeterminate" },
    },
    // inline-radio over a `mapping` to the real { tone, message } object — `none` → undefined.
    // Validation (like description) only shows when a label is set.
    validation: {
      control: "inline-radio",
      options: ["none", "error", "warning", "success", "info"],
      mapping: {
        none: undefined,
        error: { tone: "error", message: "Please accept the terms to continue." },
        warning: { tone: "warning", message: "Double-check this before you submit." },
        success: { tone: "success", message: "Looks good — you're all set." },
        info: { tone: "info", message: "You can change this later in settings." },
      },
    },
    disabled: { control: "boolean" },
    onCheckedChange: { action: "checkedChange" },
  },
  parameters: { controls: { disable: false } },
  // `checked` and `validation` arrive as string keys that Storybook resolves to the real values via
  // `mapping` before render — cast to satisfy the component's prop types.
  render: ({ label, checked, validation, size, ...args }: PropsArgs) => {
    type CBProps = ComponentProps<typeof Checkbox>;
    return (
      <Page maxWidth="none">
        <PageHeader title="Checkbox · Props" standfirst={DEFINITION} />
        <Box style={{ padding: "8px 0 2px" }}>
          <Checkbox
            label={label || undefined}
            checked={checked as unknown as CBProps["checked"]}
            validation={validation as unknown as CBProps["validation"]}
            size={size === "auto" ? undefined : size}
            {...args}
          />
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>Checkbox</Code> accepts — <Code>label</Code>/<Code>description</Code>/<Code>validation</Code> promote it into a <Code>Field</Code>, the rest pass through to Radix's <Code>Checkbox</Code>. <Code>variant</Code> is locked so a checkbox can't drift off-system; it's bare (no label) by default.</>}>
          <PropTable rows={CHECKBOX_PROPS} />
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Checkbox · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[soft-variant-scope]] · surface-locked">
            Locked to <Code>variant="surface"</Code> — an input must separate from the page (border + fill +
            hover). <Code>soft</Code> and <Code>classic</Code> aren’t exposed.
          </Decision>
          <Decision id="Label">
            A checkbox is never shipped bare — it’s always paired with a <Code>&lt;label&gt;</Code> (the
            accessible name) and the label is part of the click target.
          </Decision>
          <Decision id="Indeterminate">
            <Code>checked="indeterminate"</Code> is for a <em>parent</em> whose children are partly selected
            (a select-all), not a third state a user toggles to directly.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0 · field chrome">
            The single-checkbox <Code>description</Code> slot and accent-aware <Code>validation</Code> state,
            mirroring <Code>TextField</Code>.
          </Decision>
          <Decision id="0.9.0">
            Initial component — surface-locked wrapper over Radix Checkbox, size driven by the global
            <Code>uiSize</Code> control lane, with <Code>CheckboxGroup</Code> for multi-select. Stories on
            the standard template: History · Anatomy · Usage · Props.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
