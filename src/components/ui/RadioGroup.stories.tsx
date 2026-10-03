import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { RadioGroup } from "./RadioGroup";
import { FieldGroup } from "./Field";
import {
  AccentColor, AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine,
  MeasuredRow, MeasuredSpec, NoteRow, Page, PageHeader, PropsLead, PropDef, PropTable, Rule, Scenario, Section, tick, TokenGroup,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, BOOLEAN_CHOICE_COMPARISON, PICK_FROM_SET_COMPARISON } from "./_comparisons";

/** The text of an item whose OWN control is switched off — Radix puts `data-disabled` on that control and
 *  the label text is its next sibling, so this matches the one item and never a live one beside it. The
 *  a11y-exclusion target for the deliberately-exempt disabled ink; see the note on `Anatomy`. */
const DISABLED_ITEM_LABEL = "[data-disabled] + .rt-RadioGroupItemInner";

/* ---- anatomy diagram (RadioGroup-specific) ------------------------------ */

/** A small RadioGroup specimen (2 items, one selected) with callouts to the group-level parts. */
function AnatomyDiagram() {
  return (
    <Box style={{ overflowX: "auto" }}>
      <Box style={{ position: "relative", width: "100%", minWidth: 340, maxWidth: 600, margin: "0 auto", height: 210, background: "var(--ds-bg-subtle)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
        <Flex align="center" justify="center" style={{ position: "absolute", inset: 0 }}>
          {/* group-container outline — traces the role=radiogroup boundary the callout points at */}
          <Box style={{ position: "relative", padding: 12, borderRadius: "var(--ds-radius-3)", outline: "1px dashed var(--ds-stroke-weak)", outlineOffset: 0 }}>
            <RadioGroup size="3" defaultValue="email" aria-label="anatomy specimen — primary contact method">
              <RadioGroup.Item value="email">Email</RadioGroup.Item>
              <RadioGroup.Item value="phone">Phone</RadioGroup.Item>
            </RadioGroup>
          </Box>
        </Flex>
        {/* 1 — Group container: from the left, to the dashed boundary's upper-left edge */}
        <Box style={{ ...dotStyle, left: "calc(50% - 160px)", top: 64 }}>1</Box>
        <Box style={hLine({ left: "calc(50% - 140px)", top: 74, width: 96 })} />
        {/* 2 — Item: from the left, into the second row (a control + its label, as a unit) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 160px)", top: 110 }}>2</Box>
        <Box style={hLine({ left: "calc(50% - 140px)", top: 119, width: 110 })} />
        {/* 3 — Control: from above, down into the first item's round radio (with its selected dot) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 34px)", top: 30 }}>3</Box>
        <Box style={tick({ left: "calc(50% - 24px)", top: 50, height: 29 })} />
        {/* 4 — Label: from above, down to the first item's text */}
        <Box style={{ ...dotStyle, left: "calc(50% + 16px)", top: 30 }}>4</Box>
        <Box style={tick({ left: "calc(50% + 12px)", top: 50, height: 29 })} />
        {/* 5 — Item gap: from the right, to the space between the two rows */}
        <Box style={{ ...dotStyle, left: "calc(50% + 130px)", top: 96 }}>5</Box>
        <Box style={hLine({ left: "calc(50% + 40px)", top: 105, width: 90 })} />
      </Box>
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Group container", "role=radiogroup — a named set; needs an aria-label or an aria-labelledby pointing at a visible heading"],
  [2, "Item", "one option: a round control plus its own label, as a unit"],
  [3, "Control", "the round radio — fill, border, and a filled dot when selected"],
  [4, "Label", "the item carries its label via children — no separate field"],
  [5, "Item gap", "the vertical rhythm between stacked items"],
];

/* ========================================================================== */

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>A set of mutually-exclusive options under one name — a one-of-many choice where exactly one wins. Each <Code>RadioGroup.Item</Code> carries its own label; the group is <Code>role="radiogroup"</Code>, so it needs an accessible name of its own. For an independent, zero-to-many choice use <Code>CheckboxGroup</Code>; for a single yes/no use <Code>Checkbox</Code>.</>;

const meta: Meta<typeof RadioGroup> = {
  title: "Components/Choice/RadioGroup",
  component: RadioGroup,
  parameters: {
    // The docs stories use custom render() and don't read args, so Controls is dead there.
    // The Props re-enables it. (Accessibility + Interactions stay on.)
    controls: { disable: true },
    docs: {
      description: {
        component:
          "A set of mutually-exclusive options under one `name` — a **one-of-many** choice where exactly " +
          "one wins. Locked to the **surface** variant; each `RadioGroup.Item` carries its own label via " +
          "children. The group is `role=\"radiogroup\"`, so it needs an accessible name (`aria-label`). For " +
          "an independent, zero-to-many choice use `CheckboxGroup`; for a single yes/no use `Checkbox`.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof RadioGroup>;

/** The parts of a radio group and the states an item can take. The token spec lives on Usage. */
export const Anatomy: Story = {
  // A switched-off item's label is painted --ds-text-disabled, the role that means "inactive control".
  // It is deliberately below the contrast floor — 1.90 light, 3.01 dark — and is one of only two roles
  // the system exempts, because an unavailable option should read as unavailable rather than as text you
  // can act on. Scoped to the text of an item whose own control is disabled; every other label on the
  // page stays contrast-checked.
  parameters: { a11y: { context: { exclude: [DISABLED_ITEM_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="RadioGroup · Anatomy" standfirst={DEFINITION} />
        <Section title="Anatomy" lead="A group is a named set of radio items, stacked vertically. Each item carries its own label, so the round control and its text travel together as one option — and only one option can win at a time.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>
            The group itself has <strong>role=radiogroup</strong>, so it needs an accessible name — either
            an <strong>aria-label</strong> on the group, or a visible heading wired via{" "}
            <strong>aria-labelledby</strong>. Prefer a visible heading whenever screen real estate allows;
            it benefits all users, not just assistive-technology users. An item is a radio <em>and</em> its
            label as a single unit — there’s no separate field wrapper. The control is <strong>round</strong>{" "}
            (radius-full) and shows a filled <strong>dot</strong> when selected; picking one option clears the rest.
          </Caption>
        </Section>

        <Rule />

        <Section title="States" lead="The states a single item takes inside the group. A radio can’t be indeterminate — that’s a checkbox concept; here exactly one item is selected at a time.">
          <Flex direction="column" gap="4">
            <RadioGroup defaultValue="selected" aria-label="item states — resting and selected">
              <RadioGroup.Item value="resting">Resting</RadioGroup.Item>
              <RadioGroup.Item value="selected">Selected</RadioGroup.Item>
            </RadioGroup>
            <RadioGroup defaultValue="disabled-selected" aria-label="item states — disabled" disabled>
              <RadioGroup.Item value="disabled">Disabled</RadioGroup.Item>
              <RadioGroup.Item value="disabled-selected">Disabled + selected</RadioGroup.Item>
            </RadioGroup>
          </Flex>
          <Caption>
            <strong>Disabled</strong> is intentionally low-contrast (WCAG-exempt — GUIDELINES §9). Prefer
            guiding the user over silently disabling a whole group.
          </Caption>
          <Caption>
            <strong>Keyboard:</strong> a radio group is one tab stop — only the selected radio (or the
            first, if none is selected) is in the tab sequence. Arrow keys move focus <em>and</em> change
            selection within the group; focus wraps at the ends. This is the defining keyboard difference
            from a <Code>CheckboxGroup</Code>, where every item is independently tabbable.
          </Caption>
          <Caption>
            <strong>Focus:</strong> the focused radio takes the system ring. It is the accent fill,{" "}
            <Code>--ds-stroke-focus</Code>, with a Radix alpha stacked on top, 2px wide. It holds 3:1 and
            APCA Lc 30 for every accent, in both modes, the same as every control ([[focus-ring]]).
          </Caption>
          <Caption>
            <strong>Interaction &amp; motion:</strong> hover tints the control and the selection dot
            animates over <Code>--ds-duration-micro</Code>; colour + focus over{" "}
            <Code>--ds-duration-fast</Code> — honouring reduced-motion (GUIDELINES §6/§7).{" "}
            <strong>Colour-not-alone:</strong> the selected state is carried by the filled dot, not colour
            (WCAG 1.4.1).
          </Caption>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
};

/** Usage: the group in real one-of-many situations, the guidance that keeps each one accessible, and
 *  the live token spec that closes the page. */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  // The second entry is the label of a switched-off item (--ds-text-disabled, 1.90 light / 3.01 dark) —
  // see the note on Anatomy above.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL, DISABLED_ITEM_LABEL] } } },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="RadioGroup · Usage" standfirst={DEFINITION} />
      <ComparisonSection comparison={BOOLEAN_CHOICE_COMPARISON} highlight="RadioGroup" />

      <Rule />

      <ComparisonSection comparison={PICK_FROM_SET_COMPARISON} highlight="Radio / Checkbox group" />

      <Rule />

      <Section
        title="In context"
        lead={<>Real situations, driven by the toolbar above — <strong>Accent</strong> tints the selected item, <strong>Size</strong> scales the group, <strong>Appearance</strong> flips light and dark.</>}
      >
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
          <Scenario label="SETTINGS CHOICE" caption={<>A settings choice with a visible heading wired to the group via <code>aria-labelledby</code> — the heading <em>is</em> the accessible name. One option is selected by default, because a radio group should never rest empty.</>}>
            <Flex direction="column" gap="2">
              <Text id="u-theme-label" size="2" weight="medium" style={{ color: "var(--ds-text-strong)" }}>Theme</Text>
              <RadioGroup defaultValue="system" name="theme" aria-labelledby="u-theme-label">
                <RadioGroup.Item value="system">System</RadioGroup.Item>
                <RadioGroup.Item value="light">Light</RadioGroup.Item>
                <RadioGroup.Item value="dark">Dark</RadioGroup.Item>
              </RadioGroup>
            </Flex>
          </Scenario>

          <Scenario label="PLAN PICKER" caption={<>The canonical one-of-many — exactly one plan can win. With no visible heading, the group carries its name in <code>aria-label</code>.</>}>
            <RadioGroup defaultValue="pro" name="plan" aria-label="Choose a plan">
              <RadioGroup.Item value="free">Free</RadioGroup.Item>
              <RadioGroup.Item value="pro">Pro</RadioGroup.Item>
              <RadioGroup.Item value="enterprise">Enterprise</RadioGroup.Item>
            </RadioGroup>
          </Scenario>

          <Scenario label="FORM FIELD" caption={<>A shipping method on a checkout form — one rate applies. The <code>name</code> ties the radios together as one field and is what posts on submit.</>}>
            <RadioGroup defaultValue="standard" name="shipping" aria-label="Shipping method">
              <RadioGroup.Item value="standard">Standard</RadioGroup.Item>
              <RadioGroup.Item value="express">Express</RadioGroup.Item>
              <RadioGroup.Item value="overnight">Overnight</RadioGroup.Item>
            </RadioGroup>
          </Scenario>

          <Scenario label="WITH A LOCKED OPTION" caption={<>Still one-of-many — but an option that isn’t available reads as <code>disabled</code> (locked) rather than vanishing, so the full set of choices stays legible.</>}>
            <RadioGroup defaultValue="card" name="payment" aria-label="Payment method">
              <RadioGroup.Item value="card">Credit card</RadioGroup.Item>
              <RadioGroup.Item value="paypal">PayPal</RadioGroup.Item>
              <RadioGroup.Item value="invoice" disabled>Invoice (Enterprise only)</RadioGroup.Item>
            </RadioGroup>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section
        title="Descriptions and a required choice"
        lead={<>An item can carry a secondary <strong>description</strong> line — a price, a scope — and the whole group can be validated through a <Code>FieldGroup</Code>. On error the group <strong>name turns the family colour</strong> and the message sits below the set; the radios themselves stay neutral.</>}
      >
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
          <Scenario label="PER-ITEM DESCRIPTION" caption="Each option pairs a title with a secondary line; the control top-aligns to the title.">
            <FieldGroup.Root>
              <FieldGroup.Label>Plan</FieldGroup.Label>
              <RadioGroup defaultValue="pro" name="u-plan-desc">
                <RadioGroup.Item value="free" description="$0 — for trying things out">Free</RadioGroup.Item>
                <RadioGroup.Item value="pro" description="$20/mo — for growing teams">Pro</RadioGroup.Item>
                <RadioGroup.Item value="enterprise" description="Custom — SSO, audit logs, priority support">Enterprise</RadioGroup.Item>
              </RadioGroup>
            </FieldGroup.Root>
          </Scenario>
          <Scenario label="REQUIRED — UNSELECTED" caption="No default selection; the group reports an error until one is chosen — name in red, message below.">
            <FieldGroup.Root validation={{ tone: "error", message: "Choose a plan to continue." }}>
              <FieldGroup.Label>Plan</FieldGroup.Label>
              <RadioGroup name="u-plan-req">
                <RadioGroup.Item value="free">Free</RadioGroup.Item>
                <RadioGroup.Item value="pro">Pro</RadioGroup.Item>
              </RadioGroup>
              <FieldGroup.Message />
            </FieldGroup.Root>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section title="One-of-many, not multi-select" lead="Reach for a RadioGroup when options are mutually exclusive and exactly one must win. If any number can be on at once, that’s a CheckboxGroup — radios there block valid combinations.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" accent={globals.accent as AccentColor} note="Mutually-exclusive options, exactly one selected — a billing cycle is either monthly or annual, never both. The shape matches the choice.">
            <RadioGroup defaultValue="annual" name="billing" aria-label="Billing cycle">
              <RadioGroup.Item value="monthly">Monthly</RadioGroup.Item>
              <RadioGroup.Item value="annual">Annual</RadioGroup.Item>
            </RadioGroup>
          </DoDont>
          <DoDont kind="dont" accent={globals.accent as AccentColor} note="Independent options forced into a radio group — you can only ever keep one channel on, so email and SMS can’t both be enabled. Use a CheckboxGroup for zero-to-many.">
            <RadioGroup defaultValue="email" name="notify" aria-label="Notification channels">
              <RadioGroup.Item value="email">Email</RadioGroup.Item>
              <RadioGroup.Item value="sms">SMS</RadioGroup.Item>
              <RadioGroup.Item value="push">Push</RadioGroup.Item>
            </RadioGroup>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <Section title="Keep option counts scannable" lead="Radios show all options at once, which is their strength — but that advantage flips when the list is long enough to require scrolling. Reach for a Select once the list runs past roughly 5–7 options — a country or timezone picker with 200 radios is the canonical antipattern.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" accent={globals.accent as AccentColor} bare note="A handful of mutually-exclusive tiers — all visible, easy to compare. 3–5 options is the sweet spot for radios.">
            <RadioGroup defaultValue="pro" aria-label="Plan">
              <RadioGroup.Item value="free">Free</RadioGroup.Item>
              <RadioGroup.Item value="starter">Starter</RadioGroup.Item>
              <RadioGroup.Item value="pro">Pro</RadioGroup.Item>
              <RadioGroup.Item value="enterprise">Enterprise</RadioGroup.Item>
            </RadioGroup>
          </DoDont>
          <DoDont kind="dont" accent={globals.accent as AccentColor} bare note="8+ options as radios — the user must scroll to compare and the form grows unmanageable. Use a Select when the list length exceeds roughly 5–7 items (a country or timezone picker with 200 radios is the canonical antipattern).">
            {/* Real items, not painted discs: the mistake being shown is the LENGTH of the list, so the
                list has to be the real control at the real size — a 14px hand-drawn circle held one
                size while the DO beside it stepped with the uiSize lane. The mask is the story's own
                framing (the list runs past the card), not part of the control. */}
            <Box style={{ maxHeight: 120, overflowY: "hidden", maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)" }}>
              <RadioGroup aria-label="Time zone (don't)">
                {["UTC−12", "UTC−11", "UTC−10", "UTC−9", "UTC−8", "UTC−7", "UTC−6", "UTC−5"].map((tz) => (
                  <RadioGroup.Item key={tz} value={tz}>{tz}</RadioGroup.Item>
                ))}
              </RadioGroup>
            </Box>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <Section title="Label wrapping, not truncation" lead="A radio item’s label must never be clipped. When text is long, wrap it beneath the control and keep the control top-aligned — the readable label is more important than a tidy column edge.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" accent={globals.accent as AccentColor} bare note="Long label wraps naturally below the control, which stays top-aligned. The full option is readable and the user can make an informed choice.">
            <Flex direction="column" gap="2" style={{ maxWidth: 220 }}>
              <RadioGroup defaultValue="email" aria-label="Notification preference">
                <RadioGroup.Item value="email">
                  Send me a daily digest email with all unread activity from my watched items
                </RadioGroup.Item>
                <RadioGroup.Item value="none">No notifications</RadioGroup.Item>
              </RadioGroup>
            </Flex>
          </DoDont>
          <DoDont kind="dont" accent={globals.accent as AccentColor} bare note="Truncating the label with an ellipsis hides the option’s meaning. The user cannot evaluate a choice they can’t read — never clip radio labels.">
            {/* The CLIP is the lesson, so it stays pinned — but it is now applied to a REAL item's label
                rather than to a hand-drawn disc + loose Text. Only the label is styled; the control,
                its spacing and its size lane are the component's. */}
            <Flex direction="column" gap="2" style={{ maxWidth: 220 }}>
              <RadioGroup defaultValue="email" aria-label="Notification preference (don't)">
                <RadioGroup.Item value="email" style={{ minWidth: 0 }}>
                  {/* line-clamp, not nowrap + text-overflow: the label sits inside Radix's own
                      .rt-RadioGroupItemInner, and a nowrap child makes that wrapper's min-content the
                      whole sentence — the item then blows past the 220px column instead of clipping.
                      Clamping keeps white-space normal, so the wrapper shrinks and the ellipsis lands. */}
                  <Box style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    Send me a daily digest email with all unread activity from my watched items
                  </Box>
                </RadioGroup.Item>
                <RadioGroup.Item value="none">No notifications</RadioGroup.Item>
              </RadioGroup>
            </Flex>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="An item draws from Radix’s surface-variant skin — the same set as a single Checkbox. The shape is the difference: the control is round, and the indicator is a dot rather than a check. Every colour row below is MEASURED off a real item rendered for the purpose — the disc is drawn on the control’s ::before and the dot on its ::after — and checked against the token the row names, so a row can disagree with the component.">
          <Flex direction="column" gap="4">
            <TokenGroup
              label="SELECTED"
              blurb="A selected item: the accent disc carries a contrast-coloured dot."
              specimen={
                <RadioGroup defaultValue="s" aria-label="selected item token specimen">
                  <RadioGroup.Item value="s">Selected</RadioGroup.Item>
                </RadioGroup>
              }
            >
              <MeasuredSpec
                render={() => (
                  <RadioGroup defaultValue="s" aria-label="selected item measurement">
                    <RadioGroup.Item value="s">Selected</RadioGroup.Item>
                  </RadioGroup>
                )}
              >
                <MeasuredRow
                  part="Control disc" note="The filled circle behind the dot."
                  token="--accent-indicator" select=".rt-BaseRadioRoot" pseudo="::before" prop="background-color"
                />
                <MeasuredRow
                  part="Indicator dot" note="The dot, which has to clear the disc it sits on."
                  token="--accent-contrast" select=".rt-BaseRadioRoot" pseudo="::after" prop="background-color"
                />
              </MeasuredSpec>
            </TokenGroup>

            <TokenGroup
              label="RESTING & FOCUS"
              blurb="An unselected item on Radix’s surface, with the focus ring on top."
              specimen={
                <RadioGroup aria-label="resting item token specimen">
                  <RadioGroup.Item value="r">Resting</RadioGroup.Item>
                </RadioGroup>
              }
            >
              <MeasuredSpec
                render={() => (
                  <RadioGroup aria-label="resting item measurement">
                    <RadioGroup.Item value="r">Resting</RadioGroup.Item>
                  </RadioGroup>
                )}
              >
                <MeasuredRow
                  part="Control surface" note="The unselected circle — Radix’s surface variant, translucent over the page."
                  token="--color-surface" select=".rt-BaseRadioRoot" pseudo="::before" prop="background-color"
                />
                <MeasuredRow
                  part="Focus ring" note="Read from the rule the control’s own stylesheet paints on keyboard focus. The accent base, with the stack alpha on top, 2px ([[focus-ring]])."
                  token="--ds-stroke-focus" select=".rt-BaseRadioRoot" prop="outline-color" state="focus-visible"
                />
              </MeasuredSpec>
              <NoteRow part="Control border" value="a 1px inset ring carried inside box-shadow — a neutral hairline, not an accent stroke" radix="--gray-a7" />
            </TokenGroup>

            <TokenGroup label="GROUP LAYOUT" blurb="Vertical is the default and almost always correct. Use horizontal only for 2–3 very short labels (e.g. Yes / No) where wrapping would be awkward and the labels fit comfortably on one line.">
              <NoteRow part="Orientation" value="vertical stack (column) — default" />
              <NoteRow part="Item gap" value="Radix internal spacing scale" radix="--space-*" />
            </TokenGroup>

            <TokenGroup label="DISABLED">
              <MeasuredSpec
                render={() => (
                  <RadioGroup defaultValue="d" aria-label="disabled item measurement">
                    <RadioGroup.Item value="d" disabled>Disabled</RadioGroup.Item>
                  </RadioGroup>
                )}
              >
                <MeasuredRow
                  part="Control disc" note="Read off a rendered disabled item, so this is the paint as it lands."
                  token="--ds-fill-disabled" select=".rt-BaseRadioRoot[data-disabled]" pseudo="::before" prop="background-color"
                />
                <MeasuredRow
                  part="Indicator dot" note="The dot dims with the disc rather than disappearing."
                  token="--ds-text-disabled" select=".rt-BaseRadioRoot[data-disabled]" pseudo="::after" prop="background-color"
                />
              </MeasuredSpec>
            </TokenGroup>

            <TokenGroup label="GEOMETRY">
              <NoteRow part="Shape" value="round — radius-full (the control is always a circle)" radix="--radius-full" />
              <NoteRow part="Size" value="control size lane" radix="--radio-size-*" />
            </TokenGroup>
          </Flex>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector(".rt-RadioGroupRoot");
    if (!group) throw new Error("radio group not rendered");
    if (group.getAttribute("role") !== "radiogroup") {
      throw new Error(`expected role=radiogroup, got "${group.getAttribute("role")}"`);
    }
    // The surface lock lands on the item button[role='radio'] (the variant flows through context to
    // each radio), NOT on .rt-RadioGroupRoot — verified against the running component.
    const radio = group.querySelector("button[role='radio']");
    if (!radio) throw new Error("radio group has no items");
    if (!radio.classList.contains("rt-variant-surface")) {
      throw new Error(`radio items must be surface, got "${radio.className}"`);
    }

    // The token table's EVIDENCE, asserted at runtime: every measured row read a real radio node,
    // resolved its claim somewhere else, and the two agree. Six rows, none unproven.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 6 || rows.unproven !== 0) {
      throw new Error(`expected 6 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Properties (RadioGroup-specific) ------------------------------------ */
/* Multi-part, like Select: Root (the group) and Item (one option) get their own PropDef arrays,
   each rendered as its own labelled Section + PropTable inside the merged Props below. */

const ROOT_PROPS: PropDef[] = [
  { name: "size", type: `"1" | "2" | "3"`, desc: <>Control size. Unset, it resolves from the global <Code>uiSize</Code> (default <Code>small</Code> → <Code>1</Code>); Radix’s own default is <Code>2</Code>.</>, source: "RadioGroup.tsx:22 · Radix" },
  { name: "variant", type: `"surface" | "soft" | "classic"`, locked: true, desc: <>Radix’s raw variant is <strong>not exposed</strong> — the wrapper omits it from the public type and hard-sets <Code>surface</Code> internally, so every item stays identifiable (like every input on this system). <Code>soft</Code> and <Code>classic</Code> are unavailable.</>, source: "RadioGroup.tsx:21,26" },
  { name: "color", type: "Radix accent", desc: <>Accent override for the selected fill and border; unset, it inherits the theme accent.</>, source: "Radix" },
  { name: "highContrast", type: "boolean", def: "false", desc: <>Increases the contrast of the selected fill/border in Radix’s high-contrast mode.</>, source: "Radix" },
  { name: "name", type: "string", desc: <>Form field name — ties every <Code>RadioGroup.Item</Code> together as one field and is what posts on submit.</>, source: "Radix" },
  { name: "value / defaultValue", type: "string", desc: <>Controlled / uncontrolled selected value — exactly one item can hold it at a time.</>, source: "Radix" },
  { name: "onValueChange", type: "(value: string) => void", desc: <>Fires when the selection changes, by click or arrow-key move.</>, source: "Radix" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Disables every item in the group. Intentionally low-contrast (WCAG-exempt) — prefer guiding the user over silently disabling a whole group.</>, source: "Radix" },
  { name: "required", type: "boolean", def: "false", desc: <>Marks the group required for native form validation.</>, source: "Radix" },
  { name: "orientation", type: `"horizontal" | "vertical"`, def: `"vertical"`, desc: <>Sets the stack direction <strong>and</strong> the arrow-key axis. Vertical is the default and almost always correct — reach for horizontal only for 2–3 very short labels.</>, source: "Radix" },
  { name: "loop", type: "boolean", def: "true", desc: <>Whether arrow-key navigation wraps from the last item back to the first.</>, source: "Radix" },
  { name: "dir", type: `"ltr" | "rtl"`, desc: <>Reading direction for arrow-key navigation.</>, source: "Radix" },
  { name: "children", type: "ReactNode", desc: <>One or more <Code>RadioGroup.Item</Code> elements — the options in the set.</>, source: "Radix" },
];

const ITEM_PROPS: PropDef[] = [
  { name: "value", type: "string", def: "— (required)", desc: <>The option’s value — required and unique within the group. Reported on selection.</>, source: "Radix" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Dims this single option and skips it in arrow-key navigation and the tab sequence, without disabling the rest of the group.</>, source: "Radix" },
  { name: "description", type: "ReactNode", desc: <>Optional secondary line under the item’s label — a price, scope, or qualifier. Top-aligned, weak tone; layers onto <Code>aria-describedby</Code> via <Code>useGroupItemDescribedBy</Code>.</>, source: "RadioGroup.tsx:31" },
  { name: "children", type: "ReactNode", desc: <>The visible label — required for an accessible option. The control and label render as one row (a <Code>Text as="label"</Code> wrapping the radio).</>, source: "Radix" },
];

type PropsValidation = { tone: "error" | "warning" | "success" | "info"; message: string };

type PropsArgs = {
  label: string;
  validation?: PropsValidation;
  itemDescriptions: boolean;
  size?: "auto" | "1" | "2" | "3";
  disabled?: boolean;
  itemCount: number;
  onValueChange?: (value: string) => void;
};

// A plan-picker dataset so itemCount (2–5) always has a sensible label + price/scope sub-line.
const PLANS: { value: string; label: string; description: string }[] = [
  { value: "free", label: "Free", description: "$0 — for trying things out" },
  { value: "starter", label: "Starter", description: "$10/mo — for individuals" },
  { value: "pro", label: "Pro", description: "$20/mo — for growing teams" },
  { value: "business", label: "Business", description: "$50/mo — for scaling orgs" },
  { value: "enterprise", label: "Enterprise", description: "Custom — SSO, audit logs, priority support" },
];

/** Props — the live, args-driven group, configured as a field. Set a `label` to wrap it in a
 *  FieldGroup (named set + bottom-anchored validation); leave it empty for a bare, aria-labelled group.
 *  The full prop reference (Root + Item) sits below the instance. */
export const Props: StoryObj<PropsArgs> = {
  // "auto" (size unset) is the default so the group tracks the global uiSize toolbar out of the box.
  args: { label: "Plan", validation: undefined, itemDescriptions: true, size: "auto", disabled: false, itemCount: 3 },
  argTypes: {
    label: { name: "group label", control: "text" },
    validation: {
      control: "inline-radio",
      options: ["none", "error", "warning", "success", "info"],
      mapping: {
        none: undefined,
        error: { tone: "error", message: "Choose a plan to continue." },
        warning: { tone: "warning", message: "This plan is being deprecated soon." },
        success: { tone: "success", message: "Plan selected — you're all set." },
        info: { tone: "info", message: "You can change your plan anytime." },
      },
    },
    itemDescriptions: { name: "per-item description", control: "boolean" },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step (1–3) pins the group.' },
    disabled: { control: "boolean" },
    itemCount: { name: "item count", control: { type: "range", min: 2, max: 5, step: 1 } },
    onValueChange: { action: "valueChange" },
  },
  parameters: { controls: { disable: false } },
  render: ({ label, validation, itemDescriptions, size, disabled, itemCount, onValueChange }: PropsArgs) => {
    const plans = PLANS.slice(0, itemCount);
    // "auto" = leave `size` off entirely, so the group (and the FieldGroup around it) resolve the
    // global uiSize toolbar; any other value pins both to that step.
    const resolvedSize = size === "auto" ? undefined : size;
    const group = (
      <RadioGroup defaultValue={plans[0].value} name="pg-plan" size={resolvedSize} disabled={disabled} onValueChange={onValueChange} {...(label ? {} : { "aria-label": "Plan" })}>
        {plans.map((p) => (
          <RadioGroup.Item key={p.value} value={p.value} description={itemDescriptions ? p.description : undefined}>
            {p.label}
          </RadioGroup.Item>
        ))}
      </RadioGroup>
    );
    return (
      <Page maxWidth="none">
        <PageHeader title="RadioGroup · Props" standfirst={DEFINITION} />
        <Box style={{ padding: "8px 0 2px", maxWidth: 420 }}>
          {label ? (
            <FieldGroup.Root validation={validation} size={resolvedSize}>
              <FieldGroup.Label>{label}</FieldGroup.Label>
              {group}
              <FieldGroup.Message />
            </FieldGroup.Root>
          ) : group}
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>RadioGroup</Code> accepts, grouped by part — <Code>Root</Code> (the group) and <Code>Item</Code> (one option). <Code>variant</Code> is locked so a group can’t drift off-system.</>}>
          <Section title="Root — the group" lead={<>The <Code>&lt;RadioGroup&gt;</Code> element — locked to <Code>surface</Code>, sized on the global control lane, and auto-wired for <Code>aria-labelledby</Code>/<Code>aria-describedby</Code> when nested in a <Code>FieldGroup.Root</Code>.</>}>
            <PropTable rows={ROOT_PROPS} />
          </Section>
          <Rule />
          <Section title="Item — one option" lead={<><Code>RadioGroup.Item</Code> is a thin passthrough over Radix’s radio, plus a system-added <Code>description</Code> slot. Options are authored as JSX children — one <Code>RadioGroup.Item</Code> per choice.</>}>
            <PropTable rows={ITEM_PROPS} />
          </Section>
          <Caption>
            Wrapped in a <Code>FieldGroup.Root</Code>, the group auto-wires <Code>aria-labelledby</Code>{" "}
            (from <Code>FieldGroup.Label</Code>) and <Code>aria-describedby</Code> (from the group’s
            validation message or description) via <Code>useOptionalFieldGroupControl()</Code> — standalone,
            this is <Code>null</Code> and behaviour is unchanged; an explicit <Code>aria-label</Code> /{" "}
            <Code>aria-labelledby</Code> on the group always wins on conflict. Each item’s{" "}
            <Code>description</Code> layers onto that same <Code>aria-describedby</Code> chain via{" "}
            <Code>useGroupItemDescribedBy</Code>.
          </Caption>
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="RadioGroup · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[soft-variant-scope]] · surface-locked">
            Locked to <Code>variant="surface"</Code> — like every input, the radios must separate from the
            page (border + fill + hover). <Code>soft</Code> and <Code>classic</Code> aren’t exposed.
          </Decision>
          <Decision id="Cardinality">
            One <Code>name</Code>, at most one selected value — a group models a mutually-exclusive, one-of-many
            choice; <Code>RadioGroup.Item</Code> is a thin passthrough so options stay on-system.
          </Decision>
          <Decision id="Label">
            The group is <Code>role="radiogroup"</Code> — it needs an accessible name (an{" "}
            <Code>aria-label</Code>, or a visible heading wired with <Code>aria-labelledby</Code>), and
            should rest with a sensible <Code>defaultValue</Code> selected rather than empty.
          </Decision>
          <Decision id="Keyboard">
            A radio group is <strong>one tab stop</strong>. Only the selected radio (or the first, if none
            is selected) is in the tab sequence. Arrow keys move focus <em>and</em> selection within the
            group; focus wraps. This is the defining keyboard difference from a checkbox group (where every
            item is independently tabbable). Radix provides the roving-tabindex implementation — WAI-ARIA
            APG Radio Group pattern.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0 · item descriptions">
            Per-option <Code>description</Code> text, a sub-label beneath each item. Group-level{" "}
            <Code>validation</Code> has no published route, because the package does not export{" "}
            <Code>FieldGroup</Code> ([[group-validation]]).
          </Decision>
          <Decision id="0.9.0">
            Initial component — surface-locked <Code>RadioGroup.Root</Code> over Radix, size on the global{" "}
            <Code>uiSize</Code> control lane, with <Code>RadioGroup.Item</Code> re-exposed. Stories on the
            standard template: History · Anatomy · Usage · Props.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
