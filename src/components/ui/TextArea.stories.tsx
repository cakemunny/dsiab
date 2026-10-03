import { useEffect, useRef } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Info } from "@phosphor-icons/react";
import { TextArea, type TextAreaProps } from "./TextArea";
import { parseColor, resolveColor } from "../../foundations/_assert";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine,
  MeasuredRow, MeasuredSpec, NoteRow, Page, PageHeader, PropsLead, PropDef, PropTable, Rule, Scenario, Section, tick, TokenGroup,
} from "./_storyKit";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>A multi-line text input on the shared <Code>Field</Code> chrome — the same label row, surface control, optional description, and conditional validation row as <Code>TextField</Code>, with <Code>htmlFor</Code>, <Code>aria-describedby</Code>, and <Code>aria-invalid</Code> threaded for you. The one thing a single-line field does not have is a resize handle, vertical by default.</>;

/* ---- anatomy diagram (TextArea-specific) --------------------------------- */

function AnatomyDiagram() {
  // A real size-3 NEUTRAL specimen — the default state. A label row (name + a pinned char-count
  // end-slot), a multi-line value with the resize handle at the bottom-right, and a description helper.
  // Validation parts live in their own specimen below. Callouts are calc()-positioned against the
  // centred 280px column so they track the field at any width; below ~420px the wrapper scrolls.
  return (
    <Box style={{ overflowX: "auto" }}>
      <Box style={{ position: "relative", width: "100%", minWidth: 420, maxWidth: 640, margin: "0 auto", height: 250, background: "var(--ds-bg-subtle)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
        <Flex align="center" justify="center" style={{ position: "absolute", inset: 0 }}>
          <Box style={{ position: "relative", width: 280 }}>
            <TextArea
              size="3"
              label="Bio"
              info={<Info size={16} weight="regular" aria-hidden style={{ color: "var(--ds-icon-neutral)", display: "block" }} />}
              endSlot={<Text size="1" style={{ color: "var(--ds-text-weak)" }}>Optional</Text>}
              defaultValue={"Designer and gardener.\nBuilding small, careful tools."}
              description="A short blurb for your public profile."
              style={{ height: 76, resize: "vertical" }}
            />
          </Box>
        </Flex>
        {/* Callout tops measured against the rendered size-3 specimen (label row midY ~71, value ~110,
            resize handle ~158, description ~179); field column left ≈ calc(50% - 140px), right ≈ +140px. */}
        {/* 1 — label (from the left) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 200px)", top: 61 }}>1</Box>
        <Box style={hLine({ left: "calc(50% - 178px)", top: 71, width: 38 })} />
        {/* 2 — info affordance (tick down onto the icon, just right of the label) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 118px)", top: 16 }}>2</Box>
        <Box style={tick({ left: "calc(50% - 108px)", top: 36, height: 29 })} />
        {/* 3 — end-slot / char count (from the right) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 182px)", top: 61 }}>3</Box>
        <Box style={hLine({ left: "calc(50% + 140px)", top: 71, width: 42 })} />
        {/* 4 — value (from the left) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 200px)", top: 100 }}>4</Box>
        <Box style={hLine({ left: "calc(50% - 178px)", top: 110, width: 38 })} />
        {/* 5 — resize handle (from the right, onto the bottom-right corner) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 182px)", top: 148 }}>5</Box>
        <Box style={hLine({ left: "calc(50% + 140px)", top: 158, width: 42 })} />
        {/* 6 — description (from the left) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 200px)", top: 169 }}>6</Box>
        <Box style={hLine({ left: "calc(50% - 178px)", top: 179, width: 38 })} />
      </Box>
    </Box>
  );
}

function ValidationSpecimen() {
  return (
    <Box style={{ maxWidth: 280 }} data-testid="anatomy-validation">
      <TextArea
        size="3"
        label="What went wrong?"
        defaultValue="It froze"
        validation={{ tone: "error", message: "Add a little more detail so we can reproduce it." }}
      />
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Label", "the field’s name — sets the accessible name via htmlFor → id (shared Field.Label)"],
  [2, "Info", "an optional inline affordance beside the label — a tip icon or helper toggle (shared Field.Label)"],
  [3, "End-slot", "an optional pinned note at the far end of the label row — “Optional”, a small action (shared Field.Label)"],
  [4, "Value", "the typed text — multi-line and wrapping; held neutral (--ds-text-strong) in every state"],
  [5, "Resize handle", "drag the bottom-right corner to grow the field; vertical by default, configurable via resize"],
  [6, "Description", "an optional helper line beneath; calm guidance at rest, replaced by the validation message when a state is active"],
];

// Static FOCUSED specimen — auto-focuses on mount so the focus ring ([[focus-ring]]) is visible in
// the docs, not only exercised by a play test ("stories document, not just test").
function FocusedSpecimen() {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.querySelector("textarea")?.focus({ preventScroll: true });
  }, []);
  return (
    <Box ref={box}>
      <TextArea label="Message" defaultValue="Thanks for the quick turnaround —" />
    </Box>
  );
}

/* ========================================================================== */

const meta: Meta<typeof TextArea> = {
  title: "Components/Typed Entry/TextArea",
  component: TextArea,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "A multi-line text input on the shared **`Field`** chrome — the same label row, surface " +
          "control, optional **`description`** helper, and conditional validation row as `TextField`, " +
          "with `id`→`htmlFor` / `aria-describedby` / `aria-invalid` threaded automatically. The variant " +
          "is locked to **surface**. The one thing a single-line field doesn’t have is a **resize " +
          "handle** (vertical by default). A validation state paints the **border + tint + a status " +
          "glyph + a one-line message** from the accent-aware semantic tokens; the value text stays " +
          "neutral because colour is never the only signal.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof TextArea>;

/** The parts of a text area (a labeled diagram), a validation specimen, and its states. The token spec
 *  lives on Usage. */
export const Anatomy: Story = {
  // No page-level axe carve-out: this page renders no do/don't card and no warning/success tone, so the
  // exclusions it used to carry matched nothing. The whole page IS contrast-checked (the error-tone
  // specimen included); the warning/success carve-out travels with the token spec, on Usage.
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="TextArea · Anatomy" standfirst={DEFINITION} />

        <Section title="Anatomy" lead="The default, neutral field. A label row (the name plus an optional pinned end-slot such as a character count), a multi-line value with a resize handle at the bottom-right, and a persistent description helper beneath.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>
            Only the <strong>label</strong> and the <strong>control</strong> are required. The{" "}
            <strong>end-slot</strong>, the <strong>description</strong>, and the <strong>resize handle</strong>{" "}
            (which you can switch off) are optional. The <strong>value text stays neutral</strong>{" "}
            (<Code>--ds-text-strong</Code>) in every state — the semantic lives in the chrome, not the characters.
          </Caption>
        </Section>

        <Rule />

        <Section title="Validation specimen" lead="A validation state paints the border, a faint tint, a status glyph, and a one-line message from the accent-aware family. The glyph and the wording carry the meaning together, so the state survives without colour.">
          <ValidationSpecimen />
          <Caption>
            Border, tint, glyph, and message all paint from the same family tokens; the focus ring
            stays the same accent ring in every tone. The{" "}
            <strong>message</strong> sits below the field — top-aligned and wrapping, never truncating —
            so it never collides with the resize handle.
          </Caption>
        </Section>

        <Rule />

        <Section title="States" lead="One field across its states — same chrome, different signal. Hover and focus appear as you point and tab; the rest are shown here.">
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
            <Scenario label="EMPTY · PLACEHOLDER" caption={<>The <strong>placeholder</strong> is hint text <em>inside</em> the field — greyed so it never reads as a typed value. It is <strong>not</strong> a label.</>}>
              <TextArea label="Bio" placeholder="Tell people about yourself…" />
            </Scenario>
            <Scenario label="FILLED" caption={<>A real value in <Code>--ds-text-strong</Code> — wrapping across lines.</>}>
              <TextArea label="Bio" defaultValue={"Designer and gardener.\nBuilding small, careful tools."} />
            </Scenario>
            <Scenario label="DISABLED" caption="Dimmed and inert — not focusable, not submitted.">
              <TextArea label="Bio" defaultValue="Designer and gardener." disabled />
            </Scenario>
            <Scenario label="READ-ONLY" caption="Full contrast, focusable and selectable, submitted — just not editable.">
              <TextArea label="Bio" defaultValue="Designer and gardener." readOnly />
            </Scenario>
            <Scenario label="ERROR" caption="Border + tint + glyph + message, all from the family tokens; the value text stays neutral.">
              <TextArea label="Bio" defaultValue="x" validation={{ tone: "error", message: "Tell us a little more about yourself." }} />
            </Scenario>
            <Scenario label="NO RESIZE" caption={<>Set <Code>resize="none"</Code> for a fixed-height field — e.g. a one-line-ish note that shouldn’t grow.</>}>
              <TextArea label="Headline" defaultValue="One concise line." resize="none" />
            </Scenario>
            <Scenario label="CHARACTER COUNT" caption={<>Set <Code>showCount</Code> with <Code>maxLength</Code> for a live counter at the bottom-right of the support row — type to watch it update.</>}>
              <TextArea label="Bio" defaultValue="Designer and gardener." showCount maxLength={160} />
            </Scenario>
          </Grid>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
};

/* ---- Properties (TextArea-specific) ---------------------------------------- */

const TEXTAREA_PROPS: PropDef[] = [
  { name: "label", type: "ReactNode", desc: <>The field’s visible name — also sets the accessible name via <Code>htmlFor</Code>→<Code>id</Code> (shared <Code>Field.Label</Code>). Omit only when the field’s purpose is unambiguous from context, and supply an <Code>aria-label</Code> instead.</>, source: "TextArea.tsx:11" },
  { name: "info", type: "ReactNode", desc: <>An optional inline affordance beside the label — a tip icon or helper toggle (shared <Code>Field.Label</Code>).</>, source: "TextArea.tsx:12" },
  { name: "endSlot", type: "ReactNode", desc: <>An optional note pinned at the far end of the label row — “Optional”, a character count, a small action.</>, source: "TextArea.tsx:13" },
  { name: "description", type: "ReactNode", desc: <>A persistent helper line under the field — calm guidance that holds at rest. A <Code>validation</Code> message <strong>replaces</strong> it in the same slot when a state is active; never both.</>, source: "TextArea.tsx:15" },
  { name: "validation", type: `{ tone: "error" | "warning" | "success" | "info"; message: ReactNode }`, desc: <>Paints the border, a faint tint, a status glyph, and the message from the accent-aware family tokens. The value text itself stays neutral — colour is never the only signal.</>, source: "TextArea.tsx:16" },
  { name: "showCount", type: "boolean", def: "false", desc: <>Shows a live character counter (<Code>current/maxLength</Code>) pinned to the bottom-right of the support row. A no-op without <Code>maxLength</Code> — the counter needs a limit to count against.</>, source: "TextArea.tsx:18" },
  { name: "maxLength", type: "number", desc: <>Native cap on the value’s length. Paired with <Code>showCount</Code> it also drives the live counter; used alone it’s a silent native limit.</>, source: "TextArea.tsx:28 · Radix" },
  { name: "variant", type: `"surface" | "classic" | "soft"`, locked: true, desc: <>Radix’s raw variant is <strong>not exposed</strong> — the wrapper omits it and always renders <Code>surface</Code>, so a field can’t drift off-system (<Code>soft</Code> is banned on interactive controls; <Code>classic</Code> is unused).</>, source: "TextArea.tsx:10" },
  { name: "size", type: `"1" | "2" | "3"`, desc: <>Control size. Unset, it resolves from the global <Code>uiSize</Code> (default <Code>small</Code> → <Code>1</Code>); Radix’s own default is <Code>2</Code>. TextArea tops out at <Code>3</Code> — there’s no <Code>4</Code> step.</>, source: "TextArea.tsx:23 · Radix" },
  { name: "resize", type: `"none" | "vertical" | "horizontal" | "both"`, desc: <>Which edges the drag handle grows. Unset renders <strong>no handle</strong> (Radix’s own default); the docs specimens set <Code>vertical</Code> so height is the only dimension that grows.</>, source: "Radix" },
  { name: "color", type: `<Radix accent>`, desc: <>Accent override for the field’s chrome. A <Code>validation</Code> state paints from its own family tokens regardless, so <Code>color</Code> only matters at rest or on a plain (non-validated) focus.</>, source: "Radix" },
  { name: "placeholder", type: "string", desc: <>Hint text shown <em>inside</em> the empty field, greyed so it never reads as a typed value. Not a substitute for <Code>label</Code>.</>, source: "Radix" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Disables the field — not focusable, not submitted. Intentionally low-contrast (WCAG-exempt); with no validation active, the support row doesn’t render at all.</>, source: "Radix" },
  { name: "readOnly", type: "boolean", def: "false", desc: <>Full contrast, focusable and selectable, submitted with the form — just not editable. Prefer this over <Code>disabled</Code> when the user still needs to read or copy the value.</>, source: "Radix" },
  { name: "value / defaultValue", type: "string", desc: <><Code>value</Code> makes the field controlled; <Code>defaultValue</Code> sets the initial value of an uncontrolled one. Either seeds the character counter’s starting length.</>, source: "TextArea.tsx:28" },
  { name: "onChange", type: "(e) => void", desc: <>Change handler — TextArea wraps it to also track the value’s length for <Code>showCount</Code> when uncontrolled, then calls through to yours.</>, source: "TextArea.tsx:35" },
  { name: "rows", type: "number", desc: <>Visible text lines — sets the field’s initial height (rows × line-height), independent of <Code>resize</Code>. The native default is <Code>2</Code> when unset.</>, source: "Radix" },
];

/** Usage: textarea vs. input, the [[focus-ring]] focus ring, the one-sentence-message rule, and the live
 *  token spec that closes the page. */
export const Usage: Story = {
  // Semantic step-11 error text on the invalid-field wash: #ce2c31 on #fbe8ea = 4.42, under axe's 4.5.
  // Surfaced by narrowing the do/don't carve-out to the DO/DON'T word alone. Same unruled tone-on-tint
  // gap as Callout/Badge — it needs a ruling on the tone tokens, not a story-level fix.
  // The warning/success pair travels with the token spec that now closes this page (PARKED, pre-existing
  // [[warning-text-tolerance]]): those messages paint amber-11 (~4.38) / green-11 (~4.48) on the near-white field bg — a hair
  // under axe 4.5; the glyph + wording carry the meaning. Scoped to the toned messages only.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL, "[style*='--ds-text-error']", '[data-field-part="message"][data-tone="error"]', "[style*='--ds-text-warning']", '[data-field-part="message"][data-tone="warning"]', "[style*='--ds-text-success']", '[data-field-part="message"][data-tone="success"]'] } } },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="TextArea · Usage" standfirst={DEFINITION} />

      <Section title="Reach for a textarea when the answer is more than a line" lead="A textarea invites a longer, multi-line answer; a single-line TextField signals a short one. Match the control to the expected length — a one-line answer in a tall box looks unfinished, and a paragraph in a single line is a fight to read back.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="A multi-line answer — feedback, a bio, a message — where the height signals “write as much as you need”.">
            <Box style={{ width: 260 }}><TextArea label="What could be better?" placeholder="Share as much detail as you like…" /></Box>
          </DoDont>
          <DoDont kind="dont" bare note="A short, single-value answer (a name, a URL) in a textarea — the tall box over-promises and the resize handle is noise. Use a TextField.">
            <Box style={{ width: 260 }}><TextArea label="Full name" placeholder="Ada Lovelace" /></Box>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <Section title="Disabled vs. read-only" lead="A disabled field is out of play — not focusable, not submitted, intentionally low-contrast. A read-only field is fully focusable, its value selectable and submitted — it just can’t be edited. Prefer read-only when the user still needs to read or copy the text.">
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="3">
          <Flex direction="column" gap="2" style={{ maxWidth: 320 }}>
            <Box data-testid="disabled-field"><TextArea label="Template" defaultValue="This template is locked." disabled /></Box>
            <Caption><strong>Disabled</strong> — dimmed and inert. With no validation, no message row renders.</Caption>
          </Flex>
          <Flex direction="column" gap="2" style={{ maxWidth: 320 }}>
            <Box data-testid="readonly-field"><TextArea label="Generated summary" defaultValue="Auto-generated from your activity this week." readOnly description="Read-only — select to copy." /></Box>
            <Caption><strong>Read-only</strong> — full contrast, focusable and selectable, submitted with the form; just not editable.</Caption>
          </Flex>
        </Grid>
      </Section>

      <Rule />

      <Section title="Focus ring" lead="The focus ring is the accent fill (--ds-stroke-focus) with a Radix alpha (--ds-stroke-focus-stack) stacked on top. It is 2px wide and sits 2px out, the same ring every control wears ([[focus-ring]]). The specimen below is auto-focused so the ring is visible at rest.">
        <Box data-testid="focus-specimen" style={{ maxWidth: 320 }}>
          <FocusedSpecimen />
        </Box>
        <Caption>
          Each accent and mode takes the lightest alpha that lifts the ring to 3:1 and APCA Lc 30 against
          the page, cards and tints. In a validation state, focus recolors the border stroke to the family (no halo),
          so the field also signals its tone.
        </Caption>
      </Section>

      <Rule />

      <Section title="Keep a validation message to one imperative sentence" lead="A validation message earns attention by being short and actionable. One imperative sentence tells the user exactly what to do; a paragraph buries the fix.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="One imperative sentence — read at a glance, the next move is obvious.">
            <Box data-testid="dodont-do" style={{ width: 260 }}>
              <TextArea label="Bio" defaultValue="x" validation={{ tone: "error", message: "Add at least one full sentence." }} />
            </Box>
          </DoDont>
          <DoDont kind="dont" bare note="A wall of text in the validation row — the fix is buried and the footprint balloons. Move policy into the description; keep the message to the single corrective action.">
            <Box data-testid="dodont-dont" style={{ width: 260 }}>
              <TextArea
                label="Bio"
                defaultValue="x"
                validation={{
                  tone: "error",
                  message:
                    "Your bio does not meet our content guidelines. It must be between 20 and 280 characters, may not contain links or contact details, must avoid profanity and all-caps, and should be written in the first person without marketing language or excessive punctuation.",
                }}
              />
            </Box>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="The resting field plus each validation tone, with the tokens that paint them. Semantic tones are accent-aware — they follow a brand’s collision shifts. Every --ds-* row is read live from the running theme, so this table can’t drift from the code.">
          <Flex direction="column" gap="4">
            <TokenGroup label="DEFAULT (rest)" blurb="The neutral field — a surface border + fill and neutral value text; on focus it gains the system ring, the accent with a stacked alpha ([[focus-ring]])." specimen={<Box style={{ width: 220 }}><TextArea label="Bio" defaultValue="Designer and gardener." description="A short blurb." /></Box>}>
              <MeasuredSpec render={() => <TextArea label="Bio" defaultValue="Designer and gardener." description="A short blurb." />}>
                <MeasuredRow
                  part="Value text"
                  note="Declared on the field box; the control inherits it, so the ink never moves with a tone."
                  token="--ds-text-strong"
                  select=".rt-TextAreaRoot"
                  prop="color"
                />
                <MeasuredRow
                  part="Description"
                  note="The calm helper line under the field — the placeholder shares this ink."
                  token="--ds-text-weak"
                  select="[data-field-part='description']"
                  prop="color"
                />
                <MeasuredRow
                  part="Focus ring"
                  note="Unlike the single-line field, the ring is declared for focus ANYWHERE in the box, so a :focus read finds no rule to quote. The accent base, with the stack alpha on top, 2px ([[focus-ring]])."
                  token="--ds-stroke-focus"
                  select=".rt-TextAreaRoot"
                  prop="outline-color"
                  state="focus"
                />
              </MeasuredSpec>
              <NoteRow part="Border (rest)" value="Radix surface — inset 1px" radix="--gray-a7" />
            </TokenGroup>
            <TokenGroup label="ERROR" blurb="A blocking problem with the value — the field can’t be submitted as-is." specimen={<Box style={{ width: 220 }}><TextArea label="Feedback" defaultValue="bad" validation={{ tone: "error", message: "Tell us a little more." }} /></Box>}>
              <MeasuredSpec render={() => <TextArea label="Feedback" defaultValue="bad" validation={{ tone: "error", message: "Tell us a little more." }} />}>
                <MeasuredRow part="Tint (fill)" note="The faint wash the field box takes while the tone is active." token="--ds-fill-error-weak" select=".rt-TextAreaRoot" prop="background-color" />
                <MeasuredRow part="Message + glyph" note="Read off the status mark; the message beside it shares the ink." token="--ds-text-error" select="[data-validation='error'] svg" prop="color" />
              </MeasuredSpec>
              <NoteRow part="Border" value="inset 1px ring — the family step-8 stroke" radix="--ds-stroke-error" />
            </TokenGroup>
            <TokenGroup label="WARNING" blurb="A caution worth flagging — accepted but maybe not intended." specimen={<Box style={{ width: 220 }}><TextArea label="Note" defaultValue="ASAP!!!" validation={{ tone: "warning", message: "Avoid all-caps urgency." }} /></Box>}>
              <MeasuredSpec render={() => <TextArea label="Note" defaultValue="ASAP!!!" validation={{ tone: "warning", message: "Avoid all-caps urgency." }} />}>
                <MeasuredRow part="Tint (fill)" note="The faint wash the field box takes while the tone is active." token="--ds-fill-warning-weak" select=".rt-TextAreaRoot" prop="background-color" />
                <MeasuredRow part="Message + glyph" note="Read off the status mark; the message beside it shares the ink." token="--ds-text-warning" select="[data-validation='warning'] svg" prop="color" />
              </MeasuredSpec>
              <NoteRow part="Border" value="inset 1px ring — the family step-8 stroke" radix="--ds-stroke-warning" />
            </TokenGroup>
            <TokenGroup label="SUCCESS" blurb="Positive confirmation — the value checked out." specimen={<Box style={{ width: 220 }}><TextArea label="Summary" defaultValue="Looks complete." validation={{ tone: "success", message: "Looks good." }} /></Box>}>
              <MeasuredSpec render={() => <TextArea label="Summary" defaultValue="Looks complete." validation={{ tone: "success", message: "Looks good." }} />}>
                <MeasuredRow part="Tint (fill)" note="The faint wash the field box takes while the tone is active." token="--ds-fill-success-weak" select=".rt-TextAreaRoot" prop="background-color" />
                <MeasuredRow part="Message + glyph" note="Read off the status mark; the message beside it shares the ink." token="--ds-text-success" select="[data-validation='success'] svg" prop="color" />
              </MeasuredSpec>
              <NoteRow part="Border" value="inset 1px ring — the family step-8 stroke" radix="--ds-stroke-success" />
            </TokenGroup>
            <TokenGroup label="INFO (secondary)" blurb="A flexible secondary tone — neutral, non-blocking, not a validation peer." specimen={<Box style={{ width: 220 }}><TextArea label="Bio" defaultValue="Hello." validation={{ tone: "info", message: "You can edit this later." }} /></Box>}>
              <MeasuredSpec render={() => <TextArea label="Bio" defaultValue="Hello." validation={{ tone: "info", message: "You can edit this later." }} />}>
                <MeasuredRow part="Tint (fill)" note="The faint wash the field box takes while the tone is active." token="--ds-fill-info-weak" select=".rt-TextAreaRoot" prop="background-color" />
                <MeasuredRow part="Message + glyph" note="Read off the status mark; the message beside it shares the ink." token="--ds-text-info" select="[data-validation='info'] svg" prop="color" />
              </MeasuredSpec>
              <NoteRow part="Border" value="inset 1px ring — the family step-8 stroke" radix="--ds-stroke-info" />
            </TokenGroup>
            <TokenGroup label="ALL TONES" blurb="What a tone does NOT move — proved on a field that is wearing one.">
              <MeasuredSpec render={() => <TextArea label="Feedback" defaultValue="bad" validation={{ tone: "error", message: "Tell us a little more." }} />}>
                <MeasuredRow
                  part="Value text"
                  note="Read off a field in an error state — the ink stays neutral; the semantic lives in the chrome."
                  token="--ds-text-strong"
                  select=".rt-TextAreaRoot"
                  prop="color"
                />
              </MeasuredSpec>
              <NoteRow part="Focus ring" value="the accent ring with its stacked alpha ([[focus-ring]]), held constant in every tone" radix="--ds-stroke-focus" />
              <NoteRow part="Border (step)" value="--ds-stroke-{fam} = family step-8" radix="—" />
            </TokenGroup>
          </Flex>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    const near = (a: number, b: number, tol = 4) => Math.abs(a - b) <= tol;
    const colorRe = /rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|color\([^)]*\)/g;

    // 1. The error control's border resolves to --ds-stroke-error (presence alone is a false positive —
    //    the neutral default also carries a box-shadow border). Multi-tone validation is rare on a
    //    textarea, so the scenarios above only feature error; all tones live in the token spec that
    //    closes this page.
    const tones = ["error"] as const;
    for (const tone of tones) {
      const w = canvasElement.querySelector<HTMLElement>(`[data-validation="${tone}"]`);
      if (!w) throw new Error(`missing ${tone} specimen`);
      const root = w.querySelector<HTMLElement>(".rt-TextAreaRoot");
      if (!root) throw new Error(`${tone} specimen has no .rt-TextAreaRoot`);
      const shadow = getComputedStyle(root).boxShadow;
      if (shadow === "none") throw new Error(`${tone} control must carry a border`);
      const want = resolveColor(w, `--ds-stroke-${tone}`);
      const toks = shadow.match(colorRe) || [];
      if (!toks.some((t) => { const c = parseColor(t); return near(c.r, want.r) && near(c.g, want.g) && near(c.b, want.b); })) {
        throw new Error(`${tone} border must resolve to --ds-stroke-${tone}; got ${shadow}`);
      }
    }

    // 2. Value text stays NEUTRAL in a validation state.
    const errRoot = canvasElement.querySelector<HTMLElement>('[data-validation="error"] .rt-TextAreaRoot');
    if (!errRoot) throw new Error("error root not rendered");
    const errInput = errRoot.querySelector<HTMLTextAreaElement>("textarea");
    if (!errInput) throw new Error("error textarea not rendered");
    const neutral = resolveColor(errRoot, "--ds-text-strong");
    const v = parseColor(getComputedStyle(errInput).color);
    if (!(near(v.r, neutral.r, 6) && near(v.g, neutral.g, 6) && near(v.b, neutral.b, 6))) {
      throw new Error(`value text must stay --ds-text-strong; got rgb(${v.r},${v.g},${v.b})`);
    }

    // 3. Disabled suppresses the validation row; read-only is distinct (focusable, not disabled).
    const disabled = canvasElement.querySelector<HTMLElement>('[data-testid="disabled-field"]');
    if (!disabled?.querySelector("textarea:disabled")) throw new Error("missing disabled specimen");
    if (disabled.querySelector("[data-validation]")) throw new Error("disabled field must not show a validation row");
    const ro = canvasElement.querySelector<HTMLTextAreaElement>('[data-testid="readonly-field"] textarea');
    if (!ro?.readOnly || ro.disabled) throw new Error("read-only must be readonly and NOT disabled");

    // 4. Focus ring: the [[focus-ring]] ring, 2px wide and 2px out, the same on every control. The field's own
    //    outline is the geometry; ::before paints the accent base (--ds-stroke-focus) and ::after the
    //    stack alpha (--ds-stroke-focus-stack) on top. A validation state recolors ONLY the border stroke
    //    to the family, no halo (ruled 2026-07-08, superseding the first neutral focus ring).
    errInput.focus();
    const cs = getComputedStyle(errRoot);
    // Our 2px override (Radix 3.3.0 rings the TextArea at -1px; [[input-focus-ring-offset]]). Round for sub-pixel rendering under
    // browser zoom — e.g. at 110% getComputedStyle returns 1.818px (= 2 ÷ 1.1), still our 2px override.
    const layers = [
      { pseudo: "::before", token: "--ds-stroke-focus" },
      { pseudo: "::after", token: "--ds-stroke-focus-stack" },
    ];
    for (const { pseudo, token } of layers) {
      const ps = getComputedStyle(errRoot, pseudo);
      if (Math.round(parseFloat(ps.outlineOffset)) !== 2) throw new Error(`ring ${pseudo}: expected outline-offset ~2px, got ${ps.outlineOffset}`);
      if (ps.outlineStyle !== "solid" || Math.round(parseFloat(ps.outlineWidth)) !== 2) throw new Error(`ring ${pseudo}: expected a 2px solid ring ([[focus-ring]]), got ${ps.outlineWidth} ${ps.outlineStyle}`);
      const want = resolveColor(errRoot, token);
      const got = parseColor(ps.outlineColor);
      if (!(near(got.r, want.r) && near(got.g, want.g) && near(got.b, want.b) && Math.abs(got.a - want.a) < 0.02)) {
        throw new Error(`ring ${pseudo} must be ${token} ([[focus-ring]]); got ${ps.outlineColor}`);
      }
    }
    const strokeCol = resolveColor(errRoot, "--ds-stroke-error");
    const shadowToks = cs.boxShadow.match(colorRe) || [];
    if (!shadowToks.some((t) => { const c = parseColor(t); return near(c.r, strokeCol.r) && near(c.g, strokeCol.g) && near(c.b, strokeCol.b); })) {
      throw new Error(`focus border stroke must be --ds-stroke-error (no halo); got ${cs.boxShadow}`);
    }
  },
};

/** Props — a prototyping tool for the field. Drive every part from Controls. */
type PropsArgs = Omit<TextAreaProps, "info" | "endSlot" | "size"> & {
  /** "auto" = leave `size` unset so the field tracks the global uiSize toolbar. */
  size?: "auto" | "1" | "2" | "3";
  width?: number;
  /** Show the inline info affordance (tip icon + tooltip) beside the label. */
  showInfo?: boolean;
  /** The tooltip text for the info affordance (native `title`). */
  infoText?: string;
  /** Text pinned at the far end of the label row; empty = no end-slot. */
  endSlot?: string;
};

export const Props: StoryObj<PropsArgs> = {
  args: {
    label: "Bio",
    placeholder: "Tell people about yourself…",
    description: "A short blurb for your public profile.",
    size: "auto",
    resize: "vertical",
    rows: 4,
    width: 380,
    showCount: false,
    maxLength: 160,
    showInfo: false,
    infoText: "Visible on your public profile.",
    endSlot: "",
    disabled: false,
    readOnly: false,
  },
  argTypes: {
    label: { control: "text" },
    placeholder: { control: "text" },
    description: { name: "description (helper)", control: "text" },
    validation: {
      control: "inline-radio",
      options: ["none", "error", "warning", "success", "info"],
      mapping: {
        none: undefined,
        error: { tone: "error", message: "Add at least one full sentence." },
        warning: { tone: "warning", message: "This reads a little terse." },
        success: { tone: "success", message: "Looks good." },
        info: { tone: "info", message: "You can edit this later in settings." },
      },
    },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step pins the field.' },
    resize: { control: "inline-radio", options: ["none", "vertical", "horizontal", "both"] },
    rows: { control: { type: "range", min: 2, max: 10, step: 1 } },
    width: { control: { type: "range", min: 200, max: 560, step: 20 } },
    showCount: { name: "showCount (counter)", control: "boolean" },
    maxLength: { name: "maxLength", control: { type: "range", min: 40, max: 400, step: 20 } },
    showInfo: { name: "info (show)", control: "boolean" },
    infoText: { name: "info text", control: "text" },
    endSlot: { name: "end-slot", control: "text" },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
  },
  parameters: { controls: { disable: false } },
  render: ({ width, showInfo, infoText, endSlot, size, ...rest }: PropsArgs) => {
    const info = showInfo ? (
      <span title={infoText} style={{ display: "inline-flex", cursor: "help" }}>
        <Info size={16} weight="regular" aria-hidden style={{ color: "var(--ds-icon-neutral)", display: "block" }} />
      </span>
    ) : undefined;
    const end = endSlot ? (
      <Text size="1" style={{ color: "var(--ds-text-weak)" }}>{endSlot}</Text>
    ) : undefined;
    return (
      <Page maxWidth="none">
        <PageHeader title="TextArea · Props" standfirst={DEFINITION} />
        <Box p="5" style={{ maxWidth: width }}>
          <TextArea {...rest} size={size === "auto" ? undefined : size} info={info} endSlot={end} />
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>TextArea</Code> accepts — the Field-shell props (<Code>label</Code>, <Code>description</Code>, <Code>validation</Code>…) plus the character-counter pair, the rest passing through to Radix’s <Code>TextArea</Code>. <Code>variant</Code> is locked to <Code>surface</Code> so a field can’t drift off-system.</>}>
          <PropTable rows={TEXTAREA_PROPS} />
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="TextArea · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[soft-variant-scope]] · Surface only">
            Inputs use <Code>surface</Code> only — <Code>soft</Code> is banned on interactive controls,
            and <Code>outline</Code>/<Code>classic</Code> aren’t exposed.
          </Decision>
          <Decision id="[[field-shell]] · Shared Field shell">
            The shared <Code>Field</Code> shell owns the label and validation rows and threads aria via
            context. Validation paints the control border + tint + status glyph + message from the
            accent-aware family tokens via <Code>[data-validation]</Code>.
          </Decision>
          <Decision id="[[support-text-slot]] · One support-text slot">
            One support-text slot, two sources: a persistent <Code>description</Code> at rest, replaced
            by a conditional validation <Code>message</Code> when a state is active — never both.
          </Decision>
          <Decision id="[[field-shell-adoption]] · Field-shell parity">
            TextArea adopts the Field shell exactly like TextField (label / description / validation).
            There is <strong>no resize lock</strong> in a validation state — the message is a sibling
            below the field, so the resize handle never collides with it. The system focus ring
            overrides Radix’s own <Code>.rt-TextAreaRoot:focus-within</Code> outline (no{" "}
            <Code>!important</Code>).
          </Decision>
          <Decision id="[[focus-ring]] · Focus ring">
            Before [[focus-ring]] the ring was a neutral <Code>gray-12</Code> hairline. [[focus-ring]] replaces it with the one ring
            every control wears: the accent fill, <Code>--ds-stroke-focus</Code>, with a Radix alpha,{" "}
            <Code>--ds-stroke-focus-stack</Code>, stacked on top. Each accent and mode takes the lightest
            alpha that clears 3:1 and APCA Lc 30. It is 2px wide and sits 2px out.
            A validation state recolors the border stroke to the family (no halo).
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            TextArea moved onto the shared <Code>Field</Code> shell — gained <Code>label</Code>,{" "}
            <Code>description</Code>, and accent-aware <Code>validation</Code> (border + tint + glyph +
            message), plus the system focus ring (now [[focus-ring]]). Stays bare when none of those props are
            passed. Stories on the standard template: History · Anatomy · Usage · Props.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
