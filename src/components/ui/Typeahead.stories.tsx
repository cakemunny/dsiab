import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, type ReactNode } from "react";
import { Box, Code, Flex, Grid, Text, Theme } from "@radix-ui/themes";
import { Info, WarningCircle } from "@phosphor-icons/react";
import { Typeahead, createStaticSource, type TypeaheadOption, type TypeaheadSource } from "./Typeahead";
import { Text as UIText } from "./Text";
import { Button as UIButton } from "./Button";
import { CONTROL_STEP_TO_UISIZE, SizeContext, useResolvedSize } from "../../theme/SizeContext";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, type KeyBinding, KeyRow,
  MeasuredRow, MeasuredSpec, Mono, Muted, NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section,
  tick, TokenGroup,
} from "./_storyKit";
import { ComparisonSection, PICK_FROM_SET_COMPARISON, SEARCH_SURFACES_COMPARISON } from "./_comparisons";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>Reach for a Typeahead when the user picks <strong>one</strong> item from a set too large or too remote to list — a person, a repo, a city — and search-as-you-type is the fastest way in. It owns the query pipeline (debounce, cancel, the stale-response guard) and the states around it; the consumer owns the <Code>source</Code>.</>;

/* These are the DOCS stories (History · Anatomy · Usage · Keyboard · Menu states · Props) — static
   and calm on view. All behavioral plays live in `_typeahead.stories.tsx` (_internal/Typeahead
   behavior), so viewing a docs page never auto-drives the panel (Storybook runs a story's play on view,
   which would flash the dropdown). The live specimens here stay manually interactive.

   ONE exception, and it drives nothing: Menu states carries an ASSERTION-ONLY play that checks the
   LOADING cell against what the page promises (a real Spinner, and one shared top edge across the four
   cells). Those two claims were made in three places and rendered in none — a page that promises
   pixels needs a test that can see them. */

/* ---- demo sources -------------------------------------------------------- */
const FRUITS: TypeaheadOption[] = [
  "Apple", "Apricot", "Avocado", "Banana", "Blackberry", "Blueberry", "Cherry",
  "Clementine", "Cranberry", "Date", "Elderberry", "Fig", "Grape", "Grapefruit",
  "Kiwi", "Lemon", "Lime", "Mango", "Melon", "Nectarine", "Orange", "Papaya",
  "Peach", "Pear", "Pineapple", "Plum", "Pomegranate", "Raspberry", "Strawberry", "Watermelon",
].map((label, i) => ({ id: String(i), label }));

const fruitSource = createStaticSource(FRUITS);

// An async source (~500 ms) — the Props's loading demo.
const asyncSource: TypeaheadSource = {
  search: async (q) => {
    await new Promise((r) => setTimeout(r, 500));
    const ql = q.toLowerCase().trim();
    return ql ? FRUITS.filter((f) => f.label.toLowerCase().includes(ql)) : FRUITS;
  },
};
// Zero-match + always-error sources for the Props.
const emptySource: TypeaheadSource = { search: () => Promise.resolve([]) };
const errorSource: TypeaheadSource = { search: async () => { throw new Error("network boom"); } };
// A search that NEVER settles — the Menu-states LOADING cell HOLDS the real in-flight state. The
// ~500ms source above would spin for half a second and then repaint into results, so the cell would
// be a loading specimen only for a reader who happened to be looking in that window.
const heldSource: TypeaheadSource = { search: () => new Promise<TypeaheadOption[]>(() => {}) };

/* ---- anatomy: the input specimen + callouts ------------------------------ */

function AnatomyDiagram() {
  // A real size-3 specimen with the label row (name + info + a pinned end-slot), the input (leading
  // search glyph, query, clear ✕), and a description. The panel is portaled, so it gets its own
  // "open panel" section rather than a callout here.
  return (
    <Box style={{ overflowX: "auto" }}>
      <Box style={{ position: "relative", width: "100%", minWidth: 480, maxWidth: 660, margin: "0 auto", height: 220, background: "var(--ds-bg-subtle)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
        <Flex align="center" justify="center" style={{ position: "absolute", inset: 0 }}>
          <Box style={{ position: "relative", width: 280 }} data-size-lesson="anatomy callout geometry — the callouts are placed against this size-3 specimen; its inset clear ✕ holds step 1">
            <Typeahead
              size="3"
              label="Fruit"
              info={<Info size={16} weight="regular" aria-hidden style={{ color: "var(--ds-icon-neutral)", display: "block" }} />}
              endSlot={<Text size="1" style={{ color: "var(--ds-text-weak)" }}>Optional</Text>}
              description="Type to search the catalogue."
              placeholder="Search fruit…"
              defaultValue={{ id: "0", label: "Apple" }}
              source={fruitSource}
            />
          </Box>
        </Flex>
        {/* 1 — label (from the left) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 210px)", top: 62 }}>1</Box>
        <Box style={hLine({ left: "calc(50% - 188px)", top: 72, width: 48 })} />
        {/* 2 — info (tick down onto the icon beside the label) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 96px)", top: 14 }}>2</Box>
        <Box style={tick({ left: "calc(50% - 86px)", top: 34, height: 34 })} />
        {/* 3 — end-slot (from the right) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 210px)", top: 62 }}>3</Box>
        <Box style={hLine({ left: "calc(50% + 140px)", top: 72, width: 48 })} />
        {/* 4 — leading search glyph (tick up from below onto the left affix) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 128px)", top: 158 }}>4</Box>
        <Box style={tick({ left: "calc(50% - 118px)", top: 116, height: 42 })} />
        {/* 5 — query / placeholder (tick up) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 40px)", top: 158 }}>5</Box>
        <Box style={tick({ left: "calc(50% - 30px)", top: 116, height: 42 })} />
        {/* 6 — clear ✕ / spinner affix (from the right) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 210px)", top: 98 }}>6</Box>
        <Box style={hLine({ left: "calc(50% + 122px)", top: 108, width: 68 })} />
        {/* 7 — description (from the left) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 210px)", top: 132 }}>7</Box>
        <Box style={hLine({ left: "calc(50% - 188px)", top: 142, width: 48 })} />
      </Box>
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Label", "the field’s name — sets the accessible name via htmlFor → id (shared Field.Label)"],
  [2, "Info", "an optional inline affordance beside the label — a tip icon or helper toggle (shared Field.Label)"],
  [3, "End-slot", "an optional pinned note at the far end of the label row — “Optional”, a count, an action"],
  [4, "Leading glyph", "the search signifier — a magnifying glass by default (Typeahead’s identity is search); pass icon={null} to drop it or a node to override"],
  [5, "Query / placeholder", "the live search text; a greyed placeholder before typing. On selection the input shows the chosen label"],
  [6, "Clear ✕ / spinner", "the trailing affix — a Spinner while a search is in flight, a clear ✕ while a value/query is present (out of the tab order)"],
  [7, "Description", "an optional helper line beneath; replaced by the validation message when a state is active"],
];

/* ---- anatomy: the open panel + its parts --------------------------------- */

const PANEL_PARTS: [number, string, string][] = [
  [1, "Panel surface", "the floating listbox — solid and opaque (never translucent), painted --ds-bg-overlay, raised by --ds-shadow-overlay. Portaled to the body, so validation never reaches it."],
  [2, "Option (rest)", "an unselected match — weight 400, no fill; the row is the click target."],
  [3, "Highlighted option", "the pointer or keyboard active-descendant — a neutral --ds-fill-hover layer, reused verbatim from Select / MultiSelect so all three read as siblings."],
  [4, "Selected option", "the current value while re-searching — a semibold (600) label (the non-colour cue, WCAG 1.4.1)."],
  [5, "Empty line", "a completed search with zero matches — a muted --ds-text-weak line that ECHOES the query (“No results for …”), so the user edits rather than resets."],
  [6, "Error row", "a REJECTED search — error-tone text + a generic alert glyph on a weak --ds-fill-error-weak tint (NOT the loud solid fill), plus a Retry button. Distinct from empty."],
];

/* ONE measure for every panel specimen on this page, so a pair of state specimens differs only in the
   state it teaches — not in its frame. Two hand-picked widths (260 for empty/results, 320 for error)
   made the states matrix read as two unrelated panels.

   320 is set by the WIDEST row at the LARGEST tier: at uiSize=large the error row (16px message +
   16px "Try again", both nowrap, on the row's 8px padding) needs a 291px panel to hold one line —
   measured off the live specimen. The 260px panel wrapped "Couldn't load results." onto a second line
   there; empty ("No results for …", 145px) and the option rows are narrower still, so 320 clears
   every row at every tier with room to spare. */
const PANEL_W = 320;

// A faithful STATIC specimen of a panel state — the real Theme-on-panel compound class + real tokens,
// so it follows the toolbar accent. Presentational only (no listbox/option roles) — the live behaviour
// + roles are exercised in the _internal/Typeahead behavior suite.
function PanelSpecimen({ size, width = PANEL_W, children, testid }: { size?: "1" | "2" | "3"; width?: number; children: ReactNode; testid?: string }) {
  // The specimen must land on the SAME step the live panel resolves, or "faithful" stops being true the
  // moment the uiSize toolbar moves — it froze at step 2 while the real control on this very page ran at
  // step 1 (24px rows) at the default tier and step 3 (40px) at large. So it reuses Typeahead's OWN
  // mechanism verbatim (`useResolvedSize("control", size) ?? "1"`, Typeahead.tsx) rather than pinning a
  // step, and SEEDS the resolved step to its slots ([[container-size-seeding]]): the rows a caller passes in resolve the
  // panel's step, never the ambient tier behind it.
  const resolved = useResolvedSize<"1" | "2" | "3">("control", size) ?? "1";
  return (
    <Box data-testid={testid} style={{ width }}>
      <Theme className={`rt-ds-typeahead-panel rt-r-size-${resolved}`} hasBackground={false} style={{ position: "static", display: "block" }}>
        <SizeContext.Provider value={CONTROL_STEP_TO_UISIZE[resolved]}>{children}</SizeContext.Provider>
      </Theme>
    </Box>
  );
}
const specOption = (label: string, opts?: { highlighted?: boolean; selected?: boolean }): ReactNode => (
  <div className="rt-ds-typeahead-option" data-highlighted={opts?.highlighted ? "" : undefined} style={{ cursor: "default" }}>
    <span className="rt-ds-typeahead-label" style={opts?.selected ? { fontWeight: 600 } : undefined}>{label}</span>
  </div>
);

/* ========================================================================== */

const meta: Meta<typeof Typeahead> = {
  title: "Components/Typed Entry/Typeahead",
  component: Typeahead,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Typeahead** — an async, type-to-search combobox for picking ONE item from a searchable " +
          "source. A custom ARIA combobox (aria-activedescendant — focus never " +
          "leaves the input) on `@radix-ui/react-popover`, riding the shared **Field** shell. The input " +
          "reuses Radix `TextField.Root` (so the validation paint + system focus ring + affixes come " +
          "for free), the size defaults to small, and a failed search surfaces a **distinct, " +
          "retryable error** instead of masquerading as “no results”.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Typeahead>;

/** Anatomy — the parts of the field, its open panel, and a validation specimen. The token spec lives
 *  on Usage. */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Typeahead · Anatomy" standfirst={DEFINITION} />

        <Section title="Anatomy — the field" lead="The shared label row carries the name plus an optional info affordance and a pinned end-slot; the input composes a leading search glyph, the query (or a greyed placeholder), and a trailing affix (a loading Spinner or the clear ✕); a description helper sits beneath. The label row + support area are the same shared Field chrome as TextField — only the input’s affixes and the panel it opens are new.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>
            Only the <strong>label</strong> is required. The <strong>leading glyph</strong> defaults on
            (drop it with <Code>icon={`{null}`}</Code>); the <strong>clear ✕</strong> (<Code>clearable</Code>,
            on by default), the <strong>info</strong>, the <strong>end-slot</strong>, and the{" "}
            <strong>description</strong> are all optional.
          </Caption>
        </Section>

        <Rule />

        <Section title="Anatomy — the open panel" lead="The floating listbox the input opens into — solid and opaque (never translucent). Results are role=option rows; the active row (pointer or arrow) takes the neutral gray layer, the current value bolds. Zero matches and a failed search each get their own row — distinct by design. The specimen below is house-faithful (real tokens, follows the toolbar accent).">
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="4">
            <PanelSpecimen>
              <div className="rt-ds-typeahead-listbox">
                {specOption("Apple", { selected: true })}
                {specOption("Apricot", { highlighted: true })}
                {specOption("Grape")}
                {specOption("Grapefruit")}
              </div>
            </PanelSpecimen>
            <Flex direction="column" gap="3">
              <PanelSpecimen>
                <div className="rt-ds-typeahead-empty">No results for “xyzzy”</div>
              </PanelSpecimen>
              <PanelSpecimen>
                {/* nowrap on the message, as on every other error specimen in this file: the sentence and
                    its Retry are ONE row, and a documentation example that breaks mid-sentence teaches
                    the row's shape wrong. The panel measure above is what makes the promise keepable. */}
                <div className="rt-ds-typeahead-status rt-ds-typeahead-error">
                  <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                    <WarningCircle size={16} weight="fill" aria-hidden style={{ flexShrink: 0 }} />
                    <UIText style={{ color: "inherit", lineHeight: 1.5, whiteSpace: "nowrap" }}>Couldn’t load results.</UIText>
                  </Flex>
                  <UIButton priority="tertiary" type="button" tabIndex={-1}>Try again</UIButton>
                </div>
              </PanelSpecimen>
            </Flex>
          </Grid>
          <AnatomyLegend parts={PANEL_PARTS} />
        </Section>

        <Rule />

        <Section title="Validation specimen" lead="A validation state paints the input box — border, faint tint, a status glyph, and a one-line message below — the same accent-aware family as a TextField, because the input IS a TextField.Root. The portaled panel stays neutral.">
          <Box data-testid="anatomy-validation" style={{ maxWidth: 280 }}>
            <Typeahead label="Fruit" source={fruitSource} placeholder="Search fruit…" debounceMs={0} validation={{ tone: "error", message: "Pick a fruit from the list." }} />
          </Box>
          <Caption>The input carries the border + tint; the message sits below, top-aligned and wrapping. The paint follows the accent-aware <Mono>--ds-*-error</Mono> family — it shifts under a colliding brand, never a hardcoded red.</Caption>
        </Section>

      </Page>
    </HexThemeKey.Provider>
  ),
};

/** Usage — when to reach for Typeahead, the states that keep it honest, and the live token spec that
 *  closes the page. */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="Typeahead · Usage" standfirst={DEFINITION} />

      <ComparisonSection comparison={PICK_FROM_SET_COMPARISON} highlight="Typeahead" />

      <Rule />

      <ComparisonSection comparison={SEARCH_SURFACES_COMPARISON} highlight="Typeahead" />

      <Rule />

      <Section title="Typeahead vs. its neighbours" lead="Pick the control that matches the shape of the choice.">
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="4">
          <Scenario label="TYPEAHEAD" caption={<>Pick <strong>one</strong> from a large / remote set by <strong>searching</strong> — users, repos, cities. The list is fetched, not fixed.</>}>
            <Box>
              <Typeahead label="Assignee" source={fruitSource} placeholder="Search people…" />
            </Box>
          </Scenario>
          <Scenario label="SELECT" caption={<>A short, <strong>fixed</strong> list (a handful of options) — no search needed. Use <Code>Select</Code>.</>}>
            <Box style={{ paddingTop: 4 }}><Muted>country · status · role — the options are known and few</Muted></Box>
          </Scenario>
          <Scenario label="MULTISELECT" caption={<>Pick <strong>many</strong> from a set — tags, permissions, countries. Use <Code>MultiSelect</Code>.</>}>
            <Box style={{ paddingTop: 4 }}><Muted>the trigger summarises with a count; rows carry checkboxes</Muted></Box>
          </Scenario>
          <Scenario label="COMMAND PALETTE / TOKENIZER" caption={<>Search-to-<strong>act</strong> (⌘K) or free-text <strong>chips</strong> — both build on this engine.</>}>
            <Box style={{ paddingTop: 4 }}><Muted>same search source contract; different surface</Muted></Box>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section title="A failure is not an empty list" lead="The single most important rule this component enforces: when a search rejects, say so — and offer a way back. Collapsing an error into “no results” tells the user their query was fine and there simply is nothing, which is a lie that sends them re-typing a query that will never work.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="A rejected search gets its own error-tone row + a Retry that re-runs the query (Enter re-runs from the keyboard). The user knows it’s the system, not them.">
            <PanelSpecimen>
              <div className="rt-ds-typeahead-status rt-ds-typeahead-error">
                <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                  <WarningCircle size={16} weight="fill" aria-hidden style={{ flexShrink: 0, color: "var(--ds-text-error)" }} />
                  <UIText style={{ color: "var(--ds-text-error)", lineHeight: 1.5, whiteSpace: "nowrap" }}>Couldn’t load results.</UIText>
                </Flex>
                <UIButton priority="tertiary" type="button" tabIndex={-1}>Try again</UIButton>
              </div>
            </PanelSpecimen>
          </DoDont>
          <DoDont kind="dont" bare note="Swallowing the failure into “No results” — the user reads “nothing matches”, edits a perfectly good query, and never learns the request failed.">
            <PanelSpecimen>
              <div className="rt-ds-typeahead-empty">No results for “octocat”</div>
            </PanelSpecimen>
          </DoDont>
        </Grid>
        <Caption>The empty state itself is <strong>actionable by echoing the query</strong> (“No results for …”) — it confirms the system read the input and orients the user to edit, rather than offering a blunt reset.</Caption>
      </Section>

      <Rule />

      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Each row names a part and the role it claims, then reads that property off the part itself and checks the two against each other — so a row can disagree with the component. Semantic tones are accent-aware; they follow a brand’s collision shifts.">
          <Flex direction="column" gap="4">
            <TokenGroup label="INPUT (rest + affixes)" blurb="The input reuses Radix TextField.Root — its resting border/fill + the system focus ring ([[focus-ring]]) are the shared Field chrome; only the affix glyphs are painted here.">
              <MeasuredSpec render={() => <Typeahead label="Fruit" source={fruitSource} debounceMs={0} placeholder="Search fruit…" />}>
                <MeasuredRow
                  part="Leading glyph"
                  note="The search magnifier in the left affix slot."
                  token="--ds-icon-neutral"
                  select=".rt-TextFieldSlot svg"
                  prop="color"
                />
                <MeasuredRow
                  part="Focus ring"
                  note="The same 2px ring every control wears on focus. The accent base, with the stack alpha on top ([[focus-ring]])."
                  token="--ds-stroke-focus"
                  select=".rt-TextFieldRoot"
                  prop="outline-color"
                  state="focus"
                />
              </MeasuredSpec>
              <NoteRow part="Border (rest)" value="Radix surface — inset 1px" radix="--gray-a7" />
            </TokenGroup>
            <TokenGroup label="FLOATING PANEL" blurb="The portaled listbox and its rows — an opaque overlay, the neutral highlight reused from Select / MultiSelect.">
              {/* The panel is portaled to <body> and the component exposes no way to redirect that portal,
                  so the host carries the panel's OWN element and row markup — the same classes the live
                  panel renders. The stylesheet paints them identically and the story never names a role, so
                  each row still compares two independently-sourced values. */}
              <MeasuredSpec
                render={() => (
                  <PanelSpecimen>
                    <div className="rt-ds-typeahead-listbox">
                      {specOption("Apple", { selected: true })}
                      {specOption("Apricot", { highlighted: true })}
                    </div>
                    <div className="rt-ds-typeahead-empty">No results for “xyzzy”</div>
                  </PanelSpecimen>
                )}
              >
                <MeasuredRow
                  part="Panel surface"
                  note="Solid and opaque — a menu never lets the page read through it."
                  token="--ds-bg-overlay"
                  select=".rt-ds-typeahead-panel"
                  prop="background-color"
                />
                <MeasuredRow
                  part="Elevation"
                  note="A hairline ring plus a drop shadow, shared with the sibling menus."
                  token="--ds-shadow-overlay"
                  select=".rt-ds-typeahead-panel"
                  prop="box-shadow"
                />
                <MeasuredRow
                  part="Option text"
                  note="An unselected match at rest."
                  token="--ds-text-strong"
                  select=".rt-ds-typeahead-option"
                  prop="color"
                />
                <MeasuredRow
                  part="Highlighted row"
                  note="The pointer or arrow-key active descendant."
                  token="--ds-fill-hover"
                  select=".rt-ds-typeahead-option[data-highlighted]"
                  prop="background-color"
                />
                <MeasuredRow
                  part="Empty line"
                  note="A completed search with zero matches, echoing the query."
                  token="--ds-text-weak"
                  select=".rt-ds-typeahead-empty"
                  prop="color"
                />
              </MeasuredSpec>
              <NoteRow part="Selected row · label" value="weight 600 — the non-colour cue (WCAG 1.4.1)" />
              <NoteRow part="Panel radius" value="--ds-radius-3 · rows --ds-radius-2" />
            </TokenGroup>
            <TokenGroup label="ERROR ROW" blurb="Restrained, not alarming — error-tone text + a generic alert glyph on a weak tint. Deliberately NOT the solid fill (a search failure is a system fault, not a “your input is wrong” signal).">
              <MeasuredSpec
                render={() => (
                  <PanelSpecimen>
                    <div className="rt-ds-typeahead-status rt-ds-typeahead-error">
                      <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                        <WarningCircle size={16} weight="fill" aria-hidden style={{ flexShrink: 0 }} />
                        <UIText style={{ color: "inherit", lineHeight: 1.5 }}>Couldn’t load results.</UIText>
                      </Flex>
                      <UIButton priority="tertiary" type="button" tabIndex={-1}>Try again</UIButton>
                    </div>
                  </PanelSpecimen>
                )}
              >
                <MeasuredRow
                  part="Text + glyph"
                  note="The message and its alert mark share one ink."
                  token="--ds-text-error"
                  select=".rt-ds-typeahead-error"
                  prop="color"
                />
                <MeasuredRow
                  part="Tint"
                  note="A weak wash behind the row — never the solid fill."
                  token="--ds-fill-error-weak"
                  select=".rt-ds-typeahead-error"
                  prop="background-color"
                />
              </MeasuredSpec>
              {/* The invalid input's border is an INSET RING (a box-shadow), not a border colour, so there
                  is no colour longhand to read it off — see the Anatomy page's validation specimen for
                  the paint. */}
              <NoteRow part="Input border (invalid)" value="inset 1px ring — the family step-8 stroke" radix="--ds-stroke-error" />
            </TokenGroup>
          </Flex>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
};

/* ---- Keyboard contract --------------------------------------------------- */

const CLOSED_KEYS: KeyBinding[] = [
  { keys: ["A–Z 0–9"], action: <>Type to <strong>filter</strong> — a debounced <Code>source.search</Code> opens the panel with matches (or a distinct empty / error row).</>, src: "system" },
  { keys: ["↓"], action: <>Open the panel and highlight the first match (when a query has run or <Code>openOnFocus</Code> is set).</>, src: "system" },
  { keys: ["Backspace"], action: <>Clearing the query to empty resets the selection — the keyboard equivalent of the clear ✕ (which sits out of the tab order).</>, src: "system" },
];

const OPEN_KEYS: KeyBinding[] = [
  { keys: ["↓", "↑"], action: <>Move the virtual cursor down / up with <strong>wrap-around</strong>. DOM focus never leaves the input — only <Code>aria-activedescendant</Code> moves.</>, src: "system" },
  { keys: ["Home", "End"], action: "Jump the cursor to the first / last option.", src: "system" },
  { keys: ["Enter"], action: <>Select the highlighted option — <strong>or</strong> re-run the query when the panel is in the error state (Retry from the keyboard).</>, src: "system" },
  { keys: ["Esc"], action: "Close the panel; the query and selection are kept.", src: "system" },
  { keys: ["Tab"], action: <>Move focus on natively; leaving the field <strong>closes</strong> the panel (no orphaned menu).</>, src: "system" },
];

/** Keyboard — the complete key → action contract; the play walks it end to end. */
export const Keyboard: Story = {
  render: () => (
    <Page>
      <PageHeader title="Typeahead · Keyboard" standfirst={DEFINITION} />

      <Section title="Keyboard" lead={<>The full key → action contract. This is an <strong>aria-activedescendant</strong> combobox: DOM focus stays on the input at all times, and the arrows move a virtual cursor over the options. Every binding is <strong>system</strong>-owned; the panel’s open/close is the <Code>@radix-ui/react-popover</Code> primitive underneath.</>}>
        <Flex direction="column" gap="2">
          <Box data-testid="ta-keyboard" style={{ maxWidth: 300 }}>
            <Typeahead label="Fruit" source={fruitSource} placeholder="Search fruit…" debounceMs={0} description="Focus the input, then try the keys below." />
          </Box>
          <Caption>A live target — type a letter to open it, then arrow around.</Caption>
        </Flex>
        <Flex direction="column" gap="4">
          <TokenGroup label="INPUT · PANEL CLOSED">
            {CLOSED_KEYS.map((b) => <KeyRow key={b.keys.join("+")} {...b} />)}
          </TokenGroup>
          <TokenGroup label="PANEL OPEN">
            {OPEN_KEYS.map((b) => <KeyRow key={b.keys.join("+")} {...b} />)}
          </TokenGroup>
        </Flex>
        <Caption><strong>Pointer</strong> — hovering a row moves the highlight; clicking selects and closes. A completed search announces its outcome (result count / no-results / error) through a polite live region.</Caption>
      </Section>
    </Page>
  ),
};

/** The LOADING cell — a REAL Typeahead mid-search, never a Spinner posed in a slot. On mount it types
 *  into the real input exactly as a user would (the native value setter + an `input` event), so the
 *  component's own path runs: debounce → `source.search` → `isLoading` → the Spinner in the trailing
 *  affix. `heldSource` never settles, so that state HOLDS for as long as the page is open.
 *
 *  The panel stays CLOSED throughout, which is why this belongs on a docs page: `performSearch` only
 *  calls `emitOpen(true)` on resolve/reject, so a search that never settles can't auto-drive the page
 *  into a floating panel (the reason every behavioral play lives in `_typeahead.stories.tsx`).
 *
 *  Bare (no `label`) on purpose: a `label=""` renders the shared Field's label ROW with nothing in it,
 *  which pushed this cell's input 24px below the three panel specimens beside it in the matrix. */
function LoadingSpecimen() {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setValue.call(input, "Ap");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, []);
  return (
    <Typeahead
      aria-label="Search fruit"
      source={heldSource}
      placeholder="Search fruit…"
      inputRef={inputRef}
    />
  );
}

/** Menu states — the panel matrix (loading · results · highlighted · empty · error), with live
 *  specimens exercising the empty/error distinction, the retry paths, and the async-race guard. */
export const MenuStates: Story = {
  // SIDEBAR LEAF, in the house's sentence case. Left to Storybook the export name is
  // title-cased into "Menu States", which then disagrees with this page's own h1 —
  // the header suffix is the role humanized ("Menu states"), and the sidebar is the
  // same page. An explicit `name` does not change the story id.
  name: "Menu states",
  render: () => (
    <Page>
      <PageHeader title="Typeahead · Menu states" standfirst={DEFINITION} />

      <Section title="Panel states" lead="The panel is one surface with distinct contents. Loading shows a Spinner in the input affix (the panel keeps the prior results — never blank-then-repaint). Results are option rows with one highlighted. A completed zero-match search echoes the query as a muted line. A REJECTED search gets its own error row + Retry — never disguised as empty.">
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="4">
          <Flex direction="column" gap="2">
            <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>LOADING (affix spinner)</Text>
            {/* The live field takes the same measure as the three panel specimens beside it: this is a
                matrix of ONE surface in four states, so a cell that is 60px narrower than its neighbour
                reads as a difference the matrix is teaching, which it isn't. */}
            <Box style={{ maxWidth: PANEL_W }}>
              <LoadingSpecimen />
            </Box>
            <Caption>A real search, held mid-request: the Spinner takes the trailing affix, in place of the clear ✕. The panel opens on resolve — and a refine keeps the previous rows up while it spins, so it never blanks and repaints.</Caption>
          </Flex>
          <Flex direction="column" gap="2">
            <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>RESULTS · HIGHLIGHTED</Text>
            <PanelSpecimen testid="matrix-results">
              <div className="rt-ds-typeahead-listbox">
                {specOption("Apple", { selected: true })}
                {specOption("Apricot", { highlighted: true })}
                {specOption("Avocado")}
                {specOption("Grape")}
              </div>
            </PanelSpecimen>
          </Flex>
          <Flex direction="column" gap="2">
            <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>EMPTY (echoes the query)</Text>
            <PanelSpecimen>
              <div className="rt-ds-typeahead-empty">No results for “xyzzy”</div>
            </PanelSpecimen>
          </Flex>
          <Flex direction="column" gap="2">
            <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>ERROR (distinct + retry)</Text>
            <PanelSpecimen>
              <div className="rt-ds-typeahead-status rt-ds-typeahead-error">
                <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                  <WarningCircle size={16} weight="fill" aria-hidden style={{ flexShrink: 0 }} />
                  <UIText style={{ color: "inherit", lineHeight: 1.5, whiteSpace: "nowrap" }}>Couldn’t load results.</UIText>
                </Flex>
                <UIButton priority="tertiary" type="button" tabIndex={-1}>Try again</UIButton>
              </div>
            </PanelSpecimen>
          </Flex>
        </Grid>
      </Section>

      <Caption>The live empty / error / race behaviour is exercised in <Mono>_internal/Typeahead behavior</Mono> — kept out of the docs so viewing this page never auto-drives the panel.</Caption>
    </Page>
  ),
  // ASSERTION-ONLY (drives nothing — see the file header). The LOADING cell is the one live field in
  // this matrix, and both of its claims were previously unrendered: the Spinner the label, the caption
  // and the anatomy callout all promise, and the shared top edge a 2×2 matrix implies.
  play: async ({ canvasElement }) => {
    const deadline = performance.now() + 2000;
    const spinnerOf = () => canvasElement.querySelector<HTMLElement>(".rt-TextFieldRoot .rt-Spinner");
    while (!spinnerOf() && performance.now() < deadline) await new Promise((r) => setTimeout(r, 20));

    const spinner = spinnerOf();
    if (!spinner) {
      throw new Error(
        "the LOADING cell must render a REAL Spinner in the input's trailing affix — the label, the " +
          "caption and the anatomy callout all promise one",
      );
    }
    // A held search means the panel must NOT be open: this page stays calm on view.
    const input = canvasElement.querySelector<HTMLInputElement>('input[role="combobox"]')!;
    if (input.getAttribute("aria-expanded") !== "false") {
      throw new Error("the LOADING cell must hold its search with the panel CLOSED; got aria-expanded=true");
    }

    // One baseline across the 2×2 matrix. `label=""` on this cell used to render the shared Field's
    // label row EMPTY, dropping the input 24px below the three panel specimens beside it.
    const tops = [...canvasElement.querySelectorAll<HTMLElement>(".rt-TextFieldRoot, .rt-ds-typeahead-panel")]
      .map((el) => Math.round(el.getBoundingClientRect().top));
    const rowOne = tops.slice(0, 2);
    if (Math.abs(rowOne[0] - rowOne[1]) > 1) {
      throw new Error(`the matrix's first row must share one top edge; got ${rowOne.join(" vs ")}px`);
    }
  },
};

/* ---- Props ---------------------------------------------------------- */

const SOURCE_LABELS: Record<string, string> = {
  static: "static fruits (sync)",
  async: "async (~500 ms)",
  error: "always errors",
  empty: "empty results",
};

const PROPS: PropDef[] = [
  { name: "source", type: "TypeaheadSource<T>", desc: <><Code>{`{ search(query), bootstrap?(), cancel?() }`}</Code> — the consumer owns ALL filtering; the component never filters. Use <Code>createStaticSource(items)</Code> for a local list.</>, source: "Typeahead.tsx" },
  { name: "value / defaultValue", type: "TypeaheadOption<T> | null", desc: <>Controlled / uncontrolled selection — the whole option (id · label · element? · auxiliaryData?), not just an id.</>, source: "Typeahead.tsx" },
  { name: "onValueChange", type: "(v: Option | null) => void", desc: <>Fires on select and on clear.</>, source: "Typeahead.tsx" },
  { name: "renderOption", type: "(o: Option) => ReactNode", desc: <>Custom row content; overrides <Code>option.element</Code> / <Code>option.label</Code>.</>, source: "Typeahead.tsx" },
  { name: "openOnFocus", type: "boolean", def: "false", desc: <>Open the panel on focus (via <Code>source.bootstrap()</Code>, else <Code>search("")</Code>) — a recents / suggestions affordance before typing.</>, source: "Typeahead.tsx" },
  { name: "maxItems", type: "number", def: "10", desc: <>Cap the rendered result count.</>, source: "Typeahead.tsx" },
  { name: "emptyText", type: "ReactNode", desc: <>Zero-match copy; <Code>undefined</Code> echoes the query (“No results for …”).</>, source: "Typeahead.tsx" },
  { name: "errorText", type: "ReactNode", def: `"Couldn't load results."`, desc: <>The distinct error copy, shown with a Retry affordance when a search rejects.</>, source: "Typeahead.tsx" },
  { name: "clearable", type: "boolean", def: "true", desc: <>The trailing clear ✕ (out of tab order); Backspace-to-empty clears too.</>, source: "Typeahead.tsx" },
  { name: "icon", type: "ReactNode", desc: <>Leading glyph. <Code>undefined</Code> shows a search glyph (Typeahead’s identity is search); <Code>null</Code> removes it; a node overrides.</>, source: "Typeahead.tsx" },
  { name: "placeholder", type: "string", desc: <>Greyed hint while empty. Let it carry the object (“Search customers…”), not restate “Search”.</>, source: "Typeahead.tsx" },
  { name: "size", type: `"1" | "2" | "3"`, def: `"1"`, desc: <>Control size. Unset, it resolves from the global <Code>uiSize</Code> control lane (default <Code>small</Code> → <Code>1</Code>).</>, source: "Typeahead.tsx" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Dims the input and makes it inert.</>, source: "Typeahead.tsx" },
  { name: "debounceMs", type: "number", def: "150", desc: <>Delay before firing <Code>source.search</Code>. Set <Code>0</Code> for synchronous / local sources.</>, source: "Typeahead.tsx" },
  { name: "onOpenChange / onQueryChange", type: "(x) => void", desc: <>Observe the panel open state / the live query (logging, analytics).</>, source: "Typeahead.tsx" },
  { name: "label / info / endSlot / description / validation", type: "Field props", desc: <>The shared <Code>Field</Code> shell — label row, helper line, and accent-aware validation on the input. Pass none of label / description / validation to keep the control bare.</>, source: "Typeahead.tsx" },
  { name: "aria-label / aria-labelledby", type: "string", desc: <>Names a <strong>bare</strong> Typeahead (no visible <Code>label</Code>): pass the name as text, or the <Code>id</Code> of the element that already reads as its name. One of <Code>label</Code> / <Code>aria-label</Code> / <Code>aria-labelledby</Code> is required — an unnamed combobox fails WCAG 4.1.2, and a <Code>placeholder</Code> is not a name.</>, source: "Typeahead.tsx" },
];

/* The embedded-mode contract — the props a HOST component (Tokenizer) uses to drive Typeahead's engine
   as a transient combobox inside its own field surface. Kept in a second table so they don't read as
   everyday choices alongside `placeholder` / `size`: they only make sense together, and only to a host. */
const EMBEDDED_PROPS: PropDef[] = [
  { name: "embedded", type: "boolean", def: "false", desc: <>Render the input <strong>chrome-less</strong> — no border, background or focus ring of its own, because the host paints the surface and the ring — and make selection <strong>transient</strong>: on select it fires <Code>onValueChange</Code> and resets the query to empty, leaving the committed value to the host.</>, source: "Typeahead.tsx" },
  { name: "anchorRef", type: "RefObject<HTMLElement | null>", desc: <>The element the dropdown positions against in embedded mode — normally the host’s whole surface, so the panel spans the full field instead of just the input.</>, source: "Typeahead.tsx" },
  { name: "inputRef", type: "Ref<HTMLInputElement>", desc: <>Forwarded to the underlying <Code>{"<input>"}</Code>. A host needs the node itself to move focus and read the caret position.</>, source: "Typeahead.tsx" },
  { name: "onInputKeyDown", type: "(e) => void", desc: <>Runs <strong>before</strong> Typeahead’s own keydown, so a host can claim the keys it owns (Backspace on an empty query, Shift+Tab). Calling <Code>preventDefault()</Code> skips Typeahead’s handling for that key.</>, source: "Typeahead.tsx" },
  { name: "inputCollapsed", type: "boolean", def: "false", desc: <>Collapse the input to a focusable sliver — how a host shows it has reached its entry cap without dropping the field out of the tab order.</>, source: "Typeahead.tsx" },
  { name: "controlProps", type: `{ readOnly?; aria-disabled?; aria-describedby?; aria-invalid? }`, desc: <>A narrow set of attributes merged onto the <Code>{"<input>"}</Code> — how a host injects its own soft-disable (<Code>readOnly</Code> + <Code>aria-disabled</Code>) and a merged <Code>aria-describedby</Code>. Deliberately narrow, so it can’t clobber the input’s own typed attributes.</>, source: "Typeahead.tsx" },
];

type PropsArgs = {
  sourceKind: "static" | "async" | "error" | "empty";
  showLabel: boolean;
  label: string;
  placeholder: string;
  description: string;
  validation: { tone: "error" | "warning" | "success" | "info"; message: string } | undefined;
  size: "auto" | "1" | "2" | "3";
  clearable: boolean;
  showIcon: boolean;
  openOnFocus: boolean;
  maxItems: number;
  debounceMs: number;
  disabled: boolean;
};

/** Props — the live, args-driven field. Swap the source (static / async / error / empty) and drive
 *  every own prop from Controls. */
export const Props: StoryObj<PropsArgs> = {
  args: {
    sourceKind: "static",
    showLabel: true,
    label: "Fruit",
    placeholder: "Search fruit…",
    description: "Type to search the catalogue.",
    validation: undefined,
    size: "auto",
    clearable: true,
    showIcon: true,
    openOnFocus: false,
    maxItems: 10,
    debounceMs: 150,
    disabled: false,
  },
  argTypes: {
    sourceKind: { name: "source", control: "inline-radio", options: ["static", "async", "error", "empty"], description: "Which demo source backs the field.", table: { category: "Behaviour" } },
    showLabel: { name: "label (show)", control: "boolean", table: { category: "Field" } },
    label: { control: "text", if: { arg: "showLabel" }, table: { category: "Field" } },
    placeholder: { control: "text", table: { category: "Field" } },
    description: { name: "description (helper)", control: "text", table: { category: "Field" } },
    validation: {
      control: "inline-radio",
      options: ["none", "error", "warning", "success", "info"],
      mapping: {
        none: undefined,
        error: { tone: "error", message: "Pick a fruit from the list." },
        warning: { tone: "warning", message: "Double-check this one." },
        success: { tone: "success", message: "That works." },
        info: { tone: "info", message: "You can change this later." },
      },
      table: { category: "Field" },
    },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step pins the field.', table: { category: "Variant" } },
    clearable: { name: "clearable (✕)", control: "boolean", table: { category: "Behaviour" } },
    showIcon: { name: "icon (search glyph)", control: "boolean", table: { category: "Behaviour" } },
    openOnFocus: { control: "boolean", table: { category: "Behaviour" } },
    maxItems: { control: { type: "range", min: 1, max: 20, step: 1 }, table: { category: "Behaviour" } },
    debounceMs: { control: { type: "range", min: 0, max: 600, step: 50 }, table: { category: "Behaviour" } },
    disabled: { control: "boolean", table: { category: "Variant" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => {
    const source = { static: fruitSource, async: asyncSource, error: errorSource, empty: emptySource }[args.sourceKind];
    return (
      <Page maxWidth="none">
        <PageHeader title="Typeahead · Props" standfirst={DEFINITION} />
        <Box p="5" style={{ maxWidth: 380 }}>
          <Typeahead
            key={args.sourceKind}
            source={source}
            label={args.showLabel ? args.label : undefined}
            placeholder={args.placeholder}
            description={args.description}
            validation={args.validation}
            size={args.size === "auto" ? undefined : args.size}
            clearable={args.clearable}
            icon={args.showIcon ? undefined : null}
            openOnFocus={args.openOnFocus}
            maxItems={args.maxItems}
            debounceMs={args.debounceMs}
            disabled={args.disabled}
          />
          <Box mt="3"><Caption>Source: <Mono>{SOURCE_LABELS[args.sourceKind]}</Mono>. Type to search; the <Code>async</Code> source shows the loading Spinner, <Code>error</Code> the distinct error row, <Code>empty</Code> the query-echo.</Caption></Box>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>Typeahead</Code> accepts — the <Code>source</Code> owns filtering, the <Code>Field</Code> props layer the shared shell, and the rest tune the search pipeline.</>}>
          <PropTable rows={PROPS} />
          <Section title="Embedded mode — for host components" lead={<>A second set, for building <strong>another component on top of Typeahead’s engine</strong> rather than using the field directly — this is how <Code>Tokenizer</Code> runs a transient combobox inside its own chip surface. Reach for them only when you own the surrounding field; standalone use needs none of them.</>}>
            <PropTable rows={EMBEDDED_PROPS} />
          </Section>
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Typeahead · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · engine">
            <strong>One cohesive search engine.</strong> The engine — the async-generation guard, the
            aria-activedescendant keyboard machine, the singleton live-region announcer, and{" "}
            <Code>createStaticSource</Code> — is built on this system’s Radix substrate and its naming conventions.
          </Decision>
          <Decision id="[[headless-primitives-declared]] · dep">
            Built on <Code>@radix-ui/react-popover</Code> (the same primitive as <Code>MultiSelect</Code>)
            for portal + positioning + dismiss — so a native-popover pointerdown light-dismiss race never applies here.
          </Decision>
          <Decision id="R10 · size">
            Size resolves to the system’s small default via <Code>useResolvedSize("control")</Code>, following the
            global sizing lanes rather than a per-component default.
          </Decision>
          <Decision id="[[field-shell]] / [[field-shell-adoption]] · Field">
            Rides the shared <Code>Field</Code> shell (label / description / validation / info, mirroring{" "}
            <Code>TextField</Code>). Because the input <em>is</em> a Radix <Code>TextField.Root</Code>, the
            accent-aware <Code>[data-validation]</Code> paint and the system focus ring ([[focus-ring]]) apply with{" "}
            <strong>no net-new CSS</strong> — reuse over reinvention (Rule 11).
          </Decision>
          <Decision id="Flagship fix">
            <strong>Error ≠ empty.</strong> A naive <Code>catch {`{ setResults([]) }`}</Code> would make a
            network failure indistinguishable from zero matches. The error state is instead a{" "}
            <strong>distinct, actionable</strong> surface — <Code>errorText</Code> + Retry, announced as an
            error — so a failure never reads as “nothing found”.
          </Decision>
          <Decision id="UX rulings">
            The <strong>empty</strong> state echoes the query (a muted
            line — editing is the natural recovery in a combobox), not a nuclear “clear search” button; the{" "}
            <strong>error</strong> is restrained (weak tint + alert glyph, not the loud solid fill — a
            system fault, not “your input is wrong”); the leading <strong>search glyph</strong> defaults on;
            and <Code>Enter</Code> re-runs the query while in the error state, because the in-panel Retry
            button sits outside the Tab sequence and Enter is the only keyboard route left to it.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Typeahead</Code> — the async combobox: portaled listbox on{" "}
            <Code>@radix-ui/react-popover</Code>, the async-generation guard, the
            aria-activedescendant keyboard machine (wrap-around · Home/End · Enter · Escape · blur-close),
            the singleton live-region announcer, loading / empty / <strong>distinct error</strong> states,
            the leading search glyph + clear ✕ affixes, and full Field-shell validation. Stories:
            History · Anatomy · Usage · Keyboard · Menu states · Props.
          </Decision>
          <Decision id="Deferred → chip edit mode">
            <strong>Token-chip edit mode</strong> (chip-in-field) — revisit when <Code>Token</Code> ships
            and that UX is designed. The classic text-in-input ships first.
          </Decision>
          <Decision id="Deferred → Tooltip">
            <strong><Code>disabledMessage</Code> tooltip</strong> (aria-disabled + reason tooltip) — revisit
            as a Field-family affordance once the Tooltip wrap ships.
          </Decision>
          <Decision id="Deferred → CommandPalette">
            <strong>Grouped results</strong> — wire with real <Code>role="group"</Code> semantics that
            CommandPalette needs.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
