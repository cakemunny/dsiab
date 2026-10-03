import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text, Tooltip } from "@radix-ui/themes";
import { Globe, Lock, Envelope, Info, Eye, EyeSlash, CircleNotch, X, User, CalendarBlank, CurrencyDollar } from "@phosphor-icons/react";
import { TextField, type TextFieldProps } from "./TextField";
import { IconButton } from "./IconButton";
import { parseColor, resolveColor } from "../../foundations/_assert";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine,
  MeasuredRow, MeasuredSpec, NoteRow, Page, PageHeader, PropsLead, PropDef, PropTable, Rule, Scenario, Section, tick, TokenGroup,
} from "./_storyKit";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>A single-line text input on the shared <Code>Field</Code> chrome: a label row, the surface input, an optional persistent description, and a conditional validation row, wired so <Code>htmlFor</Code>, <Code>aria-describedby</Code>, and <Code>aria-invalid</Code> thread automatically. A validation state paints the border, tint, a status glyph, and a one-line message — the value text stays neutral, because colour is never the only signal.</>;

/* ---- anatomy diagram (TextField-specific) -------------------------------- */

function AnatomyDiagram() {
  // A real size-3 NEUTRAL (no-validation) specimen — the default state, composed to expose every
  // slot at once: label · info icon · pinned end-slot on the label row; a leading-icon slot · value ·
  // trailing lane in the input; plus the persistent description helper. Validation parts (border /
  // tint / status glyph / message) live in their own specimen below + the per-tone token spec, so the
  // primary diagram stays neutral and no two callouts collide. Each callout is positioned with calc()
  // relative to the centred column so it tracks the field at any viewport width. Below ~420px it scrolls.
  // controller: align callouts to measured specimen (the rendered size-3 dims below are best-effort).
  return (
    <Box style={{ overflowX: "auto" }}>
      <Box style={{ position: "relative", width: "100%", minWidth: 420, maxWidth: 640, margin: "0 auto", height: 210, background: "var(--ds-bg-subtle)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
        <Flex align="center" justify="center" style={{ position: "absolute", inset: 0 }}>
          <Box style={{ position: "relative", width: 280 }} data-size-lesson="anatomy callout geometry — every callout below is placed against this size-3 specimen's measured rows">
            <TextField
              size="3"
              label="Workspace URL"
              info={<Info size={16} weight="regular" aria-hidden style={{ color: "var(--ds-icon-neutral)", display: "block" }} />}
              endSlot={<Text size="1" style={{ color: "var(--ds-text-weak)" }}>Optional</Text>}
              defaultValue="acme"
              description="Lowercase letters and dashes only."
            >
              <TextField.Slot>
                <Globe />
              </TextField.Slot>
              <TextField.Slot>
                {/* a text suffix matches the input's text size (size 3 here) so it shares the value's baseline */}
                <Text size="3" style={{ color: "var(--ds-text-weak)" }}>.example.com</Text>
              </TextField.Slot>
            </TextField>
          </Box>
        </Flex>
        {/* Callout tops measured against the rendered size-3 neutral specimen (label/info/end-slot row
            midY 73, input 107, description 139); field column left ≈ calc(50% - 140px), right ≈ calc(50% + 140px). */}
        {/* LABEL ZONE */}
        {/* 1 — label text (from the left) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 200px)", top: 63 }}>1</Box>
        <Box style={hLine({ left: "calc(50% - 178px)", top: 73, width: 38 })} />
        {/* 2 — info icon (tick down from above onto the icon, just right of the label) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 32px)", top: 16 }}>2</Box>
        <Box style={tick({ left: "calc(50% - 22px)", top: 36, height: 29 })} />
        {/* 3 — pinned end-slot (from the right) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 182px)", top: 63 }}>3</Box>
        <Box style={hLine({ left: "calc(50% + 140px)", top: 73, width: 42 })} />
        {/* INPUT BODY */}
        {/* 4 — leading-icon slot (from the left) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 200px)", top: 97 }}>4</Box>
        <Box style={hLine({ left: "calc(50% - 178px)", top: 107, width: 38 })} />
        {/* 5 — value (tick up from below onto the value) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 55px)", top: 158 }}>5</Box>
        <Box style={tick({ left: "calc(50% - 45px)", top: 128, height: 28 })} />
        {/* 6 — trailing lane (from the right) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 182px)", top: 97 }}>6</Box>
        <Box style={hLine({ left: "calc(50% + 140px)", top: 107, width: 42 })} />
        {/* 7 — description helper (from the left) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 200px)", top: 129 }}>7</Box>
        <Box style={hLine({ left: "calc(50% - 178px)", top: 139, width: 38 })} />
      </Box>
    </Box>
  );
}

// A SECOND, small specimen for the validation parts — kept out of the neutral diagram so the
// primary callouts don't collide. The per-tone token spec below carries the full role table.
function ValidationSpecimen() {
  return (
    <Box style={{ maxWidth: 280 }} data-testid="anatomy-validation" data-size-lesson="held at the anatomy diagram's step 3 so the validation parts read as the same specimen, split out">
      <TextField
        size="3"
        label="Email"
        defaultValue="ada@@example"
        validation={{ tone: "error", message: "Enter a valid email address." }}
      />
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Label", "the field’s name — sets the accessible name via htmlFor → id"],
  [2, "Info", "an optional inline affordance beside the label (a tip icon or helper toggle)"],
  [3, "End-slot", "an optional pinned note at the far end of the label row (Optional, a counter, an action)"],
  [4, "Leading slot", "a TextField.Slot on the left that identifies the field (a globe, lock, mail) and rarely changes"],
  [5, "Value", "the typed text — held neutral (--ds-text-strong) in every state; the semantic lives in the chrome"],
  [6, "Trailing lane", "the right TextField.Slot — affixes, an inset clear / reveal IconButton, or a unit suffix"],
  [7, "Description", "an optional helper line under the input; calm guidance at rest, replaced by the validation message when a state is active"],
];

/* ---- icon-order worked examples (live, dismissible) ---------------------- */

// Availability check: a globe IDENTIFIES on the left; in the trailing lane a transient spinner
// sits INWARD (nearest the text) and a persistent inset clear ✕ ANCHORS to the right. Dismissing the
// clear button reflows only the text — the spinner's position is unaffected because it's inboard.
function SearchLoadingField() {
  const [value, setValue] = useState("ada");
  const loading = value.length > 0;
  return (
    <>
      {/* Local keyframe — scoped to this story component, no shared CSS touched. */}
      <style>{"@keyframes tfSpin { to { transform: rotate(360deg) } }"}</style>
      <TextField
        label="Workspace slug"
        placeholder="acme-team"
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
      >
        <TextField.Slot>
          <Globe />
        </TextField.Slot>
        <TextField.Slot side="right" gap="1">
          {loading && <CircleNotch aria-label="Checking availability" style={{ animation: "tfSpin 1s linear infinite" }} />}
          {value && (
            <IconButton inset size="1" aria-label="Clear" data-testid="search-clear" onClick={() => setValue("")}>
              <X weight="bold" />
            </IconButton>
          )}
        </TextField.Slot>
      </TextField>
    </>
  );
}

// Password-reveal: lock IDENTIFIES on the left; the inset reveal toggle ANCHORS right and persists
// whether the value is masked or shown — so toggling visibility never shifts the control's position.
function PasswordRevealField() {
  const [shown, setShown] = useState(false);
  return (
    <TextField
      label="Password"
      type={shown ? "text" : "password"}
      defaultValue="hunter2chars"
    >
      <TextField.Slot>
        <Lock />
      </TextField.Slot>
      <TextField.Slot side="right">
        <IconButton
          inset
          size="1"
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          onClick={() => setShown((s) => !s)}
        >
          {shown ? <EyeSlash weight="bold" /> : <Eye weight="bold" />}
        </IconButton>
      </TextField.Slot>
    </TextField>
  );
}

// Static FOCUSED specimen — auto-focuses on mount so the focus ring (the [[focus-ring]] ring: the accent base,
// --ds-stroke-focus, with the --ds-stroke-focus-stack alpha on top, 2px, over the field's own inset
// border stroke; a validation tone recolours only that inset stroke) is VISIBLE in the docs, not only
// exercised by a play test (per the project's "stories document, not just test" principle).
function FocusedSpecimen() {
  // TextField doesn't forward a ref to the input, so reach it through a container ref + querySelector.
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // preventScroll so auto-focusing a docs specimen doesn't yank the page to it.
    box.current?.querySelector("input")?.focus({ preventScroll: true });
  }, []);
  return (
    <Box ref={box}>
      <TextField label="Email" defaultValue="ada@example.com">
        <TextField.Slot>
          <Envelope />
        </TextField.Slot>
      </TextField>
    </Box>
  );
}

/* ========================================================================== */

const meta: Meta<typeof TextField> = {
  title: "Components/Typed Entry/TextField",
  component: TextField,
  // `info` is a ReactNode prop assembled in the Props render — never a control (an inferred
  // object control would inject `{}` and crash). Disabled here since PropsArgs omits the key.
  argTypes: { info: { table: { disable: true } } },
  parameters: {
    // The docs stories use custom render() and don't read args, so the Controls panel is dead there.
    // Hidden by default; the Props story re-enables it. (Accessibility + Interactions stay on.)
    controls: { disable: true },
    docs: {
      description: {
        component:
          "A single-line text input on the shared **`Field`** chrome — a label row, the surface " +
          "input, an optional persistent **`description`** helper, and a conditional validation row, " +
          "wired together so `id`→`htmlFor`, `aria-describedby`, and `aria-invalid` thread " +
          "automatically. The variant is locked to **surface** (no soft / outline / classic), so an " +
          "input can’t drift off-system. A validation state paints the **border + tint + a status " +
          "glyph + a one-line message** from the accent-aware semantic tokens — so the field follows " +
          "a brand’s collision shifts, and the value text stays neutral because colour is never the " +
          "only signal.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof TextField>;

/** The parts of a text field (a labeled diagram), a validation specimen, and its states. The token spec
 *  lives on Usage. */
export const Anatomy: Story = {
  // No page-level axe carve-out: this page renders no do/don't card and no warning/success tone, so the
  // exclusions it used to carry matched nothing. The whole page IS contrast-checked (the error-tone
  // specimen included); the warning/success carve-out travels with the token spec, on Usage.
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="TextField · Anatomy" standfirst={DEFINITION} />

        <Section title="Anatomy" lead="The default, neutral field — composed to expose every slot at once. The label row carries the name plus an optional info affordance and a pinned end-slot; the input has a leading-icon slot, the value, and a trailing lane; a persistent description helper sits beneath.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>
            Only the <strong>label</strong> and <strong>input</strong> are required — the label carries the
            accessible name. Everything else — the <strong>info</strong> affordance, the pinned{" "}
            <strong>end-slot</strong>, both icon <strong>lanes</strong>, and the <strong>description</strong>{" "}
            helper — is optional; a bare field is just label + input. The <strong>value text stays neutral</strong>{" "}
            (<Code>--ds-text-strong</Code>) in every state — the semantic lives in the chrome, not the characters you typed.
          </Caption>
        </Section>

        <Rule />

        <Section title="Validation specimen" lead="A validation state is the one piece the neutral diagram leaves out — it paints the border, a faint tint, a status glyph, and a one-line message from the accent-aware family. The glyph and the wording carry the meaning together, so the state survives without colour; the value text stays neutral throughout.">
          <ValidationSpecimen />
          <Caption>
            Border, tint, glyph, and message all paint from the same family tokens, so the field reads
            as one coherent state; the focus ring stays the same accent ring in every tone. The{" "}
            <strong>validation row</strong> renders only in a validation state — top-aligned and
            wrapping, never truncating. The full role table is on the Usage page.
          </Caption>
        </Section>

        <Rule />

        <Section title="States" lead="One field across its states — same chrome, different signal. Hover and focus appear as you point and tab (the focus ring is detailed in Usage); the rest are shown here.">
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
            <Scenario label="EMPTY · PLACEHOLDER" caption={<>The <strong>placeholder</strong> is hint text <em>inside</em> the field — an example or format, greyed so it never reads as a typed value. It is <strong>not</strong> a label (see Usage).</>}>
              <TextField label="Workspace name" placeholder="acme-team" />
            </Scenario>
            <Scenario label="FILLED" caption={<>A real value in <Code>--ds-text-strong</Code> — the placeholder is gone.</>}>
              <TextField label="Workspace name" defaultValue="acme-team" />
            </Scenario>
            <Scenario label="DISABLED" caption="Dimmed and inert — not focusable, not submitted.">
              <TextField label="Workspace name" defaultValue="acme-team" disabled />
            </Scenario>
            <Scenario label="READ-ONLY" caption="Full contrast, focusable and selectable, submitted — just not editable.">
              <TextField label="Workspace name" defaultValue="acme-team" readOnly />
            </Scenario>
            <Scenario label="ERROR" caption="Border + tint + glyph + message, all from the family tokens; the value text stays neutral.">
              <TextField label="Workspace name" defaultValue="Acme Inc" validation={{ tone: "error", message: "Lowercase letters and dashes only." }} />
            </Scenario>
          </Grid>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
};

/** Usage: the validation states in real situations, the icon-order principle, the one-sentence-message
 *  rule, and the live token spec that closes the page. */
export const Usage: Story = {
  // Scoped specimen exceptions; the rest of the page IS contrast-checked. The DO/DON'T word only (not the
  // whole card, which is what the old "[data-dodont]" did), plus the semantic step-11 validation text:
  // warning #ab6400 on #fcfcfd = 4.49 and success green-11 are the accepted step-11 seam (Radix's tuned
  // step-11 lands 4.40–4.49 on a near-white page; the token suite floors these roles at 4.39, axe wants
  // 4.5 with no slack). The error tone is added here because narrowing the do/don't carve-out surfaced it:
  // #ce2c31 on the #fbe8ea invalid-field wash = 4.42, the same unruled tone-on-tint gap as Callout/Badge.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL, "[style*='--ds-text-warning']", '[data-field-part="message"][data-tone="warning"]', "[style*='--ds-text-success']", '[data-field-part="message"][data-tone="success"]', "[style*='--ds-text-error']", '[data-field-part="message"][data-tone="error"]'] } } },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="TextField · Usage" standfirst={DEFINITION} />

      <Section
        title="Validation states"
        lead={<>Four tones, driven by the toolbar above — <strong>Accent</strong> re-skins the semantics (a grass brand shifts success→lime), <strong>Size</strong> scales them, <strong>Appearance</strong> flips light and dark. Each paints a border, a faint tint, a status glyph, and a single-sentence message; the value text stays neutral throughout.</>}
      >
        <Box data-testid="validation-grid">
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
            <TextField label="Email" defaultValue="ada@@example" validation={{ tone: "error", message: "Enter a valid email address." }} />
            <TextField label="Username" defaultValue="ADMIN" validation={{ tone: "warning", message: "Avoid reserved words like “admin”." }} />
            <TextField label="Workspace URL" defaultValue="acme" validation={{ tone: "success", message: "This URL is available." }} />
          </Grid>
        </Box>
        <Caption>
          <strong>error</strong> blocks submission and takes <Code>role="alert"</Code>;{" "}
          <strong>warning</strong> cautions without blocking; <strong>success</strong> confirms. The
          glyph and the wording carry the meaning together, so the state survives without colour. For
          calm, always-present guidance, prefer the persistent <Code>description</Code> helper over a
          validation tone. A fourth tone, <Code>info</Code>, is a flexible secondary slot — neutral,
          non-blocking, not a validation peer — applied at your discretion when none of the three fit.
        </Caption>
      </Section>

      <Rule />

      <Section title="Disabled vs. read-only" lead="Two different intents. A disabled field can’t be focused, copied, or submitted — it’s out of play, intentionally low-contrast (WCAG-exempt). A read-only field is fully focusable and its value is selectable and submitted with the form — it just can’t be edited. Prefer read-only when the user still needs to read or copy the value.">
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="3">
          <Flex direction="column" gap="2" style={{ maxWidth: 320 }}>
            <Box data-testid="disabled-field">
              <TextField label="Plan" defaultValue="Enterprise" disabled>
                <TextField.Slot>
                  <Lock />
                </TextField.Slot>
              </TextField>
            </Box>
            <Caption><strong>Disabled</strong> — dimmed and inert; not focusable, not submitted. With no validation, no message row renders.</Caption>
          </Flex>
          <Flex direction="column" gap="2" style={{ maxWidth: 320 }}>
            <Box data-testid="readonly-field">
              <TextField label="Account ID" defaultValue="acc_8f2c91" readOnly description="Read-only — select to copy.">
                <TextField.Slot>
                  <Lock />
                </TextField.Slot>
              </TextField>
            </Box>
            <Caption><strong>Read-only</strong> — full contrast, focusable and selectable, submitted with the form; the value just can’t be changed.</Caption>
          </Flex>
        </Grid>
      </Section>

      <Rule />

      <Section title="Label & placeholder — different jobs" lead="The label names the field; the placeholder hints at the value. Don’t make one do the other’s job.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="A persistent label names the field; the placeholder shows an example or format. Both survive once the user types.">
            <Box style={{ width: 240 }}><TextField label="Workspace URL" placeholder="acme-team" /></Box>
          </DoDont>
          <DoDont kind="dont" bare note="A placeholder used as the label vanishes the moment the user types — they lose the field’s name — and its low contrast fails WCAG 4.1.2. Never make the placeholder do the label’s job.">
            <Box style={{ width: 240 }}><TextField aria-label="Workspace URL" placeholder="Workspace URL" /></Box>
          </DoDont>
        </Grid>
        <Caption>
          A visible <strong>label</strong> is the default and almost always right. You may omit it only when the
          field’s purpose is unmistakable from context — a lone <strong>search</strong> field in a toolbar —
          and even then the control still needs an <Code>aria-label</Code> for its accessible name (the
          component warns in dev if a field has neither a <Code>label</Code> nor an <Code>aria-label</Code>).
        </Caption>
      </Section>

      <Rule />

      <Section title="Focus ring" lead="The focus ring is the accent fill (--ds-stroke-focus) with a Radix alpha (--ds-stroke-focus-stack) stacked on top. It is 2px wide and sits 2px out, the same ring every control wears ([[focus-ring]]). The specimen below is auto-focused so the ring is visible at rest, not only when you tab to it.">
        <Box data-testid="focus-specimen" style={{ maxWidth: 320 }}>
          <FocusedSpecimen />
        </Box>
        <Caption>
          Each accent and mode takes the lightest alpha that lifts the ring to 3:1 and APCA Lc 30 against
          the page, cards and tints, so a pale brand (amber, sky) still shows a clear ring. In a
          validation state, focus recolors the border stroke to the family (no halo), so the field also signals
          its tone.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Icon order — persistent anchors out, transient sits in"
        lead="The left lane identifies the field (a globe, lock, mail) and rarely changes. The right lane is for action. When several controls share one side, the most persistent control anchors outermost (right-most) and transient or conditional controls sit inward, nearest the text — so dismissing one only reflows the text, and the anchored controls never jump. The two fields below are live: type or toggle them."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="4" data-size-lesson="inset affordances hold step 1 — a ≥24×24 target inside the field, whatever step the field takes">
          <Flex direction="column" gap="2" style={{ maxWidth: 340 }}>
            <Box data-testid="search-loading"><SearchLoadingField /></Box>
            <Caption>
              <strong>Availability check.</strong> A globe identifies the field on the left. In the
              trailing lane a transient spinner sits <strong>inward</strong> (nearest the text) and the
              persistent clear ✕ <strong>anchors right</strong> on an <Code>inset</Code> IconButton.
              Clear the field: the text reflows, but the lane order — spinner inward, clear outward —
              never jumps.
            </Caption>
          </Flex>
          <Flex direction="column" gap="2" style={{ maxWidth: 340 }}>
            <Box data-testid="password-reveal"><PasswordRevealField /></Box>
            <Caption>
              <strong>Password reveal.</strong> The lock identifies on the left; the reveal toggle
              anchors right on an <Code>inset</Code> IconButton and persists whether the value is masked
              or shown — so toggling visibility never shifts the control’s position.
            </Caption>
          </Flex>
        </Grid>
        <Caption>
          In-field controls use an <Code>inset</Code> IconButton — a ghost variant with a{" "}
          <Code>data-inset</Code> marker and a <strong>≥24×24 hit target</strong> (WCAG 2.5.8 Target
          Size), so a small ✕ or eye is still comfortably tappable.
        </Caption>
      </Section>

      <Rule />

      <Section title="Keep a validation message to one imperative sentence" lead="A validation message earns attention by being short and actionable. One imperative sentence tells the user exactly what to do; a paragraph buries the fix and stretches the field’s footprint.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="One imperative sentence — the user reads it at a glance and knows the next move.">
            <Box data-testid="dodont-do">
              <TextField label="Password" defaultValue="hunter2" validation={{ tone: "error", message: "Use at least 12 characters." }} />
            </Box>
          </DoDont>
          <DoDont kind="dont" bare note="A wall of text in the validation row — the actual fix is buried, and the field’s footprint balloons. Move background and policy into help text or the info tooltip; keep the message to the single corrective action.">
            <Box data-testid="dodont-dont">
              <TextField
                label="Password"
                defaultValue="hunter2"
                validation={{
                  tone: "error",
                  message:
                    "Your password does not meet our security requirements. Passwords must be at least 12 characters long and include an uppercase letter, a lowercase letter, a number, and a special character. They also cannot reuse any of your last five passwords or contain your username, and they expire every 90 days.",
                }}
              />
            </Box>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <Section
        title="Description — a persistent helper line"
        lead={<>A <Code>description</Code> is a calm, always-present hint under the input — guidance that holds while the field is at rest, wired into <Code>aria-describedby</Code> so a screen reader announces it with the control. When the field enters a validation state the <strong>message replaces it</strong> in the same support-text slot, carrying corrective copy that steers toward the fix — so the field never stacks a redundant helper and message.</>}
      >
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
          <Box data-testid="desc-only">
            <TextField label="Workspace name" defaultValue="acme" description="Lowercase letters and dashes only." />
          </Box>
          <Box data-testid="desc-plus-validation">
            <TextField
              label="Workspace name"
              defaultValue="Acme Inc"
              description="Lowercase letters and dashes only."
              validation={{ tone: "error", message: "Remove spaces and capitals — lowercase and dashes only." }}
            />
          </Box>
        </Grid>
        <Caption>
          Left: at rest, the calm helper. Right: the same field with an invalid value — the message has{" "}
          <strong>replaced</strong> the helper in the support slot, with copy that steers toward the fix, and{" "}
          <Code>aria-describedby</Code> points to whichever single line is shown.
        </Caption>
      </Section>

      <Rule />

      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="The resting field plus each validation tone, with the tokens that paint them. Semantic tones are accent-aware — they follow a brand’s collision shifts (a grass brand’s success reads lime, a red brand’s error reads oxblood). Every row below is READ OFF the part it names on a rendered field and checked against the role it claims, so the table can disagree with the component rather than echo it.">
          <Flex direction="column" gap="4">
            <TokenGroup label="DEFAULT (rest)" blurb="The neutral field with no validation — a surface border + fill and neutral value text; on focus it gains the system ring, the accent with a stacked alpha ([[focus-ring]])." specimen={<Box style={{ width: 220 }}><TextField label="Workspace URL" defaultValue="acme" description="Lowercase letters and dashes only." /></Box>}>
              <MeasuredSpec render={() => <TextField label="Workspace URL" defaultValue="acme" description="Lowercase letters and dashes only." />}>
                <MeasuredRow
                  part="Value text"
                  note="Declared on the field box; the input inherits it, so the ink never moves with a tone."
                  token="--ds-text-strong"
                  select=".rt-TextFieldRoot"
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
                  note="Drawn on the outline while the input holds focus. The accent base, with the stack alpha on top, 2px ([[focus-ring]])."
                  token="--ds-stroke-focus"
                  select=".rt-TextFieldRoot"
                  prop="outline-color"
                  state="focus"
                />
              </MeasuredSpec>
              <NoteRow part="Border (rest)" value="Radix surface — inset 1px" radix="--gray-a7" />
              <NoteRow part="Surface fill" value="translucent white over base" radix="--gray-surface" />
            </TokenGroup>
            <TokenGroup label="ERROR" blurb="A blocking problem with the value — the field can’t be submitted as-is." specimen={<Box style={{ width: 220 }}><TextField label="Email" defaultValue="ada@@example" validation={{ tone: "error", message: "Enter a valid email address." }} /></Box>}>
              <MeasuredSpec render={() => <TextField label="Email" defaultValue="ada@@example" validation={{ tone: "error", message: "Enter a valid email address." }} />}>
                <MeasuredRow part="Tint (fill)" note="The faint wash the field box takes while the tone is active." token="--ds-fill-error-weak" select=".rt-TextFieldRoot" prop="background-color" />
                <MeasuredRow part="Message + glyph" note="Read off the status mark; the message beside it shares the ink." token="--ds-text-error" select="[data-validation='error'] svg" prop="color" />
              </MeasuredSpec>
              <NoteRow part="Border" value="inset 1px ring — the family step-8 stroke" radix="--ds-stroke-error" />
            </TokenGroup>
            <TokenGroup label="WARNING" blurb="A caution worth flagging — the value is accepted but may not be what was intended." specimen={<Box style={{ width: 220 }}><TextField label="Username" defaultValue="ADMIN" validation={{ tone: "warning", message: "Avoid reserved words like “admin”." }} /></Box>}>
              <MeasuredSpec render={() => <TextField label="Username" defaultValue="ADMIN" validation={{ tone: "warning", message: "Avoid reserved words like “admin”." }} />}>
                <MeasuredRow part="Tint (fill)" note="The faint wash the field box takes while the tone is active." token="--ds-fill-warning-weak" select=".rt-TextFieldRoot" prop="background-color" />
                <MeasuredRow part="Message + glyph" note="Read off the status mark; the message beside it shares the ink." token="--ds-text-warning" select="[data-validation='warning'] svg" prop="color" />
              </MeasuredSpec>
              <NoteRow part="Border" value="inset 1px ring — the family step-8 stroke" radix="--ds-stroke-warning" />
            </TokenGroup>
            <TokenGroup label="SUCCESS" blurb="Positive confirmation — the value checked out (available, verified, valid)." specimen={<Box style={{ width: 220 }}><TextField label="Workspace URL" defaultValue="acme" validation={{ tone: "success", message: "This URL is available." }} /></Box>}>
              <MeasuredSpec render={() => <TextField label="Workspace URL" defaultValue="acme" validation={{ tone: "success", message: "This URL is available." }} />}>
                <MeasuredRow part="Tint (fill)" note="The faint wash the field box takes while the tone is active." token="--ds-fill-success-weak" select=".rt-TextFieldRoot" prop="background-color" />
                <MeasuredRow part="Message + glyph" note="Read off the status mark; the message beside it shares the ink." token="--ds-text-success" select="[data-validation='success'] svg" prop="color" />
              </MeasuredSpec>
              <NoteRow part="Border" value="inset 1px ring — the family step-8 stroke" radix="--ds-stroke-success" />
            </TokenGroup>
            <TokenGroup label="INFO (secondary)" blurb="A flexible secondary tone — neutral, with no judgement on the value. Not a validation peer; reach for it when you need a non-blocking, non-status note in the message slot." specimen={<Box style={{ width: 220 }}><TextField label="Subdomain" defaultValue="acme" validation={{ tone: "info", message: "You can change this later in settings." }} /></Box>}>
              <MeasuredSpec render={() => <TextField label="Subdomain" defaultValue="acme" validation={{ tone: "info", message: "You can change this later in settings." }} />}>
                <MeasuredRow part="Tint (fill)" note="The faint wash the field box takes while the tone is active." token="--ds-fill-info-weak" select=".rt-TextFieldRoot" prop="background-color" />
                <MeasuredRow part="Message + glyph" note="Read off the status mark; the message beside it shares the ink." token="--ds-text-info" select="[data-validation='info'] svg" prop="color" />
              </MeasuredSpec>
              <NoteRow part="Border" value="inset 1px ring — the family step-8 stroke" radix="--ds-stroke-info" />
            </TokenGroup>
            <TokenGroup label="ALL TONES" blurb="What a tone does NOT move — proved on a field that is wearing one.">
              <MeasuredSpec render={() => <TextField label="Email" defaultValue="ada@@example" validation={{ tone: "error", message: "Enter a valid email address." }} />}>
                <MeasuredRow
                  part="Value text"
                  note="Read off a field in an error state — the ink stays neutral; the semantic lives in the chrome."
                  token="--ds-text-strong"
                  select=".rt-TextFieldRoot"
                  prop="color"
                />
                <MeasuredRow
                  part="Focus ring"
                  note="Read off the same toned field — the ring is held constant across every tone."
                  token="--ds-stroke-focus"
                  select=".rt-TextFieldRoot"
                  prop="outline-color"
                  state="focus"
                />
              </MeasuredSpec>
              <NoteRow part="Border (step)" value="--ds-stroke-{fam} = family step-8" radix="—" />
            </TokenGroup>
            <TokenGroup label="SIZE LANE">
              <NoteRow part="Size 1 · small" value="height 24px · radius 4px · icon lane 16px" radix="--radius-2" />
              <NoteRow part="Size 2 · medium" value="height 32px · radius 4px · icon lane 20px" radix="--radius-2" />
              <NoteRow part="Size 3 · large" value="height 40px · radius 6px · icon lane 24px" radix="--radius-3" />
            </TokenGroup>
          </Flex>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    const near = (a: number, b: number, tol = 4) => Math.abs(a - b) <= tol;
    const colorRe = /rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|color\([^)]*\)/g;

    // 1. Each tone's input border RESOLVES TO --ds-stroke-{tone} — presence alone is a false
    //    positive, because the neutral default ALSO carries a box-shadow border (carries ErrorPaint).
    //    info is demoted to a secondary slot, so the featured grid asserts error/warning/success only.
    const tones = ["error", "warning", "success"] as const;
    for (const tone of tones) {
      const w = canvasElement.querySelector<HTMLElement>(`[data-validation="${tone}"]`);
      if (!w) throw new Error(`missing ${tone} specimen`);
      const root = w.querySelector<HTMLElement>(".rt-TextFieldRoot");
      if (!root) throw new Error(`${tone} specimen has no .rt-TextFieldRoot`);
      const shadow = getComputedStyle(root).boxShadow;
      if (shadow === "none") throw new Error(`${tone} input must carry a border`);
      const want = resolveColor(w, `--ds-stroke-${tone}`);
      const toks = shadow.match(colorRe) || [];
      if (!toks.some((t) => { const c = parseColor(t); return near(c.r, want.r) && near(c.g, want.g) && near(c.b, want.b); })) {
        throw new Error(`${tone} border must resolve to --ds-stroke-${tone} rgb(${want.r},${want.g},${want.b}); got box-shadow ${shadow}`);
      }
    }

    // The error input is the reference for the value-text + focus-ring assertions.
    const errRoot = canvasElement.querySelector<HTMLElement>('[data-validation="error"] .rt-TextFieldRoot');
    if (!errRoot) throw new Error("error root not rendered");
    const errInput = errRoot.querySelector<HTMLInputElement>("input");
    if (!errInput) throw new Error("error input not rendered");

    // 2. Value text stays NEUTRAL in a validation state — only border/tint/message carry the semantic.
    //    Resolve --ds-text-strong against the ROOT (a void <input> can't host the probe span).
    const neutral = resolveColor(errRoot, "--ds-text-strong");
    const v = parseColor(getComputedStyle(errInput).color);
    if (!(near(v.r, neutral.r, 6) && near(v.g, neutral.g, 6) && near(v.b, neutral.b, 6))) {
      throw new Error(`input value text must stay --ds-text-strong; got rgb(${v.r},${v.g},${v.b})`);
    }

    // 3. Disabled specimen renders a disabled input and suppresses the validation row.
    const disabled = canvasElement.querySelector<HTMLElement>('[data-testid="disabled-field"]');
    if (!disabled?.querySelector("input:disabled")) throw new Error("missing disabled specimen");
    if (disabled.querySelector("[data-validation]")) throw new Error("disabled field must not show a validation row");

    // 3b. Read-only specimen is DISTINCT from disabled: readonly + focusable (not disabled).
    const readonly = canvasElement.querySelector<HTMLElement>('[data-testid="readonly-field"]');
    const roInput = readonly?.querySelector<HTMLInputElement>("input");
    if (!roInput) throw new Error("missing read-only specimen");
    if (!roInput.readOnly) throw new Error("read-only field must set the input readonly");
    if (roInput.disabled) throw new Error("read-only must NOT be disabled (it stays focusable/submittable)");
    roInput.focus();
    if (document.activeElement !== roInput) throw new Error("read-only input must be focusable");

    // 4. Focus ring: the [[focus-ring]] ring, 2px wide and 2px out, the same on every control. The field's own
    //    outline is the geometry; ::before paints the accent base (--ds-stroke-focus) and ::after the
    //    stack alpha (--ds-stroke-focus-stack) on top. A validation state recolors ONLY the border stroke
    //    to the family, no halo (ruled 2026-07-08, superseding the halo the first neutral focus ring kept). Radix keys focus off
    //    plain :focus.
    errInput.focus();
    if (document.activeElement !== errInput) throw new Error("error input did not receive focus");
    const cs = getComputedStyle(errRoot);
    // Our 2px override (Radix 3.3.0 rings inputs at -1px; [[input-focus-ring-offset]]). Round for sub-pixel rendering under
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

    // 5. Inset in-field control (moved here from IconButton's InsetHitTarget story): the search
    //    clear button is an inset IconButton (data-inset) with a >=24x24 hit target (WCAG 2.5.8).
    const clear = canvasElement.querySelector<HTMLElement>('[data-testid="search-clear"]');
    if (!clear) throw new Error("missing inset clear button in the search specimen");
    if (clear.getAttribute("data-inset") !== "true") throw new Error("in-field clear must be an inset IconButton (data-inset)");
    const cr = clear.getBoundingClientRect();
    if (cr.width < 24 || cr.height < 24) {
      throw new Error(`inset hit target must be >=24x24 (WCAG 2.5.8), got ${cr.width.toFixed(1)}x${cr.height.toFixed(1)}`);
    }

    // 6. Icon-order invariant: while present, the inset clear anchors near the field's right edge
    //    (the dismissal-reflow behaviour itself — text reflows, anchor holds — is visual/live).
    const searchField = canvasElement.querySelector<HTMLElement>('[data-testid="search-loading"] .rt-TextFieldRoot');
    if (searchField) {
      const gap = searchField.getBoundingClientRect().right - clear.getBoundingClientRect().right;
      if (gap > 24) throw new Error(`inset clear should anchor near the field's right edge; gap was ${gap.toFixed(1)}px`);
    }

    // 7. Description ⇄ validation-message single-slot rule (folded from the former Field API story):
    //    the persistent description carries an id + is referenced by aria-describedby; a validation
    //    message REPLACES it (description not rendered) and aria-describedby points at the message only.
    const descOnly = canvasElement.querySelector<HTMLElement>('[data-testid="desc-only"]');
    if (!descOnly) throw new Error("missing desc-only specimen");
    const dInput = descOnly.querySelector<HTMLInputElement>("input");
    if (!dInput) throw new Error("desc-only has no input");
    const desc = descOnly.querySelector<HTMLElement>('[data-field-part="description"]');
    if (!desc) throw new Error("description helper line did not render");
    if (!desc.id) throw new Error("description must carry an id for aria-describedby");
    if (!desc.textContent?.includes("Lowercase letters")) throw new Error("description text missing");
    if (!(dInput.getAttribute("aria-describedby") || "").split(/\s+/).includes(desc.id)) {
      throw new Error(`aria-describedby must include the description id "${desc.id}"`);
    }
    const both = canvasElement.querySelector<HTMLElement>('[data-testid="desc-plus-validation"]');
    if (!both) throw new Error("missing desc-plus-validation specimen");
    const bInput = both.querySelector<HTMLInputElement>("input");
    const bMsg = both.querySelector<HTMLElement>('[role="alert"]');
    if (!bInput || !bMsg) throw new Error("desc-plus-validation must render input + message");
    if (both.querySelector('[data-field-part="description"]')) {
      throw new Error("description must be REPLACED (not rendered) when a validation state is active");
    }
    if (!bMsg.id) throw new Error("validation message must carry an id");
    const bIds = (bInput.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
    if (bIds.length !== 1 || !bIds.includes(bMsg.id)) {
      throw new Error(`aria-describedby should point only at the message when validation is active; got "${bInput.getAttribute("aria-describedby")}"`);
    }
  },
};

// Info affordance for the Props: a 16px regular Info glyph in the neutral icon tone, wrapped so
// `text` surfaces as a tooltip. Built from a primitive string so it's never a raw-object control.
function InfoAffordance({ text }: { text: string }) {
  const glyph = (
    <span style={{ display: "inline-flex", color: "var(--ds-icon-neutral)" }} title={text} aria-label={text}>
      <Info size={16} weight="regular" aria-hidden style={{ display: "block" }} />
    </span>
  );
  return <Tooltip content={text}>{glyph}</Tooltip>;
}

/* ---- Properties (TextField-specific) ------------------------------------- */

const TEXTFIELD_PROPS: PropDef[] = [
  { name: "label", type: "ReactNode", desc: <>The field’s name — renders the shared <Code>Field.Label</Code> and sets the input’s accessible name via <Code>htmlFor</Code>→<Code>id</Code>. Omit label/description/validation to keep the field bare (then pass <Code>aria-label</Code>).</>, source: "TextField.tsx:11" },
  { name: "description", type: "ReactNode", desc: <>Persistent helper line under the input; a validation <Code>message</Code> <strong>replaces</strong> it in the same slot when a tone is active.</>, source: "TextField.tsx:15" },
  { name: "validation", type: `{ tone; message }`, desc: <>Accent-aware validation — border + faint tint + status glyph + one-line message from the family tokens. <Code>tone</Code>: <Code>error | warning | success | info</Code>.</>, source: "TextField.tsx:16" },
  { name: "info", type: "ReactNode", desc: <>Optional inline affordance beside the label — a tip icon or helper toggle.</>, source: "TextField.tsx:12" },
  { name: "endSlot", type: "ReactNode", desc: <>Optional pinned note at the far end of the label row — “Optional”, a counter, an action.</>, source: "TextField.tsx:13" },
  { name: "variant", type: `"surface"`, locked: true, desc: <>Locked to <Code>surface</Code> — <Code>soft</Code>, <Code>outline</Code>, and <Code>classic</Code> aren’t exposed, so an input can’t drift off-system.</>, source: "TextField.tsx:10 · 23" },
  { name: "size", type: `"1" | "2" | "3"`, def: `"1"`, desc: <>Control size. Unset, it resolves from the global <Code>uiSize</Code> (default <Code>small</Code> → <Code>1</Code>); Radix’s own default is <Code>2</Code>.</>, source: "TextField.tsx:20 · Radix" },
  { name: "placeholder", type: "string", desc: <>Hint text <em>inside</em> the field (an example or format) — greyed, and <strong>not</strong> a label.</>, source: "Radix" },
  { name: "type", type: `"text" | "password" | "email" | …`, def: `"text"`, desc: <>Native input type.</>, source: "Radix" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Dimmed and inert — not focusable, not submitted.</>, source: "Radix" },
  { name: "readOnly", type: "boolean", def: "false", desc: <>Full contrast, focusable and selectable, submitted — just not editable.</>, source: "Radix" },
  { name: "value / defaultValue", type: "string", desc: <>Controlled / uncontrolled value.</>, source: "Radix" },
  { name: "onChange", type: "(e) => void", desc: <>Fires on input.</>, source: "Radix" },
  { name: "children", type: "TextField.Slot", desc: <>Leading / trailing content via <Code>&lt;TextField.Slot&gt;</Code> (<Code>side="right"</Code> for the trailing lane) — an identifying icon, a text affix, or an <Code>inset</Code> IconButton.</>, source: "Radix" },
];

/** Props — a prototyping tool for the field. Drive EVERY part from Controls: the label row (toggle
 *  + text), the info affordance (+ tooltip text), the end-slot, a leading icon, the trailing element
 *  (editable suffix / clear / reveal), validation tone, size, width, and the disabled / read-only states. */
type PropsArgs = Omit<TextFieldProps, "info" | "endSlot" | "size"> & {
  /** "auto" = leave `size` unset so the field tracks the global uiSize toolbar. */
  size?: "auto" | "1" | "2" | "3";
  leadingIcon?: ReactNode;
  trailing?: "none" | "suffix" | "clear" | "reveal";
  width?: number;
  showLabel?: boolean;
  showInfo?: boolean;
  infoText?: string;
  endSlot?: string;
  suffix?: string;
};

export const Props: StoryObj<PropsArgs> = {
  args: {
    showLabel: true,
    label: "Email",
    showInfo: false,
    infoText: "We never share your email.",
    endSlot: "",
    placeholder: "you@example.com",
    description: "We’ll only use this to send receipts.",
    size: "auto",
    leadingIcon: "mail" as unknown as ReactNode,
    trailing: "none",
    suffix: ".com",
    width: 360,
  },
  argTypes: {
    showLabel: {
      name: "label row (show)",
      control: "boolean",
      description:
        "Toggles the whole label row. Off ⇒ label is removed and an aria-label is supplied so the " +
        "field keeps an accessible name. (Clearing the label text to \"\" still renders an empty row, " +
        "because the row shows whenever label != null — so the row is gated by this boolean.)",
    },
    label: { name: "label text", control: "text", if: { arg: "showLabel" } },
    showInfo: { name: "info (show)", control: "boolean" },
    infoText: { name: "info text", control: "text", description: "Tooltip text for the info icon beside the label.", if: { arg: "showInfo" } },
    endSlot: {
      name: "end-slot text",
      control: "text",
      description: "Pinned note at the far end of the label row (e.g. “Optional”). Empty ⇒ no end-slot.",
    },
    placeholder: { control: "text" },
    description: { name: "description (helper)", control: "text" },
    leadingIcon: {
      name: "leading icon",
      control: "select",
      options: ["none", "globe", "mail", "lock", "user", "calendar", "currency"],
      mapping: {
        none: null,
        globe: <Globe />,
        mail: <Envelope />,
        lock: <Lock />,
        user: <User />,
        calendar: <CalendarBlank />,
        currency: <CurrencyDollar />,
      },
    },
    trailing: { name: "trailing element", control: "inline-radio", options: ["none", "suffix", "clear", "reveal"] },
    suffix: { name: "suffix text", control: "text", description: "The text suffix shown when trailing = “suffix”.", if: { arg: "trailing", eq: "suffix" } },
    validation: {
      control: "inline-radio",
      options: ["none", "error", "warning", "success", "info"],
      mapping: {
        none: undefined,
        error: { tone: "error", message: "Enter a valid email address." },
        warning: { tone: "warning", message: "This address looks unusual." },
        success: { tone: "success", message: "This address is verified." },
        info: { tone: "info", message: "We’ll only use this for receipts." },
      },
    },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step pins the field.' },
    width: { control: { type: "range", min: 200, max: 560, step: 20 } },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
  },
  // re-enable Controls here (it's disabled at the meta level for the curated docs stories)
  parameters: { controls: { disable: false } },
  render: ({ showLabel, label, showInfo, infoText, endSlot, leadingIcon, trailing, suffix, width, size, ...rest }) => {
    const info = showInfo ? <InfoAffordance text={infoText ?? ""} /> : undefined;
    const endSlotNode = endSlot ? <Text size="1" style={{ color: "var(--ds-text-weak)" }}>{endSlot}</Text> : undefined;
    const labelNode = showLabel ? label : undefined;
    const ariaLabel = showLabel ? undefined : (typeof label === "string" && label) || "Field";
    // "auto" = pass no `size`, so the field (and the suffix text riding its font-size) tracks the toolbar.
    const controlSize = size === "auto" ? undefined : size;
    return (
      <Page maxWidth="none">
        <PageHeader title="TextField · Props" standfirst={DEFINITION} />
        <Box p="5" style={{ maxWidth: width }}>
        <TextField size={controlSize} label={labelNode} info={info} endSlot={endSlotNode} aria-label={ariaLabel} {...rest}>
          {leadingIcon ? <TextField.Slot>{leadingIcon}</TextField.Slot> : null}
          {trailing === "suffix" ? (
            <TextField.Slot>
              <Text size={controlSize} style={{ color: "var(--ds-text-weak)" }}>{suffix || ".com"}</Text>
            </TextField.Slot>
          ) : null}
          {trailing === "clear" ? (
            <TextField.Slot side="right">
              <IconButton inset size="1" aria-label="Clear"><X weight="bold" /></IconButton>
            </TextField.Slot>
          ) : null}
          {trailing === "reveal" ? (
            <TextField.Slot side="right">
              <IconButton inset size="1" aria-label="Show value"><Eye weight="bold" /></IconButton>
            </TextField.Slot>
          ) : null}
        </TextField>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>TextField</Code> accepts — the <Code>Field</Code>-shell props (<Code>label</Code>, <Code>description</Code>, <Code>validation</Code>, <Code>info</Code>, <Code>endSlot</Code>) plus the Radix input pass-throughs. <Code>variant</Code> is locked to <Code>surface</Code>.</>}>
          <PropTable rows={TEXTFIELD_PROPS} />
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="TextField · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[soft-variant-scope]] · Surface only">
            Inputs use <Code>surface</Code> only — <Code>soft</Code> is banned on interactive
            controls, and <Code>outline</Code>/<Code>classic</Code> aren’t exposed. A surface input
            is identifiable, separated from the background, and gives hover feedback.
          </Decision>
          <Decision id="[[docs-page-spine]] · Live-read token spec">
            The token spec on the Usage page is read <strong>live from the CSS</strong> — every
            swatch and hex resolves from the running theme, the Radix alias is parsed from the token
            source — so this documentation can’t drift from the code.
          </Decision>
          <Decision id="[[text-on-solid-fill-contrast]] · Alpha validation tint">
            The validation tint is an <strong>alpha fill</strong> (<Code>--ds-fill-&#123;fam&#125;-weak</Code>{" "}
            = step-a3), not a solid step-9, so it stays a faint wash over the field. The message sits at
            step-11 (<Code>--ds-text-&#123;fam&#125;</Code>) on the base background, clearing the 4.5:1 text floor.
          </Decision>
          <Decision id="[[focus-ring]] · Focus ring">
            Radix’s <Code>accent-8</Code> ring measured 2.46:1 and failed 1.4.11. The system then swapped it for a
            neutral <Code>gray-12</Code> hairline. [[focus-ring]] replaces that hairline with the one ring every
            control wears: the accent fill, <Code>--ds-stroke-focus</Code>, with a Radix alpha,{" "}
            <Code>--ds-stroke-focus-stack</Code>, stacked on top. Each accent and mode takes the lightest
            alpha that clears 3:1 and APCA Lc 30. It is 2px wide and sits 2px out. It overrides{" "}
            <strong>Radix’s own</strong> <Code>:has(.rt-TextFieldInput:focus)</Code> wrapper rule (no
            parallel focus class, no <Code>!important</Code>). A validation state recolors the border
            stroke to the family (no halo).
          </Decision>
          <Decision id="[[field-shell]] · Shared Field shell">
            The canonical input architecture: a shared <Code>Field</Code> shell owns the label and
            validation rows and threads aria via context. Validation paints the input
            border + tint + status glyph + message from the accent-aware family tokens via{" "}
            <Code>[data-validation]</Code>; in a validation state, focus recolors the border stroke to the family’s step-8 and nothing else — the focus ring is held constant. In-field controls use an <Code>inset</Code> IconButton
            (≥24×24 hit target).
          </Decision>
          <Decision id="[[support-text-slot]] · One support-text slot">
            One support-text slot under the input, two sources. An optional <Code>description</Code> is a{" "}
            <strong>persistent</strong> helper — calm, neutral guidance shown while the field is at rest. A
            validation <Code>message</Code> is <strong>conditional</strong> and <strong>replaces</strong>{" "}
            it when a state is active, carrying corrective copy — so the field never stacks a redundant
            helper and message, and <Code>aria-describedby</Code> points to whichever line is shown. For
            this reason <Code>info</Code> is not a validation peer — it’s a flexible secondary tone, not the
            home for steady guidance; reach for <Code>description</Code> first.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Added an optional, persistent <Code>description</Code> helper slot on <Code>Field</Code>/
            <Code>TextField</Code> — calm guidance at rest, wired into <Code>aria-describedby</Code>; a
            validation message <strong>replaces</strong> it in the same support slot when active (no
            redundant stacking). The Anatomy diagram now leads with the <strong>neutral default</strong>{" "}
            state, decomposed into its real slots, with validation moved to its own specimen, and the
            token table gained a <strong>DEFAULT (rest)</strong> group. <Code>info</Code> is{" "}
            <strong>demoted</strong> from the featured validation grid to a flexible secondary slot (still
            supported as a <Code>validation.tone</Code>). Added read-only, static-focus, and worked
            icon-order (search-loading, password-reveal) specimens.
          </Decision>
          <Decision id="0.9.0">
            Initial component — a single-line text input on the shared <Code>Field</Code> shell, with
            accent-aware validation (border + tint + status glyph + one-line message), a Radix-native
            focus ring (now [[focus-ring]]), and the value text held neutral. Stories on the standard
            template: History · Anatomy · Usage · Props.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
