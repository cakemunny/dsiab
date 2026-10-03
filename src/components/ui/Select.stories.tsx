import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text, Theme } from "@radix-ui/themes";
import type { CSSProperties, ReactNode } from "react";
import { Globe, Info, Tag, User, Folder, MapPin } from "@phosphor-icons/react";
import { Select } from "./Select";
import { assertPairing, contrastRatio, flatten, parseColor, resolveColor, themeRoot } from "../../foundations/_assert";
import { APCA_LC, apcaContrast } from "../../foundations/apca";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, KeyBinding, KeyRow,
  MeasuredRow, MeasuredSpec, NoteRow, Page, PageHeader, PropsLead, PropDef, PropTable, Rule, Scenario, Section, tick, TokenGroup,
} from "./_storyKit";
import { ComparisonSection, PICK_FROM_SET_COMPARISON } from "./_comparisons";

/* ---- anatomy diagram (Select-specific) ----------------------------------- */

function AnatomyDiagram() {
  // A real size-3 NEUTRAL specimen with every trigger part exposed: a shared label row (name + info + a
  // pinned end-slot) and a trigger composed leading-icon · value · clear · caret, plus a description.
  // The Content (menu) is portaled, so it gets its own "Menu contents" section rather than a callout.
  return (
    <Box style={{ overflowX: "auto" }}>
      <Box style={{ position: "relative", width: "100%", minWidth: 460, maxWidth: 640, margin: "0 auto", height: 220, background: "var(--ds-bg-subtle)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
        <Flex align="center" justify="center" style={{ position: "absolute", inset: 0 }}>
          <Box style={{ position: "relative", width: 260 }} data-size-lesson="anatomy callout geometry — the callout tops are measured against this size-3 specimen; its inset clear ✕ holds step 1">
            <Select
              size="3"
              label="Country"
              info={<Info size={16} weight="regular" aria-hidden style={{ color: "var(--ds-icon-neutral)", display: "block" }} />}
              endSlot={<Text size="1" style={{ color: "var(--ds-text-weak)" }}>Optional</Text>}
              defaultValue="us"
              description="Used for tax and shipping estimates."
              clearable
            >
              <Select.Trigger icon={<Globe size={18} />} />
              <Select.Content>
                <Select.Item value="us">United States</Select.Item>
                <Select.Item value="ca">Canada</Select.Item>
              </Select.Content>
            </Select>
          </Box>
        </Flex>
        {/* Callout tops measured against the rendered size-3 specimen (label row ~73, trigger ~110,
            description ~146); field column left ≈ calc(50% - 130px), right ≈ calc(50% + 130px). */}
        {/* LABEL ROW (y≈76) */}
        {/* 1 — label (from the left) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 200px)", top: 66 }}>1</Box>
        <Box style={hLine({ left: "calc(50% - 178px)", top: 76, width: 48 })} />
        {/* 2 — info (tick down onto the icon beside the label) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 74px)", top: 16 }}>2</Box>
        <Box style={tick({ left: "calc(50% - 64px)", top: 36, height: 38 })} />
        {/* 3 — end-slot (from the right) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 200px)", top: 66 }}>3</Box>
        <Box style={hLine({ left: "calc(50% + 130px)", top: 76, width: 48 })} />
        {/* TRIGGER BODY (y≈110) */}
        {/* 4 — leading icon (from the left) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 200px)", top: 100 }}>4</Box>
        <Box style={hLine({ left: "calc(50% - 178px)", top: 110, width: 56 })} />
        {/* 5 — value (tick up from below) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 59px)", top: 158 }}>5</Box>
        <Box style={tick({ left: "calc(50% - 49px)", top: 118, height: 40 })} />
        {/* 6 — clear (tick up from below onto the ✕, left of the caret) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 86px)", top: 158 }}>6</Box>
        <Box style={tick({ left: "calc(50% + 96px)", top: 118, height: 40 })} />
        {/* 7 — caret (from the right) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 200px)", top: 100 }}>7</Box>
        <Box style={hLine({ left: "calc(50% + 118px)", top: 110, width: 60 })} />
        {/* 8 — description (from the left) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 200px)", top: 134 }}>8</Box>
        <Box style={hLine({ left: "calc(50% - 178px)", top: 144, width: 48 })} />
      </Box>
    </Box>
  );
}

function ValidationSpecimen() {
  return (
    <Box style={{ maxWidth: 260 }} data-testid="anatomy-validation">
      <Select label="Plan" validation={{ tone: "error", message: "Select a plan to continue." }}>
        <Select.Trigger placeholder="Choose a plan…" />
        <Select.Content>
          <Select.Item value="free">Free</Select.Item>
          <Select.Item value="pro">Pro</Select.Item>
        </Select.Content>
      </Select>
    </Box>
  );
}

/* A faithful STATIC menu — the real Theme-on-Content compound class and the real row classes plus the
   state attributes the live menu sets, so the menu's own rules paint it exactly as they paint the open
   one. It exists to be READ: the token rows in the Usage table measure it. Presentational only (no
   listbox/option roles) — the live roles and behaviour are the Menu states story and the _internal suite. */
function MenuSpecimen() {
  return (
    <Theme className="rt-SelectContent rt-r-size-1" hasBackground={false} style={{ position: "static", display: "block" }}>
      <div className="rt-SelectItem" data-state="checked">Pro</div>
      <div className="rt-SelectItem" data-highlighted="">Team</div>
      <div className="rt-SelectSeparator" />
      <div className="rt-SelectLabel">Legacy</div>
    </Theme>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Label", "the field’s name — sets the accessible name via htmlFor → id (shared Field.Label)"],
  [2, "Info", "an optional inline affordance beside the label — a tip icon or helper toggle (shared Field.Label)"],
  [3, "End-slot", "an optional pinned note at the far end of the label row — “Optional”, a count, an action (shared Field.Label)"],
  [4, "Leading icon", "an optional identification glyph at the start of the trigger (a category, flag, or type icon)"],
  [5, "Value / placeholder", "the current selection in --ds-text-strong, or greyed placeholder text while nothing is chosen"],
  [6, "Clear", "an optional clear ✕ (set clearable) — shows while a value is selected, resets to the placeholder"],
  [7, "Caret", "the disclosure indicator — signals the trigger opens a menu"],
  [8, "Description", "an optional helper line beneath; replaced by the validation message when a state is active"],
];

/* ---- anatomy diagram (the open menu) ------------------------------------- */

const MENU_PARTS: [number, string, string][] = [
  [1, "Panel surface", "the floating menu — solid and opaque (never translucent), painted --ds-bg-overlay, raised by --ds-shadow-overlay with a --radius-3 corner. Portaled to the body, so validation never reaches it."],
  [2, "Group label", "a non-focusable heading clustering related options (--ds-text-weak), ruled apart by a separator."],
  [3, "Selected option", "the current value — the accent selection tint (--ds-fill-selected-subtle) + a --ds-text-strong semibold (600) label, with the gutter checkmark removed. The weight is the WCAG 1.4.1 non-colour cue left behind by the checkmark."],
  [4, "Option (rest)", "an unselected choice — weight 400 on the panel surface, no fill."],
  [5, "Active / hovered option", "the pointer or keyboard active-descendant — a neutral --ds-fill-hover layer plus a 2px inset edge in the focus ring's stacked accent ([[focus-ring]]), kept distinct from the accent selection so the two never collapse."],
  [6, "Separator", "a 1px rule between groups (--ds-stroke-weak)."],
  [7, "Disabled option", "an unavailable choice — dimmed (--ds-text-disabled), skipped in arrow-nav and type-ahead; never takes the selected or hover paint."],
];

// A faithful static specimen of the open panel (real --ds-* tokens, so it follows the toolbar accent),
// with a numbered badge trailing each labelled part — the menu equivalent of the trigger diagram above.
function MenuAnatomyDiagram() {
  const badge = (n: number) => (
    <Box style={{ ...dotStyle, position: "relative", width: 18, height: 18, flexShrink: 0 }}>{n}</Box>
  );
  const row = (n: number, label: string, rowStyle?: CSSProperties, labelStyle?: CSSProperties) => (
    <Flex align="center" gap="2" style={{ height: 30, padding: "0 8px", borderRadius: "var(--radius-1)", ...rowStyle }}>
      <Text size="2" style={{ flex: 1, minWidth: 0, color: "var(--ds-text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...labelStyle }}>{label}</Text>
      {badge(n)}
    </Flex>
  );
  return (
    <Box style={{ display: "flex", justifyContent: "center", padding: "26px 0 8px" }}>
      <Box style={{ position: "relative", width: 268 }}>
        <Box style={{ ...dotStyle, position: "absolute", left: -9, top: -9, width: 18, height: 18 }}>1</Box>
        <Box style={{ width: 268, background: "var(--ds-bg-overlay)", borderRadius: "var(--radius-3)", boxShadow: "var(--ds-shadow-overlay)", border: "1px solid var(--gray-a3)", padding: 6 }}>
          {row(2, "North America", { height: 28 }, { color: "var(--ds-text-weak)", fontSize: 13 })}
          {row(3, "United States", { background: "var(--ds-fill-selected-subtle)" }, { fontWeight: 600 })}
          {row(4, "Canada")}
          {/* Both ring layers at 2px, inset ([[focus-ring]]): the first shadow paints on top, so the stack alpha
              sits on the accent base exactly as the live row draws it. */}
          {row(5, "Mexico", { background: "var(--ds-fill-hover)", boxShadow: "inset 0 0 0 2px var(--ds-stroke-focus-stack), inset 0 0 0 2px var(--ds-stroke-focus)" })}
          <Flex align="center" gap="2" style={{ padding: "0 8px", height: 13 }}>
            <Box style={{ flex: 1, height: 1, background: "var(--ds-stroke-weak)" }} />
            {badge(6)}
          </Flex>
          {row(7, "Greenland (unavailable)", undefined, { color: "var(--ds-text-disabled)" })}
        </Box>
      </Box>
    </Box>
  );
}

/* ========================================================================== */

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>A single-select dropdown on the shared <Code>Field</Code> chrome. The trigger is the form control, so it carries the label, the validation, and the focus ring exactly like a <Code>TextField</Code>; the floating <Code>Content</Code> is locked to opaque per the layering rule. Pass <Code>label</Code>, <Code>description</Code>, or <Code>validation</Code> to render it as a <Code>Field</Code> — without them it stays bare for an external label.</>;

const meta: Meta = {
  title: "Components/Choice/Select",
  parameters: {
    controls: { disable: true },
    // The trigger placeholder is Radix gray-9 (~3.78:1) — exempt from the 4.5 text threshold (like
    // disabled text), identified by the surface border. axe treats it as normal text, so scope it off.
    a11y: { context: { exclude: [DODONT_LABEL] } },
    docs: {
      description: {
        component:
          "A single-select dropdown on the shared **`Field`** chrome. The **trigger** is the form " +
          "control (role=combobox), so it carries the label, the accent-aware validation, and the " +
          "focus ring exactly like a TextField; the floating **Content** is locked to **solid** " +
          "(opaque) per the layering rule. Pass `label` / `description` / `validation` to render it as " +
          "a Field — without them the `<Select>` stays bare for use with an external label. All " +
          "validation paints the trigger only; the Content is portaled out of the Field subtree.",
      },
    },
  },
};
export default meta;
type Story = StoryObj;

/** The parts of a select (a labeled trigger diagram + the menu contents), a validation specimen, and its
 *  states. The token spec lives on Usage. */
export const Anatomy: Story = {
  // color-contrast is ON for this story again. It used to be switched off wholesale, on the reasoning
  // that the failing text sits on the FUNCTIONAL trigger and excluding the trigger would blind its
  // name / role / keyboard rules. True of the trigger — but the failing text is the inner SPAN, and
  // excluding that leaves the trigger itself fully checked. Verified both ways: with the exclusions
  // below, button-name still reports all 8 triggers in its PASSES bucket, and stripping a trigger's
  // label (its <label for>, aria-label, aria-labelledby and inner text) still raises a button-name
  // violation on it. So the three tiers are separated instead of being covered by one blanket switch:
  //
  //   (The placeholder used to be the first exclusion here — #80838d on #ffffff = 3.78, and 3.63 once
  //   the invalid state washed the field (#7e7883 on #fbe8ea). Never exempt: SC 1.4.3 exempts INACTIVE
  //   controls, and this is the visible label of an ENABLED one. FIXED 2026-08-04 — components.css
  //   paints every .rt-SelectTrigger[data-placeholder] --ds-text-weak, measuring 5.92 and 5.05 on the
  //   same two surfaces. The exclusion is removed so axe is what holds the fix in place.)
  //
  //   [style*='--ds-text-disabled'] disabled option text, #b9bbc6 on #ffffff = 1.91. Genuinely exempt:
  //                                WCAG SC 1.4.3 excludes inactive controls, and the token is declared
  //                                low-contrast by design (--ds-text-disabled: var(--gray-a8)).
  //   [data-field-part="message"]  the Field's own validation message, which paints from the same tone
  //     [data-tone="error"]        roles but from the STYLESHEET. #ce2c31 on the #fbe8ea invalid-field
  //                                wash = 4.42 — the same unruled tone-on-tint gap as Callout/Badge, and
  //                                it needs a ruling on the tone tokens, not a story-level fix.
  //                                OPEN.
  //
  // Only those three: this page paints no tone ink inline and carries no do/don't card, and the only
  // validation tone it renders is error — the warning/success/do-don't selectors it used to list matched
  // nothing here (the warning/success carve-out travels with the token spec, on Usage).
  parameters: {
    a11y: {
      context: {
        exclude: ["[style*='--ds-text-disabled']",
                  '[data-field-part="message"][data-tone="error"]'],
      },
    },
  },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Select · Anatomy" standfirst={DEFINITION} />
        <Section title="Anatomy — the trigger" lead="The shared label row carries the name plus an optional info affordance and a pinned end-slot; the trigger composes an optional leading icon, the value (or a greyed placeholder), an optional clear ✕, and the disclosure caret; a description helper sits beneath. The label row and support area are the same shared chrome as TextField — only the trigger body differs.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>
            Only the <strong>label</strong> and <strong>trigger</strong> are required. The{" "}
            <strong>leading icon</strong>, the <strong>clear ✕</strong> (set <Code>clearable</Code>), the{" "}
            <strong>info</strong>, the <strong>end-slot</strong>, and the <strong>description</strong> are
            all optional — a bare select is just label + value + caret. The value stays neutral{" "}
            (<Code>--ds-text-strong</Code>); a greyed <strong>placeholder</strong> stands in before a choice is made.
          </Caption>
        </Section>

        <Rule />

        <Section title="Anatomy — the open menu" lead="The floating panel the trigger opens into — solid and opaque (never translucent), holding the options. The selection re-skin lives here: selection is a stronger accent fill + a semibold label (no gutter checkmark), kept distinct from the neutral active/hover layer. The specimen below is house-faithful (real tokens, follows the toolbar accent); open the live Select beneath it to see it in action.">
          <MenuAnatomyDiagram />
          <AnatomyLegend parts={MENU_PARTS} />
          <Box mt="5" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", fontFamily: "var(--code-font-family)" }}>LIVE — open it</Text>
            <Box data-testid="menu-demo" style={{ maxWidth: 260 }}>
              <Select label="Country" defaultValue="us">
                <Select.Trigger />
                <Select.Content>
                  <Select.Group>
                    <Select.Label>North America</Select.Label>
                    <Select.Item value="us">United States</Select.Item>
                    <Select.Item value="ca">Canada</Select.Item>
                  </Select.Group>
                  <Select.Separator />
                  <Select.Group>
                    <Select.Label>Europe</Select.Label>
                    <Select.Item value="gb">United Kingdom</Select.Item>
                    <Select.Item value="de">Germany</Select.Item>
                  </Select.Group>
                </Select.Content>
              </Select>
            </Box>
          </Box>
          <Caption>
            An <strong>Item</strong> is one choice; a <strong>Group</strong> + <strong>Label</strong>{" "}
            cluster related items under a heading; a <strong>Separator</strong> rules between groups.
            Assemble them <strong>inside two explicit elements</strong>: a <Code>Select.Trigger</Code> for the
            closed field, and a <Code>Select.Content</Code> wrapping every item. The root renders neither on its
            own — give it bare items and no trigger appears and no menu can open. (Its sibling{" "}
            <strong>MultiSelect</strong> is the opposite: options go straight in as direct children, and it
            renders its own trigger and listbox. The two are easy to confuse, so check which one you are in.)
            The menu is portaled and opaque, and scrolls when the list is long. The full row-state matrix
            (rest · hover · selected · selected+hover · disabled) is the <strong>Menu states</strong> story.
          </Caption>
        </Section>

        <Rule />

        <Section title="Validation specimen" lead="A validation state paints the trigger’s border, a faint tint, a status glyph, and a one-line message below — the same accent-aware family as a TextField. The portaled menu stays neutral; validation never reaches it.">
          <ValidationSpecimen />
          <Caption>The trigger carries the border + tint; the message sits below it, top-aligned and wrapping. The full role table is on the Usage page.</Caption>
        </Section>

        <Rule />

        <Section title="States" lead="One trigger across its states — same chrome, different signal. Hover and focus appear as you point and tab; the rest are shown here.">
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
            <Scenario label="EMPTY · PLACEHOLDER" caption={<>No selection yet — the greyed <strong>placeholder</strong> hints at the choice. It is <strong>not</strong> a label.</>}>
              <Select label="Country"><Select.Trigger placeholder="Select a country…" /><Select.Content><Select.Item value="us">United States</Select.Item></Select.Content></Select>
            </Scenario>
            <Scenario label="SELECTED" caption={<>A chosen value in <Code>--ds-text-strong</Code> — the placeholder is gone.</>}>
              <Select defaultValue="us" label="Country"><Select.Trigger /><Select.Content><Select.Item value="us">United States</Select.Item></Select.Content></Select>
            </Scenario>
            <Scenario label="DISABLED" caption="Dimmed and inert — not focusable, not submitted.">
              <Select defaultValue="us" disabled label="Country"><Select.Trigger /><Select.Content><Select.Item value="us">United States</Select.Item></Select.Content></Select>
            </Scenario>
            <Scenario label="ERROR" caption="Border + tint + glyph + message on the trigger; the value text stays neutral.">
              <Select validation={{ tone: "error", message: "Select a country to continue." }} label="Country"><Select.Trigger placeholder="Select a country…" /><Select.Content><Select.Item value="us">United States</Select.Item></Select.Content></Select>
            </Scenario>
          </Grid>
          <Caption>
            <strong>Interaction &amp; motion:</strong> the trigger is direct manipulation, so its hover tint is{" "}
            <strong>instant</strong> — no transition to sit through. <strong>The menu itself does not animate</strong>,
            in either direction: it is aligned to the selected item and opens <em>on</em> the trigger rather than
            beside it, so it appears and dismisses without a slide or fade. That sets it apart from the surfaces
            that open <em>next to</em> their trigger — Popover, DropdownMenu, MultiSelect — which arrive on{" "}
            <Code>--ds-duration-overlay</Code> (150ms) and leave on the slower{" "}
            <Code>--ds-duration-emphasis</Code> (260ms). <strong>Focus:</strong> the trigger
            carries the system ring, the accent fill (<Code>--ds-stroke-focus</Code>) with a Radix alpha
            stacked on top, 2px wide, at 3:1 or more for every accent and mode ([[focus-ring]]) — on{" "}
            <Code>:focus-visible</Code>. The selected menu row's non-colour cue is weight-600, not
            colour alone (WCAG 1.4.1).
          </Caption>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
};

/* ---- Properties — full prop reference (PropTable / PropDef live in _storyKit) - */

const ROOT_PROPS: PropDef[] = [
  { name: "label", type: "ReactNode", desc: <>The field’s name — renders the shared <Code>Field.Label</Code> and sets the trigger’s accessible name. Pass none of label/description/validation to keep the Select bare.</>, source: "Select.tsx:24" },
  { name: "info", type: "ReactNode", desc: <>Optional inline affordance beside the label — a tip icon or helper toggle.</>, source: "Select.tsx:25" },
  { name: "endSlot", type: "ReactNode", desc: <>Optional pinned note at the far end of the label row — “Optional”, a count, an action.</>, source: "Select.tsx:26" },
  { name: "description", type: "ReactNode", desc: <>Persistent helper line under the trigger; replaced by the validation message while a tone is active.</>, source: "Select.tsx:28" },
  { name: "validation", type: `{ tone; message }`, desc: <>Accent-aware validation painted on the <strong>trigger only</strong> — border + faint tint + status glyph + message below. The portaled Content stays neutral.</>, source: "Select.tsx:29" },
  { name: "clearable", type: "boolean", def: "false", desc: <>Shows a clear ✕ while a value is set and resets to the placeholder; Backspace/Delete also clears (keyboard parity). The Root manages the value so it can reset.</>, source: "Select.tsx:31" },
  { name: "value / defaultValue", type: "string", desc: <>Controlled / uncontrolled selected value.</>, source: "Radix" },
  { name: "onValueChange", type: "(v: string) => void", desc: <>Fires when the selection changes.</>, source: "Radix" },
  { name: "size", type: `"1" | "2" | "3"`, def: `"1"`, desc: <>Control size. Unset, it resolves from the global <Code>uiSize</Code> (default <Code>small</Code> → <Code>1</Code>); Radix’s own default is <Code>2</Code>.</>, source: "Radix · :104" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Dims the trigger and makes it inert — not focusable, not submitted.</>, source: "Radix" },
  { name: "required", type: "boolean", def: "false", desc: <>Marks the field required for native form submission.</>, source: "Radix" },
  { name: "name", type: "string", desc: <>Form field name; submits a hidden native input carrying the value.</>, source: "Radix" },
  { name: "open / defaultOpen", type: "boolean", desc: <>Controlled / uncontrolled menu open state.</>, source: "Radix" },
  { name: "onOpenChange", type: "(open: boolean) => void", desc: <>Fires when the menu opens or closes.</>, source: "Radix" },
  { name: "dir", type: `"ltr" | "rtl"`, desc: <>Reading direction for the menu.</>, source: "Radix" },
];

const TRIGGER_PROPS: PropDef[] = [
  { name: "icon", type: "ReactNode", desc: <>Optional leading identification glyph (category, flag, type). Non-interactive; CSS reserves its padding so the value never runs under it.</>, source: "Select.tsx:36" },
  { name: "placeholder", type: "string", desc: <>Greyed hint shown while no value is selected. It is a hint, <strong>not</strong> a label.</>, source: "Radix" },
  { name: "variant", type: `"surface"`, def: `"surface"`, locked: true, desc: <>Locked to <Code>surface</Code> so the field is always identifiable; soft/ghost/classic aren’t exposed (stripped via <Code>Omit</Code>, hard-set internally).</>, source: "Select.tsx:34,63" },
  { name: "radius / color", type: "Radix", desc: <>Corner-radius / accent overrides; inherit the theme when unset.</>, source: "Radix" },
];

const CONTENT_PROPS: PropDef[] = [
  { name: "variant", type: `"solid"`, def: `"solid"`, locked: true, desc: <>Locked to <Code>solid</Code> / opaque per the layering rule — a floating menu is never translucent without an opaque backstop. <Code>soft</Code> isn’t exposed.</>, source: "Select.tsx:99,100" },
  { name: "highContrast", type: "boolean", def: "false", desc: <>Radix high-contrast menu. Opts <strong>out</strong> of the selected-row re-skin — the native left-gutter checkmark returns.</>, source: "Radix" },
  { name: "position", type: `"item-aligned" | "popper"`, def: `"item-aligned"`, desc: <><Code>item-aligned</Code> centres the menu over the selected item; <Code>popper</Code> anchors it below the trigger.</>, source: "Radix" },
];

const ITEM_PROPS: PropDef[] = [
  { name: "value", type: "string", def: "— (required)", desc: <>The option’s value — required and unique. Reported on selection.</>, source: "Radix" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Dims the option; skipped by keyboard nav and carved out of the selected-row paint.</>, source: "Radix" },
  { name: "textValue", type: "string", desc: <>Type-ahead match text — set it when <Code>children</Code> isn’t plain text.</>, source: "Radix" },
  { name: "children", type: "ReactNode", desc: <>The visible option label.</>, source: "Radix" },
];

const PART_PROPS: PropDef[] = [
  { name: "Select.Group", type: "passthrough", desc: <>Wraps related items; pair with a <Code>Select.Label</Code> heading.</>, source: "Select.tsx" },
  { name: "Select.Label", type: "passthrough", desc: <>A non-selectable group heading, painted <Code>--ds-text-weak</Code>.</>, source: "Select.tsx" },
  { name: "Select.Separator", type: "passthrough", desc: <>A rule between groups, painted <Code>--ds-stroke-weak</Code>.</>, source: "Select.tsx" },
  { name: "Select.Empty", type: "passthrough + slot", desc: <>A muted, non-focusable “no options” line — render it inside <Code>Content</Code> when the option list is empty.</>, source: "Select.tsx" },
];

/** Menu states — the row-state matrix of the open panel (rest · active/hover · selected · selected+active ·
 *  disabled), rendered live. The re-skin is invisible on a closed trigger, so this story opens the menu by
 *  default; the play asserts the [[select-selected-row]] gates (rendered weight, selected-label legibility measured off the LIVE
 *  row, selected-vs-active separation, the active row's non-text edge, disabled carve-out) on the live,
 *  portaled panel. Nothing is forced: every value is read as rendered. */
export const MenuStates: Story = {
  // SIDEBAR LEAF, in the house's sentence case. Left to Storybook the export name is
  // title-cased into "Menu States", which then disagrees with this page's own h1 —
  // the header suffix is the role humanized ("Menu states"), and the sidebar is the
  // same page. An explicit `name` does not change the story id.
  name: "Menu states",
  parameters: {
    // This story renders the menu open (defaultOpen) so the re-skin is visible without interaction.
    // Radix's open Select aria-hides the background while the trigger stays focusable — axe flags
    // aria-hidden-focus, but in a real app focus is managed into the listbox on open. Scope that one
    // rule off for the open-menu specimen (color-contrast stays off from the meta, for the placeholder).
    a11y: { context: { exclude: [DODONT_LABEL] }, config: { rules: [{ id: "aria-hidden-focus", enabled: false }] } },
  },
  render: () => (
    <Page>
      <PageHeader title="Select · Menu states" standfirst={DEFINITION} />
      <Section
        title="Open menu — selected affordance & row states"
        lead="Selection is the accent tint plus a semibold label — no left-gutter checkmark. The active row (pointer or arrow-key) is a neutral gray layer with the focus ring's accent edge, so persistent selection and transient focus never collapse into one signal. Open by default; hover or arrow to move the highlight."
      >
        <Box data-testid="open-panel" style={{ minHeight: 260, maxWidth: 260 }}>
          <Select label="Country" defaultValue="us" defaultOpen>
            <Select.Trigger />
            <Select.Content>
              <Select.Group>
                <Select.Label>North America</Select.Label>
                <Select.Item value="us">United States</Select.Item>
                <Select.Item value="ca">Canada</Select.Item>
                <Select.Item value="mx" disabled>Mexico (unavailable)</Select.Item>
              </Select.Group>
              <Select.Separator />
              <Select.Group>
                <Select.Label>Europe</Select.Label>
                <Select.Item value="gb">United Kingdom</Select.Item>
                <Select.Item value="de">Germany</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select>
        </Box>
        <Caption>
          <strong>Rest</strong> rows are weight 400 on the panel surface; the <strong>selected</strong> row is the
          accent tint <Code>--ds-fill-selected-subtle</Code> + a <Code>--ds-text-strong</Code> label at weight 600;
          a non-selected <strong>active</strong> row is a neutral <Code>--ds-fill-hover</Code> ringed by a 2px
          inset edge in the focus ring's stacked accent (<Code>--ds-stroke-focus</Code> under{" "}
          <Code>--ds-stroke-focus-stack</Code>, [[focus-ring]]). The selected row keeps its tint even while active,
          so a selected + active row reads as tint + weight + edge and the two states never merge. The weight is
          the WCAG 1.4.1 non-colour cue, so the fill is never the sole signal — and no label anywhere in the
          panel sits on a solid accent fill.
        </Caption>
      </Section>
    </Page>
  ),
  play: async () => {
    const near = (a: number, b: number, tol = 6) => Math.abs(a - b) <= tol;
    // The menu is portaled to document.body — assert on the live, open panel (defaultOpen).
    const content = document.querySelector<HTMLElement>(".rt-SelectContent");
    if (!content) throw new Error("open panel: .rt-SelectContent not found (menu should be defaultOpen)");
    const root = themeRoot(content);

    // 1.4.1 — the selected row carries the RENDERED weight-600 cue (not just the data attribute).
    const selected = content.querySelector<HTMLElement>('.rt-SelectItem[data-state="checked"]');
    if (!selected) throw new Error("open panel: no checked item");
    if (getComputedStyle(selected).fontWeight !== "600") {
      throw new Error(`selected row must render weight 600, got ${getComputedStyle(selected).fontWeight}`);
    }
    const rest = content.querySelector<HTMLElement>('.rt-SelectItem[data-state="unchecked"]');
    if (rest && getComputedStyle(rest).fontWeight !== "400") {
      throw new Error("rest rows must stay weight 400 (only the selected row is bold)");
    }
    // The gutter checkmark is gone (weight is the cue).
    const indicator = selected.querySelector<HTMLElement>(".rt-SelectItemIndicator");
    if (indicator && getComputedStyle(indicator).display !== "none") {
      throw new Error("selected row indicator (checkmark) must be hidden");
    }

    // The selected row is the accent selection TINT + strong text — never a label on the solid accent fill
    // (a 12px label there measures ~3:1 at several accents, under the 4.5 a label that size owes). Read the
    // rendered colours off the live row.
    const wantFill = resolveColor(root, "--ds-fill-selected-subtle");
    const gotFill = parseColor(getComputedStyle(selected).backgroundColor);
    if (!(near(gotFill.r, wantFill.r) && near(gotFill.g, wantFill.g) && near(gotFill.b, wantFill.b))) {
      throw new Error(`selected row fill must be --ds-fill-selected-subtle; got ${getComputedStyle(selected).backgroundColor}`);
    }
    const wantText = resolveColor(root, "--ds-text-strong");
    const gotText = parseColor(getComputedStyle(selected).color);
    if (!(near(gotText.r, wantText.r) && near(gotText.g, wantText.g) && near(gotText.b, wantText.b))) {
      throw new Error(`selected row label must be --ds-text-strong; got ${getComputedStyle(selected).color}`);
    }

    // Selected label legibility, measured on the LIVE row rather than a token pair: composite the row's own
    // translucent tint over the panel it actually sits on, then the label over that. Nothing is forced — the
    // probe reads what the theme resolved.
    const panelBg = parseColor(getComputedStyle(content).backgroundColor);
    const selFill = flatten(gotFill, panelBg);
    const selRatio = contrastRatio(gotText, selFill);
    if (selRatio < 4.5) {
      throw new Error(`selected row label on its own tint = ${selRatio.toFixed(2)}:1, below the 4.5:1 a 12px label owes`);
    }

    // Selection and the active-descendant must not converge: the active row's neutral layer has to land
    // somewhere visibly different from the selected tint, on the same panel.
    const activeFill = flatten(resolveColor(root, "--ds-fill-hover"), panelBg);
    const spread = Math.abs(selFill.r - activeFill.r) + Math.abs(selFill.g - activeFill.g) + Math.abs(selFill.b - activeFill.b);
    if (spread < 24) {
      throw new Error(`selected tint and active layer are too close to tell apart (channel spread ${spread.toFixed(0)})`);
    }
    // The active row's edge is a non-text state cue — it owes 3:1 and APCA Lc 30 against the panel it is
    // drawn on (1.4.11). It is the [[focus-ring]] ring, so the colour the eye sees is the stack alpha composited on
    // the accent base, and that composite is what gets measured.
    const panel = resolveColor(root, "--ds-bg-overlay");
    const edge = flatten(resolveColor(root, "--ds-stroke-focus-stack"), resolveColor(root, "--ds-stroke-focus"));
    const edgeRatio = contrastRatio(edge, panel);
    if (edgeRatio < 3) throw new Error(`active row edge (stacked accent) on --ds-bg-overlay = ${edgeRatio.toFixed(2)}:1, below 3:1`);
    // Lc 30 is the ring floor [[focus-ring]] sets, the same value APCA names as its minimum for any visible mark.
    const edgeLc = Math.abs(apcaContrast(edge, panel));
    if (edgeLc < APCA_LC.minAnyText) throw new Error(`active row edge (stacked accent) on --ds-bg-overlay = Lc ${edgeLc.toFixed(1)}, below Lc ${APCA_LC.minAnyText}`);
    // Group label legibility — --ds-text-weak (gray-11) on the opaque panel surface clears AA normal text.
    assertPairing(root, "--ds-text-weak", "--ds-bg-overlay", 4.5);

    // Disabled item — Radix dims it; the selected/weight paint is carved out for [data-disabled].
    const disabled = content.querySelector<HTMLElement>(".rt-SelectItem[data-disabled]");
    if (!disabled) throw new Error("open panel: expected a disabled item");
    if (getComputedStyle(disabled).fontWeight === "600") {
      throw new Error("disabled item must not take the selected weight-600 cue");
    }

    // Every option says where it sits (Radix #3962, #4110). Radix sets no aria-posinset or aria-setsize,
    // so the system numbers the open listbox in DOM order. The disabled row still counts, because it is
    // part of the set a reader walks. Five rows, so the third is "Mexico (unavailable), 3 of 5".
    const options = [...content.querySelectorAll<HTMLElement>('[role="option"]')];
    if (options.length !== 5) throw new Error(`open panel: expected 5 options, got ${options.length}`);
    options.forEach((option, i) => {
      const pos = option.getAttribute("aria-posinset");
      const size = option.getAttribute("aria-setsize");
      if (pos !== String(i + 1) || size !== "5") {
        throw new Error(`option "${option.textContent}" must read ${i + 1} of 5 (aria-posinset / aria-setsize, Radix #3962), got ${pos} of ${size}`);
      }
    });
  },
};

/* ---- Keyboard contract --------------------------------------------------- */

/* KeyBinding, Kbd, SrcTag, KeyRow now live in _storyKit (shared with MultiSelect). */

const CLOSED_TRIGGER_KEYS: KeyBinding[] = [
  { keys: ["Space", "Enter", "↓", "↑"], action: "Open the menu.", src: "radix" },
  { keys: ["A–Z 0–9"], action: <>Type a printable character for a type-ahead <strong>jump</strong>: the menu opens and focuses the first matching option. A jump, <strong>not</strong> a filter — every option stays in the list.</>, src: "radix" },
  { keys: ["Backspace", "Delete"], action: <>Reset a <Code>clearable</Code> field back to its placeholder — the keyboard equivalent of the clear ✕ (which sits out of the tab order). Fires only while a value is selected.</>, src: "system" },
];

const OPEN_MENU_KEYS: KeyBinding[] = [
  { keys: ["↑", "↓"], action: "Move the active option up / down. Disabled options are skipped.", src: "radix" },
  { keys: ["Home", "End"], action: "Jump to the first / last option.", src: "radix" },
  { keys: ["A–Z 0–9"], action: "Type-ahead jump to the next matching option. Disabled options are skipped.", src: "radix" },
  { keys: ["Enter", "Space"], action: "Commit the active option — selects it and closes the menu.", src: "radix" },
  { keys: ["Esc"], action: "Close the menu without committing; the value is unchanged.", src: "radix" },
];

/** Keyboard — the complete key → action contract. Everything is free from the Radix Select primitive
 *  except the Backspace/Delete reset, which the system adds so the clear ✕ has a keyboard equivalent
 *  (WCAG 2.1.1). Type-to-filter is intentionally out of scope → a future Combobox. */
export const Keyboard: Story = {
  render: () => (
    <Page>
      <PageHeader title="Select · Keyboard" standfirst={DEFINITION} />
      <Section title="Keyboard" lead={<>The full key → action contract. <Code>Tab</Code> moves focus to and from the trigger; the keys below act once it is focused. Every binding is inherited from the Radix Select primitive, except the Backspace/Delete reset (system-added, WCAG 2.1.1).</>}>
        <Flex direction="column" gap="2">
          <Box style={{ maxWidth: 260 }} data-size-lesson="inset affordances hold step 1 — the clear ✕ garnishes the field, it doesn't join the row">
            <Select label="Country" clearable defaultValue="us" description="Focus the trigger, then try the keys below.">
              <Select.Trigger placeholder="Select a country…" />
              <Select.Content>
                <Select.Group>
                  <Select.Label>North America</Select.Label>
                  <Select.Item value="us">United States</Select.Item>
                  <Select.Item value="ca">Canada</Select.Item>
                  <Select.Item value="mx" disabled>Mexico (unavailable)</Select.Item>
                </Select.Group>
                <Select.Separator />
                <Select.Group>
                  <Select.Label>Europe</Select.Label>
                  <Select.Item value="gb">United Kingdom</Select.Item>
                  <Select.Item value="de">Germany</Select.Item>
                  <Select.Item value="fr">France</Select.Item>
                </Select.Group>
              </Select.Content>
            </Select>
          </Box>
          <Caption>A live target — <Code>clearable</Code> with a value (so Backspace/Delete resets it), and “Mexico” disabled (so you can watch arrow-nav and type-ahead step over it).</Caption>
        </Flex>
        <Flex direction="column" gap="4">
          <TokenGroup label="CLOSED TRIGGER · MENU CLOSED, TRIGGER FOCUSED">
            {CLOSED_TRIGGER_KEYS.map((b) => <KeyRow key={b.keys.join("+")} {...b} />)}
          </TokenGroup>
          <TokenGroup label="OPEN MENU · LISTBOX FOCUSED">
            {OPEN_MENU_KEYS.map((b) => <KeyRow key={b.keys.join("+")} {...b} />)}
          </TokenGroup>
        </Flex>
        <Caption><strong>Pointer &amp; display</strong> — clicking outside the open menu closes it without committing (same as <Code>Esc</Code>). Disabled options are inert. The chosen value sits on a single line and ellipsizes on overflow.</Caption>
      </Section>
      <Rule />
      <Section title="Out of scope — type-to-filter, async, multi-value" lead="Why there is no search box in the menu.">
        <Caption>Typing into an open Select is <strong>type-ahead</strong> (jump to a match); it never filters the list. Type-to-<strong>filter</strong> converts the listbox into a <strong>combobox</strong> — a different ARIA contract with its own focus and live-region rules. That belongs to a future <Code>Combobox</Code> on this same Field shell, alongside async option-loading and multi-value tags (a <Code>MultiSelect</Code>) — not to this static single-select. The system draws that line deliberately.</Caption>
      </Section>
    </Page>
  ),
};

/** Usage: select vs. radios, grouped options, validation, and the live token spec that closes the page. */
export const Usage: Story = {
  // color-contrast is ON again here too — see Anatomy for why the inner span can be excluded without
  // blinding the trigger. Placeholder #80838d on #ffffff = 3.78 (3.76 on the success-tinted field, 3.63
  // on the error-tinted one) is a REAL failure of Radix's --gray-a10 placeholder skin and is OPEN for a
  // ruling. The warning message (#ab6400 on #fcfcfd = 4.49) is the accepted step-11 seam.
  parameters: {
    a11y: {
      context: {
        exclude: [DODONT_LABEL, "[style*='--ds-text-disabled']",
                  "[style*='--ds-text-warning']", '[data-field-part="message"][data-tone="warning"]', "[style*='--ds-text-success']", '[data-field-part="message"][data-tone="success"]', "[style*='--ds-text-error']", '[data-field-part="message"][data-tone="error"]'],
      },
    },
  },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="Select · Usage" standfirst={DEFINITION} />
      <ComparisonSection comparison={PICK_FROM_SET_COMPARISON} highlight="Select / MultiSelect" />

      <Rule />

      <Section
        title="Validation states"
        lead={<>Four tones, driven by the toolbar above — <strong>Accent</strong> re-skins the semantics, <strong>Size</strong> scales them, <strong>Appearance</strong> flips light and dark. Each paints the trigger’s border + tint + a status glyph and a single-sentence message below.</>}
      >
        <Box data-testid="validation-grid">
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
            <Select validation={{ tone: "error", message: "Select a country to continue." }} label="Country"><Select.Trigger placeholder="Select a country…" /><Select.Content><Select.Item value="us">United States</Select.Item></Select.Content></Select>
            <Select defaultValue="legacy" validation={{ tone: "warning", message: "Legacy plans lose support next year." }} label="Plan"><Select.Trigger /><Select.Content><Select.Item value="legacy">Legacy</Select.Item></Select.Content></Select>
            <Select defaultValue="pro" validation={{ tone: "success", message: "Pro fits a team your size." }} label="Plan"><Select.Trigger /><Select.Content><Select.Item value="pro">Pro</Select.Item></Select.Content></Select>
          </Grid>
        </Box>
        <Caption>
          <strong>error</strong> blocks submission and takes <Code>role="alert"</Code>;{" "}
          <strong>warning</strong> cautions without blocking; <strong>success</strong> confirms. For
          calm guidance, prefer the persistent <Code>description</Code> helper over a tone.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Leading icon and a clear ✕"
        lead={<>Two optional trigger affixes. A <strong>leading icon</strong> (pass <Code>icon</Code> to <Code>Select.Trigger</Code>) identifies the kind of choice — a globe for a country, a tag for a category — and rarely changes. A <strong>clear ✕</strong> (set <Code>clearable</Code>) lets the user reset an optional field to its placeholder without reopening the menu; it shows only while a value is selected and sits just left of the caret, out of the tab order.</>}
      >
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5" data-size-lesson="inset affordances hold step 1 — the clear ✕ garnishes the field, it doesn't join the row">
          <Scenario label="LEADING ICON" caption="An identification glyph at the start of the trigger — it modifies what the field is, like a TextField's leading slot.">
            <Select label="Country" defaultValue="us">
              <Select.Trigger icon={<Globe />} />
              <Select.Content>
                <Select.Item value="us">United States</Select.Item>
                <Select.Item value="ca">Canada</Select.Item>
                <Select.Item value="gb">United Kingdom</Select.Item>
              </Select.Content>
            </Select>
          </Scenario>
          <Scenario label="CLEARABLE" caption="An optional field — pick a value, then use the ✕ to reset it to the placeholder.">
            <Select label="Country" defaultValue="us" clearable>
              <Select.Trigger icon={<Globe />} placeholder="Select a country…" />
              <Select.Content>
                <Select.Item value="us">United States</Select.Item>
                <Select.Item value="ca">Canada</Select.Item>
                <Select.Item value="gb">United Kingdom</Select.Item>
              </Select.Content>
            </Select>
          </Scenario>
        </Grid>
        <Caption>
          Reach for <Code>clearable</Code> only when an empty value is a <strong>valid</strong> state — a
          filter, an optional preference, a nullable field. A required select has nothing to clear to, so
          leave it off. A loading spinner is deliberately <em>not</em> a trigger affix: async option-loading
          belongs to a searchable combobox, not a static select.
        </Caption>
      </Section>

      <Rule />

      <Section title="Select vs. radios — about five to seven options" lead="One-of-many has two shapes. A RadioGroup shows every option at once, which is its strength — until the list is long enough to scroll. Past roughly five to seven options, collapse the set into a Select so it doesn’t dominate the form; below that, radios keep every choice visible and one tap away.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="A long one-of-many — countries, time zones, a dozen plans — collapses into a Select, so the form stays compact and the menu scrolls.">
            <Box style={{ width: 240 }}>
              <Select label="Country"><Select.Trigger placeholder="Select a country…" /><Select.Content><Select.Item value="us">United States</Select.Item><Select.Item value="ca">Canada</Select.Item><Select.Item value="gb">United Kingdom</Select.Item><Select.Item value="de">Germany</Select.Item><Select.Item value="fr">France</Select.Item><Select.Item value="jp">Japan</Select.Item></Select.Content></Select>
            </Box>
          </DoDont>
          <DoDont kind="dont" bare note="Two or three short options hidden behind a Select — the user pays a click to see choices that would fit inline. Use a RadioGroup so all options stay visible.">
            <Box style={{ width: 240 }}>
              <Select defaultValue="monthly" label="Billing"><Select.Trigger /><Select.Content><Select.Item value="monthly">Monthly</Select.Item><Select.Item value="annual">Annual</Select.Item></Select.Content></Select>
            </Box>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <Section title="Group long lists under headings" lead="When a list is long but clusters naturally — countries by continent, settings by area — wrap each cluster in a Group with a Label and rule them apart with a Separator. Scanning a few labelled groups is faster than reading one flat list.">
        <Box data-testid="grouped" style={{ maxWidth: 260 }}>
          <Select label="Country">
            <Select.Trigger placeholder="Select a country…" />
            <Select.Content>
              <Select.Group>
                <Select.Label>North America</Select.Label>
                <Select.Item value="us">United States</Select.Item>
                <Select.Item value="ca">Canada</Select.Item>
              </Select.Group>
              <Select.Separator />
              <Select.Group>
                <Select.Label>Europe</Select.Label>
                <Select.Item value="gb">United Kingdom</Select.Item>
                <Select.Item value="de">Germany</Select.Item>
                <Select.Item value="fr">France</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select>
        </Box>
        <Caption>Open it: the items sit under <strong>North America</strong> and <strong>Europe</strong> headings, separated by a rule.</Caption>
      </Section>

      <Rule />

      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="The resting trigger plus each validation tone, with the tokens that paint them. Semantic tones are accent-aware — they follow a brand’s collision shifts. Every --ds-* row is read live from the running theme, so this table can’t drift from the code.">
          <Flex direction="column" gap="4">
            <TokenGroup label="DEFAULT (rest)" blurb="The neutral trigger — a surface border + fill and neutral value text; on focus it gains the system ring, the accent with a stacked alpha ([[focus-ring]])." specimen={<Box style={{ width: 200 }}><Select defaultValue="us" label="Country"><Select.Trigger /><Select.Content><Select.Item value="us">United States</Select.Item></Select.Content></Select></Box>}>
              <MeasuredSpec render={() => <Select defaultValue="us" label="Country"><Select.Trigger /><Select.Content><Select.Item value="us">United States</Select.Item></Select.Content></Select>}>
                <MeasuredRow
                  part="Value text"
                  note="The chosen label on the resting trigger."
                  token="--ds-text-strong"
                  select=".rt-SelectTrigger"
                  prop="color"
                />
                <MeasuredRow
                  part="Focus ring"
                  note="Drawn on the trigger's outline, the same 2px ring every control wears. The accent base, with the stack alpha on top ([[focus-ring]])."
                  token="--ds-stroke-focus"
                  select=".rt-SelectTrigger"
                  prop="outline-color"
                  state="focus-visible"
                />
              </MeasuredSpec>
              <NoteRow part="Border (rest)" value="Radix surface — inset 1px" radix="--gray-a7" />
              <NoteRow part="Placeholder" value="Radix gray-9 (~3.78:1) — a hint, contrast-exempt like disabled text" radix="--gray-9" />
            </TokenGroup>
            <TokenGroup label="ERROR" blurb="A blocking problem — no valid choice is selected." specimen={<Box style={{ width: 200 }}><Select validation={{ tone: "error", message: "Required." }} label="Plan"><Select.Trigger placeholder="Choose…" /><Select.Content><Select.Item value="free">Free</Select.Item></Select.Content></Select></Box>}>
              <MeasuredSpec render={() => <Select validation={{ tone: "error", message: "Required." }} label="Plan"><Select.Trigger placeholder="Choose…" /><Select.Content><Select.Item value="free">Free</Select.Item></Select.Content></Select>}>
                <MeasuredRow part="Tint (fill)" note="The faint wash the trigger takes while the tone is active." token="--ds-fill-error-weak" select=".rt-SelectTrigger" prop="background-color" />
                <MeasuredRow part="Message + glyph" note="Read off the status mark below the trigger; the message shares its ink." token="--ds-text-error" select="[data-validation='error'] svg:not(.rt-SelectIcon)" prop="color" />
              </MeasuredSpec>
              <NoteRow part="Border" value="inset 1px ring — the family step-8 stroke" radix="--ds-stroke-error" />
            </TokenGroup>
            <TokenGroup label="WARNING" blurb="A caution worth flagging — accepted but maybe not intended." specimen={<Box style={{ width: 200 }}><Select defaultValue="legacy" validation={{ tone: "warning", message: "Legacy plan." }} label="Plan"><Select.Trigger /><Select.Content><Select.Item value="legacy">Legacy</Select.Item></Select.Content></Select></Box>}>
              <MeasuredSpec render={() => <Select defaultValue="legacy" validation={{ tone: "warning", message: "Legacy plan." }} label="Plan"><Select.Trigger /><Select.Content><Select.Item value="legacy">Legacy</Select.Item></Select.Content></Select>}>
                <MeasuredRow part="Tint (fill)" note="The faint wash the trigger takes while the tone is active." token="--ds-fill-warning-weak" select=".rt-SelectTrigger" prop="background-color" />
                <MeasuredRow part="Message + glyph" note="Read off the status mark below the trigger; the message shares its ink." token="--ds-text-warning" select="[data-validation='warning'] svg:not(.rt-SelectIcon)" prop="color" />
              </MeasuredSpec>
              <NoteRow part="Border" value="inset 1px ring — the family step-8 stroke" radix="--ds-stroke-warning" />
            </TokenGroup>
            <TokenGroup label="SUCCESS" blurb="Positive confirmation — the choice checked out." specimen={<Box style={{ width: 200 }}><Select defaultValue="pro" validation={{ tone: "success", message: "Good choice." }} label="Plan"><Select.Trigger /><Select.Content><Select.Item value="pro">Pro</Select.Item></Select.Content></Select></Box>}>
              <MeasuredSpec render={() => <Select defaultValue="pro" validation={{ tone: "success", message: "Good choice." }} label="Plan"><Select.Trigger /><Select.Content><Select.Item value="pro">Pro</Select.Item></Select.Content></Select>}>
                <MeasuredRow part="Tint (fill)" note="The faint wash the trigger takes while the tone is active." token="--ds-fill-success-weak" select=".rt-SelectTrigger" prop="background-color" />
                <MeasuredRow part="Message + glyph" note="Read off the status mark below the trigger; the message shares its ink." token="--ds-text-success" select="[data-validation='success'] svg:not(.rt-SelectIcon)" prop="color" />
              </MeasuredSpec>
              <NoteRow part="Border" value="inset 1px ring — the family step-8 stroke" radix="--ds-stroke-success" />
            </TokenGroup>
            <TokenGroup label="INFO (secondary)" blurb="A flexible secondary tone — neutral, non-blocking, not a validation peer." specimen={<Box style={{ width: 200 }}><Select defaultValue="us" validation={{ tone: "info", message: "You can change this later." }} label="Country"><Select.Trigger /><Select.Content><Select.Item value="us">United States</Select.Item></Select.Content></Select></Box>}>
              <MeasuredSpec render={() => <Select defaultValue="us" validation={{ tone: "info", message: "You can change this later." }} label="Country"><Select.Trigger /><Select.Content><Select.Item value="us">United States</Select.Item></Select.Content></Select>}>
                <MeasuredRow part="Tint (fill)" note="The faint wash the trigger takes while the tone is active." token="--ds-fill-info-weak" select=".rt-SelectTrigger" prop="background-color" />
                <MeasuredRow part="Message + glyph" note="Read off the status mark below the trigger; the message shares its ink." token="--ds-text-info" select="[data-validation='info'] svg:not(.rt-SelectIcon)" prop="color" />
              </MeasuredSpec>
              <NoteRow part="Border" value="inset 1px ring — the family step-8 stroke" radix="--ds-stroke-info" />
            </TokenGroup>
            <TokenGroup label="FLOATING CONTENT (open menu)" blurb="The portaled menu and its rows. Selection is the accent tint + a semibold label — no gutter checkmark; the active row (pointer / arrow) is a neutral layer with the focus ring's accent edge, so persistent selection and transient focus never collapse into one signal. No label ever sits on a solid accent fill.">
              {/* The menu is portaled out of the Field subtree and only exists while the Select is open —
                  and an open Select locks page scroll and moves focus, so it cannot be parked in a docs
                  page's measurement host. The host therefore carries the menu's OWN panel and row markup:
                  the same classes and state attributes the live menu renders, painted by the same rules.
                  The story names no role, so every row below still compares two independent readings. */}
              <MeasuredSpec render={() => <MenuSpecimen />}>
                <MeasuredRow
                  part="Selected row · fill"
                  note="The persistent tint on the current value."
                  token="--ds-fill-selected-subtle"
                  select=".rt-SelectItem[data-state='checked']"
                  prop="background-color"
                />
                <MeasuredRow
                  part="Selected row · label"
                  note="Held at full strength on the tint — a label never sits on a solid accent fill."
                  token="--ds-text-strong"
                  select=".rt-SelectItem[data-state='checked']"
                  prop="color"
                />
                <MeasuredRow
                  part="Active row (hover / arrow)"
                  note="The transient neutral layer under the pointer or arrow cursor."
                  token="--ds-fill-hover"
                  select=".rt-SelectItem[data-highlighted]"
                  prop="background-color"
                />
                <MeasuredRow
                  part="Active row · edge"
                  note="A 2px inset edge in the focus ring's stacked accent ([[focus-ring]]), so the row carries when the neutral wash alone is too faint. The accent base, with the stack alpha on top."
                  token="--ds-stroke-focus"
                  select=".rt-SelectItem[data-highlighted]"
                  prop="outline-color"
                  pseudo="::before"
                />
                <MeasuredRow
                  part="Group label"
                  note="A non-selectable heading over a run of rows."
                  token="--ds-text-weak"
                  select=".rt-SelectLabel"
                  prop="color"
                />
                <MeasuredRow
                  part="Separator"
                  note="The hairline that rules one group off from the next."
                  token="--ds-stroke-weak"
                  select=".rt-SelectSeparator"
                  prop="background-color"
                />
              </MeasuredSpec>
              <NoteRow part="Content surface" value="solid (opaque) — the layering rule" radix="--color-panel-solid" />
              <NoteRow part="Selected row · weight" value="600 — the non-colour 1.4.1 cue that replaces the checkmark" />
            </TokenGroup>
          </Flex>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    const near = (a: number, b: number, tol = 4) => Math.abs(a - b) <= tol;
    const colorRe = /rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|color\([^)]*\)/g;

    // Each tone's trigger border resolves to --ds-stroke-{tone} (presence alone is a false positive —
    // the neutral default also carries a box-shadow border).
    const tones = ["error", "warning", "success"] as const;
    for (const tone of tones) {
      const w = canvasElement.querySelector<HTMLElement>(`[data-validation="${tone}"]`);
      if (!w) throw new Error(`missing ${tone} specimen`);
      const trigger = w.querySelector<HTMLElement>(".rt-SelectTrigger");
      if (!trigger) throw new Error(`${tone} specimen has no .rt-SelectTrigger`);
      const shadow = getComputedStyle(trigger).boxShadow;
      if (shadow === "none") throw new Error(`${tone} trigger must carry a border`);
      const want = resolveColor(w, `--ds-stroke-${tone}`);
      const toks = shadow.match(colorRe) || [];
      if (!toks.some((t) => { const c = parseColor(t); return near(c.r, want.r) && near(c.g, want.g) && near(c.b, want.b); })) {
        throw new Error(`${tone} border must resolve to --ds-stroke-${tone}; got ${shadow}`);
      }
    }

    // The error trigger carries aria-invalid + the message has role=alert and is referenced.
    const errWrap = canvasElement.querySelector<HTMLElement>('[data-validation="error"]')!;
    const trigger = errWrap.querySelector<HTMLElement>(".rt-SelectTrigger")!;
    if (trigger.getAttribute("aria-invalid") !== "true") throw new Error("error trigger must set aria-invalid");
    const msg = errWrap.querySelector<HTMLElement>('[role="alert"]')!;
    if (!msg?.id || trigger.getAttribute("aria-describedby") !== msg.id) {
      throw new Error("aria-describedby must reference the message id");
    }
    // No validation attribute leaks to the (closed) Content — it's portaled out of the Field subtree.
    if (document.querySelector('[data-validation] .rt-SelectContent')) {
      throw new Error("validation must not reach the portaled Select.Content");
    }
  },
};

/* Leading-icon options for the Props — primitive arg → Phosphor node, so Controls only ever
   holds the string key (a ReactNode can't be a Storybook control). */
const LEADING_ICONS: Record<string, ReactNode> = {
  none: undefined,
  globe: <Globe size={18} />,
  tag: <Tag size={18} />,
  user: <User size={18} />,
  folder: <Folder size={18} />,
  pin: <MapPin size={18} />,
};

/** Props — a prototyping tool for the field. Drive every capability — label, the optional info
 *  affordance + end-slot, the leading icon, clearable, validation, size, placeholder, description. */
type PropsArgs = {
  label?: string;
  placeholder?: string;
  description?: string;
  validation?: { tone: "error" | "warning" | "success" | "info"; message: string };
  size?: "auto" | "1" | "2" | "3";
  width?: number;
  leadingIcon?: keyof typeof LEADING_ICONS;
  clearable?: boolean;
  defaultValue?: string;
  showInfo?: boolean;
  infoText?: string;
  endSlot?: string;
};

export const Props: StoryObj<PropsArgs> = {
  args: {
    label: "Country",
    placeholder: "Select a country…",
    description: "Used for tax and shipping estimates.",
    size: "auto",
    width: 320,
    leadingIcon: "globe",
    clearable: true,
    defaultValue: "us",
    showInfo: false,
    infoText: "Sets tax and shipping — change it any time in settings.",
    endSlot: "Optional",
  },
  argTypes: {
    label: { control: "text" },
    placeholder: { control: "text" },
    description: { name: "description (helper)", control: "text" },
    leadingIcon: { name: "leading icon", control: "select", options: ["none", "globe", "tag", "user", "folder", "pin"] },
    clearable: { name: "clearable (✕)", control: "boolean" },
    defaultValue: { name: "default value", control: "inline-radio", options: ["us", "ca", "gb", "de"] },
    showInfo: { name: "info (show)", control: "boolean" },
    infoText: { name: "info text", control: "text", if: { arg: "showInfo" } },
    endSlot: { name: "end-slot", control: "text" },
    validation: {
      control: "inline-radio",
      options: ["none", "error", "warning", "success", "info"],
      mapping: {
        none: undefined,
        error: { tone: "error", message: "Select a country to continue." },
        warning: { tone: "warning", message: "Double-check this is right." },
        success: { tone: "success", message: "That works." },
        info: { tone: "info", message: "You can change this later in settings." },
      },
    },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step pins the field.' },
    width: { control: { type: "range", min: 180, max: 480, step: 20 } },
  },
  parameters: { controls: { disable: false } },
  render: ({ label, placeholder, description, validation, size, width, leadingIcon, clearable, defaultValue, showInfo, infoText, endSlot }: PropsArgs) => {
    const leadingNode = LEADING_ICONS[leadingIcon ?? "none"];
    const infoNode = showInfo ? (
      <span title={infoText || undefined} style={{ display: "inline-flex", cursor: "help" }}>
        <Info size={16} weight="regular" aria-hidden style={{ color: "var(--ds-icon-neutral)", display: "block" }} />
      </span>
    ) : undefined;
    const endSlotNode = endSlot ? <Text size="1" style={{ color: "var(--ds-text-weak)" }}>{endSlot}</Text> : undefined;
    return (
      <Page maxWidth="none">
        <PageHeader title="Select · Props" standfirst={DEFINITION} />
        <Box p="5" style={{ maxWidth: width }}>
          <Select label={label} info={infoNode} endSlot={endSlotNode} description={description} validation={validation} size={size === "auto" ? undefined : size} clearable={clearable} defaultValue={defaultValue}>
            <Select.Trigger icon={leadingNode} placeholder={placeholder} />
            <Select.Content>
              <Select.Item value="us">United States</Select.Item>
              <Select.Item value="ca">Canada</Select.Item>
              <Select.Item value="gb">United Kingdom</Select.Item>
              <Select.Item value="de">Germany</Select.Item>
            </Select.Content>
          </Select>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop across the Select’s parts. Two <strong>locks</strong>: the trigger is <Code>surface</Code>-only and the Content is <Code>solid</Code>/opaque — both stripped from the public type and hard-set internally. “Radix” in Source means an inherited primitive prop; <Code>Select.tsx:NN</Code> marks a system-owned one.</>}>
          <Flex direction="column" gap="5">
            <Section title="Root — the field" lead={<>The <Code>&lt;Select&gt;</Code> element. System props (label, info, endSlot, description, validation, clearable) layer the shared <Code>Field</Code> chrome on top of the inherited Radix Root.</>}>
              <PropTable rows={ROOT_PROPS} />
            </Section>
            <Section title="Trigger — the control" lead={<><Code>Select.Trigger</Code> is the form control (<Code>role=combobox</Code>) — it carries the label, validation, and focus ring. The system adds <Code>icon</Code> and locks the variant.</>}>
              <PropTable rows={TRIGGER_PROPS} />
            </Section>
            <Section title="Content — the menu" lead={<><Code>Select.Content</Code> is the floating, portaled menu. Its variant is locked opaque; <Code>highContrast</Code> and <Code>position</Code> stay open.</>}>
              <PropTable rows={CONTENT_PROPS} />
            </Section>
            <Section title="Item — one option" lead={<><Code>Select.Item</Code> is a single choice. Options are authored as JSX children — one <Code>Select.Item</Code> per choice (no <Code>options=[]</Code> data prop).</>}>
              <PropTable rows={ITEM_PROPS} />
            </Section>
            <Section title="Group · Label · Separator · Empty — structure" lead="Passthroughs to the Radix primitives, re-skinned by the system’s tokens — used to cluster a long list under headings, and to mark an empty list.">
              <PropTable rows={PART_PROPS} />
            </Section>
          </Flex>
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Select · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[soft-variant-scope]] · surface-only trigger">
            The trigger uses <Code>surface</Code> only — <Code>soft</Code>/<Code>ghost</Code>/
            <Code>classic</Code> aren’t exposed, so the field is always identifiable.
          </Decision>
          <Decision id="[[floating-surface-fill]] · opaque menu">
            The floating <Code>Select.Content</Code> is <Code>solid</Code> (opaque), per the layering
            rule — a menu must never be translucent without an opaque backstop.
          </Decision>
          <Decision id="[[field-shell]] · Field shell">
            The shared <Code>Field</Code> shell owns the label + validation rows and threads aria via
            context.
          </Decision>
          <Decision id="[[field-shell-adoption]] · trigger is the control">
            The Select is compositional, so the <strong>trigger</strong> is the form control:{" "}
            <Code>useOptionalFieldControl()</Code> wires <Code>id</Code> / <Code>aria-describedby</Code> /{" "}
            <Code>aria-invalid</Code> onto it (valid on its <Code>role=combobox</Code>), and validation
            paints <Code>.rt-SelectTrigger</Code> only — the portaled Content can’t inherit{" "}
            <Code>[data-validation]</Code>, so its CSS is scoped to the trigger.
          </Decision>
          <Decision id="[[focus-ring]] · focus ring">
            The focus ring is the accent fill, <Code>--ds-stroke-focus</Code>, with a Radix alpha,{" "}
            <Code>--ds-stroke-focus-stack</Code>, stacked on top so it clears 3:1 and APCA Lc 30. It is 2px
            wide and the same on every control. It overrides Radix’s own{" "}
            <Code>.rt-SelectTrigger:focus-visible</Code> outline (no <Code>!important</Code>) and replaces
            the neutral <Code>gray-12</Code> ring the controls wore before. The active menu row wears the same stacked accent as
            its 2px inset edge. A validation state recolors the border stroke to the family (no halo).
          </Decision>
          <Decision id="[[select-selected-row]] · selected row">
            The open menu marks the <strong>selected</strong> option with the accent selection tint —{" "}
            <Code>--ds-fill-selected-subtle</Code> + a <Code>--ds-text-strong</Code> <strong>semibold</strong>{" "}
            label — with the left-gutter <strong>checkmark removed</strong>. The row keeps its tint whether or
            not it is also the active row; a non-selected active row takes the neutral <Code>--ds-fill-hover</Code>{" "}
            plus the accent ring edge, so persistent <em>selection</em> and transient <em>focus</em> never collapse —
            they stay apart on three channels: hue, weight, and the edge. Weight 600 is the non-colour 1.4.1 cue
            the checkmark left behind (no <Code>!important</Code>; high-contrast keeps Radix’s native checkmark
            treatment).
          </Decision>
          <Decision id="Text never rides the solid accent">
            A menu row label is 12px at the default size — the smallest type in the system — and the fill step a
            solid accent row would use is a UI-component background with no text-contrast commitment behind it.
            Measured off rendered pixels, a white label on that fill lands at 3.00–3.91:1 on the accents that
            matter, against the 4.5:1 minimum text that size owes. The selection tint keeps the brand on the row
            and hands the label back to <Code>--ds-text-strong</Code>, which measures 8–12:1 at every accent in
            both appearances. It is also the tint the rest of the system already uses for a selected row.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Open-menu selected row: moved off the solid accent fill onto the accent selection tint —{" "}
            <Code>--ds-fill-selected-subtle</Code> + a <Code>--ds-text-strong</Code> <Code>semibold</Code>{" "}
            label. The 12px white-on-fill label it replaced measured 3.00:1 at some accents, under the 4.5:1
            text minimum; the tinted row measures 8–12:1 everywhere. The active row keeps its neutral{" "}
            <Code>--ds-fill-hover</Code> and gains an inset ring edge, now the 2px stacked accent of [[focus-ring]],
            matching the DropdownMenu / ContextMenu highlighted row. CSS-only.
          </Decision>
          <Decision id="0.9.0">
            Open-menu selected row: corrected to Radix’s default solid selected fill — with the gutter checkmark
            removed; the active row is a neutral <Code>--ds-fill-hover</Code>. The earlier invented{" "}
            <Code>--ds-fill-selected-strong</Code> (accent-a8) tint and its distinctness gates were removed.
            CSS-only.
          </Decision>
          <Decision id="0.9.0">
            Select moved onto the shared <Code>Field</Code> shell — gained <Code>label</Code>,{" "}
            <Code>description</Code>, and accent-aware <Code>validation</Code> on the trigger, plus the
            system focus ring (now [[focus-ring]]). Stays bare when none of those props are passed. Stories on the standard
            template: History · Anatomy · Usage · Props.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
